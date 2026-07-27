# manna-parse

The natural-language capture endpoint. A **separate** Cloudflare Worker so the
PWA's own deploy (`../wrangler.jsonc`) stays pure static assets — this is the only
place the Anthropic API key lives, and it never reaches the browser.

Say _"200 on Jollibee today"_ → this returns a transaction **draft** the add sheet
opens on the review panel. Nothing is written until you confirm.

## Deploy

```sh
# one time — secrets go into Cloudflare, never the repo
npx wrangler secret put ANTHROPIC_API_KEY -c worker/wrangler.jsonc   # your (rotated) key
npx wrangler secret put APP_TOKEN          -c worker/wrangler.jsonc   # any long random string

npx wrangler deploy -c worker/wrangler.jsonc
```

Edit `ALLOWED_ORIGINS` in `wrangler.jsonc` to your real PWA origins before deploying.
Local run: `npx wrangler dev -c worker/wrangler.jsonc` (uses `.dev.vars` for secrets).

## Contract

`POST /` with `Authorization: Bearer <APP_TOKEN>` and JSON:

```jsonc
{
  "sentence": "200 on jollibee today",
  "categories": [ /* the live category list from useCategories() */ ],
  "wallets":    [ /* the live wallet list from useWallets() */ ],
  "today": "2026-07-27"   // optional; the user's local date for "today"/"yesterday"
}
```

Response:

```jsonc
{
  "draft": { "kind": "expense", "amountCents": 20000, "categoryId": "food", "note": "Jollibee" },
  "confidence": "high"
}
```

`draft` is an `AddDraft` (see `../src/parse.ts`) — pass it straight to `<AddSheet draft={draft} … />`.
The prompt, the id-pinned schema, and the validation all live in `../src/parse.ts`,
shared verbatim with the app and unit-tested in `../src/parse.test.ts`.

## Client call (for the capture UI, not built yet)

```ts
const res = await fetch(import.meta.env.VITE_PARSE_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_PARSE_TOKEN}`,
  },
  body: JSON.stringify({
    sentence,
    categories,
    wallets,
    today: new Date().toISOString().slice(0, 10),
  }),
});
const { draft } = await res.json();
// then: hold the draft in Manna state and open the sheet on it
```

> **On `APP_TOKEN` in the client:** it ships in the PWA bundle, so it's a soft gate
> — it plus the CORS origin allowlist deters casual abuse of a paid endpoint, but
> it is not a hard secret. The Anthropic key is the thing that must stay
> server-side, and it does. If you want a hard gate later, put Cloudflare Access
> in front of the Worker.
