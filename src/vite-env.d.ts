/// <reference types="vite/client" />

/* The env vars are declared once in the host's data layer, which Manna
   compiles through its @data alias. */
/// <reference path="../../TisWell/src/data/env.d.ts" />

/* Substituted literally by Vite's `define` at build time — see the build stamp
   block in vite.config.ts for why each one is here. Constants rather than
   `import.meta.env` because they are derived at compile time (package.json, the
   git commit, the clock), not read from the environment. */
declare const __APP_VERSION__: string;
/** Short sha, or "" where the build had no git and no CI variable to read. */
declare const __APP_COMMIT__: string;
declare const __APP_BUILT_AT__: string;
