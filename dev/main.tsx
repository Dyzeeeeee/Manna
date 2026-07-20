import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@ui/tokens.css";

import Finances from "../src";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-4">
      <Finances />
    </div>
  </StrictMode>,
);
