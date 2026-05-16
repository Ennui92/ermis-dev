# ermis-comments

Cloudflare Worker that powers the comment thread on ermis.dev posts.

- Storage: Cloudflare KV (1 entry per comment, name + body + ts stored in metadata)
- Anti-spam: Cloudflare Turnstile (captcha verified server-side) + no-links rule
- Endpoints: `GET /comments?postId=<slug>`, `POST /comments`

## One-time setup

Run all of these from this folder (`workers/comments`).

### 1. Log in to Cloudflare

```sh
npx wrangler login
```

Opens a browser, click Allow. Only needed once per machine.

### 2. Create the KV namespace

```sh
npx wrangler kv namespace create COMMENTS_KV
```

It prints something like:

```
[[kv_namespaces]]
binding = "COMMENTS_KV"
id = "abc123def456..."
```

Paste that `id` value into `wrangler.toml`, replacing `REPLACE_WITH_KV_NAMESPACE_ID`.

### 3. Get Turnstile keys

1. Open https://dash.cloudflare.com → **Turnstile** → **Add site**.
2. Site name: `ermis.dev comments` · Hostnames: `ermis.dev`, `ennui92.github.io` · Widget mode: **Managed**.
3. Copy the **Site key** (public) and the **Secret key** (private).
4. The site key goes into `assets/comments.js` at the top of the ermis-dev site.
5. Store the secret in this worker:

   ```sh
   npx wrangler secret put TURNSTILE_SECRET
   ```

   Paste the secret when prompted.

### 4. Deploy

```sh
npx wrangler deploy
```

Wrangler prints the worker URL (e.g. `https://ermis-comments.<account>.workers.dev`).
Paste that URL into `assets/comments.js` as `API`.

## Day-to-day

- Re-deploy after code changes: `npx wrangler deploy`
- Tail live logs: `npx wrangler tail`
- Read all comments for a post:
  `npx wrangler kv key list --binding=COMMENTS_KV --prefix='c:pull-the-plug-day-8:'`
- Delete a single comment by key:
  `npx wrangler kv key delete --binding=COMMENTS_KV '<full-key>'`

## Limits

- Comment body: 1–800 characters.
- Name: up to 40 characters (defaults to `Anonymous` if blank).
- 200 comments per post listed by default — bump `MAX_LIST` in `worker.js` if you ever need more.
- Rejects anything that looks like a URL or HTML anchor tag.
