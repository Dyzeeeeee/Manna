import { useEffect, useMemo, useRef, useState } from "react";

import type { ProposedAction, StewiMessage, StewiTextBlock } from "./assistant";
import { IconAssistant, IconClose, IconEdit, IconMic, IconSend } from "./icons";
import type { Allotment, Category, Debt, Recurring, RecurringSkip, Txn, Wallet } from "./money";
import type { AddDraft } from "./parse";
import { type PendingAction, recordActionOutcome, sendToStewi } from "./stewiClient";
import { StewiActionCard } from "./StewiActionCard";

/* The slice of the Web Speech API this uses — ported from the retired
   CaptureBox, which had the same need. Not in the DOM lib types, and in
   practice only Chromium ships it, so it's feature-detected and the mic
   button simply doesn't render where it's missing. */
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (event: SpeechResultEvent) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Must match `.drawer-out` in app.css — the overlay unmounts on this timer,
 *  and unmounting early cuts the slide-down off mid-way. */
const DRAWER_OUT_MS = 200;

export interface StewiHandoff {
  /** Bumped on every hand-off so a repeated value (the same close firing
   *  twice) is a no-op rather than a duplicate transcript note. */
  token: number;
  outcome: "saved" | "deleted" | "cancelled";
}

interface StewiProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  wallets: Wallet[];
  txns: Txn[];
  allotments: Allotment[];
  recurring: Recurring[];
  skips: RecurringSkip[];
  debts: Debt[];
  /** The running transcript, lifted to Manna.tsx so it survives this overlay
   *  closing and reopening — everything else here (a pending confirmation
   *  card, the input, the busy flag) is transient and fine to lose on close. */
  messages: StewiMessage[];
  onMessagesChange: (messages: StewiMessage[]) => void;
  /** Opens the existing Add wizard on a proposed new transaction. */
  onProposeCreate: (draft: AddDraft) => void;
  /** Opens the existing edit sheet — on the already-modified transaction for
   *  an edit proposal, or on the original for a delete proposal (its own
   *  Delete button is the confirm step). */
  onProposeReview: (txn: Txn) => void;
  /** The offline/manual fallback: a blank Add wizard, bypassing Stewi
   *  entirely — Stewi needs a network round trip; logging must not. */
  onManualEntry: () => void;
  /** Set once a hand-off sheet (opened via the two callbacks above) resolves,
   *  so the transcript can note what happened. */
  handoff?: StewiHandoff;
}

function formatHandoffNote(
  outcome: StewiHandoff["outcome"],
  action: Extract<ProposedAction, { type: "create_transaction" | "edit_transaction" | "delete_transaction" }>,
): string {
  if (outcome === "cancelled") return "You decided not to make that change.";
  if (action.type === "create_transaction") return "Logged.";
  if (action.type === "edit_transaction") return "Updated.";
  return "Deleted.";
}

/** Stewi's overlay: reachable from anywhere, answers questions and proposes
 *  ledger actions, but never writes anything by itself — every proposal is a
 *  tap away from the exact confirm surface a manual log/edit already uses. */
