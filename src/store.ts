import { useEffect, useState } from "react";

import { useDataReady, useRecords } from "@data/hooks";
import { data } from "@data/instant";

import type {
  Accent,
  Allotment,
  Category,
  Considering,
  Debt,
  Recurring,
  RecurringSkip,
  Txn,
  Wallet,
} from "./money";

/* Manna's corner of the shared database. Transactions keep the original
   "finances" namespace — renaming it would strand everything already logged —
   and the new collections sit beside it under the same prefix. */
const NS_TXNS = "finances";
const NS_CATEGORIES = "finances:categories";
const NS_WALLETS = "finances:wallets";
/* Plan's three tabs. New collections need no schema push — the shared `records`
   table is (ns, recordId, item), so a new prefix just works. */
const NS_RECURRING = "finances:recurring";
const NS_SKIPS = "finances:recurring-skips";
const NS_ALLOTMENTS = "finances:allotments";
const NS_CONSIDERING = "finances:considering";
const NS_DEBTS = "finances:debts";

/* Comparators live at module scope because useRecords caches its sorted array
   against the comparator's identity — an inline arrow would re-sort forever. */
const newestFirst = (a: Txn, b: Txn) => b.createdAt.localeCompare(a.createdAt);
const oldestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  a.createdAt.localeCompare(b.createdAt);

export function useTxns(): Txn[] {
  return useRecords<Txn>(NS_TXNS, newestFirst);
}

export function useCategories(): Category[] {
  return useRecords<Category>(NS_CATEGORIES, oldestFirst);
}

/** Oldest first so the wallet you started with stays at the top of the list
 *  instead of reshuffling as you add more. */
export function useWallets(): Wallet[] {
  return useRecords<Wallet>(NS_WALLETS, oldestFirst);
}

/* Plan reads these; Settings writes them. Recurring is ordered by day of month
   so the Settings list reads as a calendar of the month's commitments. */
const byDueDay = (a: Recurring, b: Recurring) =>
  a.dayOfMonth - b.dayOfMonth || a.name.localeCompare(b.name);

export function useRecurring(): Recurring[] {
  return useRecords<Recurring>(NS_RECURRING, byDueDay);
}

export function useRecurringSkips(): RecurringSkip[] {
  return useRecords<RecurringSkip>(NS_SKIPS, oldestFirst);
}

export function useAllotments(): Allotment[] {
  return useRecords<Allotment>(NS_ALLOTMENTS, oldestFirst);
}

/** Oldest first: the longer something has been considered, the higher it sits,
 *  which is the list's whole argument. */
export function useConsidering(): Considering[] {
  return useRecords<Considering>(NS_CONSIDERING, oldestFirst);
}

export function useDebts(): Debt[] {
  return useRecords<Debt>(NS_DEBTS, oldestFirst);
}

/* ── Seeding ───────────────────────────────────────────────────────────────
   Fixed ids, not crypto.randomUUID(). The data layer keys records by
   "${ns}:${id}", so if a phone and a laptop both seed before syncing they
   upsert the same rows rather than leaving two of every category. */

const SEEDED_AT = "2026-01-01T00:00:00.000Z";

/* The starting taxonomy. CLAUDE.md fixes the parents — eleven expense, four
   income, two levels and no deeper, each owning a colour — and the full designed
   subcategory set is seeded with them. (Rule 4 argues for discovering subs from
   real spending rather than designing them up front; the deliberate call here
   was to ship the whole set and let Settings prune whatever goes unused.)

   Parents are listed in the order you pick them on the add sheet — heaviest
   first — because a parent is chosen on every log and that order is part of the
   five-second bar. The list index becomes each parent's `order` below.

   Each parent also ships with an icon, which is what the add sheet leads with
   — a tinted glyph is recognised before the word under it is read. The value is
   a key into the catalogue in icons.tsx, and it is only a starting point:
   Settings lets any parent be given a different one, and subcategories have no
   icon of their own (they match on their name, then inherit). */
interface SeedParent {
  name: string;
  accent: Accent;
  icon: string;
  subs: string[];
}

