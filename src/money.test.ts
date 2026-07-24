import { describe, expect, it } from "vitest";

import {
  accentOf,
  allotmentProgress,
  allotmentsRunningHot,
  categoryBreakdown,
  categorySpend,
  daysOnList,
  debtBalance,
  owedTotals,
  filterByKind,
  formatEntry,
  monthlyHistory,
  monthsWithActivity,
  monthSummary,
  paceVsAverage,
  parentBreakdown,
  parentCategories,
  parentOf,
  parseAmount,
  pressKey,
  recurringForMonth,
  shiftMonth,
  subcategoriesOf,
  topCategories,
  totalBalance,
  walletBalances,
  type Category,
  type Debt,
  type Recurring,
  type RecurringSkip,
  type Txn,
  type Wallet,
} from "./money";

let seq = 0;
const txn = (over: Partial<Txn> = {}): Txn =>
  ({
    id: `t${++seq}`,
    kind: "expense",
    amountCents: 100,
    note: "",
    createdAt: "2026-07-19T08:00:00Z",
    ...over,
  }) as Txn;

const wallet = (id: string, openingCents = 0): Wallet => ({
  id,
  name: id,
  openingCents,
  createdAt: "2026-01-01T00:00:00Z",
});

let catSeq = 0;
const cat = (over: Partial<Category> = {}): Category => ({
  id: `c${++catSeq}`,
  name: "Category",
  for: "expense",
  order: 0,
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

/* A small two-level tree reused across the category tests: two expense parents
   with subs, plus an income parent. */
const food = cat({ id: "food", name: "Food", accent: "clay", order: 0 });
const groceries = cat({ id: "groceries", name: "Groceries", parentId: "food", order: 0 });
const dining = cat({ id: "dining", name: "Dining Out", parentId: "food", order: 1 });
const transport = cat({ id: "transport", name: "Transport", accent: "indigo", order: 1 });
const fuel = cat({ id: "fuel", name: "Fuel", parentId: "transport", order: 0 });
const salary = cat({ id: "salary", name: "Salary", accent: "sage", order: 0, for: "income" });
const tree = [food, groceries, dining, transport, fuel, salary];

/* Local noon, so these dates land on the intended calendar day in any
   timezone — the month functions bucket by local date, as the UI displays. */
const localNoon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();

describe("filterByKind", () => {
  const spent = txn({ kind: "expense" });
  const earned = txn({ kind: "income" });
  const moved = txn({ kind: "transfer" });
  const all = [spent, earned, moved];

  it("keeps everything, transfers included, when unfiltered", () => {
    expect(filterByKind(all, "all")).toEqual(all);
  });

  it("narrows to one kind", () => {
    expect(filterByKind(all, "income")).toEqual([earned]);
    expect(filterByKind(all, "expense")).toEqual([spent]);
  });

  /* A transfer is neither money in nor money out, so it must not surface under
     either of the narrowed filters — it would double-count what you have. */
  it("drops transfers from both narrowed filters", () => {
    expect(filterByKind(all, "income")).not.toContain(moved);
    expect(filterByKind(all, "expense")).not.toContain(moved);
  });
});

describe("parseAmount", () => {
  it("parses pesos into centavos", () => {
    expect(parseAmount("250")).toBe(25000);
    expect(parseAmount("1,250.50")).toBe(125050);
    expect(parseAmount(" 99.99 ")).toBe(9999);
  });

  it("rejects junk, zero, and negatives", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
  });
});

describe("numpad entry", () => {
  /** Types a run of keys from empty, the way a thumb would. */
  const type = (keys: string) => [...keys].reduce(pressKey, "");

  it("builds an amount digit by digit", () => {
    expect(type("150")).toBe("150");
    expect(formatEntry(type("12500"))).toBe("12,500");
  });

  it("keeps the point while decimals are being typed", () => {
    expect(type("12.")).toBe("12.");
    expect(formatEntry(type("1250.5"))).toBe("1,250.5");
    expect(parseAmount(type("1250.50"))).toBe(125050);
  });

  it("starts a bare point at zero and refuses a second one", () => {
    expect(pressKey("", ".")).toBe("0.");
    expect(pressKey("12.5", ".")).toBe("12.5");
  });

  it("refuses a third decimal place", () => {
    expect(pressKey("12.34", "5")).toBe("12.34");
  });

  it("replaces a leading zero rather than appending to it", () => {
    expect(pressKey("0", "5")).toBe("5");
  });

  it("stops at nine digits", () => {
    expect(pressKey("123456789", "0")).toBe("123456789");
    // the decimal point doesn't count against the limit
    expect(pressKey("1234567.8", "9")).toBe("1234567.89");
  });

  it("deletes back to empty, which reads as zero", () => {
    expect(pressKey("15", "del")).toBe("1");
    expect(pressKey("1", "del")).toBe("");
    expect(formatEntry("")).toBe("0");
    expect(parseAmount("")).toBeNull();
  });
});

describe("monthSummary", () => {
  it("totals only the given month and nets income vs expense", () => {
    const txns: Txn[] = [
      txn({ kind: "income", amountCents: 500_00, createdAt: localNoon(2026, 7, 19) }),
      txn({ kind: "expense", amountCents: 120_00, createdAt: localNoon(2026, 7, 19) }),
      txn({ kind: "expense", amountCents: 80_00, createdAt: localNoon(2026, 7, 2) }),
      txn({ kind: "expense", amountCents: 999_00, createdAt: localNoon(2026, 6, 19) }),
    ];
    expect(monthSummary(txns, new Date(2026, 6, 19))).toEqual({
      income: 500_00,
      expense: 200_00,
      net: 300_00,
    });
  });

  /* The reason the transfer kind exists. Counting a wallet-to-wallet move as
     both income and expense would inflate every month you shuffled money. */
  it("ignores transfers entirely", () => {
    const txns: Txn[] = [
      txn({ kind: "income", amountCents: 500_00, createdAt: localNoon(2026, 7, 10) }),
      txn({ kind: "expense", amountCents: 100_00, createdAt: localNoon(2026, 7, 11) }),
      txn({
        kind: "transfer",
        amountCents: 2000_00,
        walletId: "cash",
        toWalletId: "gcash",
        createdAt: localNoon(2026, 7, 12),
      }),
    ];
    expect(monthSummary(txns, new Date(2026, 6, 15))).toEqual({
      income: 500_00,
      expense: 100_00,
      net: 400_00,
    });
  });

  it("splits at the month boundary", () => {
    const txns: Txn[] = [
      txn({ amountCents: 10_00, createdAt: localNoon(2026, 7, 31) }),
      txn({ amountCents: 20_00, createdAt: localNoon(2026, 8, 1) }),
    ];
    expect(monthSummary(txns, new Date(2026, 6, 15)).expense).toBe(10_00);
    expect(monthSummary(txns, new Date(2026, 7, 15)).expense).toBe(20_00);
  });

  it("is empty for a month with nothing in it", () => {
    expect(monthSummary([], new Date(2026, 0, 1))).toEqual({ income: 0, expense: 0, net: 0 });
  });
});

describe("categoryBreakdown", () => {
  it("totals spend per category, largest first", () => {
    const txns: Txn[] = [
      txn({ amountCents: 50_00, categoryId: "food", createdAt: localNoon(2026, 7, 3) }),
      txn({ amountCents: 70_00, categoryId: "food", createdAt: localNoon(2026, 7, 4) }),
      txn({ amountCents: 90_00, categoryId: "bills", createdAt: localNoon(2026, 7, 5) }),
    ];
    expect(categoryBreakdown(txns, new Date(2026, 6, 15))).toEqual([
      { categoryId: "food", totalCents: 120_00 },
      { categoryId: "bills", totalCents: 90_00 },
    ]);
  });

  it("buckets transactions with no category rather than dropping them", () => {
    const txns: Txn[] = [txn({ amountCents: 40_00, createdAt: localNoon(2026, 7, 3) })];
    expect(categoryBreakdown(txns, new Date(2026, 6, 15))).toEqual([
      { categoryId: "uncategorised", totalCents: 40_00 },
    ]);
  });

  it("leaves out income and transfers", () => {
    const txns: Txn[] = [
      txn({ amountCents: 30_00, categoryId: "food", createdAt: localNoon(2026, 7, 3) }),
      txn({
        kind: "income",
        amountCents: 900_00,
        categoryId: "salary",
        createdAt: localNoon(2026, 7, 3),
      }),
      txn({
        kind: "transfer",
        amountCents: 500_00,
        walletId: "cash",
        toWalletId: "gcash",
        createdAt: localNoon(2026, 7, 3),
      }),
    ];
    expect(categoryBreakdown(txns, new Date(2026, 6, 15))).toEqual([
      { categoryId: "food", totalCents: 30_00 },
    ]);
  });
});

describe("walletBalances", () => {
  it("starts from the opening balance", () => {
    const balances = walletBalances([], [wallet("cash", 1000_00)]);
    expect(balances.get("cash")).toBe(1000_00);
  });

  it("adds income and subtracts expenses", () => {
    const txns: Txn[] = [
      txn({ kind: "income", amountCents: 500_00, walletId: "cash" }),
      txn({ kind: "expense", amountCents: 200_00, walletId: "cash" }),
    ];
    expect(walletBalances(txns, [wallet("cash", 100_00)]).get("cash")).toBe(400_00);
  });

  /* The other half of the transfer contract: balances move, the grand total
     doesn't. */
  it("moves a transfer between both wallets without changing the total", () => {
    const wallets = [wallet("cash", 3000_00), wallet("gcash", 500_00)];
    const txns: Txn[] = [
      txn({ kind: "transfer", amountCents: 2000_00, walletId: "cash", toWalletId: "gcash" }),
    ];
    const balances = walletBalances(txns, wallets);

    expect(balances.get("cash")).toBe(1000_00);
    expect(balances.get("gcash")).toBe(2500_00);
    expect(totalBalance(balances)).toBe(totalBalance(walletBalances([], wallets)));
  });

  it("ignores transactions pointing at a wallet that no longer exists", () => {
    const txns: Txn[] = [txn({ kind: "expense", amountCents: 100_00, walletId: "deleted" })];
    const balances = walletBalances(txns, [wallet("cash", 500_00)]);
    expect(balances.get("cash")).toBe(500_00);
    expect(totalBalance(balances)).toBe(500_00);
  });

  it("ignores transactions from before wallets existed", () => {
    const txns: Txn[] = [txn({ kind: "expense", amountCents: 100_00 })]; // no walletId
    expect(walletBalances(txns, [wallet("cash", 500_00)]).get("cash")).toBe(500_00);
  });
});

describe("month navigation", () => {
  it("steps across year boundaries", () => {
    expect(shiftMonth("2026-07", -1)).toBe("2026-06");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("lists months holding transactions, newest first, always including now", () => {
    const txns: Txn[] = [
      txn({ createdAt: localNoon(2026, 5, 4) }),
      txn({ createdAt: localNoon(2026, 7, 4) }),
      txn({ createdAt: localNoon(2026, 5, 20) }),
    ];
    expect(monthsWithActivity(txns, new Date(2026, 7, 1))).toEqual(["2026-08", "2026-07", "2026-05"]);
  });
});

describe("category tree", () => {
  it("resolves a sub to its parent, and a parent to itself", () => {
    expect(parentOf(tree, "groceries")?.id).toBe("food");
    expect(parentOf(tree, "food")?.id).toBe("food");
    expect(parentOf(tree, "missing")).toBeUndefined();
  });

  it("inherits a sub's colour from its parent, and falls back for unknowns", () => {
    expect(accentOf(tree, "groceries")).toBe("clay"); // Food's accent
    expect(accentOf(tree, "food")).toBe("clay");
    // an unknown id gets a stable hashed fallback rather than throwing
    expect(accentOf(tree, "uncategorised")).toBe(accentOf(tree, "uncategorised"));
  });

  it("lists live parents per kind in order, dropping archived ones", () => {
    const withArchived = [...tree, cat({ id: "gone", name: "Old", accent: "rust", order: 5, archived: true })];
    expect(parentCategories(withArchived, "expense").map((c) => c.id)).toEqual(["food", "transport"]);
    expect(parentCategories(withArchived, "income").map((c) => c.id)).toEqual(["salary"]);
  });

  it("lists a parent's live subs in order", () => {
    expect(subcategoriesOf(tree, "food").map((c) => c.id)).toEqual(["groceries", "dining"]);
    expect(subcategoriesOf(tree, "salary")).toEqual([]);
  });
});

describe("parentBreakdown", () => {
  it("rolls sub spend up to parents, ranked, each keeping its sub rows", () => {
    const txns: Txn[] = [
      txn({ amountCents: 50_00, categoryId: "groceries", createdAt: localNoon(2026, 7, 3) }),
      txn({ amountCents: 70_00, categoryId: "dining", createdAt: localNoon(2026, 7, 4) }),
      txn({ amountCents: 200_00, categoryId: "fuel", createdAt: localNoon(2026, 7, 5) }),
    ];
    const rows = parentBreakdown(txns, tree, new Date(2026, 6, 15));
    expect(rows.map((r) => ({ id: r.parentId, total: r.totalCents }))).toEqual([
      { id: "transport", total: 200_00 },
      { id: "food", total: 120_00 },
    ]);
    expect(rows[1].subs).toEqual([
      { categoryId: "dining", totalCents: 70_00 },
      { categoryId: "groceries", totalCents: 50_00 },
    ]);
  });

  it("collapses spend under a deleted parent into uncategorised", () => {
    const orphan = cat({ id: "orphan", name: "Orphan", parentId: "deleted-parent", order: 0 });
    const txns: Txn[] = [txn({ amountCents: 30_00, categoryId: "orphan", createdAt: localNoon(2026, 7, 3) })];
    const rows = parentBreakdown(txns, [orphan], new Date(2026, 6, 15));
    expect(rows).toEqual([
      { parentId: "uncategorised", totalCents: 30_00, subs: [{ categoryId: "orphan", totalCents: 30_00 }] },
    ]);
  });
});

describe("monthlyHistory", () => {
  it("returns n months up to now, oldest first, zero-filling empty ones", () => {
    const txns: Txn[] = [
      txn({ kind: "income", amountCents: 500_00, createdAt: localNoon(2026, 7, 3) }),
      txn({ kind: "expense", amountCents: 120_00, createdAt: localNoon(2026, 7, 4) }),
      txn({ kind: "expense", amountCents: 80_00, createdAt: localNoon(2026, 5, 4) }),
      // a transfer must not show up in either total
      txn({ kind: "transfer", amountCents: 999_00, walletId: "a", toWalletId: "b", createdAt: localNoon(2026, 7, 5) }),
    ];
    const points = monthlyHistory(txns, 3, new Date(2026, 6, 15));
    expect(points).toEqual([
      { key: "2026-05", income: 0, expense: 80_00 },
      { key: "2026-06", income: 0, expense: 0 },
      { key: "2026-07", income: 500_00, expense: 120_00 },
    ]);
  });
});

describe("paceVsAverage", () => {
  it("measures this month's spend against the mean of the earlier months", () => {
    const pace = paceVsAverage([
      { key: "2026-05", income: 0, expense: 100_00 },
      { key: "2026-06", income: 0, expense: 200_00 },
      { key: "2026-07", income: 0, expense: 120_00 },
    ]);
    expect(pace.average).toBe(150_00);
    expect(pace.delta).toBe(-30_00);
    expect(pace.better).toBe(true);
    expect(pace.hasHistory).toBe(true);
  });

  it("reports no history when there is no earlier spend to compare against", () => {
    const pace = paceVsAverage([
      { key: "2026-06", income: 0, expense: 0 },
      { key: "2026-07", income: 0, expense: 120_00 },
    ]);
    expect(pace.hasHistory).toBe(false);
  });
});

describe("categorySpend", () => {
  const txns: Txn[] = [
    txn({ amountCents: 50_00, categoryId: "groceries", createdAt: localNoon(2026, 7, 3) }),
    txn({ amountCents: 70_00, categoryId: "dining", createdAt: localNoon(2026, 7, 4) }),
    txn({ amountCents: 30_00, categoryId: "food", createdAt: localNoon(2026, 7, 5) }),
    txn({ amountCents: 90_00, categoryId: "fuel", createdAt: localNoon(2026, 7, 6) }),
    txn({ amountCents: 999_00, categoryId: "dining", createdAt: localNoon(2026, 6, 4) }),
  ];

  it("rolls a parent's subcategories up into its own total", () => {
    // 50 + 70 + 30 logged straight to the bare parent
    expect(categorySpend(txns, tree, "food", new Date(2026, 6, 15))).toBe(150_00);
  });

  it("counts only the one subcategory when given a sub", () => {
    expect(categorySpend(txns, tree, "dining", new Date(2026, 6, 15))).toBe(70_00);
  });

  it("stays inside the month asked for", () => {
    expect(categorySpend(txns, tree, "dining", new Date(2026, 5, 15))).toBe(999_00);
  });
});

describe("allotmentProgress", () => {
  const spend = (cents: number): Txn[] => [
    txn({ amountCents: cents, categoryId: "fuel", createdAt: localNoon(2026, 7, 3) }),
  ];
  const ceiling = {
    id: "a1",
    categoryId: "fuel",
    limitCents: 2500_00,
    kind: "ceiling" as const,
    createdAt: "2026-01-01T00:00:00Z",
  };

  it("reports an under-budget ceiling with what is left", () => {
    const p = allotmentProgress(ceiling, spend(1500_00), tree, new Date(2026, 6, 15));
    expect(p).toMatchObject({ spentCents: 1500_00, pct: 60, over: false, remainingCents: 1000_00 });
  });

  it("flags a ceiling that has been exceeded and caps the bar at 100", () => {
    const p = allotmentProgress(ceiling, spend(2800_00), tree, new Date(2026, 6, 15));
    expect(p.over).toBe(true);
    expect(p.pct).toBe(100);
    expect(p.remainingCents).toBe(-300_00);
  });

  /* Giving is the one allotment that is a floor: reaching it is the good
     outcome, so "met" must not be reported as "over". */
  it("treats a floor as met once reached, never as over", () => {
    const floor = { ...ceiling, categoryId: "fuel", kind: "floor" as const, limitCents: 1000_00 };
    const p = allotmentProgress(floor, spend(1200_00), tree, new Date(2026, 6, 15));
    expect(p.met).toBe(true);
    expect(p.over).toBe(false);
  });
});

describe("allotmentsRunningHot", () => {
  const make = (id: string, limit: number, spent: number, kind: "ceiling" | "floor" = "ceiling") =>
    allotmentProgress(
      { id, categoryId: "fuel", limitCents: limit, kind, createdAt: "2026-01-01T00:00:00Z" },
      [txn({ amountCents: spent, categoryId: "fuel", createdAt: localNoon(2026, 7, 3) })],
      tree,
      new Date(2026, 6, 15),
    );

  it("surfaces ceilings at or past the threshold, tightest first", () => {
    const hot = allotmentsRunningHot([make("cool", 1000_00, 100_00), make("tight", 1000_00, 950_00), make("over", 1000_00, 1200_00)]);
    expect(hot.map((p) => p.allotment.id)).toEqual(["over", "tight"]);
  });

  it("leaves floors out — an unmet floor is not an alarm", () => {
    expect(allotmentsRunningHot([make("giving", 1000_00, 0, "floor")])).toEqual([]);
  });
});

describe("recurringForMonth", () => {
  const rent: Recurring = {
    id: "r-rent",
    name: "Rent",
    amountCents: 8000_00,
    dayOfMonth: 5,
    createdAt: "2026-01-01T00:00:00Z",
  };
  const net: Recurring = { ...rent, id: "r-net", name: "Internet", dayOfMonth: 10 };
  const july = new Date(2026, 6, 15);

  it("starts everything waiting, ordered by due date", () => {
    const rows = recurringForMonth([net, rent], [], [], july);
    expect(rows.map((r) => r.recurring.id)).toEqual(["r-rent", "r-net"]);
    expect(rows.every((r) => r.state === "waiting")).toBe(true);
  });

  it("reads approval from a transaction carrying the recurring id", () => {
    const paid = txn({ recurringId: "r-rent", createdAt: localNoon(2026, 7, 5) });
    const rows = recurringForMonth([rent], [paid], [], july);
    expect(rows[0].state).toBe("approved");
    expect(rows[0].txn).toBe(paid);
  });

  /* Last month's payment must not settle this month — that would silently mark
     a bill paid that nobody has paid. */
  it("ignores an approval from another month", () => {
    const paid = txn({ recurringId: "r-rent", createdAt: localNoon(2026, 6, 5) });
    expect(recurringForMonth([rent], [paid], [], july)[0].state).toBe("waiting");
  });

  it("remembers a skip for that month only", () => {
    const skip: RecurringSkip = {
      id: "r-rent:2026-07",
      recurringId: "r-rent",
      monthKey: "2026-07",
      createdAt: "2026-07-01T00:00:00Z",
    };
    expect(recurringForMonth([rent], [], [skip], july)[0].state).toBe("skipped");
    expect(recurringForMonth([rent], [], [skip], new Date(2026, 7, 15))[0].state).toBe("waiting");
  });

  it("clamps a day-31 commitment to the end of a short month", () => {
    const end: Recurring = { ...rent, dayOfMonth: 31 };
    expect(recurringForMonth([end], [], [], new Date(2026, 1, 10))[0].due.getDate()).toBe(28);
  });

  it("leaves archived templates out", () => {
    expect(recurringForMonth([{ ...rent, archived: true }], [], [], july)).toEqual([]);
  });
});

describe("debts", () => {
  const owe: Debt = {
    id: "d1",
    person: "Melissa R.",
    direction: "owe",
    principalCents: 8000_00,
    openedAt: "2026-06-12T00:00:00Z",
    note: "",
    createdAt: "2026-06-12T00:00:00Z",
  };
  const lent: Debt = { ...owe, id: "d2", person: "Jun D.", direction: "owed", principalCents: 1500_00 };

  /** A payment as the app writes it: a transfer with one end attached. */
  const payment = (debtId: string, cents: number, out = true) =>
    txn({
      kind: "transfer",
      amountCents: cents,
      debtId,
      ...(out ? { walletId: "gcash" } : { toWalletId: "gcash" }),
      createdAt: localNoon(2026, 7, 3),
    });

  it("is the principal minus what has been paid against it", () => {
    const b = debtBalance(owe, [payment("d1", 2500_00)]);
    expect(b.paidCents).toBe(2500_00);
    expect(b.balanceCents).toBe(5500_00);
    expect(b.settled).toBe(false);
  });

  it("adds up partial payments without any extra bookkeeping", () => {
    const b = debtBalance(owe, [payment("d1", 2500_00), payment("d1", 1500_00)]);
    expect(b.balanceCents).toBe(4000_00);
  });

  it("settles once covered, and an overpayment floors at zero", () => {
    const b = debtBalance(owe, [payment("d1", 9000_00)]);
    expect(b.settled).toBe(true);
    expect(b.balanceCents).toBe(0);
    expect(b.pct).toBe(100);
  });

  it("ignores payments belonging to another debt", () => {
    expect(debtBalance(owe, [payment("d2", 500_00)]).balanceCents).toBe(8000_00);
  });

  it("totals each direction separately, settled debts falling out on their own", () => {
    const txns = [payment("d1", 2500_00), payment("d2", 1500_00, false)];
    expect(owedTotals([owe, lent], txns)).toEqual({ oweCents: 5500_00, owedCents: 0 });
  });

  /* The whole reason a repayment is a transfer. If it counted as spending it
     would land in the category totals and make the month's report a lie. */
  it("never counts as spending or income", () => {
    const txns = [payment("d1", 2500_00), payment("d2", 1500_00, false)];
    expect(monthSummary(txns, new Date(2026, 6, 15))).toEqual({
      income: 0,
      expense: 0,
      net: 0,
    });
    expect(categoryBreakdown(txns, new Date(2026, 6, 15))).toEqual([]);
  });

  /* Paying out reduces the wallet; being repaid increases it. Neither has a
     second wallet on the other end — the debt itself is the other end. */
  it("moves exactly one wallet, in the right direction", () => {
    const wallets = [wallet("gcash", 10_000_00)];
    expect(walletBalances([payment("d1", 2500_00)], wallets).get("gcash")).toBe(7500_00);
    expect(walletBalances([payment("d2", 1500_00, false)], wallets).get("gcash")).toBe(11_500_00);
  });
});

describe("daysOnList", () => {
  it("counts whole days since it was added", () => {
    const now = new Date(2026, 6, 20, 12);
    expect(daysOnList(new Date(2026, 6, 8, 12).toISOString(), now)).toBe(12);
    expect(daysOnList(now.toISOString(), now)).toBe(0);
  });
});

describe("topCategories", () => {
  it("ranks subs by how often they were logged, seeded order as the tiebreak", () => {
    const txns: Txn[] = [
      txn({ categoryId: "dining" }),
      txn({ categoryId: "dining" }),
      txn({ categoryId: "fuel" }),
    ];
    const picks = topCategories(txns, tree, "expense", 3);
    expect(picks.map((p) => p.categoryId)).toEqual(["dining", "fuel", "groceries"]);
    expect(picks[0]).toMatchObject({ parentId: "food", name: "Dining Out", accent: "clay" });
  });

  it("falls back to seeded order before any history exists", () => {
    expect(topCategories([], tree, "expense", 2).map((p) => p.categoryId)).toEqual([
      "groceries",
      "dining",
    ]);
  });
});
