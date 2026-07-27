/** The PWA's thin client for the manna-parse Worker. Turns a sentence plus the
 *  live category and wallet lists into a draft the add sheet opens on. The Worker
 *  holds the Anthropic key; this side only knows its URL and a shared token —
 *  both build-time env, both absent by default so the feature stays dark until
 *  the Worker is deployed and configured. */
import type { Category, Wallet } from "./money";
import type { AddDraft } from "./parse";

/* Cast rather than augment ImportMetaEnv: these two vars are optional and local
   to this feature, and Vite injects whatever VITE_-prefixed values exist at
   build. Missing ones read back as undefined, which is exactly the "not
   configured" signal below. */
const env = import.meta.env as Record<string, string | undefined>;
const PARSE_URL = env.VITE_PARSE_URL;
const PARSE_TOKEN = env.VITE_PARSE_TOKEN;

/** Whether natural-language capture is wired up. When the Worker's URL and token
 *  aren't set, Home hides the capture box and you log with the wizard — which is
 *  the offline / manual path regardless. */
export const captureConfigured = Boolean(PARSE_URL && PARSE_TOKEN);

export interface CaptureResult {
  draft: AddDraft;
  confidence: "high" | "medium" | "low";
}

/** Local calendar date (YYYY-MM-DD), so "today"/"yesterday" resolve in the
 *  user's timezone rather than UTC — the same local-date rule the month views
 *  bucket by. */
function localDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** POST one sentence to the Worker and get back a validated draft. Throws on a
 *  network or server failure; the caller keeps the manual wizard as the
 *  fallback rather than surfacing an error the user can't act on. */
export async function parseSentence(
  sentence: string,
  categories: Category[],
  wallets: Wallet[],
): Promise<CaptureResult> {
  if (!PARSE_URL || !PARSE_TOKEN) throw new Error("capture not configured");
  const res = await fetch(PARSE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PARSE_TOKEN}`,
    },
    body: JSON.stringify({ sentence, categories, wallets, today: localDate() }),
  });
  if (!res.ok) throw new Error(`parse failed: ${res.status}`);
  return (await res.json()) as CaptureResult;
}
