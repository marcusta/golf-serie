# Admin Visual Design Rules

Guidelines for a clean, efficient admin UI that stays consistent with the player-facing design system while prioritizing density, alignment, and speed.

## Relationship to Player UI

The player UI emphasizes soft, welcoming containers and strong visual hierarchy through roundness and background contrast. The admin UI should:

- Keep the same color system and typography.
- Preserve the "one-level-of-containment" and "one-shadow" rules.
- Reduce roundness, padding, and decoration to improve scanning speed.
- Favor aligned grids, tables, and compact forms.

Reference: `docs/visual-design-rules.md`, `docs/STYLE_GUIDE.md`.

---

## Core Principles (Admin)

1. **Efficiency First**  
   Reduce visual noise, optimize for scanning, and minimize scroll.

2. **Alignment Over Decoration**  
   Use consistent grids, column widths, and row heights. Avoid ad-hoc spacing.

3. **Single Containment Level**  
   If a container has a border or shadow, inner elements are flat.

4. **Sharp = Operational**  
   Admin UI uses tighter corners and smaller padding to feel precise.

---

## Layout & Grid

- Use an **8px spacing system** (`gap-2`, `gap-4`, `px-4`, `py-2`).
- Prefer **two-column forms** on desktop; single column on mobile.
- Align primary page actions to the right of the page header.
- Keep **row heights consistent** within lists and tables (40-48px).

---

## Containers & Cards

Admin containers should be sharper and denser than player views.

**Recommended:**
- Outer container: `rounded-lg` + `border` or `shadow-sm`
- Inner content: `rounded` or no rounding
- Avoid nested shadows

```tsx
// Admin container (outer)
<div className="bg-scorecard rounded-lg border border-soft-grey shadow-sm p-4">
  {/* Inner content stays flat */}
  <div className="bg-white rounded">
    {/* Content */}
  </div>
</div>
```

**Avoid:**
- `rounded-2xl` on admin surfaces
- Card-per-row list items
- Nested shadows or borders

---

## Lists & Tables

Admin lists should read like tables: aligned columns, consistent row height, and clear dividers.

**Preferred pattern:**
```tsx
<div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
  <div className="grid grid-cols-[2fr_1fr_1fr_120px] px-4 py-2 text-xs font-semibold text-charcoal/70 uppercase tracking-wide border-b border-soft-grey">
    <div>Name</div>
    <div>Date</div>
    <div>Status</div>
    <div className="text-right">Actions</div>
  </div>
  <div className="divide-y divide-soft-grey">
    {rows.map(row => (
      <div key={row.id} className="grid grid-cols-[2fr_1fr_1fr_120px] px-4 py-2 text-sm items-center">
        <div className="font-medium text-charcoal">{row.name}</div>
        <div className="text-charcoal/70 tabular-nums">{row.date}</div>
        <div className="text-charcoal/70">{row.status}</div>
        <div className="flex justify-end gap-1">
          {/* icon buttons */}
        </div>
      </div>
    ))}
  </div>
</div>
```

**Rules:**
- Use `divide-y` instead of item cards.
- Align numeric data with `tabular-nums`.
- Keep action buttons in a fixed-width right column.

---

## Forms & Input Density

- Default input height: `h-9` (or `py-2`).
- Use `text-sm` for labels and inputs.
- Keep labels aligned in a grid; avoid uneven vertical stacking.
- Prefer shadcn UI form controls (Select, Input, Switch) over native browser elements for consistent styling.

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <label className="text-xs font-semibold text-charcoal/70 uppercase tracking-wide">
    Competition Name
  </label>
  <input className="h-9 px-3 border border-soft-grey rounded-md text-sm" />
</div>
```

---

## Buttons & Actions

Admin actions must be compact and uniform.

- Primary action: `rounded-md`, `h-9`, `px-3`, `text-sm`
- Secondary: outline or neutral background
- Icon buttons: `rounded-md`, `p-2`, consistent size

```tsx
<button className="h-9 px-3 rounded-md bg-turf text-scorecard text-sm font-medium">
  Save
</button>
<button className="h-9 px-3 rounded-md border border-soft-grey text-charcoal text-sm">
  Cancel
</button>
```

**Avoid:**
- `rounded-full` buttons in admin contexts
- Mixed button sizes in a single row

---

## Editing Surface Policy (Modal vs Full Page)

Use one consistent pattern across the admin:

- **Modal**: quick, low-risk edits (1–2 sections), minimal dependencies, can be completed in ~60 seconds.
- **Full page**: multi-step workflows, large forms, complex validation, or edits that require related data context.
- **Structural changes** (competitions, enrollments, tee times, scoring rules) should always be full page.
- **Batch-heavy tasks** should prefer inline rows or dedicated pages over modals.
- **Single-entity consistency**: pick a default per entity and keep it consistent.

**Default mapping:**
- Full page: Series, Tours, Competitions, Courses, Teams
- Modal: quick metadata edits (rename, visibility toggle, short description)

---

## Color Usage (Admin)

Use the TapScore palette consistently. Avoid arbitrary blues and purples.

**Preferred semantic colors:**
- Primary: `text-turf`, `bg-turf`
- Warning: `text-coral`, `bg-coral`
- Destructive: `text-flag`, `bg-flag`
- Info: `text-sky`, `bg-sky`
- Neutral: `text-charcoal/70`, `border-soft-grey`

---

## Typography

- Keep admin UI in **Inter** for clarity and compactness.
- Page titles: `text-xl font-semibold text-charcoal`
- Section headers: `text-sm font-semibold text-charcoal`
- Labels: `text-xs font-semibold text-charcoal/70 uppercase tracking-wide`
- Metadata: `text-sm text-charcoal/60`

Avoid oversized display typography in admin layouts.

---

## Icons

- Functional only (actions, status, navigation)
- Size: `h-4 w-4` for inline, `h-5 w-5` for buttons
- Match icon color to text color; avoid rainbow icon sets

---

## Alignment Checklist

- [ ] All list rows share the same column grid and row height
- [ ] Actions align to the right in a fixed-width column
- [ ] Padding and gaps follow the 8px system
- [ ] Only one level of border/shadow per container
- [ ] Consistent corner radius across the view
- [ ] Color usage matches the TapScore palette
