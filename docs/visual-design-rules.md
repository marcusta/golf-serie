# Visual Design Rules

Guidelines for creating a clean, professional UI that avoids the "AI-generated template" look.

## Core Principle

**One level of containment per visual group.**

If a section has a border, the items inside should not. Let content breathe instead of boxing everything.

---

## Patterns

### Lists of Items

**Do:** Use dividers between items
```tsx
<div className="divide-y divide-soft-grey">
  {items.map(item => (
    <div className="py-5 hover:bg-gray-50/50 transition-colors">
      {/* content */}
    </div>
  ))}
</div>
```

**Don't:** Give each item its own card
```tsx
// AVOID
<div className="space-y-4">
  {items.map(item => (
    <div className="rounded-xl border border-soft-grey p-4 shadow-sm">
      {/* content */}
    </div>
  ))}
</div>
```

### Grouped Content (e.g., Tee Times)

When items naturally group together, use a left accent instead of full borders:

```tsx
<div className="border-l-4 border-turf">
  <div className="bg-rough/20 px-4 py-3">
    {/* Header */}
  </div>
  <div className="divide-y divide-soft-grey">
    {/* Items */}
  </div>
</div>
```

### Highlighting Important Items (e.g., Leader)

Use subtle left accent + background tint, not rings/shadows:

```tsx
className={isLeader ? "border-l-4 border-l-coral bg-coral/5" : ""}
```

### Metadata Display

**Do:** Plain inline text with icons for visual interest
```tsx
<div className="flex items-center gap-4 text-sm text-charcoal/70">
  <div className="flex items-center gap-1">
    <Calendar className="h-4 w-4 text-turf" />
    <span>Sep 5, 2025</span>
  </div>
  <div className="flex items-center gap-1">
    <MapPin className="h-4 w-4 text-turf" />
    <span>Klinga</span>
  </div>
</div>
```

**Don't:** Wrap metadata in pills/badges
```tsx
// AVOID
<div className="bg-rough/30 rounded-xl p-4 border border-soft-grey">
  {/* metadata */}
</div>
```

### Position/Rank Numbers

**Do:** Plain colored text
```tsx
<div className={`text-lg font-bold ${getPositionColor(index)}`}>
  {index + 1}
</div>
```

**Don't:** Circles with borders
```tsx
// AVOID
<div className="w-12 h-12 rounded-full border-2 border-yellow-400">
  1
</div>
```

### Link Banners (e.g., "Part of a Series")

**Do:** Left accent bar
```tsx
<Link className="block border-l-4 border-turf pl-4 py-3 hover:bg-turf/5">
```

**Don't:** Full bordered card
```tsx
// AVOID
<Link className="block bg-turf/10 border border-turf/20 rounded-xl p-4">
```

---

## Hover States

Prefer subtle background changes over shadows and transforms:

```tsx
// Good
className="hover:bg-gray-50/50 transition-colors"

// Avoid
className="hover:shadow-lg hover:-translate-y-1"
```

---

## Icons

- Use icons inline with text for context
- Avoid large decorative icon boxes that duplicate information already shown
- Icon color: `text-turf` for interactive elements, `text-charcoal/70` for metadata

---

## What to Remove

When reviewing a view, look for and eliminate:

1. **Redundant borders** - If parent has border, children shouldn't
2. **Decorative icon boxes** - Large rounded squares just holding an icon
3. **Metadata pills** - Replace with plain inline text
4. **Position circles** - Replace with plain colored numbers
5. **Unused filter/action icons** - Remove if not functional
6. **Shadow + translate hover effects** - Replace with background color change
7. **`rounded-xl border border-soft-grey`** on list items - Use `divide-y` on parent instead

---

## Color Reference

| Use Case | Class |
|----------|-------|
| Subtle divider | `divide-soft-grey` or `border-soft-grey/50` |
| Left accent (primary) | `border-turf` |
| Left accent (highlight) | `border-coral` |
| Hover background | `hover:bg-gray-50/50` |
| Highlighted row | `bg-coral/5` |
| Muted text | `text-charcoal/70` |

---

## Checklist for New Views

- [ ] Lists use `divide-y` instead of individual card borders
- [ ] No nested borders (container + items both bordered)
- [ ] Metadata is inline text, not pills
- [ ] Position numbers are plain text, not circles
- [ ] Hover states use background color, not shadow/transform
- [ ] Icons serve a purpose, not just decoration
- [ ] Left accents used for grouping/hierarchy instead of full borders
