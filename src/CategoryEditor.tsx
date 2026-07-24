import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";

import { accentBg } from "./Amount";
import { ACCENTS, type Accent, type Category } from "./money";
import { saveCategory } from "./store";

/** CLAUDE.md's rule 2: parents are picked on every log, so they must fit one
 *  screen. Twelve is the ceiling; the button refuses the thirteenth. */
const MAX_PARENTS = 12;

const byOrder = (a: Category, b: Category) =>
  a.order - b.order || a.createdAt.localeCompare(b.createdAt);

type Editing = { level: "parent" | "sub"; id: string } | null;

/** Categories, as the only place the taxonomy can be changed.
 *
 *  Two levels and no more, so there is no "add a sub-subcategory" anywhere in
 *  here — a third level would be a note or a tag instead. Archiving rather than
 *  deleting is the default action: every past transaction keeps pointing at a
 *  real category, the category just stops being offered on new logs. */
export function CategoryEditor({ categories }: { categories: Category[] }) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [openParent, setOpenParent] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [showArchived, setShowArchived] = useState(false);

  const parents = categories.filter((c) => c.for === kind && !c.parentId).sort(byOrder);
  const live = parents.filter((p) => !p.archived);
  const archived = categories.filter((c) => c.archived && c.for === kind);
  const subsOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId && !c.archived).sort(byOrder);

  async function addParent() {
    if (live.length >= MAX_PARENTS) return;
    // first accent not already spoken for on this side of the ledger
    const taken = new Set(live.map((p) => p.accent));
    const accent = ACCENTS.find((a) => !taken.has(a)) ?? ACCENTS[live.length % ACCENTS.length];
    const id = crypto.randomUUID();
    await saveCategory({
      id,
      name: "New category",
      for: kind,
      accent,
      order: live.length,
      createdAt: new Date().toISOString(),
    });
    setOpenParent(id);
    setEditing({ level: "parent", id });
  }

  async function addSub(parent: Category) {
    const id = crypto.randomUUID();
    await saveCategory({
      id,
      name: "New subcategory",
      for: parent.for,
      parentId: parent.id,
      order: subsOf(parent.id).length,
      createdAt: new Date().toISOString(),
    });
    setEditing({ level: "sub", id });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-umber-700">
        Two levels only. Merchants belong in the transaction note, not here — "Jollibee" is a
        note, not a category. Keep parents between 8 and 12 so they fit one screen.
      </p>

      <div className="flex rounded-control bg-clay-200 p-1">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              setOpenParent(null);
              setEditing(null);
            }}
            aria-pressed={kind === k}
            className={`min-h-11 flex-1 rounded-control font-display text-sm font-semibold capitalize transition-colors duration-150 ${
              kind === k ? "bg-raised text-umber-900 shadow-soft" : "text-umber-700"
            }`}
          >
            {k === "expense" ? "Expenses" : "Income"}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
        {live.map((parent, i) => {
          const open = openParent === parent.id;
          const subs = subsOf(parent.id);

          return (
            <div key={parent.id} className={i === 0 ? "" : "border-t border-sand-300/50"}>
              {editing?.level === "parent" && editing.id === parent.id ? (
                <CategoryForm
                  category={parent}
                  showColour
                  onDone={() => setEditing(null)}
                />
              ) : (
                <div className="flex items-center gap-2 px-4">
                  <button
                    type="button"
                    onClick={() => setOpenParent(open ? null : parent.id)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
                  >
                    <ChevronRight
                      aria-hidden
                      className={`size-4 shrink-0 text-umber-700 transition-transform duration-200 ${
                        open ? "rotate-90" : ""
                      }`}
                    />
                    <span
                      aria-hidden
                      className={`size-2.5 shrink-0 rounded-control ${
                        accentBg[parent.accent ?? "sage"]
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate font-display font-semibold">
                      {parent.name}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-umber-700">
                      {subs.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing({ level: "parent", id: parent.id })}
                    className="shrink-0 rounded-control px-3 py-1.5 font-display text-xs font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
                  >
                    Edit
                  </button>
                </div>
              )}

              {open && (
                <div className="ml-7 border-l-2 border-sand-300/60 pb-3 pl-3">
                  {subs.map((sub) =>
                    editing?.level === "sub" && editing.id === sub.id ? (
                      <CategoryForm key={sub.id} category={sub} onDone={() => setEditing(null)} />
                    ) : (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setEditing({ level: "sub", id: sub.id })}
                        className="flex w-full items-center gap-2 border-b border-sand-300/40 py-2.5 pr-2 text-left text-sm transition-colors duration-150 last:border-b-0 hover:text-umber-900"
                      >
                        <span className="min-w-0 flex-1 truncate">{sub.name}</span>
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() => void addSub(parent)}
                    className="mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-sand-300 text-sm font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
                  >
                    <Plus aria-hidden className="size-3.5" />
                    Add subcategory to {parent.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        variant="ghost"
        onClick={() => void addParent()}
        disabled={live.length >= MAX_PARENTS}
        className="gap-2 self-center"
      >
        <Plus className="size-4" />
        Add a parent category
      </Button>

      <p className="text-center text-sm text-umber-700">
        {live.length >= MAX_PARENTS
          ? "Twelve parents is the ceiling. Add a subcategory instead."
          : `${live.length} parent categories. Keep it between 8 and 12 so they fit one screen.`}
      </p>

      {archived.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 self-start font-display text-sm font-semibold text-umber-700"
          >
            <ChevronRight
              aria-hidden
              className={`size-4 transition-transform duration-200 ${showArchived ? "rotate-90" : ""}`}
            />
            Archived · {archived.length}
          </button>

          {showArchived && (
            <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
              {archived.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i === 0 ? "" : "border-t border-sand-300/50"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-umber-700">
                    {c.name}
                    {c.parentId && <span className="text-umber-700/70"> · subcategory</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => void saveCategory({ ...c, archived: false })}
                    className="shrink-0 rounded-control px-3 py-1.5 font-display text-xs font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-umber-700">
        Archiving keeps every past transaction intact — the category just stops appearing when
        you log something new.
      </p>
    </div>
  );
}

/** Rename, recolour, archive. One form for both levels; only a parent owns a
 *  colour, so only a parent is offered the swatches. */
function CategoryForm({
  category,
  showColour = false,
  onDone,
}: {
  category: Category;
  showColour?: boolean;
  onDone: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [accent, setAccent] = useState<Accent>(category.accent ?? "sage");

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveCategory({
      ...category,
      name: trimmed,
      ...(showColour ? { accent } : {}),
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 border-y border-sage-500/40 bg-clay-200/50 p-4">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
        aria-label="Category name"
        maxLength={28}
        autoFocus
      />

      {showColour && (
        <div className="flex flex-col gap-2">
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
            Colour
          </p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a)}
                aria-label={a}
                aria-pressed={a === accent}
                className={`size-7 rounded-control ${accentBg[a]} ${
                  a === accent ? "ring-2 ring-umber-900 ring-offset-2 ring-offset-clay-200" : ""
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => void saveCategory({ ...category, archived: true }).then(onDone)}
          className="px-4"
        >
          Archive
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone} className="px-4">
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
