/** manna-parse — Stewi's endpoint.
 *
 *  A separate Cloudflare Worker, on purpose: the PWA's own deploy stays static
 *  assets with no server in front of it (see ../wrangler.jsonc). This is the
 *  one place that holds the Anthropic key, so the key never reaches the
 *  browser. Kept the deployed name/URL from the single-shot capture endpoint
 *  this replaces, to avoid an env-var/redeploy churn for what is, underneath,
 *  the same "one Worker for the AI feature" role.
 *
 *  Contract: POST the running conversation plus the user's live categories/
 *  wallets/recurring/debts; get back whatever content blocks Claude produced
 *  — text and/or tool_use. This Worker makes exactly one Claude call per
 *  request and never executes a tool itself: it has no database access (all
 *  of Manna's data lives in the browser via InstantDB), so every tool —
 *  read or write — is resolved client-side. See ../src/assistant.ts for the
 *  tool schemas, the system prompt, and the read-tool/sanitiser logic shared
 *  verbatim with the app and unit-tested there.
 */
import Anthropic from "@anthropic-ai/sdk";

import { buildStewiSystemPrompt, buildStewiTools, type StewiContentBlock, type StewiMessage } from "../src/assistant";
import type { Category, Debt, Recurring, Wallet } from "../src/money";

interface Env {
  /** Secret — `wrangler secret put ANTHROPIC_API_KEY`. Never in the repo. */
  ANTHROPIC_API_KEY: string;
  /** Secret — a shared token the PWA sends so a stranger can't spend your
   *  Anthropic credit against an open endpoint. `wrangler secret put APP_TOKEN`. */
  APP_TOKEN: string;
  /** Plain var (wrangler.jsonc) — comma-separated origins allowed to call in. */
  ALLOWED_ORIGINS: string;
}

interface StewiRequestBody {
  messages: StewiMessage[];
  categories: Category[];
  wallets: Wallet[];
  recurring: Recurring[];
  debts: Debt[];
  /** ISO date (YYYY-MM-DD) in the user's timezone, so "today"/"yesterday"
   *  resolve correctly. Defaults to the Worker's date if omitted. */
  today?: string;
}

/** Cheap and fast, and it handles tool selection well at this scope — a
 *  personal ledger's worth of everyday actions, not open-ended reasoning.
 *  Bump to a larger model here if tool selection starts missing. */
const MODEL = "claude-haiku-4-5";

const MAX_TOKENS = 1024;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
    const cors = corsHeaders(request.headers.get("Origin"), allowed);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405, cors);

    // Shared-secret gate. Constant-ish compare is overkill for a single-user app,
    // but an unauthenticated endpoint that calls a paid API is an abuse vector.
    if (!env.APP_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.APP_TOKEN}`) {
      return json({ error: "unauthorized" }, 401, cors);
    }

    let body: StewiRequestBody;
    try {
      body = (await request.json()) as StewiRequestBody;
    } catch {
      return json({ error: "invalid JSON" }, 400, cors);
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: "messages is required" }, 400, cors);
    }
    if (
      !Array.isArray(body.categories) ||
      !Array.isArray(body.wallets) ||
      !Array.isArray(body.recurring) ||
      !Array.isArray(body.debts)
    ) {
      return json({ error: "categories, wallets, recurring, and debts are required" }, 400, cors);
    }

    const today = body.today ?? new Date().toISOString().slice(0, 10);
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    // Strip the client-only `display` rendering hint before it reaches the
    // API — Anthropic's schema doesn't know about it, and only role/content
    // are ever meaningful to the model.
    const messages = body.messages.map(({ role, content }) => ({ role, content }));

    let content: StewiContentBlock[];
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: "text",
            text: buildStewiSystemPrompt(body.categories, body.wallets, today),
            // Stable per taxonomy, so it caches once the prompt clears the
            // model's minimum cacheable prefix. Harmless below it.
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: buildStewiTools(body) as Anthropic.Messages.Tool[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages as any,
      });
      content = res.content.map(mapBlock).filter((b): b is StewiContentBlock => b !== undefined);
    } catch (err) {
      console.error("manna-parse: model call failed", err);
      return json({ error: "could not reach Stewi" }, 502, cors);
    }

    return json({ content }, 200, cors);
  },
} satisfies ExportedHandler<Env>;

/** Anthropic's own content-block shape → the smaller one assistant.ts (and the
 *  client bundle) knows about. Thinking/other block types are dropped rather
 *  than surfaced — nothing downstream reads them. */
function mapBlock(block: Anthropic.Messages.ContentBlock): StewiContentBlock | undefined {
  if (block.type === "text") return { type: "text", text: block.text };
  if (block.type === "tool_use") {
    return { type: "tool_use", id: block.id, name: block.name, input: block.input as Record<string, unknown> };
  }
  return undefined;
}

/** Echo the caller's origin only when it's on the allowlist; otherwise send no
 *  ACAO header, which is what blocks a disallowed browser origin. */
function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
