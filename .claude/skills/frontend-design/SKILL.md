---
name: frontend-design
description: Enforce TapScore design system when creating or modifying frontend UI components. Use this skill when implementing any visual elements, pages, or components. Ensures compliance with visual-design-rules.md and STYLE_GUIDE.md to avoid generic "AI template" aesthetics.
---

# TapScore Frontend Design Skill

This skill enforces TapScore's fixed design system for all frontend UI work. Use for ANY visual implementation: components, pages, forms, lists, or layouts.

---

## Implementation Workflow

Copy this checklist and track your progress:

```
Design Implementation Progress:
- [ ] Step 1: Read required documentation
- [ ] Step 2: Plan visual hierarchy
- [ ] Step 3: Implement using approved patterns
- [ ] Step 4: Validate design system compliance
- [ ] Step 5: Check accessibility requirements
```

---

## Step 1: Read Required Documentation

**MANDATORY - Read these files before coding:**

```bash
cat docs/visual-design-rules.md    # Core design principles
cat docs/STYLE_GUIDE.md             # Complete design system
```

**What to extract:**
- Visual hierarchy rules (shadows, roundness, spacing)
- Approved color combinations and contrast ratios
- Component patterns and anti-patterns
- Golf-specific UI components

**Key constraint**: TapScore has a FIXED design system. NO variation in:
- **Typography**: DM Sans (display) + Inter (body) only
- **Colors**: TapScore brand palette only (fairway, turf, rough, coral, flag, sky, scorecard, charcoal, soft-grey)
- **Aesthetic**: Refined, professional, golf-specific (no maximalism, no asymmetry experiments)

---

## Step 2: Plan Visual Hierarchy

Before writing code, determine:

### Shadow Strategy
- **One level only**: Outer container gets `shadow-lg`, inner elements are flat
- Question: Which element is the primary container?

### Roundness Hierarchy
- **Outer containers**: `rounded-2xl` (16px)
- **Inner content boxes**: `rounded` (4px)
- **Navigation buttons**: `rounded-full`
- **Action buttons in content**: `rounded`

### Background Contrast
- **Container**: `bg-soft-grey/30` (gray makes white content pop)
- **Content boxes**: `bg-white` (naturally stands out)

### Content Structure
- **Lists**: Use `divide-y divide-soft-grey` between items, NOT individual cards
- **Section labels**: Uppercase bold labels OUTSIDE boxes, not inside colored headers
- **Left accents**: Use `border-l-4` with brand colors for grouping/color-coding

---

## Step 3: Implement Using Approved Patterns

### Standard Container Pattern

```tsx
{/* Outer: soft corners, shadow, gray background */}
<div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">

  {/* Section with label outside */}
  <div className="mb-6">
    <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
      Section Title
    </h3>

    {/* Inner: sharp corners, no shadow, white background */}
    <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
      <div className="px-4 py-3 hover:bg-turf/5 transition-colors">Item 1</div>
      <div className="px-4 py-3 hover:bg-turf/5 transition-colors">Item 2</div>
    </div>
  </div>
</div>
```

### Grouped Content with Left Accent

```tsx
{/* Color-coded group */}
<div className="border-l-4 border-turf bg-white rounded overflow-hidden">
  <div className="bg-turf/10 px-4 py-3">
    <span className="font-bold uppercase tracking-wide text-sm">Group Name</span>
  </div>
  <div className="divide-y divide-soft-grey px-4">
    <div className="py-3">Item 1</div>
    <div className="py-3">Item 2</div>
  </div>
</div>
```

### Approved Color Combinations

**High Contrast (WCAG AAA)**:
```tsx
"bg-scorecard text-charcoal"    // 16.75:1
"bg-fairway text-scorecard"     // 13.94:1
"bg-turf text-scorecard"        // 9.2:1
"bg-coral text-scorecard"       // 4.9:1
```

**Medium Contrast (WCAG AA minimum)**:
```tsx
"bg-scorecard text-turf"        // 4.5:1
"bg-rough text-charcoal"        // 4.2:1
```

**NEVER use** (fails WCAG):
```tsx
"bg-scorecard text-scorecard"   // 1.05:1 - invisible
"bg-rough text-scorecard"       // 1.8:1 - poor contrast
"bg-fairway text-charcoal"      // 1.2:1 - poor contrast
```

### Component Library

**ALWAYS use shadcn/ui components**:
```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

// ✅ CORRECT
<Button className="rounded">Add Player</Button>

// ❌ WRONG
<button>Add Player</button>
```

**Check available**: `ls frontend/src/components/ui/`
**Install if needed**: `npx shadcn@latest add <component>`

### Button Patterns

```tsx
// Navigation/flow - Pills
<Button className="rounded-full bg-coral text-scorecard">
  Next Step
</Button>

// Content actions - Sharp
<Button className="rounded bg-turf text-scorecard">
  Add Player
</Button>
```

### Hover States

```tsx
// ✅ CORRECT - Subtle background
className="hover:bg-turf/5 transition-colors"

// ❌ WRONG - Shadow + transform
className="hover:shadow-lg hover:-translate-y-1"
```

---

## Step 4: Validate Design System Compliance

