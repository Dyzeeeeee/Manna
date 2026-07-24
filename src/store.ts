import { useEffect } from "react";

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

/* The starting taxonomy, straight from CLAUDE.md's category rules: eleven
   expense parents and four income parents, two levels and no deeper, each
   parent owning a colour. Written as a compact tree and expanded below rather
   than as ~75 hand-written records — the shape is the point, and it stays
   readable enough to edit. */
interface SeedParent {
  name: string;
  accent: Accent;
  subs: string[];
}

const EXPENSE_TREE: SeedParent[] = [
  {
    name: "Food",
    accent: "clay",
    subs: ["Groceries", "Dining Out", "Coffee & Snacks", "Delivery", "Water Refill"],
  },
  {
    name: "Transportation",
    accent: "indigo",
    subs: ["Fuel", "Fare", "Maintenance & Repair", "Parking & Toll", "Registration & Insurance"],
  },
  {
    name: "Housing & Utilities",
    accent: "teal",
    subs: ["Rent", "Electricity", "Water", "Internet", "LPG", "Household Supplies", "Repairs"],
  },
  {
    name: "Communication & Tech",
    accent: "slate",
    subs: ["Load & Phone Plan", "Subscriptions", "Devices", "Software & Domains"],
  },
  { name: "Health", accent: "rose", subs: ["Medicine", "Consultation", "Dental", "Fitness"] },
  { name: "Personal", accent: "plum", subs: ["Clothing", "Grooming", "Personal Care"] },
  {
    // gold on purpose: Giving is a normal parent, but it is the one the tithe
    // strip and the floor allotment will read from
    name: "Giving",
    accent: "gold",
    subs: ["Tithe", "Offering", "Sponsorship", "Gifts", "Family Support", "Hospitality"],
  },
  { name: "Learning", accent: "moss", subs: ["Books", "Courses", "Materials"] },
  { name: "Leisure", accent: "rust", subs: ["Entertainment", "Travel & Outings", "Hobbies"] },
  {
    name: "Financial",
    accent: "sage",
    subs: ["Loan & Installment", "Interest & Fees", "Taxes", "Insurance"],
  },
  { name: "Work", accent: "ochre", subs: ["Tools & Equipment", "Fees & Licenses"] },
];

const INCOME_TREE: SeedParent[] = [
  { name: "Earned", accent: "teal", subs: ["Salary", "Freelance", "Bonus", "Overtime"] },
  { name: "Business", accent: "moss", subs: ["Sales", "Commission"] },
  { name: "Passive", accent: "plum", subs: ["Interest", "Dividends", "Rental"] },
  { name: "Other", accent: "slate", subs: ["Gifts Received", "Refunds", "Resale"] },
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
      { id, name: parent.name, for: forKind, accent: parent.accent, order, createdAt: SEEDED_AT },
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

/** Gives a fresh install something to pick from. Gated on `ready` by the caller
 *  so an empty-but-unsynced mirror isn't mistaken for a new account — that
 *  would re-seed categories you had deliberately deleted. */
export function useSeedDefaults(): void {
  const ready = useDataReady();
  const categories = useCategories();
  const wallets = useWallets();

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      // in parallel: the taxonomy is ~75 records, and awaiting each one's round
      // trip in turn made a fresh install sit on an empty screen for seconds
      if (categories.length === 0) {
        await Promise.all(SEED_CATEGORIES.map((c) => data.put(NS_CATEGORIES, c)));
      }
      if (wallets.length === 0) {
        await Promise.all(SEED_WALLETS.map((w) => data.put(NS_WALLETS, w)));
      }
    })().catch((err: unknown) => console.error("manna: could not seed defaults", err));
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
