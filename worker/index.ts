/** manna-parse — the natural-language capture endpoint.
 *
 *  A separate Cloudflare Worker, on purpose: the PWA's own deploy stays static
 *  assets with no server in front of it (see ../wrangler.jsonc). This is the one
 *  place that holds the Anthropic key, so the key never reaches the browser.
 *
 *  Contract: POST a sentence plus the user's live category and wallet lists;
 *  get back an { draft, confidence }. The heavy lifting — the prompt, the schema
 *  that pins ids to real categories/wallets, and the validation — lives in
 *  ../src/parse.ts, shared verbatim with the app and unit-tested there. This file
 *  is just the HTTP shell: auth, CORS, one Claude call, JSON out.
 */
import Anthropic from "@anthropic-ai/sdk";

import type { Category, Wallet } from "../src/money";
import { buildDraftSchema, buildParsePrompt, sanitizeDraft, type ParsedDraft } from "../src/parse";

interface Env {
  /** Secret — `wrangler secret put ANTHROPIC_API_KEY`. Never in the repo. */
  ANTHROPIC_API_KEY: string;
  /** Secret — a shared token the PWA sends so a stranger can't spend your
   *  Anthropic credit against an open endpoint. `wrangler secret put APP_TOKEN`. */
  APP_TOKEN: string;
  /** Plain var (wrangler.jsonc) — comma-separated origins allowed to call in. */
  ALLOWED_ORIGINS: string;
}

interface ParseRequest {
  sentence: string;
  categories: Category[];
  wallets: Wallet[];
  /** ISO date (YYYY-MM-DD) in the user's timezone, so "today"/"yesterday"
   *  resolve correctly. Defaults to the Worker's date if omitted. */
  today?: string;
}

/** Cheap and fast, and it supports structured outputs — the right tier for a
 *  short, high-frequency extraction. Bump to a larger model here if the parses
 *  start missing. */
const MODEL = "claude-haiku-4-5";

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

    let body: ParseRequest;
    try {
      body = (await request.json()) as ParseRequest;
    } catch {
      return json({ error: "invalid JSON" }, 400, cors);
    }

    const sentence = (body.sentence ?? "").trim();
    if (!sentence) return json({ error: "empty sentence" }, 400, cors);
    if (!Array.isArray(body.categories) || !Array.isArray(body.wallets)) {
      return json({ error: "categories and wallets are required" }, 400, cors);
    }

    const today = body.today ?? new Date().toISOString().slice(0, 10);
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    let parsed: ParsedDraft;
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 512,
        system: [
          {
            type: "text",
            text: buildParsePrompt(body.categories, body.wallets, today),
            // Stable per taxonomy, so it caches once the prompt clears the
            // model's minimum cacheable prefix. Harmless below it.
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            schema: buildDraftSchema(body.categories, body.wallets),
          },
        },
        messages: [{ role: "user", content: sentence }],
      });

      const block = res.content.find((b) => b.type === "text");
      if (block?.type !== "text") throw new Error("no text block in response");
      parsed = JSON.parse(block.text) as ParsedDraft;
    } catch (err) {
      console.error("manna-parse: model call failed", err);
      return json({ error: "could not parse" }, 502, cors);
    }

    // The schema already constrains ids, but re-validate against the lists the
    // client actually sent — trust the review panel, not the model.
    const draft = sanitizeDraft(parsed, body.categories, body.wallets);
    return json({ draft, confidence: parsed.confidence }, 200, cors);
  },
} satisfies ExportedHandler<Env>;

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
