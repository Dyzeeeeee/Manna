import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@ui/tokens.css";

import Finances from "../src";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4">
      <header className="flex items-center justify-between py-3">
        <span className="font-display text-xl font-semibold lowercase tracking-wide">
          tis<span className="text-sage-500">.</span>well
        </span>
        <span className="rounded-control bg-clay-200 px-3 py-1 font-display text-xs font-semibold text-umber-700">
          standalone dev · sandbox data
        </span>
      </header>
      <main className="pb-10">
        <Finances />
      </main>
    </div>
  </StrictMode>,
);