const EXPENSE_TREE: SeedParent[] = [
  // no "Delivery": it's a mode of dining out (note the app), not its own kind
  {
    name: "Food",
    accent: "clay",
    icon: "utensils",
    subs: ["Groceries", "Dining Out", "Coffee & Snacks", "Water Refill"],
  },
  // "Registration" only — insurance is consolidated under Financial
  {
    name: "Transportation",
    accent: "indigo",
    icon: "bus",
    subs: ["Fuel", "Fare", "Maintenance & Repair", "Parking & Toll", "Registration"],
  },
  {
    name: "Housing & Utilities",
    accent: "teal",
    icon: "house",
    subs: ["Rent", "Electricity", "Water Bill", "Internet", "LPG", "Household Supplies", "Repairs"],
  },
  {
    // gold on purpose: Giving is a normal parent, but it is the one the tithe
    // strip and the floor allotment read from
    name: "Giving",
    accent: "gold",
    icon: "hand-heart",
    subs: ["Tithe", "Offering", "Sponsorship", "Gifts", "Family Support", "Hospitality"],
  },
  // "Grooming & Care" is the old Grooming + Personal Care, merged
  { name: "Personal", accent: "plum", icon: "shirt", subs: ["Clothing", "Grooming & Care"] },
  {
    name: "Health",
    accent: "rose",
    icon: "pulse",
    subs: ["Medicine", "Consultation", "Dental", "Fitness"],
  },
  // no "Subscriptions": recurring digital spend files by purpose (streaming →
  // Leisure, cloud/tools → Software & Domains, gym → Fitness). Being recurring
  // is the Recurring feature's job, not a category's.
  {
    name: "Communication & Tech",
    accent: "slate",
    icon: "phone",
    subs: ["Load & Phone Plan", "Devices", "Software & Domains"],
  },
  {
    name: "Leisure",
    accent: "rust",
    icon: "ticket",
    subs: ["Entertainment", "Travel & Outings", "Hobbies"],
  },
  // insurance lives here (one home; the type goes in the note). Debt principal
  // moves as a transfer carrying debt_id — never a category — so "Loan &
  // Installment" is absent and only the *cost* of borrowing is ever spending.
  {
    name: "Financial",
    accent: "sage",
    icon: "bank",
    subs: ["Interest & Fees", "Taxes", "Insurance"],
  },
  { name: "Learning", accent: "moss", icon: "graduation", subs: ["Books", "Courses", "Materials"] },
  {
    name: "Work",
    accent: "ochre",
    icon: "briefcase",
    subs: ["Tools & Equipment", "Fees & Licenses"],
  },
];

/* Income parents share the green end of the palette so in and out read apart at
   a glance. A repaid loan is a transfer, not income, so "Debt Repaid to You" is
   deliberately absent. */
const INCOME_TREE: SeedParent[] = [
  {
    name: "Earned",
    accent: "teal",
    icon: "cash",
    subs: ["Salary", "Freelance", "Bonus", "Overtime"],
  },
  { name: "Business", accent: "moss", icon: "store", subs: ["Sales", "Commission"] },
  { name: "Passive", accent: "olive", icon: "chart", subs: ["Interest", "Dividends", "Rental"] },
  { name: "Other", accent: "sage", icon: "gift", subs: ["Gifts Received", "Refunds", "Resale"] },
];

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Ids are derived from the seed name and never change afterwards, so renaming
 *  a category in Settings keeps every transaction filed under it. The kind is
 *  in the id so an expense and an income parent can share a name. */
function expand(tree: SeedParent[], forKind: "expense" | "income"): Category[] {
  const prefix = forKind === "expense" ? "exp" : "inc";
  return tree.flatMap((parent, order) => {
    const id = `cat-${prefix}-${slug(parent.name)}`;
    return [
      {
        id,
        name: parent.name,
        for: forKind,
        accent: parent.accent,
        icon: parent.icon,
        order,
        createdAt: SEEDED_AT,
      },
      ...parent.subs.map((sub, subOrder) => ({
        id: `${id}-${slug(sub)}`,
        name: sub,
        for: forKind,
        parentId: id,
        order: subOrder,
        createdAt: SEEDED_AT,
      })),
    ];
  });
}

const SEED_CATEGORIES: Category[] = [
  ...expand(EXPENSE_TREE, "expense"),
  ...expand(INCOME_TREE, "income"),
];

/* Savings is a wallet, not a category — CLAUDE.md is explicit, and it is why
   the Wallets grand total can answer "what can I spend today". */
const SEED_WALLETS: Wallet[] = [
  "GCash",
  "Cash",
  "Maribank",
  "GoTyme",
  "Wise",
  "Savings",
].map((name) => ({
  id: `wal-${slug(name)}`,
  name,
  openingCents: 0,
  createdAt: SEEDED_AT,
}));

