/** Manna's own router — no dependency. Six flat routes, no dynamic segments,
 *  no nested layouts, and navigation only ever happens through existing
 *  onClick handlers (there are no `<a href>` links to intercept) — narrow
 *  enough that a router library would cost more bundle weight than it saves.
 *
 *  Standalone, this drives the real History API, so the URL bar, refresh,
 *  and the browser's own Back/Forward all work. Embedded in Tiswell's
 *  iframe, `history.pushState` still lands in the *iframe's own* entry in
 *  the browser's joint session history — the top-level page's Back button
 *  would start stepping back through Manna's internal navigation instead of
 *  Tiswell's own. So embedded, this stays in memory and never touches
 *  `window.history` at all. */
import { useEffect, useState } from "react";

import { embedded } from "@data/AuthGate";

/** Only meaningful when `embedded` — a plain stack standing in for browser
 *  history, since there is no real one to borrow. */
const memoryStack: string[] = ["/"];

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function currentPath(): string {
  return embedded ? memoryStack[memoryStack.length - 1] : window.location.pathname;
}

/** Go to `path`. `replace` is for tab switches (Home/Month/Plan/Wallets) —
 *  those shouldn't pile up Back-button entries, the way a native tab bar
 *  doesn't. Drill-downs (Settings, Owed) call this without `replace`, so
 *  their own Back button (`goBack`) returns to the exact tab you came from. */
export function navigate(path: string, opts?: { replace?: boolean }): void {
  if (currentPath() === path) return;
  if (embedded) {
    if (opts?.replace) memoryStack[memoryStack.length - 1] = path;
    else memoryStack.push(path);
  } else if (opts?.replace) {
    window.history.replaceState(null, "", path);
  } else {
    window.history.pushState(null, "", path);
  }
  notify();
}

export function goBack(): void {
  if (embedded) {
    if (memoryStack.length > 1) memoryStack.pop();
    notify();
    return;
  }
  window.history.back();
}

/** The current pathname, re-rendering whenever it changes — from `navigate`,
 *  from `goBack`, or from the browser's own Back/Forward when standalone. */
export function useRoute(): string {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    listeners.add(onChange);
    if (!embedded) window.addEventListener("popstate", onChange);
    return () => {
      listeners.delete(onChange);
      if (!embedded) window.removeEventListener("popstate", onChange);
    };
  }, []);
  return path;
}
