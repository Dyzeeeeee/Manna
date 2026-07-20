import { describe, expect, it } from "vitest";

import { monthSummary, parseAmount, type Txn } from "./money";

const txn = (over: Partial<Txn>): Txn => ({
  id: "t",
  kind: "expense",
  amountCents: 100,
  note: "",
  createdAt: "2026-07-19T08:00:00Z",
  ...over,
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

describe("monthSummary", () => {
  it("totals only the current month and nets income vs expense", () => {
    const now = new Date("2026-07-19T12:00:00Z");
    const lastMonth = new Date("2026-06-19T12:00:00Z").toISOString();
    const txns: Txn[] = [
      txn({ kind: "income", amountCents: 500_00 }),
      txn({ kind: "expense", amountCents: 120_00 }),
      txn({ kind: "expense", amountCents: 80_00 }),
      txn({ kind: "expense", amountCents: 999_00, createdAt: lastMonth }),
    ];
    expect(monthSummary(txns, now)).toEqual({
      income: 500_00,
      expense: 200_00,
      net: 300_00,
    });
  });
});
