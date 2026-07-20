import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/* Standalone dev harness only — production builds happen in ../TisWell,
   which compiles this package into the real app. Running here uses the
   host's design system + data layer source, but on its own origin, so
   the database is a separate dev sandbox (browser storage is per-origin). */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@ui", replacement: here("../TisWell/src/ui") },
      { find: "@data", replacement: here("../TisWell/src/data") },
    ],
    // host source files resolve packages from the host's node_modules —
    // dedupe pins everything to one copy so hooks don't break
    dedupe: ["react", "react-dom", "lucide-react", "dexie"],
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [here("."), here("../TisWell")] },
  },
});