/* Bump when the default taxonomy in the trees above changes. A fresh database
   is seeded once, but an install that already seeded an *older* default set
   would otherwise be frozen on it — which is exactly what happened when the
   lean taxonomy replaced the original. When the stored version is behind this
   one, the current defaults are re-applied and the default rows we've since
   retired are removed — see reconcileDefaultCategories. */
const SEED_VERSION = "4";
const SEED_VERSION_KEY = "manna:seed-version";

/* Seeded categories carry derived ids (cat-exp-…, cat-inc-…); a category you add
   in Settings gets a random uuid. So this matches only the rows Manna seeded,
   which is what lets reconciliation update or drop defaults without ever
   disturbing a category you made yourself. */
const DEFAULT_CATEGORY_ID = /^cat-(exp|inc)-/;

/** Bring an already-seeded install up to the current defaults: upsert today's
 *  set (adds new parents/subs, applies the reordered `order`, recoloured accents
 *  and default icons) and delete the default rows no longer in it. Categories
 *  you created (uuid ids) are left untouched. It does re-apply default names and
 *  icons, so a renamed or re-iconed default would revert — acceptable because
 *  this runs only on a deliberate SEED_VERSION bump, i.e. when the defaults are
 *  meant to move. */
async function reconcileDefaultCategories(existing: Category[]): Promise<void> {
  const current = new Set(SEED_CATEGORIES.map((c) => c.id));
  const retired = existing.filter((c) => DEFAULT_CATEGORY_ID.test(c.id) && !current.has(c.id));
  await Promise.all([
    ...SEED_CATEGORIES.map((c) => data.put(NS_CATEGORIES, c)),
    ...retired.map((c) => data.remove(NS_CATEGORIES, c.id)),
  ]);
}

/* One run at a time: seeding and reconciliation both change categories.length,
   which re-fires the effect mid-flight — this guard stops a reconcile from
   overlapping itself before the version flag is written. */
let seedInFlight = false;

/** Gives a fresh install something to pick from, and brings an existing one up
 *  to the current defaults after a SEED_VERSION bump. Gated on `ready` so an
 *  empty-but-unsynced mirror isn't mistaken for a new account — that would
 *  re-seed categories you had deliberately deleted. */
export function useSeedDefaults(): void {
  const ready = useDataReady();
  const categories = useCategories();
  const wallets = useWallets();

  useEffect(() => {
    if (!ready || seedInFlight) return;
    seedInFlight = true;
    void (async () => {
      // in parallel: the taxonomy is ~70 records, and awaiting each one's round
      // trip in turn made a fresh install sit on an empty screen for seconds
      if (categories.length === 0) {
        await Promise.all(SEED_CATEGORIES.map((c) => data.put(NS_CATEGORIES, c)));
      } else if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
        await reconcileDefaultCategories(categories);
      }
      // written only after the awaits settle: a failure leaves it unset so the
      // reconcile is retried on the next load rather than silently skipped
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      if (wallets.length === 0) {
        await Promise.all(SEED_WALLETS.map((w) => data.put(NS_WALLETS, w)));
      }
    })()
      .catch((err: unknown) => console.error("manna: could not seed defaults", err))
      .finally(() => {
        seedInFlight = false;
      });
  }, [ready, categories.length, wallets.length]);
}

/* ── Sticky defaults ───────────────────────────────────────────────────────
   Logging asks for an amount and nothing else, so a new transaction inherits
   whatever you last used. Kept per-device in localStorage rather than in the
   database: which wallet you're spending from is a property of where you are,
   not something to sync to your other devices. */

const LAST_CATEGORY = "manna:last-category";
const LAST_WALLET = "manna:last-wallet";

function remembered(key: string, valid: { id: string }[]): string | undefined {
  const id = localStorage.getItem(key);
  // a remembered id that has since been deleted must not silently poison writes
  return id && valid.some((v) => v.id === id) ? id : valid[0]?.id;
}

export function lastCategoryId(categories: Category[]): string | undefined {
  return remembered(LAST_CATEGORY, categories);
}

export function lastWalletId(wallets: Wallet[]): string | undefined {
  return remembered(LAST_WALLET, wallets);
}

/* ── Theme ─────────────────────────────────────────────────────────────────
   Same reasoning as the sticky defaults above: which palette you're looking
   at is a property of this device, not something to carry to another one, so
   it lives in localStorage rather than the shared database.

   "System" is the app's original behaviour and needs nothing stored —
   `prefers-color-scheme` decides, same as before this existed. Naming a theme
   pins the palette regardless of the OS's own light/dark setting; app.css keys
   its Shark and Penguin overrides off the `data-theme` attribute this sets on
   the document root. index.html sets the same attribute inline, before React
   mounts, so a named theme doesn't flash the default palette first. */

