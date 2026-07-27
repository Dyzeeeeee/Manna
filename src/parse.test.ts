import { describe, expect, it } from "vitest";

import { buildDraftSchema, sanitizeDraft, type ParsedDraft } from "./parse";
import type { Category, Wallet } from "./money";

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

const wallet = (id: string): Wallet => ({
  id,
  name: id,
  openingCents: 0,
  createdAt: "2026-01-01T00:00:00Z",
});
const wallets = [wallet("gcash"), wallet("cash"), wallet("savings")];

const parsed = (over: Partial<ParsedDraft> = {}): ParsedDraft => ({
  kind: "expense",
  amountCents: 20000,
  categoryId: null,
  walletId: null,
  toWalletId: null,
  note: "",
  confidence: "high",
  ...over,
});

describe("buildDraftSchema", () => {
  it("pins category and wallet ids to the live lists", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildDraftSchema(categories, wallets) as any;
    expect(schema.properties.categoryId.anyOf[0].enum).toEqual(["food", "dining", "salary"]);
    expect(schema.properties.walletId.anyOf[0].enum).toEqual(["gcash", "cash", "savings"]);
  });

  it("leaves archived categories out of the enum", () => {
    const withArchived = [...categories, cat({ id: "old", name: "Old", archived: true })];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = buildDraftSchema(withArchived, wallets) as any;
    expect(schema.properties.categoryId.anyOf[0].enum).not.toContain("old");
  });
});

describe("sanitizeDraft", () => {
  it("keeps a real category, trims the note, and passes the amount through", () => {
    const d = sanitizeDraft(parsed({ categoryId: "dining", note: "  Jollibee  " }), categories, wallets);
    expect(d.categoryId).toBe("dining");
    expect(d.note).toBe("Jollibee");
    expect(d.amountCents).toBe(20000);
  });

  it("drops a category id that no longer exists", () => {
    const d = sanitizeDraft(parsed({ categoryId: "ghost" }), categories, wallets);
    expect(d.categoryId).toBeUndefined();
  });

  it("requires a transfer's two wallets to differ and carries no category", () => {
    const same = sanitizeDraft(
      parsed({ kind: "transfer", walletId: "gcash", toWalletId: "gcash", categoryId: "dining" }),
      categories,
      wallets,
    );
    expect(same.walletId).toBe("gcash");
    expect(same.toWalletId).toBeUndefined();
    expect(same.categoryId).toBeUndefined();

    const ok = sanitizeDraft(
      parsed({ kind: "transfer", walletId: "gcash", toWalletId: "savings" }),
      categories,
      wallets,
    );
    expect(ok.toWalletId).toBe("savings");
  });

  it("rejects a non-positive or non-integer amount", () => {
    expect(sanitizeDraft(parsed({ amountCents: 0 }), categories, wallets).amountCents).toBeUndefined();
    expect(sanitizeDraft(parsed({ amountCents: 200.5 }), categories, wallets).amountCents).toBeUndefined();
    expect(sanitizeDraft(parsed({ amountCents: null }), categories, wallets).amountCents).toBeUndefined();
  });

  it("caps a runaway note at the field limit", () => {
    const d = sanitizeDraft(parsed({ note: "x".repeat(80) }), categories, wallets);
    expect(d.note).toHaveLength(60);
  });

  it("defaults an unrecognised kind to expense", () => {
    const d = sanitizeDraft(parsed({ kind: "weird" as ParsedDraft["kind"] }), categories, wallets);
    expect(d.kind).toBe("expense");
  });
});
