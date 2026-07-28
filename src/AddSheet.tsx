import { useEffect, useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";
import { Select } from "@ui/Select";

import { CategoryIcon, WalletIcon } from "./Amount";
import { CategoryPicker } from "./CategoryPicker";
import {
  glyph,
  IconApprove,
  IconBack,
  IconBrowse,
  IconClose,
  IconForward,
  IconIn,
  IconOut,
  IconTransfer,
  type Icon,
} from "./icons";
import {
  centsToEntry,
  findCategory,
  formatEntry,
  formatMoney,
  glyphOf,
  parentOf,
  parseAmount,
  pressKey,
  topCategories,
  type Category,
  type Txn,
  type TxnKind,
  type Wallet,
} from "./money";
import { Numpad } from "./Numpad";
import type { AddDraft } from "./parse";
import { addTxn, lastWalletId } from "./store";

export type { AddDraft };

/* The kind toggle carries a glyph as well as a word. Three labels in a row are
   easy to misread at speed — "Spent" and "Received" are the same shape and
   length at a glance — where an arrow leaving, an arrow arriving and a pair
   swapping are told apart without reading anything. */
const kinds: { value: TxnKind; label: string; icon: Icon }[] = [
  { value: "expense", label: "Spent", icon: IconOut },
  { value: "income", label: "Received", icon: IconIn },
  { value: "transfer", label: "Moved", icon: IconTransfer },
];

/* Icons for the review panel's rows, so each line is identifiable before it is
   read — the point of the panel is to be scanned, not studied. */
const IconAmount = glyph("coins").line;
const IconNote = glyph("quill").line;
const IconWallet = glyph("wallet").line;
const IconCategory = glyph("tag").line;

/** Six fits two columns without scrolling on the shortest phone, and past six
 *  the list stops being "the ones I always use" and becomes browsing — which is
 *  what the full picker is for. */
const QUICK_PICKS = 6;

/** The panels, in order, for each kind. Both flows are four wide so the progress
 *  dots read the same however you're logging; only the middle two panels differ,
 *  because a transfer has a route where a spend has a category. */
type Step = "amount" | "category" | "route" | "details" | "note" | "review";
const flowFor = (kind: TxnKind): Step[] =>
  kind === "transfer"
    ? ["amount", "route", "note", "review"]
    : ["amount", "category", "details", "review"];

interface AddSheetProps {
  /** The kind to open on, or null when shut. Doubling as the open flag keeps the
   *  draft unmounted between uses, so every session starts blank with no reset
   *  logic to get wrong. */
  kind: TxnKind | null;
  categories: Category[];
  wallets: Wallet[];
  /** Read only, to rank the quick picks by what actually gets logged. */
  txns: Txn[];
  /** Optional pre-fill. When set, the wizard seeds from it and skips ahead to the
   *  first thing still missing (often straight to review). */
  draft?: AddDraft;
  onClose: () => void;
  /** The id of what was just written, so Home can mark the new row. */
  onLogged: (id: string) => void;
}

export function AddSheet({ kind, categories, wallets, txns, draft, onClose, onLogged }: AddSheetProps) {
  if (!kind) return null;
  return (
    <AddComposer
      initialKind={draft?.kind ?? kind}
      categories={categories}
      wallets={wallets}
      txns={txns}
      draft={draft}
      onClose={onClose}
      onLogged={onLogged}
    />
  );
}

/** Which panel to open on for a given draft: the first one whose field isn't
 *  already satisfied. A complete draft goes straight to review; a bare or
 *  unresolved one falls back to the step that collects what's missing. */
function initialStep(
  draft: AddDraft | undefined,
  initialKind: TxnKind,
  categories: Category[],
  wallets: Wallet[],
): number {
  if (!draft) return 0;
  const kind = draft.kind ?? initialKind;
  const flow = flowFor(kind);
  if (!(draft.amountCents != null && draft.amountCents > 0)) return 0;
  const exists = (id: string | undefined) => wallets.some((w) => w.id === id);
  const whatOk =
    kind === "transfer"
      ? exists(draft.walletId) && exists(draft.toWalletId) && draft.walletId !== draft.toWalletId
      : Boolean(findCategory(categories, draft.categoryId));
  if (!whatOk) return 1;
  return flow.length - 1; // everything resolves → review, one tap from filed
}

/** Logging as a short wizard rather than one dense screen.
 *
 *  Everything a transaction needs is still here — amount, kind, category (or
 *  route), wallet, note — but shown one decision at a time so a hurried log
 *  never faces a wall of controls. The trade for that calm is a Save step at the
 *  end: unlike the old tap-a-category-to-file sheet, nothing is written until
 *  you confirm it on the review panel. */
function AddComposer({
  initialKind,
  categories,
  wallets,
  txns,
  draft,
  onClose,
  onLogged,
}: Omit<AddSheetProps, "kind"> & { initialKind: TxnKind }) {
  /* Seeded once from the draft (if any) via lazy initialisers — the composer is
     mounted fresh on every open, so this needs no reset when the draft changes.
     Draft ids are validated against the live lists here, not trusted: a stale or
     hallucinated category/wallet id simply falls back rather than filing wrong. */
  const [kind, setKind] = useState<TxnKind>(initialKind);
  const [entry, setEntry] = useState(() =>
    draft?.amountCents != null ? centsToEntry(draft.amountCents) : "",
  );
  const [note, setNote] = useState(() => draft?.note ?? "");
  const [walletId, setWalletId] = useState(
    () => wallets.find((w) => w.id === draft?.walletId)?.id ?? lastWalletId(wallets) ?? "",
  );
  const [toWalletId, setToWalletId] = useState(
    () => wallets.find((w) => w.id === draft?.toWalletId)?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(
    () => findCategory(categories, draft?.categoryId)?.id,
  );
  const [step, setStep] = useState(() => initialStep(draft, initialKind, categories, wallets));
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const amountCents = parseAmount(entry);
  const transfer = kind === "transfer";
  const sameWallet = Boolean(walletId && walletId === toWalletId);
  const canTransfer = amountCents !== null && Boolean(walletId) && Boolean(toWalletId) && !sameWallet;

  const flow = flowFor(kind);
  const current = flow[step];
  const type = (key: string) => setEntry((current) => pressKey(current, key));

  /* Whether the current panel is complete enough to move on. The last panel is
     review, which saves rather than advances, so it never gates. */
  const canAdvance =
    current === "amount"
      ? amountCents !== null
      : current === "category"
        ? Boolean(categoryId)
        : current === "route"
          ? canTransfer
          : true;

  const goBack = () => (step === 0 ? onClose() : setStep((s) => s - 1));
  const goNext = () => {
    if (canAdvance && step < flow.length - 1) setStep((s) => s + 1);
  };

  /* Switching kind rewrites the middle of the flow, so the choices those panels
     collected no longer mean anything — drop them and start the wizard over. */
  const changeKind = (next: TxnKind) => {
    setKind(next);
    setCategoryId(undefined);
    setToWalletId("");
    setStep(0);
  };

  /* Picking a category is a selection now, not the save — so it carries you on
     to the details panel instead of filing the transaction. */
  const chooseCategory = (id: string) => {
    setCategoryId(id);
    setPicking(false);
    setStep((s) => s + 1);
  };

  /* A hardware keyboard should drive the amount panel the same way the keypad
     does — this is the desktop path, and typing is only meaningful while the
     amount is on screen. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picking) return; // the picker's own Escape handling takes over
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLSelectElement) return;
      if (current !== "amount") return;
      if (/^[0-9]$/.test(e.key)) type(e.key);
      else if (e.key === ".") type(".");
      else if (e.key === "Backspace") type("del");
      else if (e.key === "Enter") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function save() {
    if (busy) return;
    if (transfer ? !canTransfer : amountCents === null) return;
    setBusy(true);

    const base = {
      id: crypto.randomUUID(),
      amountCents: amountCents as number,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    try {
      await addTxn(
        transfer
          ? { ...base, kind: "transfer", walletId, toWalletId }
          : { ...base, kind, walletId: walletId || undefined, categoryId },
      );
      onLogged(base.id);
      onClose();
    } catch (err: unknown) {
      // the wizard stays open with the draft intact rather than swallowing it
      console.error("manna: could not log transaction", err);
      setBusy(false);
    }
  }

  const picks = transfer ? [] : topCategories(txns, categories, kind, QUICK_PICKS);
  const chosenKind = kinds.find((k) => k.value === kind);
  const kindLabel = chosenKind?.label ?? "";
  const KindIcon = chosenKind?.icon ?? IconOut;
  const walletName = (id: string) => wallets.find((w) => w.id === id)?.name ?? "—";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Log something"
      className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-clay-50"
    >
      <header className="flex items-center gap-3 px-4 pt-4">
        <button
          type="button"
          onClick={goBack}
          aria-label={step === 0 ? "Close" : "Back"}
          className="flex size-11 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
        >
          {step === 0 ? <IconClose className="size-5" /> : <IconBack className="size-5" />}
        </button>

        <Progress total={flow.length} current={step} />

        {/* the running amount rides along from the second panel on, so you can
            always see what you're committing without stepping back */}
        <span className="w-16 text-right font-display font-semibold tabular-nums text-umber-700">
          {step > 0 && amountCents !== null ? formatMoney(amountCents) : ""}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        {current === "amount" && (
          <AmountPanel
            entry={entry}
            kind={kind}
            onKind={changeKind}
            note={note}
            onNote={setNote}
          />
        )}

        {current === "category" && (
          <section>
            <Heading>What was it for?</Heading>
            {/* Icon first and large: this is the panel the five-second bar is
                won or lost on, and a tinted shape is recognised in peripheral
                vision while a word still has to be read. */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {picks.map((pick) => (
                <button
                  key={pick.categoryId}
                  type="button"
                  onClick={() => chooseCategory(pick.categoryId)}
                  aria-pressed={categoryId === pick.categoryId}
                  className={`flex min-h-14 items-center gap-3 rounded-tile px-3 text-left shadow-soft transition duration-150 active:brightness-95 ${
                    categoryId === pick.categoryId
                      ? "bg-sage-500/15 ring-1 ring-sage-500"
                      : "bg-clay-100 hover:bg-clay-200"
                  }`}
                >
                  <CategoryIcon
                    accent={pick.accent}
                    name={pick.name}
                    inherit={pick.inheritIcon}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{pick.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-tile border border-dashed border-sand-300 font-display text-sm font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-100 hover:text-umber-900"
              >
                <IconBrowse aria-hidden className="size-4" />
                All categories…
              </button>
            </div>
          </section>
        )}

        {current === "route" && (
          <section className="flex flex-col gap-2">
            <Heading>Move between your wallets</Heading>
            {/* The wallet's own glyph sits beside each picker and follows the
                selection, so the route reads as a picture before the two names
                are compared. */}
            <Field icon={<WalletIcon name={walletName(walletId)} />}>
              <Select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                aria-label="From wallet"
              >
                <option value="">From…</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-center py-0.5 text-umber-700">
              <IconTransfer aria-hidden className="size-4 rotate-90" />
            </div>
            <Field icon={<WalletIcon name={walletName(toWalletId)} />}>
              <Select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                aria-label="To wallet"
              >
                <option value="">To…</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            {sameWallet && (
              <p className="text-sm text-umber-700">A transfer needs two different wallets.</p>
            )}
            <p className="pt-1 text-sm text-umber-700">
              Moving money to savings is not spending — it stays out of your category totals.
            </p>
          </section>
        )}

        {current === "details" && (
          <section className="flex flex-col gap-2">
            <Heading>Wallet &amp; note</Heading>
            <Field icon={<WalletIcon name={walletName(walletId)} />}>
              <Select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                aria-label="Wallet"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field icon={<IconNote aria-hidden className="size-5" />} className="mt-1">
              <Input
                placeholder="Note — merchant, detail (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                aria-label="Note"
                maxLength={60}
              />
            </Field>
          </section>
        )}

        {current === "note" && (
          <section className="flex flex-col gap-2">
            <Heading>Add a note?</Heading>
            <Field icon={<IconNote aria-hidden className="size-5" />}>
              <Input
                placeholder="Note — reason for the move (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                aria-label="Note"
                maxLength={60}
              />
            </Field>
            <p className="flex items-center gap-2 pt-1 text-sm text-umber-700">
              <WalletIcon name={walletName(walletId)} className="size-4" />
              {walletName(walletId)}
              <IconTransfer aria-hidden className="size-3.5" />
              <WalletIcon name={walletName(toWalletId)} className="size-4" />
              {walletName(toWalletId)}
            </p>
          </section>
        )}

        {current === "review" && (
          <section>
            <Heading>Ready to log</Heading>
            <div className="mt-1 overflow-hidden rounded-tile bg-clay-100 shadow-soft">
              <ReviewRow icon={IconAmount} label="Amount" onEdit={() => setStep(0)}>
                <span className="font-display font-semibold tabular-nums text-umber-900">
                  {amountCents !== null ? formatMoney(amountCents) : "—"}
                </span>
                <span className="ml-2 flex items-center gap-1 text-sm text-umber-700">
                  <KindIcon aria-hidden className="size-3.5" />
                  {kindLabel}
                </span>
              </ReviewRow>

              {transfer ? (
                <ReviewRow icon={IconTransfer} label="Route" onEdit={() => setStep(1)}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon accent="slate" transfer />
                    <span className="truncate">
                      {walletName(walletId)} → {walletName(toWalletId)}
                    </span>
                  </span>
                </ReviewRow>
              ) : (
                <>
                  <ReviewRow icon={IconCategory} label="Category" onEdit={() => setStep(1)}>
                    <CategorySummary categories={categories} categoryId={categoryId} />
                  </ReviewRow>
                  <ReviewRow icon={IconWallet} label="Wallet" onEdit={() => setStep(2)}>
                    <span className="flex items-center gap-2">
                      <WalletIcon name={walletName(walletId)} className="size-4" />
                      {walletName(walletId)}
                    </span>
                  </ReviewRow>
                </>
              )}

              <ReviewRow icon={IconNote} label="Note" onEdit={() => setStep(2)}>
                {note.trim() ? (
                  note.trim()
                ) : (
                  <span className="text-umber-700">None</span>
                )}
              </ReviewRow>
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-sand-300/50 bg-clay-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {current === "amount" ? (
          <>
            <Button onClick={goNext} disabled={!canAdvance} className="mb-2 w-full gap-1.5">
              Next
              <IconForward aria-hidden className="size-4" />
            </Button>
            <Numpad onPress={type} />
          </>
        ) : current === "review" ? (
          <Button
            onClick={() => void save()}
            disabled={busy}
            className="w-full gap-2 tabular-nums"
          >
            <IconApprove aria-hidden className="size-4" />
            {busy ? "Saving…" : `Log ${amountCents !== null ? formatMoney(amountCents) : ""}`.trim()}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canAdvance} className="w-full gap-1.5">
            Next
            <IconForward aria-hidden className="size-4" />
          </Button>
        )}
      </footer>

      <CategoryPicker
        open={picking}
        categories={categories}
        forKind={kind === "income" ? "income" : "expense"}
        amountLabel={amountCents !== null ? formatMoney(amountCents) : "₱0.00"}
        onPick={chooseCategory}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

/** The amount panel: the keypad-driven figure with the kind toggle and note
 *  directly under it, since those are the two things you may want to change
 *  before you even think about a category. */
function AmountPanel({
  entry,
  kind,
  onKind,
  note,
  onNote,
}: {
  entry: string;
  kind: TxnKind;
  onKind: (kind: TxnKind) => void;
  note: string;
  onNote: (note: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="pt-4 text-center font-display font-semibold leading-none tabular-nums">
        <span className="mr-1 text-2xl text-umber-700">₱</span>
        <span className={`text-5xl ${entry ? "text-umber-900" : "text-umber-700/40"}`}>
          {formatEntry(entry)}
        </span>
      </p>

      <div className="flex rounded-control bg-clay-200 p-1">
        {kinds.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => onKind(k.value)}
            aria-pressed={kind === k.value}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control font-display text-sm font-semibold transition-colors duration-150 ${
              kind === k.value ? "bg-raised text-umber-900 shadow-soft" : "text-umber-700"
            }`}
          >
            <k.icon aria-hidden className="size-4" />
            {k.label}
          </button>
        ))}
      </div>

      <Field icon={<IconNote aria-hidden className="size-5" />}>
        <Input
          placeholder="Note — merchant, detail (optional)"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Note"
          maxLength={60}
        />
      </Field>
    </div>
  );
}

/** A control with a glyph pinned inside its left edge. The design system's Input
 *  and Select are plain boxes on purpose, so rather than forking them the icon
 *  is overlaid and the box padded to clear it — which keeps every field on this
 *  sheet identifiable at a glance without touching Tiswell's components. */
function Field({
  icon,
  className = "",
  children,
}: {
  icon: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-umber-700"
      >
        {icon}
      </span>
      {/* the child is the real control; padding-left clears the glyph */}
      <div className="[&_input]:pl-12 [&_select]:pl-12">{children}</div>
    </div>
  );
}

/** Dots, one per panel, filled up to where you are. A count rather than labels:
 *  the panel already says what it wants, so this only has to show how far along
 *  the wizard you are. */
function Progress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-control transition-all duration-150 ${
            i === current
              ? "w-5 bg-sage-500"
              : i < current
                ? "w-1.5 bg-sage-500"
                : "w-1.5 bg-sand-300"
          }`}
        />
      ))}
    </div>
  );
}

/** One line on the review panel, tappable to jump straight back to the step
 *  that set it — the fastest way to fix a wrong wallet or amount. */
function ReviewRow({
  icon: Glyph,
  label,
  onEdit,
  children,
}: {
  icon: Icon;
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-3 border-b border-sand-300/50 px-4 py-3.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-clay-200"
    >
      <span className="flex w-24 shrink-0 items-center gap-2 font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
        <Glyph aria-hidden className="size-4" />
        {label}
      </span>
      <span className="flex min-w-0 flex-1 items-center truncate">{children}</span>
    </button>
  );
}

/** The chosen category on the review panel, showing its parent as context when
 *  the pick was a subcategory — the same "Food · Coffee" reading a logged row
 *  gets. */
function CategorySummary({
  categories,
  categoryId,
}: {
  categories: Category[];
  categoryId: string | undefined;
}) {
  const category = findCategory(categories, categoryId);
  const parent = parentOf(categories, categoryId);
  const { own, inherited } = glyphOf(categories, categoryId);
  const parentName = parent && parent.id !== category?.id ? parent.name : undefined;
  return (
    <span className="flex items-center gap-2">
      <CategoryIcon
        accent={parent?.accent ?? "slate"}
        name={category?.name}
        icon={own}
        inherit={inherited}
        className="size-8"
        glyphClassName="size-4"
      />
      <span className="min-w-0 truncate">
        {category?.name ?? "Uncategorised"}
        {parentName && <span className="text-umber-700"> · {parentName}</span>}
      </span>
    </span>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pb-1 text-center font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
      {children}
    </h2>
  );
}
