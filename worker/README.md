# manna-parse

Stewi's endpoint. A **separate** Cloudflare Worker so the PWA's own deploy
(`../wrangler.jsonc`) stays pure static assets — this is the only place the
Anthropic API key lives, and it never reaches the browser. Kept the deployed
name from the single-shot capture endpoint this replaces, to avoid an
env-var/redeploy churn for what is, underneath, still "the one Worker for the
AI feature."

This Worker makes exactly **one Claude call per request** and never executes
a tool itself — it has no database access, so every tool (read or write) is
resolved client-side in `../src/stewiClient.ts`. See `../src/assistant.ts` for
the tool schemas, the system prompt, and the sanitisers, all shared verbatim
with the app and unit-tested in `../src/assistant.test.ts`.

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
  "messages": [ /* the running StewiMessage[] conversation, see ../src/assistant.ts */ ],
  "categories": [ /* the live category list from useCategories() */ ],
  "wallets":    [ /* the live wallet list from useWallets() */ ],
  "recurring":  [ /* the live recurring list from useRecurring() */ ],
  "debts":      [ /* the live debt list from useDebts() */ ],
  "today": "2026-07-27"   // optional; the user's local date for "today"/"yesterday"
}
```

Response:

```jsonc
{
  "content": [
    { "type": "text", "text": "…" },
    { "type": "tool_use", "id": "…", "name": "propose_transaction", "input": { "…": "…" } }
  ]
}
```

`content` is Claude's own response content blocks, narrowed to `StewiContentBlock[]`
(text and tool_use only — see `../src/assistant.ts`). The client appends this as
the next assistant turn and decides what to do with any `tool_use` blocks:

- **Read tools** (`get_overview`, `get_category_breakdown`, `get_allotment_status`,
  `get_recurring_status`, `get_debts`, `search_transactions`) are answered
  immediately by `runReadTool` against data already loaded in the browser — no
  user interaction, and the client calls this Worker again automatically with
  the `tool_result` appended.
- **Write tools** (`propose_transaction`, `propose_transaction_edit`,
  `propose_transaction_delete`, `propose_recurring_approval`,
  `propose_recurring_skip`, `propose_debt_payment`) are turned into a
  `ProposedAction` by `sanitizeProposedAction`, shown to the user, and only
  carried out — via the exact same store functions the manual screens use —
  once they confirm. Nothing this Worker returns is ever written by itself.

## On `APP_TOKEN` in the client

It ships in the PWA bundle, so it's a soft gate — it plus the CORS origin
allowlist deters casual abuse of a paid endpoint, but it is not a hard secret.
The Anthropic key is the thing that must stay server-side, and it does. If you
want a hard gate later, put Cloudflare Access in front of the Worker.