**Check against visual-design-rules.md**:
- [ ] Only ONE level has shadows (outer container only)
- [ ] Corner roundness creates hierarchy (outer soft, inner sharp)
- [ ] Background contrast strategy used (`bg-soft-grey/30` containers)
- [ ] Lists use `divide-y`, not individual card borders
- [ ] No nested borders (container + items both bordered)
- [ ] Typography creates structure (uppercase bold labels outside boxes)
- [ ] Section headers outside boxes, not inside colored header boxes
- [ ] Metadata is inline text, not pills/badges for simple info
- [ ] Position numbers are plain colored text, not circles
- [ ] Hover states use background color, not shadow/transform

**Check against STYLE_GUIDE.md**:
- [ ] Used shadcn/ui components (no raw HTML elements)
- [ ] All text meets WCAG AA contrast (4.5:1 minimum)
- [ ] Used approved color combinations only
- [ ] Followed TapScore brand colors (no custom colors)
- [ ] Used DM Sans for display headings, Inter for body text
- [ ] Navigation buttons use `rounded-full`, action buttons use `rounded`
- [ ] Badges use solid colors when needed, not transparent

---

## Step 5: Check Accessibility Requirements

- [ ] Minimum 4.5:1 contrast ratio for all text (WCAG AA)
- [ ] Touch targets minimum 44px for mobile (`min-h-[44px]`)
- [ ] Proper ARIA labels on interactive elements
- [ ] Keyboard navigation support
- [ ] Focus indicators visible on interactive elements

---

## Anti-Patterns (Remove These)

Look for and eliminate:

1. ❌ Nested shadows (parent + children both have `shadow-lg`)
2. ❌ Inconsistent roundness (everything `rounded-xl` with no hierarchy)
3. ❌ Redundant borders (parent + children both bordered)
4. ❌ Decorative icon boxes (large rounded squares just holding icons)
5. ❌ Metadata pills for simple info (use inline text)
6. ❌ Position circles (use plain colored numbers)
7. ❌ Shadow + transform hovers (use `hover:bg-*/5`)
8. ❌ Individual cards in lists (use `divide-y` on parent)
9. ❌ White on white (use `bg-soft-grey/30` for containers)
10. ❌ Raw HTML elements (`<button>`, `<input>` - use shadcn/ui)

---

## Navigation Pattern (If Applicable)

**Detail pages** (use PlayerPageLayout):
- Series/Tour/Competition detail pages
- Player profile pages
- Document detail pages
- Game setup/play pages

```tsx
<PlayerPageLayout title="Page Title" seriesId={id}>
  {/* content */}
</PlayerPageLayout>
```

**CRITICAL**: Update `PlayerLayout.tsx` `isDetailView` when adding new detail routes.

**Top-level list pages** (NO PlayerPageLayout):
- Dashboard
- All Rounds, Tours list, Series list, Competitions list

```tsx
<div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
  <div className="container mx-auto px-4 py-8">
    {/* content */}
  </div>
</div>
```

---

## Golf-Specific Components

### Score Display
```tsx
<div className="bg-white rounded p-4 border-l-4 border-turf">
  <div className="text-display-sm text-fairway font-bold">72</div>
  <div className="text-body-sm text-charcoal/70">Total Score</div>
</div>
```

### Leaderboard with Leader Highlight
```tsx
<div className="divide-y divide-soft-grey">
  {entries.map((entry, index) => (
    <div
      className={`px-4 py-3 flex items-center gap-4 ${
        index === 0 ? 'border-l-4 border-coral bg-coral/5' : ''
      }`}
    >
      <div className="text-lg font-bold text-coral">{index + 1}</div>
      <div className="flex-1 font-medium text-charcoal">{entry.name}</div>
      <div className="text-charcoal/70">{entry.score}</div>
    </div>
  ))}
</div>
```

### Status Indicators
```tsx
// Success
<div className="flex items-center gap-2 text-turf">
  <CheckCircle className="h-5 w-5" />
  <span>Completed</span>
</div>

// Warning
<div className="flex items-center gap-2 text-coral">
  <AlertCircle className="h-5 w-5" />
  <span>Pending</span>
</div>
```

---

## User Feedback Patterns

Choose based on workflow:

**Dialog (blocks workflow)**: Destructive actions, required decisions
```tsx
npx shadcn@latest add dialog
```

**Alert (inline, persistent)**: Form validation, section warnings
```tsx
npx shadcn@latest add alert
```

**Toast (temporary)**: Success confirmations, quick feedback
```tsx
npx shadcn@latest add sonner
// Add <Toaster /> to root layout
```

---

## Key Differences from Generic Design

**TapScore enforces constraints that generic design doesn't:**
- Fixed typography (no experimentation)
- Fixed color palette (no improvisation)
- Consistent aesthetic (no per-page variation)
- Structured layouts (no asymmetry experiments)
- Professional refinement only (no maximalism)

**What we share with quality design:**
- Avoid generic "AI template" look through intentional choices
- Production-grade code
- Meticulous attention to hierarchy, contrast, spacing
- Cohesive visual language

---

## Summary

**TapScore approach**: Refined, professional, golf-specific interfaces with meticulous execution of a fixed design system. Distinctiveness through **constraint and excellence**, not experimentation.

**Every implementation must**:
- Read visual-design-rules.md and STYLE_GUIDE.md first
- Follow one-level shadow rule
- Use hierarchical roundness
- Apply gray backgrounds for contrast
- Use approved color combinations
- Use shadcn/ui components
- Meet WCAG AA contrast (4.5:1)
- Provide 44px touch targets

Build interfaces that tournament organizers and players love using.
