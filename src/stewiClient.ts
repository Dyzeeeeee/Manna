/** Stewi's thin Worker client. Owns the turn-taking loop: read tools are
 *  resolved silently and the Worker is called again automatically; the first
 *  write proposal in a turn pauses the loop and comes back as `pendingAction`
 *  for the UI to show. The Worker holds the Anthropic key; this side only
 *  knows its URL and a shared token — both build-time env, both absent by
 *  default so the feature stays dark until the Worker is deployed. */
import {
  isReadTool,
  runReadTool,
  sanitizeProposedAction,
  type ProposedAction,
  type StewiContentBlock,
  type StewiContext,
  type StewiMessage,
  type StewiToolResultBlock,
} from "./assistant";

const env = import.meta.env as Record<string, string | undefined>;
const STEWI_URL = env.VITE_PARSE_URL;
const STEWI_TOKEN = env.VITE_PARSE_TOKEN;

/** Whether Stewi is wired up. When the Worker's URL and token aren't set, the
 *  launcher stays hidden and logging is the numpad wizard — the offline path
 *  regardless. */
export const stewiConfigured = Boolean(STEWI_URL && STEWI_TOKEN);

/** A read/write tool call gets at most this many automatic round trips to the
 *  Worker before giving up — a safety valve against a runaway tool loop. */
const MAX_AUTO_STEPS = 5;

export interface PendingAction {
  toolUseId: string;
  action: ProposedAction;
}

export interface StewiTurnResult {
  /** The full updated history — hold onto this and pass it back as `history`
   *  on the next call. */
  messages: StewiMessage[];
  /** Claude's final text for this turn, if it produced one. */
  reply?: string;
  /** A write tool waiting on a user tap before anything is written. */
  pendingAction?: PendingAction;
  /** Set when the Worker call itself failed (network, not configured, etc.) —
   *  distinct from the model choosing not to reply. */
  error?: string;
}

function localDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function callWorker(messages: StewiMessage[], ctx: StewiContext): Promise<StewiContentBlock[]> {
  const res = await fetch(STEWI_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${STEWI_TOKEN}` },
    body: JSON.stringify({
      messages,
      categories: ctx.categories,
      wallets: ctx.wallets,
      recurring: ctx.recurring,
      debts: ctx.debts,
      today: localDate(),
    }),
  });
  if (!res.ok) throw new Error(`stewi failed: ${res.status}`);
  const data = (await res.json()) as { content: StewiContentBlock[] };
  return data.content;
}

const isToolUse = (b: StewiContentBlock): b is Extract<StewiContentBlock, { type: "tool_use" }> =>
  b.type === "tool_use";
const isText = (b: StewiContentBlock): b is Extract<StewiContentBlock, { type: "text" }> => b.type === "text";

/** Send one user message (plus whatever history came before it) and drive the
 *  tool loop to a stopping point: a final reply, a write proposal awaiting
 *  confirmation, or an error. Every read tool the model calls along the way is
 *  answered without asking — nothing it does is ever visible as a step, only
 *  the eventual answer or proposal is. */
export async function sendToStewi(
  history: StewiMessage[],
  userText: string,
  ctx: StewiContext,
): Promise<StewiTurnResult> {
  if (!STEWI_URL || !STEWI_TOKEN) return { messages: history, error: "Stewi isn't configured yet." };

  let messages: StewiMessage[] = [...history, { role: "user", content: userText }];

  for (let step = 0; step < MAX_AUTO_STEPS; step += 1) {
    let content: StewiContentBlock[];
    try {
      content = await callWorker(messages, ctx);
    } catch {
      return { messages, error: "Stewi couldn't respond just now." };
    }
    messages = [...messages, { role: "assistant", content }];

    const toolUses = content.filter(isToolUse);
    if (toolUses.length === 0) {
      const reply = content.filter(isText).map((b) => b.text).join("\n").trim();
      return { messages, reply: reply || undefined };
    }

    const results: StewiToolResultBlock[] = [];
    let pendingAction: PendingAction | undefined;

    // Every tool_use in this turn gets a matching tool_result, in order —
    // Anthropic requires the full batch answered before the next call. Read
    // tools always resolve for real; at most one write tool becomes the
    // pending proposal, and anything after it (or a second write call, which
    // the UI can only act on one of at a time) gets a neutral placeholder.
    for (const call of toolUses) {
      if (isReadTool(call.name)) {
        const data = runReadTool(call.name, call.input, ctx);
        results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(data) });
        continue;
      }
      if (pendingAction) {
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: "(awaiting the user's confirmation on another proposal first)",
        });
        continue;
      }
      const action = sanitizeProposedAction(call.name, call.input, ctx);
      if ("error" in action) {
        results.push({ type: "tool_result", tool_use_id: call.id, content: action.error, is_error: true });
      } else {
        pendingAction = { toolUseId: call.id, action };
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: "(awaiting user confirmation in the app)",
        });
      }
    }

    messages = [...messages, { role: "user", content: results }];
    if (pendingAction) return { messages, pendingAction };
    // every call this turn was a read (or a rejected write) — loop continues
  }

  return { messages, error: "That needed too many steps — try asking more directly." };
}

/** Records what happened to a proposal as a small synthetic note (rendered as
 *  a caption, not a chat bubble — see `StewiMessage.display`) rather than
 *  spending another Claude call just to acknowledge it. The next real message
 *  the user sends carries this forward as ordinary conversation context. */
export function recordActionOutcome(messages: StewiMessage[], outcome: string): StewiMessage[] {
  return [...messages, { role: "user", content: outcome, display: "note" }];
}
