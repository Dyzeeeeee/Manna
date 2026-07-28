import { useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";

import { accentBg, Amount, CategoryIcon } from "./Amount";
import {
  glyph,
  IconAdd,
  IconApprove,
  IconClose,
  IconForward,
  IconSettings,
  IconSkip,
  type Icon,
} from "./icons";
import {
  accentOf,
  allotmentProgress,
  daysOnList,
  findCategory,
  formatMoney,
  glyphOf,
  monthKey,
  monthLabel,
  parseAmount,
  recurringForMonth,
  type Allotment,
  type AllotmentProgress,
  type Category,
  type Considering,
  type Recurring,
  type RecurringSkip,
  type RecurringStatus,
  type Txn,
  type Wallet,
} from "./money";
import { ConsideringForm } from "./RuleEditors";
import {
  addTxn,
  approveRecurring,
  removeConsidering,
  skipRecurring,
  unskipRecurring,
} from "./store";

interface PlanProps {
  txns: Txn[];
  categories: Category[];
  wallets: Wallet[];
  recurring: Recurring[];
  skips: RecurringSkip[];
  allotments: Allotment[];
  considering: Considering[];
  onSettings: () => void;
  onLogged: (id: string) => void;
}

/* Three tabs, each with the shape of what it holds: things that come round every
   month, a set of limits, and a list of things being weighed. */
const TABS = [
  { value: "expected", label: "Expected", icon: glyph("calendar").line },
  { value: "allotments", label: "Allotments", icon: glyph("scales").line },
  { value: "considering", label: "Considering", icon: glyph("clock").line },
] as const;

type Tab = (typeof TABS)[number]["value"];

/** A ceiling is a limit you stay under; a floor is one you rise to. Giving is
 *  the only floor, and it is the one place in the app where a full bar is the
 *  good outcome — the arrow says which way is right without a legend. */
const IconCeiling: Icon = glyph("scales").line;
const IconFloor: Icon = glyph("hand-heart").line;

/** How long something has been weighed. The whole argument of the Considering
 *  list is that time spent deciding is information, so it gets a clock. */
const IconWaiting: Icon = glyph("clock").line;

/** Deciding against something is a real outcome, not a deletion — but it does
 *  remove the row, so it takes the dismiss glyph rather than the bin. */
const IconLetGo: Icon = IconClose;

/** Plan shows status. Settings holds the rules.
 *
 *  Nothing on this screen edits a rule — you approve, skip, or let go, and the
 *  templates and caps themselves are changed in Settings. Keeping that line
 *  sharp is what stops Plan from becoming a second, competing settings screen. */
export function Plan({
  txns,
  categories,
  wallets,
  recurring,
  skips,
  allotments,
  considering,
  onSettings,
  onLogged,
}: PlanProps) {
  const [tab, setTab] = useState<Tab>("expected");
  const now = new Date();
  const key = monthKey(now);

  const statuses = recurringForMonth(recurring, txns, skips, now);
  const waiting = statuses.filter((s) => s.state === "waiting");
  const progress = allotments.map((a) => allotmentProgress(a, txns, categories, now));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header>
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
          Plan
        </p>
        <h1 className="pt-1 font-display text-2xl font-semibold">{monthLabel(key)}</h1>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const count =
            t.value === "expected"
              ? waiting.length
              : t.value === "allotments"
                ? progress.filter((p) => p.over).length
                : considering.length;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
              className={`flex min-h-9 shrink-0 items-center gap-2 rounded-control px-4 font-display text-sm font-semibold transition-colors duration-150 ${
                tab === t.value
                  ? "bg-sage-500 text-clay-50"
                  : "bg-clay-100 text-umber-700 hover:bg-clay-200 hover:text-umber-900"
              }`}
            >
              <t.icon aria-hidden className="size-4" />
              {t.label}
              {count > 0 && (
                <span
                  className={`rounded-control px-1.5 text-xs tabular-nums ${
                    tab === t.value ? "bg-clay-50/25" : "bg-clay-200"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "expected" && (
        <Expected
          statuses={statuses}
          categories={categories}
          wallets={wallets}
          monthKey={key}
          onLogged={onLogged}
        />
      )}
      {tab === "allotments" && (
        <Allotments progress={progress} categories={categories} onSettings={onSettings} />
      )}
      {tab === "considering" && (
        <ConsideringList
          items={considering}
          categories={categories}
          progress={progress}
          onLogged={onLogged}
        />
      )}
    </div>
  );
}

/* ── Expected ─────────────────────────────────────────────────────────────── */

function Expected({
  statuses,
  categories,
  wallets,
  monthKey: key,
  onLogged,
}: {
  statuses: RecurringStatus[];
  categories: Category[];
  wallets: Wallet[];
  monthKey: string;
  onLogged: (id: string) => void;
}) {
  const [showSettled, setShowSettled] = useState(false);
  const waiting = statuses.filter((s) => s.state === "waiting");
  const settled = statuses.filter((s) => s.state !== "waiting");
  const settledTotal = settled.reduce((sum, s) => sum + (s.txn?.amountCents ?? 0), 0);

  if (statuses.length === 0) {
    return (
      <Empty>
        Nothing is expected yet. Add the bills and commitments that come round every month in
        Settings — they will propose themselves here, and nothing is logged until you approve it.
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-umber-700">
        Recurring commitments propose themselves. Nothing is logged until you approve it.
      </p>

      {waiting.map((status) => (
        <ExpectedCard
          key={status.recurring.id}
          status={status}
          categories={categories}
          wallets={wallets}
          monthKey={key}
          onLogged={onLogged}
        />
      ))}

      {waiting.length === 0 && (
        <Empty>Nothing left to approve. Everything expected this month is settled.</Empty>
      )}

      {settled.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowSettled(!showSettled)}
            className="flex items-center gap-2 border-t border-sand-300/50 py-3 text-left font-display text-sm font-semibold text-umber-700"
          >
            <IconForward
              aria-hidden
              className={`size-4 transition-transform duration-200 ${showSettled ? "rotate-90" : ""}`}
            />
            <span className="flex-1">
              Already settled <span className="font-normal">· {settled.length} items</span>
            </span>
            <Amount cents={settledTotal} sign="none" />
          </button>

          {showSettled && (
            <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
              {settled.map((status, i) => {
                const { own, inherited } = glyphOf(categories, status.recurring.categoryId);
                const skipped = status.state === "skipped";
                return (
                  <div
                    key={status.recurring.id}
                    className={`flex items-center gap-3 px-5 py-2.5 ${
                      i === 0 ? "" : "border-t border-sand-300/50"
                    }`}
                  >
                    <CategoryIcon
                      accent={accentOf(categories, status.recurring.categoryId)}
                      name={
                        findCategory(categories, status.recurring.categoryId)?.name ??
                        status.recurring.name
                      }
                      icon={own}
                      inherit={inherited}
                      className={`size-8 ${skipped ? "opacity-50" : ""}`}
                      glyphClassName="size-4"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{status.recurring.name}</span>
                      <span className="flex items-center gap-1 truncate text-sm text-umber-700">
                        {skipped ? (
                          <>
                            <IconSkip aria-hidden className="size-3.5" />
                            Skipped this month
                          </>
                        ) : (
                          <>
                            <IconApprove aria-hidden className="size-3.5 text-sage-500" />
                            {status.due.toLocaleDateString("en", {
                              day: "numeric",
                              month: "long",
                            })}
                          </>
                        )}
                      </span>
                    </span>
                    {skipped ? (
                      <button
                        type="button"
                        onClick={() => void unskipRecurring(status.recurring.id, key)}
                        className="shrink-0 rounded-control px-3 py-1.5 font-display text-xs font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
                      >
                        Undo skip
                      </button>
                    ) : (
                      <Amount
                        cents={status.txn?.amountCents ?? 0}
                        sign="none"
                        className="shrink-0 text-umber-700"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One waiting commitment. The amount is an input, not a label — bills vary,
 *  and the moment of approval is the only moment you actually know the figure. */
function ExpectedCard({
  status,
  categories,
  wallets,
  monthKey: key,
  onLogged,
}: {
  status: RecurringStatus;
  categories: Category[];
  wallets: Wallet[];
  monthKey: string;
  onLogged: (id: string) => void;
}) {
  const { recurring, due } = status;
  const [amount, setAmount] = useState(String(recurring.amountCents / 100));
  const [busy, setBusy] = useState(false);

  const amountCents = parseAmount(amount);
  const category = findCategory(categories, recurring.categoryId);
  const wallet = wallets.find((w) => w.id === recurring.walletId);

  async function approve() {
    if (amountCents === null || busy) return;
    setBusy(true);
    const id = crypto.randomUUID();
    try {
      await approveRecurring(recurring, {
        id,
        kind: "expense",
        amountCents,
        note: "",
        createdAt: new Date().toISOString(),
        categoryId: recurring.categoryId,
        walletId: recurring.walletId,
      });
      onLogged(id);
    } catch (err: unknown) {
      console.error("manna: could not approve recurring item", err);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-tile bg-clay-100 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <CategoryIcon
          accent={accentOf(categories, recurring.categoryId)}
          name={category?.name ?? recurring.name}
          icon={glyphOf(categories, recurring.categoryId).own}
          inherit={glyphOf(categories, recurring.categoryId).inherited}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{recurring.name}</p>
          <p className="truncate text-sm text-umber-700">
            {[category?.name, wallet?.name].filter(Boolean).join(" · ")} · due{" "}
            {due.toLocaleDateString("en", { day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span aria-hidden className="text-umber-700">
            ₱
          </span>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={`Amount for ${recurring.name}`}
            className="w-24 px-3 py-2 text-right font-display font-semibold tabular-nums"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => void approve()}
          disabled={amountCents === null || busy}
          className="flex-1 gap-2"
        >
          <IconApprove aria-hidden className="size-4" />
          {busy ? "Logging…" : "Approve & log"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => void skipRecurring(recurring.id, key)}
          className="gap-1.5 px-5"
        >
          <IconSkip aria-hidden className="size-4" />
          Skip
        </Button>
      </div>
    </div>
  );
}

/* ── Allotments ───────────────────────────────────────────────────────────── */

function Allotments({
  progress,
  categories,
  onSettings,
}: {
  progress: AllotmentProgress[];
  categories: Category[];
  onSettings: () => void;
}) {
  if (progress.length === 0) {
    return (
      <Empty>
        No allotments set. A cap per category lives in Settings — and Giving is the one you set a
        floor for instead of a ceiling.
      </Empty>
    );
  }

  const floors = progress.filter((p) => p.allotment.kind === "floor");
  const ceilings = progress.filter((p) => p.allotment.kind === "ceiling");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-umber-700">
        Giving is the one you set a floor for. Everything else is a ceiling.
      </p>

      {floors.map((p) => (
        <div
          key={p.allotment.id}
          className="rounded-tile border border-accent-gold/40 bg-accent-gold/10 p-4"
        >
          <Track progress={p} categories={categories} />
        </div>
      ))}

      {ceilings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-tile bg-clay-100 p-5 shadow-soft">
          {ceilings.map((p) => (
            <div key={p.allotment.id} className="border-b border-sand-300/50 py-3 last:border-b-0">
              <Track progress={p} categories={categories} />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onSettings}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-tile border border-dashed border-sand-300 font-display text-sm font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-100 hover:text-umber-900"
      >
        <IconSettings aria-hidden className="size-4" />
        Change these in Settings
        <IconForward aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function Track({
  progress,
  categories,
}: {
  progress: AllotmentProgress;
  categories: Category[];
}) {
  const { allotment, spentCents, pct, over, met, remainingCents } = progress;
  const name = findCategory(categories, allotment.categoryId)?.name ?? "Deleted category";
  const accent = accentOf(categories, allotment.categoryId);
  const { own, inherited } = glyphOf(categories, allotment.categoryId);
  const KindIcon = allotment.kind === "floor" ? IconFloor : IconCeiling;

  const foot = over
    ? `Over by ${formatMoney(-remainingCents)}`
    : met
      ? "Floor met — set apart before anything else."
      : allotment.kind === "floor"
        ? `${formatMoney(remainingCents)} still to give`
        : `${formatMoney(remainingCents)} left`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <CategoryIcon
          accent={accent}
          name={name}
          icon={own}
          inherit={inherited}
          className="size-8"
          glyphClassName="size-4"
        />
        <span className="min-w-0 flex-1 truncate font-display font-semibold">{name}</span>
        <span className="shrink-0 text-xs tabular-nums text-umber-700">{pct}%</span>
        <span className="shrink-0 text-sm tabular-nums text-umber-700">
          <Amount cents={spentCents} sign="none" className="text-umber-900" /> /{" "}
          <Amount cents={allotment.limitCents} sign="none" />
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-control bg-clay-200">
        <div
          className={`h-full rounded-control transition-[width] duration-200 ease-out ${
            over ? "bg-accent-rust" : accentBg[accent]
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p
        className={`flex items-center gap-1.5 text-xs ${
          over ? "text-accent-rust" : met ? "text-sage-500" : "text-umber-700"
        }`}
      >
        <KindIcon aria-hidden className="size-3.5 shrink-0" />
        {foot}
      </p>
    </div>
  );
}

/* ── Considering ──────────────────────────────────────────────────────────── */

function ConsideringList({
  items,
  categories,
  progress,
  onLogged,
}: {
  items: Considering[];
  categories: Category[];
  progress: AllotmentProgress[];
  onLogged: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-umber-700">
        Things you are weighing, not committed to. The longer one sits here, the more considered
        the decision.
      </p>

      {items.length === 0 && !adding && (
        <Empty>
          Nothing under consideration. A to-buy is money about to move, so it lives here — things
          you already own belong in Tiswell.
        </Empty>
      )}

      {items.map((item) => (
        <ConsideringCard
          key={item.id}
          item={item}
          categories={categories}
          progress={progress}
          onLogged={onLogged}
        />
      ))}

      {/* Adding a to-buy is not editing a rule — it is the same kind of act as
          letting one go, so it belongs on the screen you weigh them on. */}
      {adding ? (
        <ConsideringForm categories={categories} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="ghost" onClick={() => setAdding(true)} className="gap-2 self-center">
          <IconAdd className="size-4" />
          Add something you are considering
        </Button>
      )}
    </div>
  );
}

function ConsideringCard({
  item,
  categories,
  progress,
  onLogged,
}: {
  item: Considering;
  categories: Category[];
  progress: AllotmentProgress[];
  onLogged: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const days = daysOnList(item.createdAt);
  const category = findCategory(categories, item.categoryId);

  /* If this purchase has an allotment behind it, say what buying it would do —
     the point of the list is to make the cost visible before committing. */
  const cap = progress.find((p) => p.allotment.categoryId === item.categoryId);
  const wouldExceed = cap && cap.allotment.kind === "ceiling" && item.amountCents > cap.remainingCents;

  async function buy() {
    if (busy) return;
    setBusy(true);
    const id = crypto.randomUUID();
    try {
      await addTxn({
        id,
        kind: "expense",
        amountCents: item.amountCents,
        note: item.name,
        createdAt: new Date().toISOString(),
        categoryId: item.categoryId,
      });
      await removeConsidering(item.id);
      onLogged(id);
    } catch (err: unknown) {
      console.error("manna: could not log a considered purchase", err);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile bg-clay-100 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <CategoryIcon
          accent={accentOf(categories, item.categoryId)}
          name={category?.name ?? item.name}
          icon={glyphOf(categories, item.categoryId).own}
          inherit={glyphOf(categories, item.categoryId).inherited}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{item.name}</p>
          <p
            className={`flex items-center gap-1.5 truncate text-sm ${
              days >= 30 ? "text-sage-500" : "text-umber-700"
            }`}
          >
            <IconWaiting aria-hidden className="size-3.5 shrink-0" />
            {category ? `${category.name} · ` : ""}
            {days === 0 ? "Added today" : `On the list ${days} ${days === 1 ? "day" : "days"}`}
          </p>
        </div>
        <Amount cents={item.amountCents} sign="none" className="shrink-0 font-display font-semibold" />
      </div>

      {wouldExceed && (
        <p className="text-sm text-accent-rust">
          This would put {findCategory(categories, cap.allotment.categoryId)?.name} over its
          allotment — {formatMoney(cap.remainingCents)} left this month.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => void buy()}
          disabled={busy}
          variant="ghost"
          className="flex-1 gap-2 border border-sand-300"
        >
          <IconApprove aria-hidden className="size-4" />
          {busy ? "Logging…" : `Buy it — log ${formatMoney(item.amountCents)}`}
        </Button>
        <Button
          variant="ghost"
          onClick={() => void removeConsidering(item.id)}
          className="gap-1.5 px-5"
        >
          <IconLetGo aria-hidden className="size-4" />
          Let go
        </Button>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-tile border border-dashed border-sand-300 p-6 text-center text-sm leading-relaxed text-umber-700">
      {children}
    </div>
  );
}
