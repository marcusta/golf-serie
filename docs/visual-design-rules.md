# Visual Design Rules

Guidelines for creating a clean, professional UI that avoids the "AI-generated template" look.

## Core Principles

### 1. One Level of Containment Per Visual Group

If a section has a border or shadow, the items inside should not. Let content breathe instead of boxing everything.

### 2. Visual Hierarchy Through Roundness

Use different corner radii to create intentional hierarchy:

- **Outer containers**: `rounded-2xl` (16px) - soft, welcoming
- **Inner boxes**: `rounded` (4px) - sharp, structured
- **Navigation buttons**: `rounded-full` - distinct from content

**Why:** Different levels of roundness signal different purposes. Outer = major sections, Inner = content, Pills = navigation/flow.

```tsx
// Good - Clear hierarchy
<div className="rounded-2xl shadow-lg">  {/* Outer container */}
  <div className="rounded bg-white">     {/* Inner content box */}
    {/* Content */}
  </div>
</div>

// Bad - Everything equally rounded
<div className="rounded-xl shadow-lg">
  <div className="rounded-xl bg-white">
    {/* Looks arbitrary */}
  </div>
</div>
```

### 3. One Level of 3D Effects

Only major containers should have shadows. Inner elements must be flat.

**Rule:** If the outer container has a shadow, nothing inside it should have shadows.

```tsx
// Good - Single shadow on outer container
<div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">
  <div className="bg-white rounded p-4">  {/* No shadow */}
    <h3>Game Type</h3>
  </div>
  <div className="bg-white rounded p-4">  {/* No shadow */}
    <h3>Scoring Mode</h3>
  </div>
</div>

// Bad - Nested shadows create visual mess
<div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">
  <div className="bg-white rounded-xl shadow-lg p-4">  {/* Nested shadow */}
    <h3>Game Type</h3>
  </div>
  <div className="bg-white rounded-xl shadow-lg p-4">  {/* Nested shadow */}
    <h3>Scoring Mode</h3>
  </div>
</div>
```

### 4. Background Contrast Creates Pop

Use darker backgrounds to make white content boxes stand out, rather than relying on shadows.

```tsx
// Good - Gray background makes white boxes pop naturally
<div className="bg-soft-grey/30 p-6">
  <div className="bg-white rounded p-4">
    {/* White naturally pops against gray */}
  </div>
</div>

// Bad - White on white requires shadows to separate
<div className="bg-white p-6">
  <div className="bg-white rounded shadow-lg p-4">
    {/* Needs shadow to be visible */}
  </div>
</div>
```

---

## Typography-Based Hierarchy

Use typography to create structure instead of borders and boxes.

### Section Labels

```tsx
// Good - Uppercase bold labels create clear sections
<div className="mb-6">
  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
    Game Type
  </h3>
  <div className="bg-white rounded p-4">
    {/* Content */}
  </div>
</div>

// Bad - Nested header boxes
<div className="bg-white rounded-xl shadow-lg">
  <div className="bg-turf/20 border-b px-6 py-3">
    <h3 className="text-sm font-semibold">Game Type</h3>
  </div>
  <div className="p-6">{/* Content */}</div>
</div>
```

### Font Weight Scale

- **Labels/Headers**: `font-bold` + `uppercase tracking-wide`
- **Primary content**: `font-medium`
- **Secondary content**: `font-normal`
- **Metadata**: `font-normal` + `text-charcoal/70`

---

## Patterns

### Lists of Items

**Do:** Use dividers between items
```tsx
<div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
  {items.map(item => (
    <div className="px-4 py-3 hover:bg-turf/5 transition-colors">
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
    <div className="bg-white rounded-xl shadow-lg p-4">
      {/* content */}
    </div>
  ))}
</div>
```

### Grouped Content with Color Coding

Use left accent bars + subtle background tints instead of full borders:

