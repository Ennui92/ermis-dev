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
        remoteip: request.headers.get("CF-Connecting-IP") || "",
      }),
    }
  );
  const verify = await verifyRes.json().catch(() => ({ success: false }));
  if (!verify.success) {
    return json({ error: "captcha failed, try again" }, 403, cors);
  }

  const ts = Date.now();
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
