import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";
import { Select } from "@ui/Select";

import {
  formatMoney,
  parentCategories,
  parseAmount,
  subcategoriesOf,
  type Allotment,
  type Category,
  type Recurring,
  type Wallet,
} from "./money";
import {
  removeAllotment,
  removeRecurring,
  saveAllotment,
  saveConsidering,
  saveRecurring,
} from "./store";

/** The two-level category picker as a grouped native select — shared by all
 *  three editors below, because every rule points at a category. */
function CategorySelect({
  categories,
  value,
  onChange,
  label,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">No category</option>
      {parentCategories(categories, "expense").map((parent) => (
        <optgroup key={parent.id} label={parent.name}>
          <option value={parent.id}>{parent.name} — whole category</option>
          {subcategoriesOf(categories, parent.id).map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-sand-300/50 px-4 py-3 last:border-b-0">
      {children}
    </div>
  );
}

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-accent-rust"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

/* ── Recurring ────────────────────────────────────────────────────────────── */

export function RecurringEditor({
  recurring,
  categories,
  wallets,
}: {
  recurring: Recurring[];
  categories: Category[];
  wallets: Wallet[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-umber-700">
        These propose themselves each month. Nothing is logged until you approve it on Plan, and
        the amount stays editable at that moment — because bills vary.
      </p>

      {recurring.length > 0 && (
        <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
          {recurring.map((item) => (
            <Row key={item.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate">{item.name}</p>
                <p className="truncate text-sm text-umber-700">
                  {[
                    categories.find((c) => c.id === item.categoryId)?.name,
                    wallets.find((w) => w.id === item.walletId)?.name,
                    `day ${item.dayOfMonth} of the month`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="shrink-0 font-display font-semibold tabular-nums">
                {formatMoney(item.amountCents)}
              </span>
              <DeleteButton
                onClick={() => void removeRecurring(item.id)}
                label={`Delete ${item.name}`}
              />
            </Row>
          ))}
        </div>
      )}

      {adding ? (
        <RecurringForm
          categories={categories}
          wallets={wallets}
          onDone={() => setAdding(false)}
        />
      ) : (
        <Button variant="ghost" onClick={() => setAdding(true)} className="gap-2 self-center">
          <Plus className="size-4" />
          Add a recurring item
        </Button>
      )}
    </div>
  );
}

function RecurringForm({
  categories,
  wallets,
  onDone,
}: {
  categories: Category[];
  wallets: Wallet[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [day, setDay] = useState("1");

  const amountCents = parseAmount(amount);
  const dayOfMonth = Number(day);
  const valid =
    name.trim() !== "" &&
    amountCents !== null &&
    Number.isInteger(dayOfMonth) &&
    dayOfMonth >= 1 &&
    dayOfMonth <= 31;

  async function save() {
    if (!valid || amountCents === null) return;
    await saveRecurring({
      id: crypto.randomUUID(),
      name: name.trim(),
      amountCents,
      dayOfMonth,
      categoryId: categoryId || undefined,
      walletId: walletId || undefined,
      createdAt: new Date().toISOString(),
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile bg-clay-100 p-4 shadow-soft">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (Rent, Internet, Tithe…)"
        aria-label="Name"
        maxLength={40}
        autoFocus
      />
      <div className="flex gap-2">
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Usual amount (₱)"
          aria-label="Usual amount in pesos"
          className="tabular-nums"
        />
        <Input
          inputMode="numeric"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="Day of the month"
          className="w-28 tabular-nums"
        />
      </div>
      <CategorySelect
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        label="Category"
      />
      <Select
        value={walletId}
        onChange={(e) => setWalletId(e.target.value)}
        aria-label="Wallet"
      >
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </Select>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} className="px-4">
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={!valid}>
          Save
        </Button>
      </div>
    </div>
  );
}

/* ── Allotments ───────────────────────────────────────────────────────────── */

export function AllotmentEditor({
  allotments,
  categories,
}: {
  allotments: Allotment[];
  categories: Category[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-umber-700">
        Caps on variable spending. Giving is the one you set a floor for instead — at least this
        much, rather than at most.
      </p>

      {allotments.length > 0 && (
        <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
          {allotments.map((item) => (
            <Row key={item.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {categories.find((c) => c.id === item.categoryId)?.name ?? "Deleted category"}
                </p>
                <p className="truncate text-sm text-umber-700">
                  {item.kind === "floor"
                    ? "Floor — at least this much"
                    : "Ceiling — at most this much"}
                </p>
              </div>
              <span className="shrink-0 font-display font-semibold tabular-nums">
                {formatMoney(item.limitCents)}
              </span>
              <DeleteButton
                onClick={() => void removeAllotment(item.id)}
                label="Delete allotment"
              />
            </Row>
          ))}
        </div>
      )}

      {adding ? (
        <AllotmentForm categories={categories} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="ghost" onClick={() => setAdding(true)} className="gap-2 self-center">
          <Plus className="size-4" />
          Add an allotment
        </Button>
      )}
    </div>
  );
}

function AllotmentForm({
  categories,
  onDone,
}: {
  categories: Category[];
  onDone: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [kind, setKind] = useState<"ceiling" | "floor">("ceiling");

  const limitCents = parseAmount(limit);
  const valid = categoryId !== "" && limitCents !== null;

  async function save() {
    if (!valid || limitCents === null) return;
    await saveAllotment({
      id: crypto.randomUUID(),
      categoryId,
      limitCents,
      kind,
      createdAt: new Date().toISOString(),
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile bg-clay-100 p-4 shadow-soft">
      <CategorySelect
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        label="Category to cap"
      />
      <Input
        inputMode="decimal"
        value={limit}
        onChange={(e) => setLimit(e.target.value)}
        placeholder="Amount (₱)"
        aria-label="Limit in pesos"
        className="tabular-nums"
      />

      <div className="flex rounded-control bg-clay-200 p-1">
        {(["ceiling", "floor"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`min-h-11 flex-1 rounded-control font-display text-sm font-semibold transition-colors duration-150 ${
              kind === k ? "bg-raised text-umber-900 shadow-soft" : "text-umber-700"
            }`}
          >
            {k === "ceiling" ? "Ceiling" : "Floor"}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} className="px-4">
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={!valid}>
          Save
        </Button>
      </div>
    </div>
  );
}

/* ── Considering ──────────────────────────────────────────────────────────── */

/** Lives here beside the other forms, but is rendered by Plan — a to-buy is not
 *  a rule, so Settings has no Considering tab. */
export function ConsideringForm({
  categories,
  onDone,
}: {
  categories: Category[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const amountCents = parseAmount(amount);
  const valid = name.trim() !== "" && amountCents !== null;

  async function save() {
    if (!valid || amountCents === null) return;
    await saveConsidering({
      id: crypto.randomUUID(),
      name: name.trim(),
      amountCents,
      categoryId: categoryId || undefined,
      createdAt: new Date().toISOString(),
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile bg-clay-100 p-4 shadow-soft">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="What is it?"
        aria-label="Name"
        maxLength={40}
        autoFocus
      />
      <Input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Roughly how much (₱)"
        aria-label="Amount in pesos"
        className="tabular-nums"
      />
      <CategorySelect
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        label="Category"
      />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} className="px-4">
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={!valid}>
          Save
        </Button>
      </div>
    </div>
  );
}
