import { useEffect, useRef, useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";

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
import { WalletPicker } from "./WalletPicker";

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

/** The selected segment's own colour, not a generic highlight — Spent and
 *  Received borrow the same rust and sage an amount takes everywhere else in
 *  the app (Wallets' owed panel, Home's pace line, a transaction row). Moved
 *  keeps the slate a transfer's tile already carries in the review panel below
 *  — neutral by the app's own rule that a transfer is not spending, but still
 *  its own colour rather than plain grey. */
const kindTone: Record<TxnKind, string> = {
  expense: "bg-accent-rust/15 text-accent-rust",
  income: "bg-sage-500/15 text-sage-500",
  transfer: "bg-accent-slate/15 text-accent-slate",
};

/* Icons for the review panel's rows, so each line is identifiable before it is
   read — the point of the panel is to be scanned, not studied. */
const IconAmount = glyph("coins").line;
const IconNote = glyph("quill").line;
const IconWallet = glyph("wallet").line;
const IconCategory = glyph("tag").line;

/** Past six, the grid needs the panel's own scroll — the panel already scrolls
 *  for a long note or a long review, so that's not a new behaviour, just this
 *  step using it too. Twelve keeps "your top picks" reading as a ranked list of
 *  actual habits rather than sliding into "browse everything", which is still
 *  what "All categories…" is for underneath it. */
const QUICK_PICKS = 12;

/** How long the drawer takes to slide back down. Must match `.drawer-out` in
 *  `app.css` — the sheet unmounts on this timer, and unmounting early cuts the
 *  animation off mid-slide. */
const DRAWER_OUT_MS = 200;

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
  /* Which wallet field a tap on a WalletField opened the picker for — one
     shared sheet instance serves From, To and the plain Wallet field, since
     only one of them can be open at a time. */
  const [pickingWallet, setPickingWallet] = useState<"from" | "to" | "wallet" | null>(null);
  const [busy, setBusy] = useState(false);
  /* Which way the last step change went, so the incoming panel enters from the
     side you left. 0 is the first panel of the session: it arrives with the
     drawer itself, and animating it separately would be two slides at once. */
  const [dir, setDir] = useState(0);
  /* Set while the drawer plays its way out. The sheet stays mounted for that
     beat, which is the only reason there is a closing animation at all — the
     parent drops it the moment `onClose` runs. */
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const panes = useRef<HTMLDivElement>(null);

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

  /* Whether there is anywhere to go. Review is the last panel and saves rather
     than advances, so `canAdvance` alone would let a forward swipe walk off the
     end of the flow. */
  const canNext = canAdvance && step < flow.length - 1;
  const canPrev = step > 0;

  /* Every step change goes through here, so the direction is recorded once and
     the panel animation never disagrees with the way you actually moved —
     including the jumps back from the review rows. */
  const go = (next: number) => {
    if (next < 0 || next > flow.length - 1 || next === step) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  /* Close the drawer by playing it out first. Guarded because the exit can be
     triggered from four places (Back, Escape, a swipe, a finished save) and a
     second one mid-slide would stack another timer on the same unmount. */
  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    exitTimer.current = window.setTimeout(onClose, DRAWER_OUT_MS);
  };

  const goBack = () => (step === 0 ? dismiss() : go(step - 1));
  const goNext = () => {
    if (canNext) go(step + 1);
  };

  const swipe = useStepSwipe({ canNext, canPrev, onNext: goNext, onPrev: goBack });

  /* A forward drag pushing against a panel that isn't satisfied yet — no
     amount, no category, an incomplete transfer. Review is excluded: at the
     end of the flow a forward swipe has nothing left to reach, which is a
     different situation from something still being missing. */
  const blockedForward = swipe.dragging && swipe.dx < 0 && !canNext && current !== "review";
  /* How hard the drag is pulling against that resistance, 0 to 1 — the fill
     the gate bar shows. 40px of (already quartered) travel is a firm, deliberate
     pull without asking for an unreasonable reach. */
  const gatePull = blockedForward ? Math.min(1, Math.abs(swipe.dx) / 40) : 0;
  const gateMessage =
    current === "amount"
      ? "Enter an amount to continue"
      : current === "category"
        ? "Choose a category to continue"
        : current === "route"
          ? "Choose two different wallets"
          : "";

  /* Picking a wallet is a selection, not a save, so it just closes the sheet
     and lands the id on whichever field opened it. */
  const pickWallet = (id: string) => {
    if (pickingWallet === "to") setToWalletId(id);
    else setWalletId(id);
    setPickingWallet(null);
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
    go(step + 1);
  };

  /* A new panel starts at the top. The scroller is the frame, not the panel, so
     it keeps whatever offset the last step was left at otherwise — which on a
     short panel after a scrolled one means opening on blank space. */
  useEffect(() => {
    panes.current?.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => () => window.clearTimeout(exitTimer.current ?? undefined), []);

  /* A hardware keyboard should drive the amount panel the same way the keypad
     does — this is the desktop path, and typing is only meaningful while the
     amount is on screen. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picking) return; // the picker's own Escape handling takes over
      if (e.key === "Escape") {
        dismiss();
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
      dismiss();
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
      /* pointer-events off on the way out: the drawer is still on screen for
         that beat, and a tap landing on a control that is sliding away would
         act on a sheet the user has already dismissed */
      className={`fixed inset-0 z-50 flex flex-col bg-clay-50 ${
        leaving ? "drawer-out pointer-events-none" : "drawer-in"
      }`}
    >
      {/* relative so the gate message below can overlay the header's own
          space on release rather than pushing it — nothing here ever grows */}
      <header className="relative flex items-center gap-3 px-4 pt-4">
        <button
          type="button"
          onClick={goBack}
          aria-label={step === 0 ? "Close" : "Back"}
          className="flex size-11 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
        >
          {step === 0 ? <IconClose className="size-5" /> : <IconBack className="size-5" />}
        </button>

        <Progress
          total={flow.length}
          current={step}
          blocked={blockedForward}
          pull={gatePull}
        />

        {/* the running amount rides along from the second panel on, so you can
            always see what you're committing without stepping back */}
        <span className="w-16 text-right font-display font-semibold tabular-nums text-umber-700">
          {step > 0 && amountCents !== null ? formatMoney(amountCents) : ""}
        </span>

        {/* Absolutely positioned on purpose: it names what a forward swipe is
            pushing against, right under the stepper that's showing it — but as
            an overlay, not a row in the flow, so nothing above or below it
            ever shifts to make room. It fades over the top of the content
            instead. */}
        <p
          aria-live="polite"
          className={`pointer-events-none absolute inset-x-4 top-full z-10 pt-1 text-center text-xs font-semibold text-accent-ochre transition-opacity duration-150 ${
            blockedForward ? "opacity-100" : "opacity-0"
          }`}
        >
          {gateMessage}
        </p>
      </header>

      {/* touch-pan-y hands the browser the vertical axis and keeps the
          horizontal one, so a panel still scrolls while a sideways drag reaches
          us intact instead of being eaten as a scroll. overflow-x-hidden is not
          decoration: a scroller left at `visible` on the other axis is promoted
          to `auto`, and the dragged panel would then be something you could
          scroll sideways to. overscroll-y-contain stops an overscroll at the top
          of this list from chaining past the sheet to the page underneath —
          without it, dragging down on an already-scrolled-to-top panel could
          still end up triggering the browser's own pull-to-refresh. */}
      <div
        ref={panes}
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pt-4"
        {...swipe.handlers}
      >
        {/* Keyed by panel so each step is a fresh element and plays its entry.
            The drag offset rides on the same element, which is what makes a
            flick continuous: the panel you pushed is replaced at the offset it
            was pushed to, and the new one comes in from the side. */}
        <div
          key={current}
          className={dir > 0 ? "panel-next" : dir < 0 ? "panel-prev" : undefined}
          style={{
            transform: `translateX(${swipe.dx}px)`,
            transition: swipe.dragging ? "none" : "transform 200ms ease-out",
            opacity: 1 - Math.min(Math.abs(swipe.dx) / 420, 0.3),
          }}
        >
          {current === "amount" && <AmountPanel entry={entry} note={note} onNote={setNote} />}

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
              <WalletField
                label="From"
                wallet={wallets.find((w) => w.id === walletId)}
                onOpen={() => setPickingWallet("from")}
              />
              <div className="flex justify-center py-0.5 text-umber-700">
                <IconTransfer aria-hidden className="size-4 rotate-90" />
              </div>
              <WalletField
                label="To"
                wallet={wallets.find((w) => w.id === toWalletId)}
                onOpen={() => setPickingWallet("to")}
              />
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
              <WalletField
                label="Wallet"
                wallet={wallets.find((w) => w.id === walletId)}
                onOpen={() => setPickingWallet("wallet")}
              />
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
                <ReviewRow icon={IconAmount} label="Amount" onEdit={() => go(0)}>
                  <span className="font-display font-semibold tabular-nums text-umber-900">
                    {amountCents !== null ? formatMoney(amountCents) : "—"}
                  </span>
                  <span className="ml-2 flex items-center gap-1 text-sm text-umber-700">
                    <KindIcon aria-hidden className="size-3.5" />
                    {kindLabel}
                  </span>
                </ReviewRow>

                {transfer ? (
                  <ReviewRow icon={IconTransfer} label="Route" onEdit={() => go(1)}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon accent="slate" transfer />
                      <span className="truncate">
                        {walletName(walletId)} → {walletName(toWalletId)}
                      </span>
                    </span>
                  </ReviewRow>
                ) : (
                  <>
                    <ReviewRow icon={IconCategory} label="Category" onEdit={() => go(1)}>
                      <CategorySummary categories={categories} categoryId={categoryId} />
                    </ReviewRow>
                    <ReviewRow icon={IconWallet} label="Wallet" onEdit={() => go(2)}>
                      <span className="flex items-center gap-2">
                        <WalletIcon name={walletName(walletId)} className="size-4" />
                        {walletName(walletId)}
                      </span>
                    </ReviewRow>
                  </>
                )}

                <ReviewRow icon={IconNote} label="Note" onEdit={() => go(2)}>
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
      </div>

      {/* Carries the same swipe handlers as the panel above: the numpad is
          the biggest tap target on the amount step, and a swipe that stops
          working the moment your thumb crosses onto it would feel like the
          gesture was never really there. A tap still reaches the numpad's own
          buttons untouched — the handlers only turn into a drag past the same
          slop threshold that guards every other pointer down on the sheet.
          touch-pan-y matters here as much as it does on the panel above: without
          it, a mobile browser can decide a drag starting on a button is its own
          gesture to handle and never hand our JS the pointermove events that
          would have turned it into a swipe. */}
      <footer
        className="touch-pan-y border-t border-sand-300/50 bg-clay-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        {...swipe.handlers}
      >
        {current === "amount" ? (
          <>
            <div className="mb-2 flex rounded-control bg-clay-200 p-1">
              {kinds.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => changeKind(k.value)}
                  aria-pressed={kind === k.value}
                  className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control font-display text-sm font-semibold transition-colors duration-150 ${
                    kind === k.value ? `${kindTone[k.value]} shadow-soft` : "text-umber-700"
                  }`}
                >
                  <k.icon aria-hidden className="size-4" />
                  {k.label}
                </button>
              ))}
            </div>
            <div className="mb-2">
              <Numpad onPress={type} />
            </div>
            <Button onClick={goNext} disabled={!canAdvance} className="w-full gap-1.5">
              Next
              <IconForward aria-hidden className="size-4" />
            </Button>
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

      <WalletPicker
        open={pickingWallet !== null}
        title={
          pickingWallet === "from" ? "From wallet" : pickingWallet === "to" ? "To wallet" : "Wallet"
        }
        wallets={wallets}
        txns={txns}
        selectedId={pickingWallet === "to" ? toWalletId : walletId}
        excludeId={
          pickingWallet === "from" ? toWalletId : pickingWallet === "to" ? walletId : undefined
        }
        onPick={pickWallet}
        onClose={() => setPickingWallet(null)}
      />
    </div>
  );
}

/** Travel before a drag is read as a swipe at all — under this it is a tap that
 *  wobbled, and a category tile must still take it as a tap. */
const SWIPE_SLOP = 10;
/** Travel that turns the step over on release. Deliberately shorter than the
 *  slop-plus-a-bit a hesitant drag produces, so a flick works, but long enough
 *  that a thumb sliding down the category grid never files anything. */
const SWIPE_COMMIT = 56;
/** Ceiling on the offset. Past this the panel is just torn away from the header
 *  and footer, which stay put. */
const SWIPE_MAX = 140;

/** Swiping the panel to move a step.
 *
 *  Pointer events rather than touch, so the same gesture works with a trackpad
 *  drag on the desktop, and so `setPointerCapture` can be used: once the axis is
 *  known to be horizontal the capture takes the pointer off whatever button it
 *  started on, which is what stops a swipe begun on a category tile from also
 *  selecting that category on release.
 *
 *  The axis is decided once, in the first few pixels, and never revisited — a
 *  gesture that starts as a scroll stays a scroll however far sideways it
 *  wanders, which is the difference between a list that feels solid and one
 *  that changes step while you are reading it. */
function useStepSwipe({
  canNext,
  canPrev,
  onNext,
  onPrev,
}: {
  canNext: boolean;
  canPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  /* The live gesture. In a ref, not state: `pointerup` needs the final offset,
     and reading it from state there would be reading the previous render. */
  const drag = useRef<{ x: number; y: number; axis: "" | "x" | "y"; dx: number } | null>(null);

  const settle = (commit: boolean) => {
    const gesture = drag.current;
    drag.current = null;
    // a tap or a scroll: nothing was offset, so there is nothing to put back
    if (!gesture || gesture.axis !== "x") return;
    setDragging(false);
    setDx(0);
    if (!commit) return;
    if (gesture.dx <= -SWIPE_COMMIT && canNext) onNext();
    else if (gesture.dx >= SWIPE_COMMIT && canPrev) onPrev();
  };

  return {
    dx,
    dragging,
    handlers: {
      onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        if (drag.current) return; // the first finger down owns the gesture
        // fields keep their own drag: selecting inside a note is how you fix one
        if ((e.target as HTMLElement).closest("input, select, textarea")) return;
        drag.current = { x: e.clientX, y: e.clientY, axis: "", dx: 0 };
      },
      onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
        const gesture = drag.current;
        if (!gesture) return;
        const moveX = e.clientX - gesture.x;
        const moveY = e.clientY - gesture.y;

        if (gesture.axis === "") {
          if (Math.abs(moveX) < SWIPE_SLOP && Math.abs(moveY) < SWIPE_SLOP) return;
          gesture.axis = Math.abs(moveX) > Math.abs(moveY) ? "x" : "y";
          if (gesture.axis !== "x") return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }
        if (gesture.axis !== "x") return;

        /* Resistance where there is nothing to reach — the end of the flow, the
           first panel, an amount not yet entered. The panel still gives, because
           a control that does not move at all reads as broken rather than as
           refused, but it gives a quarter as much. */
        const open = moveX < 0 ? canNext : canPrev;
        const travel = open ? moveX : moveX / 4;
        gesture.dx = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, travel));
        setDx(gesture.dx);
      },
      onPointerUp() {
        settle(true);
      },
      onPointerCancel() {
        settle(false);
      },
    },
  };
}

/** The amount panel: the keypad-driven figure with the note directly under it.
 *  The kind toggle used to live here too, but it now sits in the footer, right
 *  above the numpad it governs — see the "amount" branch of the footer below. */
function AmountPanel({
  entry,
  note,
  onNote,
}: {
  entry: string;
  note: string;
  onNote: (note: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* The numpad has no input element to focus, so nothing marks it as the
          thing your taps are currently feeding — this caret stands in for
          that, blinking the way a text cursor says "typing here" without a
          text field underneath it. */}
      <p className="flex items-center justify-center gap-0.5 pt-4 font-display font-semibold leading-none tabular-nums">
        <span className="text-2xl text-umber-700">₱</span>
        <span className={`text-5xl ${entry ? "text-umber-900" : "text-umber-700/40"}`}>
          {formatEntry(entry)}
        </span>
        <span aria-hidden className="amount-caret h-9 w-0.75 shrink-0 rounded-full bg-sage-500" />
      </p>

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

/** A wallet field, standing in for a native `<select>`: the glyph, the wallet's
 *  own name, and a chevron, opening the sheet-based `WalletPicker` on tap
 *  rather than the OS's own dropdown chrome. Used for From, To, and the plain
 *  Wallet field alike — which one it is lives in the label above the value,
 *  not in the component. */
function WalletField({
  label,
  wallet,
  onOpen,
}: {
  label: string;
  wallet: Wallet | undefined;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-14 w-full items-center gap-3 rounded-tile bg-clay-100 px-4 text-left shadow-soft transition duration-150 hover:bg-clay-200 active:brightness-95"
    >
      <WalletIcon name={wallet?.name} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
          {label}
        </span>
        <span className={`block truncate ${wallet ? "text-umber-900" : "text-umber-700/60"}`}>
          {wallet?.name ?? "Choose…"}
        </span>
      </span>
      <IconForward aria-hidden className="size-4 shrink-0 text-umber-700" />
    </button>
  );
}

/** Dots, one per panel, filled up to where you are. A count rather than labels:
 *  the panel already says what it wants, so this only has to show how far along
 *  the wizard you are.
 *
 *  `blocked`/`pull` carry the same forward-swipe resistance the panel below is
 *  showing, onto the current dot's own fixed footprint — a `scaleX` fill
 *  inside it, not a change to its width, so the warning rides on the stepper
 *  without the stepper (or anything around it) changing size to show it. */
function Progress({
  total,
  current,
  blocked = false,
  pull = 0,
}: {
  total: number;
  current: number;
  blocked?: boolean;
  pull?: number;
}) {
  return (
    <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === current;
        return (
          <span
            key={i}
            className={`relative h-1.5 overflow-hidden rounded-control transition-all duration-150 ${
              isCurrent
                ? blocked
                  ? "w-5 bg-sand-300"
                  : "w-5 bg-sage-500"
                : i < current
                  ? "w-1.5 bg-sage-500"
                  : "w-1.5 bg-sand-300"
            }`}
          >
            {isCurrent && blocked && (
              <span
                className="absolute inset-y-0 left-0 w-full origin-left rounded-control bg-accent-ochre transition-transform duration-75"
                style={{ transform: `scaleX(${pull})` }}
              />
            )}
          </span>
        );
      })}
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