export type Theme = "system" | "shark" | "penguin";
const THEME_KEY = "manna:theme";

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "shark" || stored === "penguin" ? stored : "system";
}

function applyTheme(theme: Theme) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  useEffect(() => applyTheme(theme), [theme]);
  const setTheme = (next: Theme) => {
    localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  };
  return [theme, setTheme];
}

/* ── Mutations ─────────────────────────────────────────────────────────── */

export async function addTxn(txn: Txn): Promise<void> {
  if (txn.walletId) localStorage.setItem(LAST_WALLET, txn.walletId);
  if (txn.kind !== "transfer" && txn.categoryId) {
    localStorage.setItem(LAST_CATEGORY, txn.categoryId);
  }
  await data.put<Txn>(NS_TXNS, txn);
}

export async function updateTxn(txn: Txn): Promise<void> {
  await data.put<Txn>(NS_TXNS, txn);
}

export async function removeTxn(id: string): Promise<void> {
  await data.remove(NS_TXNS, id);
}

export async function saveCategory(category: Category): Promise<void> {
  await data.put<Category>(NS_CATEGORIES, category);
}

export async function removeCategory(id: string): Promise<void> {
  await data.remove(NS_CATEGORIES, id);
}

export async function saveWallet(wallet: Wallet): Promise<void> {
  await data.put<Wallet>(NS_WALLETS, wallet);
}

export async function removeWallet(id: string): Promise<void> {
  await data.remove(NS_WALLETS, id);
}

export async function saveRecurring(recurring: Recurring): Promise<void> {
  await data.put<Recurring>(NS_RECURRING, recurring);
}

export async function removeRecurring(id: string): Promise<void> {
  await data.remove(NS_RECURRING, id);
}

/** Approving is just logging: the transaction carries `recurringId`, which is
 *  what marks the commitment settled for the month. Nothing else to write. */
export async function approveRecurring(recurring: Recurring, txn: Txn): Promise<void> {
  await addTxn({ ...txn, recurringId: recurring.id });
}

/* The skip id is derived, not random, so skipping twice is idempotent and
   un-skipping knows exactly what to delete. */
const skipId = (recurringId: string, monthKey: string) => `${recurringId}:${monthKey}`;

export async function skipRecurring(recurringId: string, monthKey: string): Promise<void> {
  await data.put<RecurringSkip>(NS_SKIPS, {
    id: skipId(recurringId, monthKey),
    recurringId,
    monthKey,
    createdAt: new Date().toISOString(),
  });
}

export async function unskipRecurring(recurringId: string, monthKey: string): Promise<void> {
  await data.remove(NS_SKIPS, skipId(recurringId, monthKey));
}

export async function saveAllotment(allotment: Allotment): Promise<void> {
  await data.put<Allotment>(NS_ALLOTMENTS, allotment);
}

export async function removeAllotment(id: string): Promise<void> {
  await data.remove(NS_ALLOTMENTS, id);
}

export async function saveConsidering(item: Considering): Promise<void> {
  await data.put<Considering>(NS_CONSIDERING, item);
}

export async function removeConsidering(id: string): Promise<void> {
  await data.remove(NS_CONSIDERING, id);
}

export async function saveDebt(debt: Debt): Promise<void> {
  await data.put<Debt>(NS_DEBTS, debt);
}

export async function removeDebt(id: string): Promise<void> {
  await data.remove(NS_DEBTS, id);
}

/** Record money moving against a debt.
 *
 *  A transfer with one end attached: paying something you owe takes it out of a
 *  wallet, being repaid puts it in, and neither is spending or income. The debt
 *  is the account on the other side, so there is no second wallet — see the
 *  Owed section of money.ts for why that falls out of the existing rules rather
 *  than needing new ones. */
export async function payDebt(
  debt: Debt,
  amountCents: number,
  walletId: string,
  note = "",
): Promise<string> {
  const id = crypto.randomUUID();
  const out = debt.direction === "owe";
  await addTxn({
    id,
    kind: "transfer",
    amountCents,
    note,
    createdAt: new Date().toISOString(),
    debtId: debt.id,
    ...(out ? { walletId } : { toWalletId: walletId }),
  });
  return id;
}
