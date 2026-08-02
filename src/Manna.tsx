import { useEffect, useRef, useState } from "react";

import { AddSheet } from "./AddSheet";
import type { StewiMessage } from "./assistant";
import { Home } from "./Home";
import { IconAdd, IconSettings, NAV_GLYPHS, type Icon } from "./icons";
import { Month } from "./Month";
import { recurringForMonth, type Txn, type TxnKind } from "./money";
import { Owed } from "./Owed";
import type { AddDraft } from "./parse";
import { Plan } from "./Plan";
import { goBack, navigate, useRoute } from "./router";
import { Settings } from "./Settings";
import { Stewi, type StewiHandoff } from "./Stewi";
import { stewiConfigured } from "./stewiClient";
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

type Tab = "home" | "month" | "plan" | "wallets";

interface TabDef {
  value: Tab;
  label: string;
  /** Both weights: the bar fills the section you are in and outlines the rest. */
  fill: Icon;
  line: Icon;
}

const tabs: TabDef[] = [
  { value: "home", label: "Home", ...NAV_GLYPHS.home },
  { value: "month", label: "Month", ...NAV_GLYPHS.month },
  { value: "plan", label: "Plan", ...NAV_GLYPHS.plan },
  { value: "wallets", label: "Wallets", ...NAV_GLYPHS.wallets },
];

/** How long a freshly logged row stays marked. Long enough to catch the eye
 *  after the sheet closes, short enough not to become part of the design. */
const HIGHLIGHT_MS = 2500;

/** Tab ↔ path, the one place that mapping lives. Home is "/" rather than
 *  "/home" so the bare root — what a fresh install or a bookmarked PWA
 *  actually opens on — needs no redirect. */
const tabPaths: Record<Tab, string> = { home: "/", month: "/month", plan: "/plan", wallets: "/wallets" };

function tabFromPath(path: string): Tab {
  if (path.startsWith("/month")) return "month";
  if (path.startsWith("/plan")) return "plan";
  if (path.startsWith("/wallets")) return "wallets";
  return "home";
}