```tsx
// Primary groups (turf)
<div className="border-l-4 border-turf bg-white rounded overflow-hidden">
  <div className="bg-turf/10 px-4 py-3">
    {/* Header */}
  </div>
  <div className="divide-y divide-soft-grey">
    {/* Items */}
  </div>
</div>

// Warning/Alert groups (coral)
<div className="border-l-4 border-coral bg-white rounded overflow-hidden">
  <div className="bg-coral/10 px-4 py-3">
    {/* Header */}
  </div>
  <div className="divide-y divide-soft-grey">
    {/* Items */}
  </div>
</div>
```

### Section Separation Within One Container

Use thick dividers instead of separate cards:

```tsx
<div className="bg-white rounded shadow-lg overflow-hidden">
  {/* Section 1 */}
  <div className="px-6 py-4">
    <h3 className="font-bold uppercase tracking-wide mb-3">Game Type</h3>
    {/* Content */}
  </div>

  {/* Strong divider */}
  <div className="border-t-2 border-charcoal/10" />

  {/* Section 2 */}
  <div className="px-6 py-4">
    <h3 className="font-bold uppercase tracking-wide mb-3">Scoring Mode</h3>
    {/* Content */}
  </div>
</div>
```

### Highlighting Important Items

Use subtle left accent + background tint:

```tsx
className={isLeader ? "border-l-4 border-coral bg-coral/5" : ""}
```

### Metadata Display

**Do:** Plain inline text with icons
```tsx
<div className="flex items-center gap-4 text-sm text-charcoal/70">
  <div className="flex items-center gap-1">
    <Calendar className="h-4 w-4 text-turf" />
    <span>Sep 5, 2025</span>
  </div>
</div>
```

**Don't:** Wrap metadata in pills/badges
```tsx
// AVOID
<div className="bg-rough/30 rounded-xl p-4 border">
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

---

## Interactive Elements

### Button Roundness Guidelines

Different button types should have different corner radii based on their function:

**Navigation/Flow Buttons** - Keep pill shape
```tsx
// Previous/Next buttons, wizard navigation
<Button className="rounded-full">
  <ChevronLeft /> Previous
</Button>
```

**Action Buttons in Content** - Match content sharpness
```tsx
// Buttons within forms, content areas
<Button className="rounded">
  Add Guest Player
</Button>
```

**Why:** Navigation buttons should feel like "transport controls" - distinct from content. Action buttons within content should match the content's aesthetic.

### Hover States

Prefer subtle background changes over shadows and transforms:

```tsx
// Good
className="hover:bg-turf/5 transition-colors"

// Avoid
className="hover:shadow-lg hover:-translate-y-1"
```

### Multi-Select Options

Use opacity changes for unselected state, not background colors:

```tsx
<button className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
  isSelected ? "opacity-100" : "opacity-70 hover:opacity-100"
}`}>
  {/* Content */}
</button>
```

---

## Color Usage

### Background Colors for Contrast

| Use Case | Class |
|----------|-------|
| Main container | `bg-soft-grey/30` |
| Content boxes | `bg-white` |
| Primary header/section | `bg-turf/10` or `bg-turf/40` |
| Warning/unassigned | `bg-coral/10` |

### Border Colors

| Use Case | Class |
|----------|-------|
| Subtle divider | `divide-soft-grey` or `border-soft-grey/50` |
| Left accent (primary) | `border-l-4 border-turf` |
| Left accent (warning) | `border-l-4 border-coral` |
| Strong divider | `border-t-2 border-charcoal/10` |

### Text Colors

| Use Case | Class |
|----------|-------|
| Primary text | `text-charcoal` |
| Secondary/metadata | `text-charcoal/70` |
| Placeholder | `text-charcoal/40` |

### Badge Colors

Use solid colors, not transparent:

```tsx
// Good - Solid background, high contrast
<Badge className="bg-turf text-white border-0">
  1/4
</Badge>

// Avoid - Transparent, low contrast
<Badge className="bg-turf/20 text-turf border-turf">
  1/4
</Badge>
```

---

## Icons

### Functional vs. Decorative Icons

**Icons should be functional, not decorative embellishments.**

**Use icons for:**
- **Actions** (buttons, controls) - helps quick recognition
- **Status indicators** - conveys meaning at a glance
- **Navigation** - aids wayfinding
- **Data visualization** - clarifies information type (e.g., calendar for dates, location for places)

