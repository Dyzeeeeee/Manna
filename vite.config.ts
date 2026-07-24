/// <reference types="vitest/config" />
import { existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

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
    dedupe: ["react", "react-dom", "lucide-react", "@instantdb/react", "dexie"],
  },
  server: {
    // bind all interfaces so a phone on the same wifi can reach the dev server
    host: true,
    port: 5174,
    strictPort: true,
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