export default function Manna() {
  /* Switching tabs replaces rather than pushes — a tab bar isn't a Back-button
     stack in any native app, and shouldn't become one here just because the
     path changes. Settings and Owed are drill-downs, reached with a plain
     (pushed) `navigate`, so `goBack` returns you to the exact tab you left. */
  const path = useRoute();
  const tab = tabFromPath(path);
  const settings = path === "/settings";
  /* Owed hangs off Wallets rather than taking a tab of its own — it answers a
     question about what you have, and the bar is already full. */
  const owed = path === "/wallets/owed";
  const goToTab = (t: Tab) => navigate(tabPaths[t], { replace: true });

  const [editing, setEditing] = useState<Txn | null>(null);
  const [highlightId, setHighlightId] = useState<string | undefined>();

  /* Which kind the add sheet is open on, or null when it's shut. Held here
     rather than in Home because both the quick actions and the bottom bar's +
     open it, and the + has to work from any tab. */
  const [adding, setAdding] = useState<TxnKind | null>(null);
  /* A pre-fill for the add sheet — from Stewi proposing a new transaction, or
     stale-cleared whenever the sheet is opened blank so a prior proposal never
     leaks into a manual log. */
  const [addDraft, setAddDraft] = useState<AddDraft | undefined>();

  /* Stewi: reachable from anywhere, the centre + and the desktop "Log
     something" button both open it first when it's configured (see
     `openLogger` below) — the numpad wizard stays one tap away, in the
     overlay's own empty state, for the offline/manual path. The transcript
     is lifted here (not owned by Stewi) so it survives the overlay closing
     and reopening; everything else about a conversation in progress is
     transient and fine to lose on close. */
  const [stewiOpen, setStewiOpen] = useState(false);
  const [stewiMessages, setStewiMessages] = useState<StewiMessage[]>([]);
  const [stewiHandoff, setStewiHandoff] = useState<StewiHandoff | undefined>();
  /* True for the stretch between Stewi handing a proposal to AddSheet/TxnSheet
     and that sheet closing — lets the sheets' existing onLogged/onClose
     handlers tell Stewi what happened without needing to know who opened them. */
  const stewiHandoffPending = useRef(false);
  const stewiJustSaved = useRef(false);
  const handoffToken = useRef(0);

  const notifyStewi = (outcome: StewiHandoff["outcome"]) => {
    handoffToken.current += 1;
    setStewiHandoff({ token: handoffToken.current, outcome });
  };

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

  /* Open the add sheet blank — the manual, offline path. Clearing the draft
     and the handoff flag is what keeps a prior Stewi proposal or hand-off
     from bleeding into a plain + log. */
  const openAdd = (kind: TxnKind) => {
    setAddDraft(undefined);
    stewiHandoffPending.current = false;
    setAdding(kind);
  };

  /* The centre + and the desktop "Log something" button both go through here:
     Stewi first when it's configured — logging is now a conversation, not a
     kind picker — falling back to the manual wizard only when it isn't. */
  const openLogger = (kind: TxnKind = "expense") => {
    if (stewiConfigured) setStewiOpen(true);
    else openAdd(kind);
  };

  /* Stewi proposing a brand-new transaction: hand off to the exact sheet a
     manual log already uses, flagged so its onLogged/onClose below report
     back to the overlay instead of switching tabs. */
  const proposeCreate = (draft: AddDraft) => {
    stewiHandoffPending.current = true;
    stewiJustSaved.current = false;
    setAddDraft(draft);
    setAdding(draft.kind ?? "expense");
  };

  /* Stewi proposing an edit (already-modified txn) or a delete (the original,
     whose own Delete button is the confirm step) — both open the same
     existing edit sheet. */
  const proposeReview = (txn: Txn) => {
    stewiHandoffPending.current = true;
    stewiJustSaved.current = false;
    setEditing(txn);
  };

  if (owed) {
    return (
      <div className="relative flex flex-col gap-5 py-2">
        <AmbientGlow />
        <Owed
          debts={debts}
          txns={txns}
          wallets={wallets}
          onBack={goBack}
          onLogged={setHighlightId}
        />
      </div>
    );
  }

  if (settings) {
    return (
      <div className="relative flex flex-col gap-5 py-2">
        <AmbientGlow />
        <Settings
          categories={categories}
          wallets={wallets}
          recurring={recurring}
          allotments={allotments}
          onBack={goBack}
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-5 py-2 pb-28 lg:pb-2">
      <AmbientGlow />

      {/* Desktop only: phones reach Settings from Home's gear and switch tabs
          with the bottom bar, so up here both would just be duplicates. */}
      <header className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
        <h1 className="font-display text-2xl font-semibold">Manna</h1>

        <div className="flex items-center gap-2">
          <nav className="flex rounded-control border border-white/15 bg-clay-200/50 p-1 shadow-glass backdrop-blur-md">
            {tabs.map((t) => {
              const active = tab === t.value;
              const Glyph = active ? t.fill : t.line;
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => goToTab(t.value)}
                  className={`flex min-h-9 items-center gap-1.5 rounded-control px-4 font-display text-sm font-semibold transition-colors duration-150 ${
                    active ? "bg-raised/90 text-umber-900 shadow-soft" : "text-umber-700"
                  }`}
                >
                  <Glyph aria-hidden className="size-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="Settings"
            className="flex size-11 items-center justify-center rounded-control border border-white/10 bg-clay-200/40 text-umber-700 backdrop-blur-md transition-colors duration-150 hover:bg-clay-200/70 hover:text-umber-900"
          >
            <IconSettings className="size-5" />
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
          onNavigate={goToTab}
          onAdd={openLogger}
          onOpenStewi={() => setStewiOpen(true)}
          onSettings={() => navigate("/settings")}
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
          onSettings={() => navigate("/settings")}
          onLogged={setHighlightId}
        />
      )}
      {tab === "wallets" && (
        <Wallets
          txns={txns}
          wallets={wallets}
          debts={debts}
          onOwed={() => navigate("/wallets/owed")}
        />
      )}

      <BottomNav tab={tab} onTab={goToTab} onCapture={() => openLogger()} waiting={waiting} />

      <AddSheet
        kind={adding}
        categories={categories}
        wallets={wallets}
        txns={txns}
        draft={addDraft}
        onClose={() => {
          setAdding(null);
          setAddDraft(undefined);
          if (stewiHandoffPending.current) {
            stewiHandoffPending.current = false;
            if (!stewiJustSaved.current) notifyStewi("cancelled");
          }
        }}
        onLogged={(id) => {
          // land where the new row is, so the save is something you see happen
          setHighlightId(id);
          if (stewiHandoffPending.current) {
            stewiJustSaved.current = true;
            notifyStewi("saved");
          } else {
            goToTab("home");
          }
        }}
      />

      <TxnSheet
        txn={editing}
        categories={categories}
        wallets={wallets}
        onClose={() => {
          setEditing(null);
          if (stewiHandoffPending.current) {
            stewiHandoffPending.current = false;
            if (!stewiJustSaved.current) notifyStewi("cancelled");
          }
        }}
        onSaved={() => {
          if (stewiHandoffPending.current) {
            stewiJustSaved.current = true;
            notifyStewi("saved");
          }
        }}
        onDeleted={() => {
          if (stewiHandoffPending.current) {
            stewiJustSaved.current = true;
            notifyStewi("deleted");
          }
        }}
      />

      <Stewi
        open={stewiOpen}
        onClose={() => setStewiOpen(false)}
        categories={categories}
        wallets={wallets}
        txns={txns}
        allotments={allotments}
        recurring={recurring}
        skips={skips}
        debts={debts}
        messages={stewiMessages}
        onMessagesChange={setStewiMessages}
        onProposeCreate={proposeCreate}
        onProposeReview={proposeReview}
        onManualEntry={() => {
          setStewiOpen(false);
          openAdd("expense");
        }}
        handoff={stewiHandoff}
      />
    </div>
  );
}

/** Soft colour behind the app's translucent surfaces — a pane of glass needs
 *  something underneath it to blur, and a flat clay background gives it
 *  nothing to show. Positioned within Manna's own root (`absolute`, not
 *  `fixed`) so it stays inside Manna's frame rather than covering the whole
 *  viewport when Tiswell embeds Manna as a tile. Screens still on opaque
 *  cards simply hide it — nothing here forces the glass look on them. */
function AmbientGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-20 -left-16 size-80 rounded-full bg-sage-500/35 blur-3xl" />
      <div className="absolute top-1/4 -right-20 size-96 rounded-full bg-accent-gold/25 blur-3xl" />
      <div className="absolute -bottom-16 left-1/4 size-80 rounded-full bg-accent-indigo/25 blur-3xl" />
      <div className="absolute -right-10 bottom-1/4 size-72 rounded-full bg-accent-rose/20 blur-3xl" />
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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/15 bg-clay-100/75 shadow-glass backdrop-blur-xl lg:hidden"
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
            className="-translate-y-4 flex size-14 items-center justify-center rounded-control bg-sage-500 text-clay-50 shadow-[0_10px_28px_-6px_color-mix(in_srgb,var(--color-sage-500)_60%,transparent)] transition duration-150 hover:brightness-105 active:brightness-95"
          >
            <IconAdd aria-hidden className="size-6" />
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
  item: TabDef;
  active: boolean;
  onClick: () => void;
  /** Count of things waiting on a decision, shown over the icon. */
  badge?: number;
}) {
  /* Filled when you are on it. At 20px with a two-word label under it, a weight
     change reads as "you are here" faster than the colour shift alone did. */
  const Glyph = active ? item.fill : item.line;
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
        <Glyph aria-hidden className="size-5" />
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
