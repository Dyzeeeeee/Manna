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

Run everything from the TisWell app folder — it is the host:

```sh
cd ../TisWell
pnpm dev    # serves the whole app including this mini-app (live reload works)
pnpm test   # runs this package's tests too
pnpm build  # bundles this package into the production app
```

The devDependencies here exist only so editors resolve types in this folder;
the host app supplies the real react/lucide at build time.
