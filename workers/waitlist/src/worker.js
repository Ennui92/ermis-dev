// Waitlist worker for ermis.dev — captures emails for Pull the Plug launch.
//
// Endpoints:
//   POST /waitlist  → body: { email, source, turnstileToken, formAgeMs, website }
//                    → { ok: true } or { ok: true, already: true } if duplicate
//   GET  /waitlist/count → { count: <int> }   (public; no PII)
//
// Storage: email is hashed (sha256, hex) and used as the KV key suffix.
// We never expose the raw list; admin reads happen via `wrangler kv:key list`.

const ALLOWED_ORIGINS = new Set([
  "https://ermis.dev",
  "https://www.ermis.dev",
  "https://ennui92.github.io",
  "http://localhost:4000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

const MIN_FORM_AGE_MS = 1500;
const RATE_LIMIT_WINDOW_S = 3600;
const RATE_LIMIT_MAX = 5;
const MAX_EMAIL_LEN = 254;
const MAX_SOURCE_LEN = 64;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const corsOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://ermis.dev";
    const cors = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/waitlist/count" && request.method === "GET") {
      return handleCount(env, cors);
    }
    if (url.pathname === "/waitlist" && request.method === "POST") {
      return handlePost(request, env, cors);
    }
    return json({ error: "not found" }, 404, cors);
  },
};

async function handleCount(env, cors) {
  // Counts only `wl:` keys, skipping rate-limit entries.
  let total = 0;
  let cursor;
  do {
    const page = await env.WAITLIST_KV.list({ prefix: "wl:", cursor, limit: 1000 });
    total += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ count: total }, 200, cors);
}

async function handlePost(request, env, cors) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "bad json" }, 400, cors);
  }

  // Honeypot — invisible field. Bots fill it; humans never see it.
  if (payload.website && String(payload.website).trim().length > 0) {
    return json({ ok: true }, 200, cors);
  }

  const formAgeMs = Number(payload.formAgeMs);
  if (!Number.isFinite(formAgeMs) || formAgeMs < MIN_FORM_AGE_MS) {
    return json({ error: "submitted too fast, please retry" }, 400, cors);
  }

  const email = String(payload.email || "").trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    return json({ error: "enter a valid email" }, 400, cors);
  }

  const source = String(payload.source || "unknown").slice(0, MAX_SOURCE_LEN);

  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (ip !== "0.0.0.0") {
    const rl = await env.WAITLIST_KV.list({ prefix: `rl:${ip}:`, limit: RATE_LIMIT_MAX + 1 });
    if (rl.keys.length >= RATE_LIMIT_MAX) {
      return json({ error: "too many signups, slow down" }, 429, cors);
    }
  }

  const token = String(payload.turnstileToken || "");
  if (!token) return json({ error: "captcha missing" }, 400, cors);

  const verifyRes = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: ip,
      }),
    }
  );
  const verify = await verifyRes.json().catch(() => ({ success: false }));
  if (!verify.success) {
    return json({ error: "captcha failed, try again" }, 403, cors);
  }

  const hash = await sha256Hex(email);
  const key = `wl:${hash}`;

  const existing = await env.WAITLIST_KV.get(key, { type: "json" });
  if (existing) {
    return json({ ok: true, already: true }, 200, cors);
  }

  const ts = Date.now();
  await env.WAITLIST_KV.put(key, JSON.stringify({ email, source, ts }));

  if (ip !== "0.0.0.0") {
    await env.WAITLIST_KV.put(
      `rl:${ip}:${ts}`,
      "",
      { expirationTtl: RATE_LIMIT_WINDOW_S }
    );
  }

  return json({ ok: true }, 200, cors);
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}
