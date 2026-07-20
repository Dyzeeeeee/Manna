# Manna (@tiswell/manna)

A standalone finance app in the [Tiswell](../TisWell/README.md) family:
expense/income log with a monthly in/out/net summary (₱, stored as integer
centavos). Named for the daily bread provided in the wilderness —
provision, one day at a time.

## How it connects to Tiswell

This is its **own app with its own database** — Tiswell doesn't compile it
in. It appears in Tiswell as an embedded tile:

1. Run it (`pnpm dev` → http://localhost:5174).
2. In Tiswell → Settings → Apps, paste `localhost:5174`.
3. The tile opens the app embedded under Tiswell's chrome.

Because it lives at its own address, browsers give it separate storage:
its transactions are not in Tiswell's database. That's the accepted
trade-off of the all-external architecture.

## Shared design system

It borrows Tiswell's tokens, UI components, and `TiswellData` layer as
source, via aliases in [vite.config.ts](vite.config.ts) pointing at
`../TisWell/src` — so both folders must sit side by side, and the app
always looks unmistakably Tiswell. `resolve.dedupe` keeps react to a
single copy.

## Commands

```sh
pnpm dev    # http://localhost:5174
pnpm test   # money utils tests
```

When this app should live on your phone, deploy it to its own URL and
paste that into Tiswell instead of localhost. (Its build needs the
sibling TisWell folder present, because of the source aliases.)