export function Stewi({
  open,
  onClose,
  categories,
  wallets,
  txns,
  allotments,
  recurring,
  skips,
  debts,
  messages,
  onMessagesChange,
  onProposeCreate,
  onProposeReview,
  onManualEntry,
  handoff,
}: StewiProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>();
  const [localError, setLocalError] = useState<string | undefined>();
  /* What was handed off to AddSheet/TxnSheet, remembered so the eventual
     `handoff` signal can be turned into a readable transcript note. Local
     state, not lifted — it only has to survive Stewi staying open behind the
     nested sheet, never a full close. */
  const [handoffAction, setHandoffAction] = useState<
    Extract<ProposedAction, { type: "create_transaction" | "edit_transaction" | "delete_transaction" }> | undefined
  >();
  const lastHandoffToken = useRef<number | undefined>(undefined);

  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const transcript = useRef<HTMLDivElement>(null);

  const SR = useMemo(speechCtor, []);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" });
  }, [messages, pendingAction, busy]);

  useEffect(() => () => window.clearTimeout(exitTimer.current ?? undefined), []);

  useEffect(() => {
    if (!handoff || handoff.token === lastHandoffToken.current) return;
    lastHandoffToken.current = handoff.token;
    if (!handoffAction) return; // a hand-off we didn't originate — nothing to note
    onMessagesChange(recordActionOutcome(messages, formatHandoffNote(handoff.outcome, handoffAction)));
    setHandoffAction(undefined);
  }, [handoff, handoffAction, messages, onMessagesChange]);

  if (!open && !leaving) return null;

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    exitTimer.current = window.setTimeout(() => {
      setLeaving(false);
      onClose();
    }, DRAWER_OUT_MS);
  };

  async function submit(value?: string) {
    const sentence = (value ?? text).trim();
    if (!sentence || busy || pendingAction) return;
    setText("");
    setLocalError(undefined);
    setBusy(true);
    try {
      const result = await sendToStewi(messages, sentence, {
        categories,
        wallets,
        txns,
        allotments,
        recurring,
        skips,
        debts,
      });
      onMessagesChange(result.messages);
      if (result.pendingAction) setPendingAction(result.pendingAction);
      if (result.error) setLocalError(result.error);
    } finally {
      setBusy(false);
    }
  }

  const listen = () => {
    if (!SR || listening || busy) return;
    const rec = new SR();
    rec.lang = "en-PH";
    rec.interimResults = false;
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? "";
      if (said) {
        setText(said);
        void submit(said);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setListening(true);
    rec.start();
  };

  const openSheetFor = (action: ProposedAction) => {
    setPendingAction(undefined);
    if (action.type === "create_transaction") {
      setHandoffAction(action);
      onProposeCreate(action.draft);
    } else if (action.type === "edit_transaction") {
      setHandoffAction(action);
      onProposeReview(action.next);
    } else if (action.type === "delete_transaction") {
      setHandoffAction(action);
      onProposeReview(action.txn);
    }
  };

  const resolveAction = (outcome: string) => {
    onMessagesChange(recordActionOutcome(messages, outcome));
    setPendingAction(undefined);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stewi"
      className={`fixed inset-0 z-40 flex flex-col bg-clay-50 ${leaving ? "drawer-out pointer-events-none" : "drawer-in"}`}
    >
      <header className="flex items-center gap-3 border-b border-sand-300/40 px-4 py-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-500 text-clay-50"
        >
          <IconAssistant className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">Stewi</p>
          <p className="truncate text-xs text-umber-700">Ask, or tell me what happened</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="flex size-11 shrink-0 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
        >
          <IconClose className="size-5" />
        </button>
      </header>

      <div ref={transcript} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          {messages.length === 0 && (
            <div className="rounded-tile border border-dashed border-sand-300 p-6 text-center text-sm leading-relaxed text-umber-700">
              Log a transaction, ask how your month is going, approve something waiting on Plan, or
              log a payment against a debt — I'll always show you what I'm about to do before it's
              written anywhere.
            </div>
          )}

          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}

          {busy && (
            <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-raised/70 px-3 py-2 shadow-soft backdrop-blur-sm">
              <span className="size-1.5 animate-bounce rounded-full bg-umber-700 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-umber-700 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-umber-700" />
            </div>
          )}

          {localError && <p className="self-start text-sm text-accent-rust">{localError}</p>}

          {pendingAction && (
            <StewiActionCard
              action={pendingAction.action}
              categories={categories}
              wallets={wallets}
              onOpenSheet={openSheetFor}
              onDone={resolveAction}
            />
          )}
        </div>
      </div>

      <footer className="border-t border-sand-300/50 bg-clay-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {messages.length === 0 && (
            <button
              type="button"
              onClick={onManualEntry}
              className="flex min-h-11 items-center justify-center gap-1.5 self-center rounded-control px-4 font-display text-sm font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
            >
              <IconEdit aria-hidden className="size-4" />
              Or log it manually
            </button>
          )}
          <div className="flex min-h-12 items-center gap-1 rounded-control bg-raised p-1.5 shadow-soft">
            {SR && (
              <button
                type="button"
                onClick={listen}
                disabled={busy || Boolean(pendingAction)}
                aria-label={listening ? "Listening" : "Speak to Stewi"}
                aria-pressed={listening}
                className={`flex size-10 shrink-0 items-center justify-center rounded-control transition-colors duration-150 ${
                  listening ? "bg-sage-500/15 text-sage-500" : "text-umber-700 hover:bg-clay-200"
                }`}
              >
                <IconMic className={`size-5 ${listening ? "animate-pulse" : ""}`} />
              </button>
            )}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              disabled={busy || Boolean(pendingAction)}
              aria-label="Message Stewi"
              placeholder={
                pendingAction
                  ? "Resolve the proposal above to continue…"
                  : listening
                    ? "Listening…"
                    : "“200 on Jollibee” or “how's my month”"
              }
              className="min-w-0 flex-1 bg-transparent px-2 text-umber-900 placeholder:text-umber-700/50 focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !text.trim() || Boolean(pendingAction)}
              aria-label="Send"
              className="flex size-10 shrink-0 items-center justify-center rounded-control bg-sage-500 text-clay-50 transition duration-150 hover:brightness-105 active:brightness-95 disabled:opacity-40"
            >
              <IconSend className="size-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Bubble({ message }: { message: StewiMessage }) {
  if (typeof message.content !== "string") {
    // an assistant turn's tool_use/tool_result blocks are invisible plumbing;
    // only its own text (if any) is worth showing
    if (message.role !== "assistant") return null;
    const text = message.content
      .filter((b): b is StewiTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) return null;
    return (
      <div className="max-w-[85%] flex flex-col gap-1.5 self-start rounded-2xl rounded-bl-sm bg-raised/70 px-3.5 py-2 text-sm shadow-soft backdrop-blur-sm [&_ol]:list-decimal [&_ol]:space-y-0.5 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:pl-5">
        {renderMarkdown(text)}
      </div>
    );
  }

  if (message.display === "note") {
    return <p className="self-center text-xs text-umber-700">{message.content}</p>;
  }

  return (
    <p className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-sage-500/15 px-3.5 py-2 text-sm text-umber-900">
      {message.content}
    </p>
  );
}

