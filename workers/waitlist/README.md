# ermis-waitlist

Email capture for the Pull the Plug launch. Stores hashed emails in KV with anti-spam (honeypot + form-age + per-IP rate limit + Turnstile).

## One-time setup

```bash
cd workers/waitlist

# 1. Create the KV namespace and paste the id into wrangler.toml
npx wrangler kv namespace create WAITLIST_KV

# 2. Set the Turnstile secret (use the always-pass test key for now)
echo 1x0000000000000000000000000000000AA | npx wrangler secret put TURNSTILE_SECRET

# 3. Deploy
npx wrangler deploy
```

## Endpoints

- `POST /waitlist` — body `{ email, source, turnstileToken, formAgeMs, website }`
- `GET  /waitlist/count` — returns total subscribers

## Exporting the list

```bash
npx wrangler kv key list --binding=WAITLIST_KV --prefix="wl:" \
  | jq -r '.[].name' \
  | while read k; do
      npx wrangler kv key get "$k" --binding=WAITLIST_KV
      echo
    done
```

Or use the CF dashboard → Workers KV → WAITLIST_KV.