**Avoid icons for:**
- **Decorative headers** - adds visual noise without purpose
- **Section titles** - text alone is clearer
- **Redundant labeling** - when text already explains everything
- **Every single heading** - creates pattern fatigue

```tsx
// Good - Icon adds functional value
<Button onClick={handleEdit}>
  <Edit2 className="h-4 w-4 mr-2" />
  Edit Profile
</Button>

// Good - Icon clarifies data type
<div className="flex items-center gap-1 text-sm">
  <Calendar className="h-4 w-4 text-turf" />
  <span>Sep 5, 2025</span>
</div>

// Bad - Decorative icon in header adds no value
<h2 className="flex items-center gap-2">
  <Target className="h-5 w-5 text-turf" />
  Handicap Index
</h2>

// Better - Just the text
<h2 className="font-display font-bold">
  Handicap Index
</h2>
```

### Icon Sizing & Colors

- Icon sizing:
  - Inline with text: `h-4 w-4`
  - Button icons: `h-5 w-5`
  - Large interactive: `h-6 w-6`
- Icon colors:
  - Interactive elements: `text-turf`
  - Metadata: `text-charcoal/70`
  - Disabled: `text-charcoal/40`
- Avoid large decorative icon boxes that duplicate information

---

## What to Remove

When reviewing a view, look for and eliminate:

1. **Nested shadows** - If parent has shadow, children shouldn't
2. **Multiple rounded corners** - Use hierarchy: outer soft, inner sharp
3. **Redundant borders** - If parent has border, children shouldn't
4. **Decorative icon boxes** - Large rounded squares just holding an icon
5. **Metadata pills** - Replace with plain inline text
6. **Position circles** - Replace with plain colored numbers
7. **Shadow + translate hover effects** - Replace with background color change
8. **Individual card borders on list items** - Use `divide-y` on parent instead
9. **Green on green** - Use darker backgrounds for better contrast

---

## Checklist for New Views

- [ ] Only ONE level has shadows (usually the outer container)
- [ ] Corner roundness creates hierarchy (outer soft, inner sharp)
- [ ] Background contrast makes white boxes pop (gray background recommended)
- [ ] Lists use `divide-y` instead of individual card borders
- [ ] No nested borders (container + items both bordered)
- [ ] Typography creates structure (uppercase bold labels)
- [ ] Section headers outside boxes, not inside colored header boxes
- [ ] Metadata is inline text, not pills
- [ ] Position numbers are plain text, not circles
- [ ] Hover states use background color, not shadow/transform
- [ ] Icons only used for actions, status, navigation, or data clarification - not decorative headers
- [ ] Left accents used for color coding
- [ ] Navigation buttons can be pills, action buttons match content
- [ ] Badges use solid colors, not transparent
- [ ] Strong dividers (`border-t-2`) separate major sections within one container

---

## Example: Complete Section

```tsx
{/* Outer container - has shadow */}
<div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">

  {/* Section 1 */}
  <div className="mb-6">
    <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
      Players Added (5)
    </h3>
    <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
      {players.map(player => (
        <div key={player.id} className="px-4 py-3 hover:bg-turf/5 transition-colors">
          <div className="font-medium text-charcoal">{player.name}</div>
          <div className="text-sm text-charcoal/70">PHCP: {player.handicap}</div>
        </div>
      ))}
    </div>
  </div>

  {/* Section 2 with color coding */}
  <div>
    <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
      Groups
    </h3>
    <div className="space-y-3">
      {groups.map(group => (
        <div key={group.id} className="border-l-4 border-turf bg-white rounded overflow-hidden">
          <div className="bg-turf/10 px-4 py-3">
            <span className="font-bold uppercase tracking-wide text-sm">
              {group.name}
            </span>
            <Badge className="bg-turf text-white border-0 ml-2">
              {group.count}/4
            </Badge>
          </div>
          <div className="divide-y divide-soft-grey px-4">
            {group.players.map(player => (
              <div key={player.id} className="py-3">
                {player.name}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
```