/** A minimal, dependency-free markdown-to-React renderer for Stewi's own
 *  replies — just the handful of things a short chat answer actually uses:
 *  paragraphs, bullet/numbered lists, bold, and inline code. Builds React
 *  elements directly rather than going through `dangerouslySetInnerHTML`, so
 *  there's nothing here for a reply to inject — plain text stays plain text,
 *  React escapes it the same as any other string child. */
function renderMarkdown(text: string): React.ReactNode {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const items = list.items;
    const ordered = list.ordered;
    const ListTag = ordered ? "ol" : "ul";
    blocks.push(
      <ListTag key={blocks.length}>
        {items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ListTag>,
    );
    list = null;
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const bullet = /^[-*]\s+(.*)/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)/.exec(line);

    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
    } else {
      flushList();
      if (line !== "") blocks.push(<p key={blocks.length}>{renderInline(line)}</p>);
    }
  }
  flushList();
  return blocks;
}

/** `**bold**` and `` `code` `` within one line/list item — the two marks an
 *  answer like "you're **under** by ₱200" or "set `Food` as the category"
 *  actually needs. Anything else passes through as plain text. */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|`(.+?)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) parts.push(<strong key={match.index}>{match[1]}</strong>);
    else if (match[2] !== undefined) {
      parts.push(
        <code key={match.index} className="rounded bg-clay-200 px-1 py-0.5 text-[0.85em]">
          {match[2]}
        </code>,
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
