# Manna (@tiswell/manna)

A standalone finance app in the [Tiswell](../TisWell/README.md) family. Named
for the daily bread provided in the wilderness — provision, one day at a time.

Three screens:

- **Log** — the landing screen, built for speed. Type an amount, hit Add.
  Category and wallet come from whatever you used last, so the common case is
  two taps; tap any row afterwards to correct it.
- **Month** — in / out / net, where the money went, and arrows back through
  past months.
- **Wallets** — a balance per wallet and a grand total.

Amounts are Philippine pesos, stored as integer centavos — floats would drift a
centavo at a time through the sums and a ledger that doesn't add up is worse
than none.

Moving money between your own wallets is a **transfer**, a first-class kind
alongside in and out. It shifts both balances but is excluded from month totals
and the category breakdown: ₱2,000 from cash to GCash is not ₱2,000 earned and
₱2,000 spent. See `monthSummary` and `walletBalances` in
[money.ts](src/money.ts).

## How it connects to Tiswell

This is its **own app on its own origin** — Tiswell doesn't compile it in. It
appears in Tiswell as an embedded tile:

1. Run it (`pnpm dev` → http://localhost:5174).
2. In Tiswell → Settings → Apps, paste `localhost:5174`.
3. The tile opens the app embedded under Tiswell's chrome.

**It shares Tiswell's database.** Storage is a shared InstantDB app rather than
per-origin browser storage, so a transaction logged here and a capture jotted
in Tiswell live in the same place — and both sync to every device. Embedded, it
adopts the host's session over `postMessage` (`@data/handshake`), so there's no
second sign-in; opened on its own it shows the same sign-in form and reaches
the same data anyway.

## Setup

```sh
cp .env.example .env
```

`VITE_INSTANT_APP_ID` must be the **same** value as in `../TisWell/.env` — that
identical string is what makes them one database. `VITE_TISWELL_ORIGIN` lists
the origins this app will accept a session from; anything not listed is ignored.

## Shared design system

It borrows Tiswell's tokens, UI components, and `TiswellData` layer as
source, via aliases in [vite.config.ts](vite.config.ts) pointing at
`../TisWell/src` — so both folders must sit side by side, and the app
always looks unmistakably Tiswell. `resolve.dedupe` keeps react and
`@instantdb/react` to a single copy each.

## Commands

```sh
pnpm dev      # http://localhost:5174
pnpm build    # typecheck + production build (dist/)
pnpm preview  # serve the production build
pnpm test     # money model tests
pnpm icons    # regenerate public/icons from the mark in scripts/
```

## Layout

- `src/money.ts` — types and every pure calculation (totals, breakdowns,
  balances, month stepping). All the logic worth testing lives here.
- `src/store.ts` — namespaces, live hooks, seeding, sticky defaults
- `src/Home.tsx` / `Month.tsx` / `Wallets.tsx` — the three screens
- `src/TxnSheet.tsx` — the edit sheet, which is what makes amount-only
  logging safe rather than sloppy

Data sits in the shared database under `finances`, `finances:categories`, and
`finances:wallets`. Default categories and a Cash wallet are seeded on first
run with fixed ids, so two devices seeding before they sync upsert the same
rows instead of leaving duplicates.

Manna is installable: add it to your home screen and it runs standalone and
offline, same as Tiswell.

When this app should live on your phone, deploy it to its own URL, add that URL
to `VITE_TISWELL_ORIGIN`'s counterpart in Tiswell, and paste it into Tiswell's
Settings instead of localhost. (Its build needs the sibling TisWell folder
present, because of the source aliases.)
