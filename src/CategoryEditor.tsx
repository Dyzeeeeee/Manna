import { useEffect, useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";
import { Sheet } from "@ui/Sheet";

import { accentBg, CategoryIcon } from "./Amount";
import {
  glyph,
  ICON_GROUPS,
  IconAdd,
  IconArchive,
  IconEdit,
  IconForward,
  iconLabel,
  iconNameFor,
  type IconName,
} from "./icons";
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

  /* Sheet is a fixed overlay, not a real modal — it doesn't stop the page
     underneath from scrolling on its own, so the list keeps moving behind
     the sheet you're editing in unless something locks it here. */
  useEffect(() => {
    if (editing === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editing]);

  const parents = categories.filter((c) => c.for === kind && !c.parentId).sort(byOrder);
  const live = parents.filter((p) => !p.archived);
  const archived = categories.filter((c) => c.archived && c.for === kind);
  const subsOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId && !c.archived).sort(byOrder);

  /* One sheet for the whole editor rather than one form per row: what is being
     edited is looked up fresh from `categories` each render, and for a sub
     that means also finding its parent, which is where the accent and the
     icon fallback both actually live. */
  const editingCategory = editing && categories.find((c) => c.id === editing.id);
  const editingParent =
    editingCategory?.parentId !== undefined
      ? categories.find((c) => c.id === editingCategory.parentId)
      : undefined;

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
      // the neutral tag, until it is given a name or an icon of its own
      icon: "tag",
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
        note, not a category. Keep parents between 8 and 12 so they fit one screen. Colour is set
        on the parent and always inherited. A subcategory's icon can be set too — leave it alone
        and it matches its own name, falling back to the family's.
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
              <div className="flex items-center gap-1 px-4">
                <button
                  type="button"
                  onClick={() => setOpenParent(open ? null : parent.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
                >
                  <IconForward
                    aria-hidden
                    className={`size-4 shrink-0 text-umber-700 transition-transform duration-200 ${
                      open ? "rotate-90" : ""
                    }`}
                  />
                  {/* the real tile, not a swatch: what you are about to change
                      is exactly what the add sheet will show */}
                  <CategoryIcon
                    accent={parent.accent ?? "sage"}
                    name={parent.name}
                    icon={parent.icon}
                  />
                  <span className="min-w-0 flex-1 truncate font-display font-semibold">
                    {parent.name}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-umber-700">
                    {subs.length}
                  </span>
                </button>
                <EditButton
                  onClick={() => setEditing({ level: "parent", id: parent.id })}
                  label={`Edit ${parent.name}`}
                />
                <ArchiveButton
                  onClick={() => void saveCategory({ ...parent, archived: true })}
                  label={`Archive ${parent.name}`}
                />
              </div>

              {open && (
                <div className="ml-7 border-l-2 border-sand-300/60 pb-3 pl-3">
                  {/* Subs still take colour from the parent — rule 1 keeps that
                      inherited outright — but can now be given their own icon,
                      the same picker a parent gets, in the same edit sheet.
                      Left untouched, a sub's glyph is matched from its own
                      name, or the family's if nothing matches; SubGlyph shows
                      exactly that resolution. */}
                  {subs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-1 border-b border-sand-300/40 py-1 last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => setEditing({ level: "sub", id: sub.id })}
                        className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-left text-sm transition-colors duration-150 hover:text-umber-900"
                      >
                        <SubGlyph name={sub.name} inherit={parent.icon} />
                        <span className="min-w-0 flex-1 truncate">{sub.name}</span>
                      </button>
                      <ArchiveButton
                        onClick={() => void saveCategory({ ...sub, archived: true })}
                        label={`Archive ${sub.name}`}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => void addSub(parent)}
                    className="mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-sand-300 text-sm font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
                  >
                    <IconAdd aria-hidden className="size-3.5" />
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
        <IconAdd className="size-4" />
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
            <IconForward
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
                  <SubGlyph name={c.name} inherit={c.icon} />
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

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.level === "parent" ? "Edit category" : "Edit subcategory"}
      >
        {editingCategory && (
          <CategoryForm
            // remounts the form when what's being edited changes, so its
            // internal state (name/accent/icon) starts fresh rather than
            // carrying over from whichever category was open before
            key={editingCategory.id}
            category={editingCategory}
            showColour={editing?.level === "parent"}
            accent={
              (editing?.level === "parent" ? editingCategory.accent : editingParent?.accent) ??
              "sage"
            }
            inheritIcon={editing?.level === "sub" ? editingParent?.icon : undefined}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

/** The glyph a subcategory will be drawn with, shown but not editable. */
function SubGlyph({ name, inherit }: { name: string; inherit?: string }) {
  const Glyph = glyph(iconNameFor(undefined, name, inherit)).line;
  return <Glyph aria-hidden className="size-4 shrink-0 text-umber-700" />;
}

/** Rename, recolour (parent only), re-icon (either level), archive. One form
 *  for both levels: colour is inherited outright below a parent, so only a
 *  parent is offered that grid, but the icon picker is offered at both —
 *  `accent` is always the tile's real colour (the parent's own, or the
 *  parent's passed down for a sub) so the icon squares are tinted correctly
 *  either way. */
function CategoryForm({
  category,
  showColour = false,
  accent: accentProp,
  inheritIcon,
  onDone,
}: {
  category: Category;
  showColour?: boolean;
  accent: Accent;
  /** A sub's fallback below its own name match — the parent's icon, so the
   *  picker opens on what the row actually shows today, not a guess that
   *  ignores inheritance. Irrelevant for a parent, which has no further
   *  fallback of its own. */
  inheritIcon?: string;
  onDone: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [accent, setAccent] = useState<Accent>(accentProp);
  /* Seeded through the same resolver the rest of the app uses, so a category
     that has never been given its own icon opens on whatever it currently
     resolves to — name match, then inheritance, then the fallback tag —
     rather than on nothing; saving then makes that choice explicit instead of
     silently changing the glyph. */
  const [icon, setIcon] = useState<IconName>(() =>
    iconNameFor(category.icon, category.name, inheritIcon),
  );

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveCategory({
      ...category,
      name: trimmed,
      icon,
      ...(showColour ? { accent } : {}),
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* The live preview. Colour and icon are chosen separately below but
            only ever seen together, so the pair is shown as the finished tile
            rather than left to be imagined. */}
        <CategoryIcon accent={accent} name={name} icon={icon} className="size-11" />
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
        />
      </div>

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

      <IconPicker accent={accent} value={icon} onChange={setIcon} />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} className="px-4">
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={!name.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}

/** A parent's row is already a button (tap to expand); this is the second
 *  action beside it, so it reads as a glyph next to Archive rather than a
 *  label competing with the category name for attention. */
function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
    >
      <IconEdit className="size-4" />
    </button>
  );
}

/** Archive lives on the row, not in the edit sheet — same placement
 *  RuleEditors.tsx uses for its own DeleteButton, and one fewer thing
 *  crowding the sheet's Cancel/Save row. Neutral hover rather than a warning
 *  colour: unlike a hard delete, archiving keeps every past transaction
 *  intact and can be undone from the Archived list below. */
function ArchiveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
    >
      <IconArchive className="size-4" />
    </button>
  );
}

/** The catalogue as a grid, grouped by subject and capped in height so it never
 *  pushes the Save button off screen.
 *
 *  Grouped rather than one flat run of ninety squares: you arrive knowing
 *  roughly what you want — something to do with the house, something to do with
 *  money — and the headings turn that into a short scan. Every square is drawn
 *  in the accent currently selected, because an icon is never seen apart from
 *  its colour once it is in use. */
function IconPicker({
  accent,
  value,
  onChange,
}: {
  accent: Accent;
  value: IconName;
  onChange: (name: IconName) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
          Icon
        </p>
        <p className="text-xs text-umber-700">{iconLabel(value)}</p>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-tile bg-clay-100 p-2">
        {ICON_GROUPS.map((group) => (
          <section key={group.label} className="pb-1">
            <h4 className="px-1 pb-1.5 pt-2 text-xs text-umber-700">{group.label}</h4>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {group.names.map((name) => {
                const Glyph = glyph(name).fill;
                const selected = name === value;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onChange(name)}
                    aria-label={iconLabel(name)}
                    aria-pressed={selected}
                    title={iconLabel(name)}
                    className={`flex aspect-square items-center justify-center rounded-control transition duration-150 active:brightness-95 ${
                      selected
                        ? `${accentBg[accent]} text-clay-50`
                        : "bg-clay-200 text-umber-700 hover:text-umber-900"
                    }`}
                  >
                    <Glyph className="size-5" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
