# @tiswell/finances

The Finances mini-app for [Tiswell](../TisWell/README.md), developed in its
own folder but compiled **into** the Tiswell app.

## How it connects

- Tiswell's `vite.config.ts` aliases `@tiswell/finances` to this folder's
  `src/`, and `src/shell/registry.ts` registers the manifest (tile, route,
  lazy component). No shell internals are edited — the mini-app contract.
- All storage goes through Tiswell's `TiswellData` interface (`@data/local`),
  namespace `"finances"`. Because this code runs inside the Tiswell app, it
  shares the same IndexedDB database as every other mini-app — that is what
  makes cross-app connectivity (e.g. reading inbox captures) possible.
- UI comes from Tiswell's design system (`@ui/*`) so it looks like one app.

## Working here

Two ways to run:

```sh
pnpm dev    # standalone at http://localhost:5174 — own sandbox database
pnpm test   # this package's tests
```

Standalone dev borrows the host's design system and data layer source, but
runs on its own origin, so its database is a separate dev sandbox — perfect
for experimenting without touching real data.

The real thing always runs from the host:

```sh
cd ../TisWell
pnpm dev    # whole app incl. this mini-app, real shared database
pnpm build  # bundles this package into the production app
```
