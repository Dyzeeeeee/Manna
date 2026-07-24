import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AuthGate } from "@data/AuthGate";
import "@ui/tokens.css";

import Manna from "../src";

/* Embedded in Tiswell, AuthGate adopts the host's session and Manna reaches
   the same database. Opened on its own, it shows the same sign-in form and
   reaches that database anyway — one Instant app either way. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* wider than Tiswell's max-w-3xl so the two-column layout has room when
        Manna is installed on its own; embedded in a tile it never gets that
        wide and falls back to the single column */}
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4">
      <AuthGate>
        <Manna />
      </AuthGate>
    </div>
  </StrictMode>,
);
