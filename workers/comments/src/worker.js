// Comments worker for ermis.dev — Turnstile-gated, KV-backed, no links.
//
// Endpoints:
//   GET  /comments?postId=<slug>  → { comments: [{id, name, body, ts}, ...] }
//   POST /comments                → body: { postId, name, body, turnstileToken }
//                                   → { comment: {id, name, body, ts} } on success

const ALLOWED_ORIGINS = new Set([
  "https://ermis.dev",
  "https://www.ermis.dev",
  "https://ennui92.github.io",
  "http://localhost:4000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

const MAX_BODY = 800;
const MAX_NAME = 40;
const MAX_LIST = 200;
const POST_ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const LINK_RE =
  /\bhttps?:\/\/|<a\b|\bwww\.[a-z0-9]|[a-z0-9-]{2,}\.(com|net|org|io|dev|app|co|me|xyz|gg|ai|tv|us|uk|de|fr|ru|cn|info|biz|tech|site|online|store|shop|link|click|live|fun|top|wtf|sh|to)\b/i;

// Anti-spam layers stacked on top of Turnstile so the system has teeth
// even while the captcha widget is using Cloudflare's always-pass test
// keys. Each layer is cheap; together they catch the bulk of script
// kiddies, automated scrapers, and brute-force comment spam.
const MIN_FORM_AGE_MS = 1500;          // form must be open this long before submit
const RATE_LIMIT_WINDOW_S = 300;       // 5-minute sliding window
const RATE_LIMIT_MAX = 5;              // max posts per IP in the window

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

    if (url.pathname !== "/comments") {
      return json({ error: "not found" }, 404, cors);
    }

    if (request.method === "GET") return handleList(url, env, cors);
    if (request.method === "POST") return handlePost(request, env, cors);
    return json({ error: "method not allowed" }, 405, cors);
  },
};

async function handleList(url, env, cors) {
  const postId = url.searchParams.get("postId") || "";
  if (!POST_ID_RE.test(postId)) {
    return json({ error: "bad postId" }, 400, cors);
  }
  const list = await env.COMMENTS_KV.list({
    prefix: `c:${postId}:`,
    limit: MAX_LIST,
  });
  const comments = list.keys
    .filter(k => k.metadata && typeof k.metadata === "object")
    .map(k => ({
      id: k.name,
      name: k.metadata.name,
      body: k.metadata.body,
      ts: k.metadata.ts,
    }))
    .sort((a, b) => b.ts - a.ts);
  return json({ comments }, 200, cors);
}

async function handlePost(request, env, cors) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "bad json" }, 400, cors);
  }

  // ── Honeypot ─────────────────────────────────────────────────────────
  // The form has a hidden `website` field that humans never see and
  // bots fill in automatically. If it has any value, it's a bot.
  // We respond 200 OK to avoid signaling rejection (so the bot doesn't
  // retry with a different strategy), but skip the KV write.
  if (payload.website && String(payload.website).trim().length > 0) {
    return json({ comment: { id: "honey", name: "Anonymous", body: "", ts: Date.now() } }, 200, cors);
  }

  // ── Form-age gate ────────────────────────────────────────────────────
  // The frontend stamps a timestamp when the page loads and sends the
  // elapsed milliseconds at submit time. Sub-1.5s submissions are
  // overwhelmingly bots (humans can't fill and submit that fast).
  const formAgeMs = Number(payload.formAgeMs);
  if (!Number.isFinite(formAgeMs) || formAgeMs < MIN_FORM_AGE_MS) {
    return json({ error: "submitted too fast, please retry" }, 400, cors);
  }

  const postId = String(payload.postId || "");
  if (!POST_ID_RE.test(postId)) {
    return json({ error: "bad postId" }, 400, cors);
  }

  const rawName = String(payload.name || "").trim();
  const name = (rawName.slice(0, MAX_NAME) || "Anonymous");
  const body = String(payload.body || "").trim();
  if (body.length < 1) return json({ error: "comment is empty" }, 400, cors);
  if (body.length > MAX_BODY) {
    return json({ error: `comment is too long (max ${MAX_BODY} characters)` }, 400, cors);
  }
  if (LINK_RE.test(body) || LINK_RE.test(name)) {
    return json({ error: "no links allowed in comments" }, 400, cors);
  }

  // ── Per-IP rate limit ────────────────────────────────────────────────
  // Sliding window of N posts per 5 minutes. Each post writes a KV
  // entry under `rl:<ip>:<ts>` with TTL = window. Counting matching
  // entries gives the rolling count without needing to manage expiry
  // ourselves.
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (ip !== "0.0.0.0") {
    const rl = await env.COMMENTS_KV.list({ prefix: `rl:${ip}:`, limit: RATE_LIMIT_MAX + 1 });
    if (rl.keys.length >= RATE_LIMIT_MAX) {
      return json({ error: "too many comments, please slow down" }, 429, cors);
    }
  }

  // ── Turnstile (test key always passes; real key on swap-in) ─────────
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

  const ts = Date.now();

  // Stamp the rate-limit key (TTL auto-expires it after the window).
  if (ip !== "0.0.0.0") {
    await env.COMMENTS_KV.put(
      `rl:${ip}:${ts}`,
      "",
      { expirationTtl: RATE_LIMIT_WINDOW_S }
    );
  }

  // Sortable suffix: invert ts so list() (lexicographic) returns newest first,
  // but we still sort client-side to be safe.
  const id = `c:${postId}:${ts}-${crypto.randomUUID().slice(0, 8)}`;
  const metadata = { name, body, ts };
  await env.COMMENTS_KV.put(id, "", { metadata });

  return json({ comment: { id, name, body, ts } }, 200, cors);
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}
