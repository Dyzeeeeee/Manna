# Manna

A personal stewardship log. Not a budgeting app — the question it answers is
"have I given first," not "how much did I spend." Single user.

`manna-prototype.html` in this repo is the visual and interaction reference.
Open it before changing any screen. It is a throwaway prototype, not production
code — read it for layout, copy, and flow, not architecture.

---

## Constraints

- **PWA, offline-first.** No native app. Logging must work with no network.
- **Separate deployment** from Tiswell, but shares Tiswell's database.
- **Currency is PHP only.** No multi-currency, ever.
- **All copy in formal English.** No Tagalog. "Motor upkeep," not "motor gastos."
  "Money borrowed and lent," not "utang at pautang."
- **The bar to clear:** log a real expense in under 5 seconds, offline, and see it
  correctly in Month after a reload.

---

## Data model

**Transaction** — amount, category (parent + optional subcategory), wallet, date,
optional note, kind.

`kind` is one of `in`, `out`, `transfer`. This matters more than it looks:

- Moving money to savings is a `transfer`, not spending.
- Paying down a debt is a `transfer`, not spending. Your cash drops and your
  obligation drops by the same amount — nothing was consumed.
- Transfers never appear in category totals. If they do, the reports lie.

**Wallet** — GCash, Cash, Maribank, GoTyme, Wise, Savings. Savings is a wallet,
not a category. The Wallets grand total answers "what can I spend today," so
anything not spendable stays out of it.

**Category** — parent plus optional subcategory. Two levels, never three.

**Debt** — person, direction (owe / owed), principal, opened date, optional due
date, status. Payments are not new objects: they are transactions carrying a
`debt_id` and no category. Balance is principal minus linked payments, so partial
payments need no extra code.

**Recurring** — a template: category, amount, wallet, day of month. Generates a
proposal each month. Does not create a transaction until approved.

**Allotment** — a cap on a category. Giving is a floor instead of a ceiling.

---

## Category rules

Enforce these. They are what keeps the taxonomy from rotting.

1. **Two levels, never three.** If a sub-sub is wanted, it is a note or a tag.
2. **Parents stay at 8–12.** They must fit one screen with no scrolling, because
   a parent is picked on every log. Refuse to create a 13th.
3. **Subcategory is optional.** Logging to a bare parent must be one tap. A
   hurried log that gets sorted later beats a log that never happened.
4. **Merchants are never subcategories.** "Jollibee" goes in the note field.
   Merchants as categories grow without limit and make reports meaningless.

Expense parents: Food, Transportation, Housing & Utilities, Communication & Tech,
Health, Personal, Giving, Learning, Leisure, Financial, Work.

Income parents: Earned, Business, Passive, Other.

Each parent owns a colour **and an icon**, both editable in Settings. Bars,
ticks, chips, and tiles read from them.

A subcategory has neither of its own. Colour is inherited outright. The icon
resolves: the sub's own name first — "Dental" gets a tooth, not Health's
heartbeat — then the parent's, then a fallback tag. That order is why Rule 1
costs nothing visually: two levels still give every row a distinct shape.

Icons come from one catalogue in `src/icons.tsx`, keyed by stable strings
(`"utensils"`, not a component). The key is what is stored on the category, so
the library behind it can be replaced by editing that one file.

---

## Screens

- **Home** — spendable total, reminders, month summary with pace against average,
  allotments running hot, today's transactions.
- **Month** — six-month in/out chart, then categories ranked by amount with their
  subcategory breakdown.
- **Add** — full-screen sheet from the centre button. Built-in numpad, not the
  system keyboard: the system keyboard covers the categories and forces you to
  type blind. Amount, note, wallet, and categories all visible at once.
- **Plan** — three tabs. Expected (approve or skip), Allotments (progress),
  Considering (things being weighed).
- **Wallets** — balances, spendable grand total, and a separate Owed panel.
- **Owed** — debts and loans both directions, with payment history.
- **Settings** — Categories, Recurring, Allotments, General.

**Plan shows status. Settings holds the rules.** Do not make Plan editable.

---

## Decisions already made — do not relitigate

**No bank sync.** Only a handful of PH banks are reachable by any aggregator, and
those aggregators are B2B with contracts and compliance onboarding. Not available
to a solo developer. If capture is ever automated it will be SMS or notification
parsing on Android via MacroDroid or a small sideloaded listener posting to the
API — which keeps Manna a pure PWA.

**Recurring items are approved, not auto-logged.** Silent monthly deductions are
exactly the passivity this app exists to work against. The amount stays editable
at the moment of approval, because bills vary.

**There is no God/Others/Needs/Wants split.** It existed, then was derived from
the category, then was removed. Categories are the only classification. Do not
reintroduce it.

**Giving is a normal parent category.** The stewardship function is carried by
two things: the tithe strip on Home, and the Giving allotment being a floor while
every other allotment is a ceiling.

**To-buys live here. To-sells live in Tiswell.** Manna owns money that moves;
Tiswell owns things you have. A to-buy is money about to move. A to-sell is a
possession.

**Owed stays out of the spendable grand total.** Money lent out cannot be spent.
Rolling it in would turn that number into net worth, which answers a different
question.

---

## Out of scope

No bank sync. No multi-currency. No receipt photos. No business ledger. No
merchant-level categories. No third category level.

---

## Build order

1. **v1** — wallets, categories, transactions, transfers, the add sheet, Home,
   Month, Wallets, Settings. Offline. Done when the 5-second bar is met.
2. **v1.1** — recurring with approval, allotments, search, CSV export.
3. **v1.5** — Owed screen. Add `debt_id` (nullable) and the no-category flag to
   the transaction schema in v1 so this needs no migration.
4. **Later** — Considering, Tiswell quick-capture handoff, SMS capture.

---

## Not built yet, worth knowing

- Rule 4 has no enforcement. Nothing counts three occurrences before allowing a
  new subcategory. The app could suggest one when a note repeats — that is the
  rule most worth automating.
- Moving a category between parents is not decided: does it rewrite history, or
  apply going forward only? Pick deliberately.
