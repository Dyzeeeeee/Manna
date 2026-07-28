/// <reference types="vitest/config" />
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/* ── Build stamp ───────────────────────────────────────────────────────────
   Baked in at compile time and shown in Settings. This exists because the
   service worker registers as `autoUpdate`: a stale build is served silently
   and looks exactly like a fresh one, so without a visible stamp there is no
   way to tell whether an update actually landed. Version alone can't answer
   that — it only moves when someone remembers to bump it — which is why the
   commit and the build time are here too. */

const pkg = JSON.parse(readFileSync(here("package.json"), "utf8")) as { version: string };

/** The commit being built. Falls back to the CI-provided sha, then to nothing:
 *  a deploy host may build from a tarball with no .git at all, and a missing
 *  stamp must never fail the build. */
function commit(): string {
  const fromCI = process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromCI) return fromCI.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

/* Where Tiswell's source is found, in two situations:
   - working locally, it's the sibling folder you actually edit
   - building on a host, there is no sibling — only the git submodule cloned
     into this repo, which is why TisWell is a submodule at all
   Sibling wins so local edits are live without touching the submodule. Note
   the consequence: after changing Tiswell, push it *and* bump the submodule
   pointer here, or a deploy will build against the older pinned commit. */
const TISWELL = existsSync(here("../TisWell/src")) ? here("../TisWell") : here("TisWell");

/* Manna is its own app on its own origin — Tiswell embeds it as a tile, it
   doesn't compile it in. It borrows the host's design system and data layer
   as source, and because that data layer now talks to a shared Instant app
   rather than per-origin browser storage, both reach the same database. */
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit()),
    __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        // A stable identity for the installed app, independent of start_url —
        // without it the browser derives one from the URL, and changing that
        // later would register as a *different* app rather than an update.
        id: "/",
        name: "Manna",
        short_name: "Manna",
        description: "Daily bread, accounted for.",
        display: "standalone",
        /* Light values on purpose: a manifest cannot carry media queries, so
           these are one fixed pair whatever the system theme is. They only
           drive the launch splash — the address/status bar follows the
           theme-color meta tags in index.html, which do adapt. */
        background_color: "#F4EFE6",
        theme_color: "#F4EFE6",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: "@ui", replacement: `${TISWELL}/src/ui` },
      { find: "@data", replacement: `${TISWELL}/src/data` },
    ],
    // host source files resolve packages from the host's node_modules —
    // dedupe pins everything to one copy so hooks don't break. @instantdb/react
    // especially: a second copy would mean a second client, and the session
    // handed down from Tiswell would land in the wrong one.
    //
    // lucide-react stays in the list although Manna's own source no longer
    // imports it: the borrowed @ui components still do, and they compile as
    // part of this build.
    dedupe: [
      "react",
      "react-dom",
      "@remixicon/react",
      "lucide-react",
      "@instantdb/react",
      "dexie",
    ],
  },
  server: {
    // bind all interfaces so a phone on the same wifi can reach the dev server
    host: true,
    port: 5174,
    strictPort: true,
    // Vite 8 blocks Host headers it doesn't recognise; these let a friendly
    // name resolve to the dev server. `manna.localhost` needs no hosts-file
    // entry (browsers map *.localhost to loopback) and counts as a secure
    // context, so the service worker still registers — unlike `manna.test`,
    // which needs a `127.0.0.1 manna.test` line in the hosts file and, being
    // plain http on a custom name, won't run the PWA/offline layer.
    allowedHosts: ["manna.localhost", "manna.test"],
    fs: { allow: [here("."), TISWELL] },
  },
  preview: {
    host: true,
    port: 5174,
    strictPort: true,
  },
  test: {
    /* The TisWell submodule carries its own suite, and once it sits inside this
       repo vitest would happily run it too — `pnpm test` here should say
       whether *Manna* is sound, not re-run the host app's tests. */
    exclude: ["**/node_modules/**", "**/dist/**", "TisWell/**"],
  },
});
