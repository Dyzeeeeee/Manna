# Manna — what to add for financial tracking

Working notes, not commitments. Ordered by what it costs against what it gives.

## Where it stands

Manna records three kinds of thing — money out, money in, and transfers between
your own wallets — against a category and a wallet, and answers three questions:
what have I got (Wallets), what did this month do (Month), what did I just spend
(Log). Every amount is integer centavos and every pure calculation lives in
[money.ts](src/money.ts) under test.

That's a **ledger**. Most of what follows is the difference between a ledger and
a tracker: a ledger tells you what happened, a tracker tells you whether it's
going the way you meant.

## Already half-built

**Category management has no screen.** `saveCategory` and `removeCategory` exist
in [store.ts](src/store.ts) and are called from nowhere. In practice you're
locked to the eight seeded categories forever — no adding "Utang" or "Load", no
renaming, no deleting one you'll never use. Wallets got this screen; categories
didn't. Cheapest real win on the list, and it's mostly a copy of
[Wallets.tsx](src/Wallets.tsx).

## Tier 1 — completes what's there

- **Categories screen.** Above. Small.
- **Search and date range.** There's currently no way to find "that ₱2,000 thing
  in March" except paging the Month view backwards. A search field over note and
  category name, plus a from/to date filter, uses the pure-function pattern
  already in `money.ts` and needs no data model change.
- **A confirmation after saving.** Right now the add sheet closes and the row
  appears; that's the entire feedback. A brief highlight on the new row would
  close the loop — this is the thing you flagged that I only half-fixed.

## Tier 2 — the actual tracking

- **Budgets per category per month.** The biggest single addition, and the one
  that fits the app's name: a cap you check yourself against, one month at a
  time. "Food: ₱8,000, ₱5,240 used, 12 days left." The Month view already
  computes `categoryBreakdown` — budgets are that number against a target.
- **Recurring transactions.** Rent, salary, subscriptions, tithe. Strong opinion:
  these should **prompt, not auto-write**. A ledger that inserts rows you didn't
  authorise is a ledger you stop trusting, and trusting it is the whole point.
  Due items appear as a "confirm these" strip on Log.
- **Trends.** Spend per month as a sparkline, and one category's line over time.
  Answers "is this getting worse", which no current screen can.
- **CSV export.** Partly a backup, partly trust — an app holding your money
  history should have a visible exit door. Cheap: it's a pure function over
  `Txn[]` plus a download.

## Tier 3 — bigger bets, each with a real cost

- **Debts / utang.** Money owed to and by named people, with partial payments.
  Genuinely useful in this context and currently tracked nowhere. Needs its own
  namespace and a screen; the tricky part is that a repayment is both a debt
  event and a wallet movement, and double-counting it would break the totals the
  same way transfers would have.
- **Savings goals.** A target amount and a date against a wallet. Small if it
  leans on `walletBalances`; the design question is whether a goal is a property
  of a wallet or its own thing.
- **Receipt photos.** The Instant app already has `$files` available, so the
  storage exists. Cost is UI and sync weight, not backend.
- **Shared or split expenses.** This one breaks the architecture, not just adds
  to it — see below. Worth wanting, worth costing properly first.
- **Multi-currency.** `money.ts` hardcodes `en-PH` and PHP. Everything is
  centavos-as-integers, so a second currency means a currency per wallet, a rate
  at time of transaction, and a decision about what a "total" across currencies
  even means. Large.

## Data model notes

The shared `records` table is deliberately generic — `ns`, `recordId`, `item` —
so **new collections need no schema push**. `finances:budgets`,
`finances:recurring`, `finances:debts` all just work, following the prefix
convention already in [store.ts](src/store.ts). That's a real advantage and
worth spending.

Two things that would need care:

- **Permissions are owner-scoped.** `instant.perms.ts` allows a row only when
  `auth.id == data.owner`. Everything above is fine under that rule *except*
  shared expenses, which needs rows visible to two accounts. That's a
  permissions redesign, not a feature.
- **Deleting a category must not orphan things.** Budgets and recurring items
  would both point at a category id. `walletBalances` already handles the
  equivalent for deleted wallets by skipping unknown ids — the same discipline
  applies.

## My ranking, if it were only me

1. Categories screen — it's a bug wearing a feature's clothes
2. Budgets — the thing that turns this into a tracker
3. CSV export — cheap, and it buys trust
4. Search — the gap you hit the first time you look for something
5. Recurring — high value, but design it as prompts

## Yours

_(space for what you had in mind)_
