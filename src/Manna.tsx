import {
  CalendarDays,
  CircleCheck,
  House,
  Plus,
  Settings as SettingsIcon,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AddSheet } from "./AddSheet";
import { parseSentence } from "./capture";
import { Home } from "./Home";
import { Month } from "./Month";
import { recurringForMonth, type Txn, type TxnKind } from "./money";
import type { AddDraft } from "./parse";
import { Owed } from "./Owed";
import { Plan } from "./Plan";
import { Settings } from "./Settings";
import {
  useAllotments,
  useCategories,
  useConsidering,
  useDebts,
  useRecurring,
  useRecurringSkips,
  useSeedDefaults,
  useTxns,
  useWallets,
} from "./store";
import { TxnSheet } from "./TxnSheet";
import { Wallets } from "./Wallets";

const tabs: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: "home", label: "Home", icon: House },
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "plan", label: "Plan", icon: CircleCheck },
  { value: "wallets", label: "Wallets", icon: Wallet },
];

type Tab = "home" | "month" | "plan" | "wallets";

/** How long a freshly logged row stays marked. Long enough to catch the eye
 *  after the sheet closes, short enough not to become part of the design. */
const HIGHLIGHT_MS = 2500;

export default function Manna() {
  const [tab, setTab] = useState<Tab>("home");
  const [settings, setSettings] = useState(false);
  /* Owed hangs off Wallets rather than taking a tab of its own — it answers a
     question about what you have, and the bar is already full. */
  const [owed, setOwed] = useState(false);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [highlightId, setHighlightId] = useState<string | undefined>();

  /* Which kind the add sheet is open on, or null when it's shut. Held here
     rather than in Home because both the quick actions and the bottom bar's +
     open it, and the + has to work from any tab. */
  const [adding, setAdding] = useState<TxnKind | null>(null);
  /* A pre-fill for the add sheet from natural-language capture, cleared whenever
     the sheet is opened blank so a stale draft never leaks into a manual log. */
  const [addDraft, setAddDraft] = useState<AddDraft | undefined>();

  /* All views read the same live lists, so the data is fetched once here and
     passed down — a transaction logged on the phone reaches every screen
     without a reload. */
  const txns = useTxns();
  const categories = useCategories();
  const wallets = useWallets();
  const recurring = useRecurring();
  const skips = useRecurringSkips();
  const allotments = useAllotments();
  const considering = useConsidering();
  const debts = useDebts();
  useSeedDefaults();

  /* The badge on the Plan tab: commitments still waiting on a decision this
     month. Derived, so approving one anywhere makes it tick down at once. */
  const waiting = recurringForMonth(recurring, txns, skips).filter(
    (s) => s.state === "waiting",
  ).length;

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(undefined), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightId]);

  /* Open the add sheet blank — the manual path. Clearing the draft here is what
     keeps a prior capture from bleeding into a plain + log. */
  const openAdd = (kind: TxnKind) => {
    setAddDraft(undefined);
    setAdding(kind);
  };

  /* Natural-language capture: parse the sentence into a draft, then open the
     sheet on it. Rejection propagates so the capture box shows its own hint; the
     sheet opens only on success. */
  const capture = async (sentence: string) => {
    const { draft } = await parseSentence(sentence, categories, wallets);
    setAddDraft(draft);
    setAdding(draft.kind ?? "expense");
  };

  if (owed) {
    return (
      <div className="flex flex-col gap-5 py-2">
        <Owed
          debts={debts}
          txns={txns}
          wallets={wallets}
          onBack={() => setOwed(false)}
          onLogged={setHighlightId}
        />
      </div>
    );
  }

  if (settings) {
    return (
      <div className="flex flex-col gap-5 py-2">
        <Settings
          categories={categories}
          wallets={wallets}
          recurring={recurring}
          allotments={allotments}
          onBack={() => setSettings(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 py-2 pb-28 lg:pb-2">
      {/* Desktop only: phones reach Settings from Home's gear and switch tabs
          with the bottom bar, so up here both would just be duplicates. */}
      <header className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
        <h1 className="font-display text-2xl font-semibold">Manna</h1>

        <div className="flex items-center gap-2">
          <nav className="flex rounded-control bg-clay-200 p-1">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-current={tab === t.value ? "page" : undefined}
                onClick={() => setTab(t.value)}
                className={`min-h-9 rounded-control px-4 font-display text-sm font-semibold transition-colors duration-150 ${
                  tab === t.value ? "bg-raised text-umber-900 shadow-soft" : "text-umber-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setSettings(true)}
            aria-label="Settings"
            className="flex size-11 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
          >
            <SettingsIcon className="size-5" />
          </button>
        </div>
      </header>

      {tab === "home" && (
        <Home
          txns={txns}
          categories={categories}
          wallets={wallets}
          allotments={allotments}
          onSelect={setEditing}
          onNavigate={setTab}
          onAdd={openAdd}
          onCapture={capture}
          onSettings={() => setSettings(true)}
          highlightId={highlightId}
        />
      )}
      {tab === "month" && (
        <Month txns={txns} categories={categories} wallets={wallets} onSelect={setEditing} />
      )}
      {tab === "plan" && (
        <Plan
          txns={txns}
          categories={categories}
          wallets={wallets}
          recurring={recurring}
          skips={skips}
          allotments={allotments}
          considering={considering}
          onSettings={() => setSettings(true)}
          onLogged={setHighlightId}
        />
      )}
      {tab === "wallets" && (
        <Wallets txns={txns} wallets={wallets} debts={debts} onOwed={() => setOwed(true)} />
      )}

      <BottomNav
        tab={tab}
        onTab={setTab}
        onCapture={() => openAdd("expense")}
        waiting={waiting}
      />

      <AddSheet
        kind={adding}
        categories={categories}
        wallets={wallets}
        txns={txns}
        draft={addDraft}
        onClose={() => {
          setAdding(null);
          setAddDraft(undefined);
        }}
        onLogged={(id) => {
          // land where the new row is, so the save is something you see happen
          setHighlightId(id);
          setTab("home");
        }}
      />

      <TxnSheet
        txn={editing}
        categories={categories}
        wallets={wallets}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

/** Phones only, and only outside the Tiswell frame. The capture button sits in
 *  the middle of the bar and rides above it, because logging something is the
 *  reason this app is open — it shouldn't be one of four equal destinations. */
function BottomNav({
  tab,
  onTab,
  onCapture,
  waiting,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  onCapture: () => void;
  waiting: number;
}) {
  const [home, month, plan, wallets] = tabs;

  return (
    <nav
      aria-label="Sections"
      // lg:hidden — from `lg` up the header's tabs take over
      className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-300/50 bg-clay-100/95 backdrop-blur lg:hidden"
      // keeps the bar clear of the home indicator on a phone
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Five equal columns edge to edge — the + is a slot like the others, so
          nothing reserves width it doesn't fill and the bar reads as one even
          row at any window size. */}
      <div className="grid grid-cols-5">
        <NavItem item={home} active={tab === home.value} onClick={() => onTab(home.value)} />
        <NavItem item={month} active={tab === month.value} onClick={() => onTab(month.value)} />

        <div className="flex items-start justify-center">
          <button
            type="button"
            onClick={onCapture}
            aria-label="Log something"
            className="-translate-y-4 flex size-14 items-center justify-center rounded-control bg-sage-500 text-clay-50 shadow-soft transition duration-150 hover:brightness-105 active:brightness-95"
          >
            <Plus aria-hidden className="size-6" />
          </button>
        </div>

        <NavItem
          item={plan}
          active={tab === plan.value}
          onClick={() => onTab(plan.value)}
          badge={waiting}
        />
        <NavItem
          item={wallets}
          active={tab === wallets.value}
          onClick={() => onTab(wallets.value)}
        />
      </div>
    </nav>
  );
}

function NavItem({
  item,
  active,
  onClick,
  badge = 0,
}: {
  item: { value: Tab; label: string; icon: LucideIcon };
  active: boolean;
  onClick: () => void;
  /** Count of things waiting on a decision, shown over the icon. */
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-14 flex-col items-center justify-center gap-1 transition-colors duration-150 ${
        active ? "text-umber-900" : "text-umber-700"
      }`}
    >
      <span className="relative">
        <Icon aria-hidden className="size-5" />
        {badge > 0 && (
          <span
            aria-label={`${badge} waiting`}
            className="absolute -right-2.5 -top-1.5 min-w-4 rounded-control bg-sage-500 px-1 text-center font-display text-[10px] font-semibold leading-4 tabular-nums text-clay-50"
          >
            {badge}
          </span>
        )}
      </span>
      <span className="font-display text-xs font-semibold">{item.label}</span>
      {/* the dot, not a filled pill: at this size a background swatch under a
          two-word label is more noise than signal */}
      <span
        aria-hidden
        className={`size-1 rounded-control transition-colors duration-150 ${
          active ? "bg-sage-500" : "bg-transparent"
        }`}
      />
    </button>
  );
}
