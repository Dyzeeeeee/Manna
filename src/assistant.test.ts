import { describe, expect, it } from "vitest";

import {
  buildStewiTools,
  isReadTool,
  runReadTool,
  sanitizeProposedAction,
  type StewiContext,
} from "./assistant";
import type { Allotment, Category, Debt, Recurring, RecurringSkip, Txn, Wallet } from "./money";

const cat = (over: Partial<Category> = {}): Category => ({
  id: "c",
  name: "Category",
  for: "expense",
  order: 0,
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

const food = cat({ id: "food", name: "Food", accent: "clay" });
const dining = cat({ id: "dining", name: "Dining Out", parentId: "food", order: 1 });
const salary = cat({ id: "salary", name: "Salary", for: "income", accent: "sage" });
const categories = [food, dining, salary];

const wallet = (id: string): Wallet => ({ id, name: id, openingCents: 0, createdAt: "2026-01-01T00:00:00Z" });
const wallets = [wallet("gcash"), wallet("cash"), wallet("savings")];

const txn = (over: Partial<Txn> = {}): Txn =>
  ({
    id: "t1",
    kind: "expense",
    amountCents: 21_500,
    note: "Jollibee",
    categoryId: "dining",
    walletId: "gcash",
    createdAt: "2026-07-30T12:00:00Z",
    ...over,
  }) as Txn;

const recurring = (over: Partial<Recurring> = {}): Recurring => ({
  id: "r1",
  name: "Internet",
  categoryId: "food",
  walletId: "gcash",
  amountCents: 150_000,
  dayOfMonth: 5,
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

const debt = (over: Partial<Debt> = {}): Debt => ({
  id: "d1",
  person: "Ate",
  direction: "owe",
  principalCents: 500_000,
  openedAt: "2026-01-01T00:00:00Z",
  note: "",
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

function ctx(over: Partial<StewiContext> = {}): StewiContext {
  return {
    categories,
    wallets,
    txns: [txn()],
    allotments: [] as Allotment[],
    recurring: [recurring()],
    skips: [] as RecurringSkip[],
    debts: [debt()],
    now: new Date("2026-07-31T00:00:00Z"),
    ...over,
  };
}

describe("buildStewiTools", () => {
  it("pins category, wallet, recurring, and debt ids to the live lists", () => {
    const tools = buildStewiTools(ctx());
    const byName = (name: string) => tools.find((t) => t.name === name);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const propose = byName("propose_transaction")!.input_schema as any;
    expect(propose.properties.categoryId.enum).toEqual(["food", "dining", "salary"]);
    expect(propose.properties.walletId.enum).toEqual(["gcash", "cash", "savings"]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approval = byName("propose_recurring_approval")!.input_schema as any;
    expect(approval.properties.recurringId.enum).toEqual(["r1"]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payment = byName("propose_debt_payment")!.input_schema as any;
    expect(payment.properties.debtId.enum).toEqual(["d1"]);
  });

  it("includes all six read tools alongside the write tools", () => {
    const tools = buildStewiTools(ctx());
    for (const name of [
      "get_overview",
      "get_category_breakdown",
      "get_allotment_status",
      "get_recurring_status",
      "get_debts",
      "search_transactions",
    ]) {
      expect(isReadTool(name)).toBe(true);
      expect(tools.some((t) => t.name === name)).toBe(true);
    }
  });
});

describe("runReadTool", () => {
  it("returns undefined for a write tool name", () => {
    expect(runReadTool("propose_transaction", {}, ctx())).toBeUndefined();
  });

  it("get_overview reflects the loaded wallets and this month's txns", () => {
    const result = runReadTool("get_overview", {}, ctx()) as { spendableCents: number; walletCount: number };
    expect(result.walletCount).toBe(3);
    expect(result.spendableCents).toBe(-21_500);
  });

  it("search_transactions matches free text against note/category/wallet", () => {
    const result = runReadTool("search_transactions", { query: "jollibee" }, ctx()) as {
      transactions: { id: string }[];
    };
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].id).toBe("t1");

    const miss = runReadTool("search_transactions", { query: "nothing-like-this" }, ctx()) as {
      transactions: unknown[];
    };
    expect(miss.transactions).toHaveLength(0);
  });
});

describe("sanitizeProposedAction", () => {
  it("builds a create_transaction draft and drops an unrecognised category", () => {
    const ok = sanitizeProposedAction(
      "propose_transaction",
      { kind: "expense", amountCents: 20000, categoryId: "dining", note: "  Jollibee  " },
      ctx(),
    );
    expect(ok).toEqual({
      type: "create_transaction",
      draft: { kind: "expense", amountCents: 20000, note: "Jollibee", categoryId: "dining" },
    });

    const ghost = sanitizeProposedAction(
      "propose_transaction",
      { kind: "expense", amountCents: 20000, categoryId: "ghost" },
      ctx(),
    );
    expect("error" in ghost).toBe(false);
    if (!("error" in ghost) && ghost.type === "create_transaction") {
      expect(ghost.draft.categoryId).toBeUndefined();
    }
  });

  it("rejects a non-positive amount with an error rather than a silent default", () => {
    const result = sanitizeProposedAction("propose_transaction", { kind: "expense", amountCents: 0 }, ctx());
    expect("error" in result).toBe(true);
  });

  it("requires a transfer's two wallets to differ", () => {
    const result = sanitizeProposedAction(
      "propose_transaction",
      { kind: "transfer", amountCents: 5000, walletId: "gcash", toWalletId: "gcash" },
      ctx(),
    );
    expect("error" in result).toBe(false);
    if (!("error" in result) && result.type === "create_transaction") {
      expect(result.draft.toWalletId).toBeUndefined();
    }
  });

  it("resolves an edit against the live transaction and applies only the given fields", () => {
    const result = sanitizeProposedAction(
      "propose_transaction_edit",
      { txnId: "t1", amountCents: 25000 },
      ctx(),
    );
    expect(result).toMatchObject({
      type: "edit_transaction",
      original: { id: "t1", amountCents: 21_500 },
      next: { id: "t1", amountCents: 25000, categoryId: "dining" },
    });
  });

  it("errors on an edit/delete for an id that doesn't exist, pointing at search_transactions", () => {
    const edit = sanitizeProposedAction("propose_transaction_edit", { txnId: "nope" }, ctx());
    expect("error" in edit && edit.error).toMatch(/search_transactions/);

    const del = sanitizeProposedAction("propose_transaction_delete", { txnId: "nope" }, ctx());
    expect("error" in del && del.error).toMatch(/search_transactions/);
  });

  it("defaults a recurring approval's amount to the template's usual figure", () => {
    const result = sanitizeProposedAction("propose_recurring_approval", { recurringId: "r1" }, ctx());
    expect(result).toEqual({ type: "approve_recurring", recurring: recurring(), amountCents: 150_000 });
  });

  it("resolves a recurring skip", () => {
    const result = sanitizeProposedAction("propose_recurring_skip", { recurringId: "r1" }, ctx());
    expect(result).toEqual({ type: "skip_recurring", recurring: recurring() });
  });

  it("defaults a debt payment's amount to the remaining balance and requires a real wallet", () => {
    const result = sanitizeProposedAction(
      "propose_debt_payment",
      { debtId: "d1", walletId: "gcash" },
      ctx(),
    );
    expect(result).toEqual({
      type: "log_debt_payment",
      debt: debt(),
      amountCents: 500_000,
      walletId: "gcash",
    });

    const badWallet = sanitizeProposedAction(
      "propose_debt_payment",
      { debtId: "d1", walletId: "ghost" },
      ctx(),
    );
    expect("error" in badWallet).toBe(true);
  });

  it("errors on an unknown tool name", () => {
    const result = sanitizeProposedAction("propose_something_else", {}, ctx());
    expect("error" in result).toBe(true);
  });
});
