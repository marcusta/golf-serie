---
name: component-check
description: Validates that shadcn/ui components are used instead of raw HTML elements in React components. Use when reviewing or implementing frontend code to ensure component library compliance and maintain consistent UI patterns.
---

# Component Library Compliance Checker

Validates TapScore frontend code uses shadcn/ui components instead of raw HTML elements. Use for code review or before committing frontend changes.

---

## Validation Workflow

Copy this checklist to track progress:

```
Component Validation Progress:
- [ ] Step 1: Identify files to check
- [ ] Step 2: Scan for raw HTML violations
- [ ] Step 3: Check component imports
- [ ] Step 4: Generate violation report
- [ ] Step 5: Provide fix recommendations
```

---

## Step 1: Identify Files to Check

**For specific files:**
User provides file paths to check.

**For recent changes:**
```bash
git diff --name-only --diff-filter=AM '*.tsx' '*.jsx'
```

**For all components:**
```bash
find frontend/src/components -name "*.tsx" -o -name "*.jsx"
```

---

## Step 2: Scan for Raw HTML Violations

Search for common raw HTML elements that should use shadcn/ui:

### Buttons
```bash
grep -n "<button" [file_path]
```

**Violation:** `<button>` without `Button` import
**Required:** `import { Button } from "@/components/ui/button"`

### Inputs
```bash
grep -n "<input" [file_path]
```

**Violation:** `<input>` without `Input` import
**Required:** `import { Input } from "@/components/ui/input"`

### Textareas
```bash
grep -n "<textarea" [file_path]
```

**Violation:** `<textarea>` without `Textarea` import
**Required:** `import { Textarea } from "@/components/ui/textarea"`

### Select Dropdowns
```bash
grep -n "<select" [file_path]
```

**Violation:** `<select>` without `Select` import
**Required:** `import { Select } from "@/components/ui/select"`

### Dialogs/Modals
```bash
grep -n "modal\|Modal" [file_path]
```

**Violation:** Custom modal without `Dialog` import
**Required:** `import { Dialog } from "@/components/ui/dialog"`

### Switches/Checkboxes
```bash
grep -n 'type="checkbox"' [file_path]
```

**Violation:** Checkbox input without `Switch` or `Checkbox` import
**Required:** `import { Switch } from "@/components/ui/switch"`

---

## Step 3: Check Component Imports

For each file, verify imports match usage:

```bash
grep -n "^import.*@/components/ui" [file_path]
```

**Check:**
- Are shadcn/ui components imported?
- Do imports match actual usage in JSX?
- Are there unused imports?

---

## Step 4: Generate Violation Report

Create structured report:

```markdown
## Component Library Violations Report

### File: [file_path]

**Total Violations:** [count]

#### Buttons
- Line [X]: `<button>` should use `Button` component
- Line [Y]: `<button className="...">` should use `Button` with className

#### Inputs
- Line [X]: `<input type="text">` should use `Input` component
- Line [Y]: `<input type="email">` should use `Input` with type prop

#### [Other Categories]
...

### Available Components

Check installed components:
```bash
ls frontend/src/components/ui/
```

If component missing, install with:
```bash
npx shadcn@latest add [component-name]
```
```

---

## Step 5: Provide Fix Recommendations

For each violation, provide specific fix:

### Example Fix Pattern

**Violation:**
```tsx
<button onClick={handleClick} className="bg-turf text-scorecard">
  Save Changes
</button>
```

**Fix:**
```tsx
import { Button } from "@/components/ui/button"

<Button onClick={handleClick} className="bg-turf text-scorecard">
  Save Changes
</Button>
```

**Changes:**
1. Add import statement at top of file
2. Replace `<button>` with `<Button>`
3. Keep all props (onClick, className) unchanged
4. Ensure closing tag matches: `</Button>`

---

## Common Patterns

### Form Elements

**Bad:**
```tsx
<form>
  <input type="text" name="username" />
  <textarea name="bio" />
  <select name="role">
    <option value="player">Player</option>
  </select>
  <button type="submit">Submit</button>
</form>
```

**Good:**
```tsx
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

<form>
  <Input type="text" name="username" />
  <Textarea name="bio" />
  <Select name="role">
    <SelectTrigger>
      <SelectValue placeholder="Select role" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="player">Player</SelectItem>
    </SelectContent>
  </Select>
  <Button type="submit">Submit</Button>
</form>
```

### Action Buttons

**Bad:**
```tsx
<button onClick={handleDelete} className="text-flag">
  Delete
</button>
```

**Good:**
```tsx
import { Button } from "@/components/ui/button"

<Button
  onClick={handleDelete}
  variant="destructive"
  className="bg-flag text-scorecard"
>
  Delete
</Button>
```

### Checkbox/Toggle

**Bad:**
```tsx
<input
  type="checkbox"
  checked={enabled}
  onChange={handleToggle}
/>
```

**Good:**
```tsx
import { Switch } from "@/components/ui/switch"

<Switch
  checked={enabled}
  onCheckedChange={handleToggle}
/>
```

---

## Validation Script

Run automated check across multiple files:

```bash
# Check all component files for raw HTML elements
for file in $(find frontend/src/components -name "*.tsx"); do
  echo "=== $file ==="

  # Count violations
  button_count=$(grep -c "<button" "$file" 2>/dev/null || echo "0")
  input_count=$(grep -c "<input" "$file" 2>/dev/null || echo "0")
  textarea_count=$(grep -c "<textarea" "$file" 2>/dev/null || echo "0")
  select_count=$(grep -c "<select" "$file" 2>/dev/null || echo "0")

  total=$((button_count + input_count + textarea_count + select_count))

  if [ $total -gt 0 ]; then
    echo "Potential violations: $total"
    echo "  Buttons: $button_count"
    echo "  Inputs: $input_count"
    echo "  Textareas: $textarea_count"
    echo "  Selects: $select_count"
    echo ""
  fi
done
```

**Interpret results:**
- **0 violations:** File follows component library standards
- **1+ violations:** Review each line, check if shadcn/ui component exists

---

## Exceptions (When Raw HTML is Acceptable)

### Semantic HTML Structure

**Acceptable:**
```tsx
<div>, <span>, <p>, <h1>-<h6>, <section>, <article>, <nav>, <header>, <footer>
```

These structural elements do not have shadcn/ui equivalents.

### SVG Elements

**Acceptable:**
```tsx
<svg>, <path>, <circle>, <rect>, <line>
```

SVG elements are standard and do not need component wrappers.

### Third-Party Components

**Acceptable:**
```tsx
<Link> from @tanstack/router
<Toaster> from sonner (notification system)
```

External library components are fine if they're the standard way to use that library.

---

## Feedback Loop

After generating report:

1. **Review violations** with user
2. **Ask:** Should I fix these violations now?
3. **If yes:** Apply fixes file by file
4. **Re-validate:** Run checks again after fixes
5. **Confirm:** All violations resolved before proceeding

---

## Key Constraints

- **Always prefer shadcn/ui** over raw HTML for interactive elements
- **Check availability first:** Run `ls frontend/src/components/ui/` to see installed components
- **Install if missing:** Use `npx shadcn@latest add [component]`
- **Preserve behavior:** Keep all props, event handlers, and className unchanged when converting
- **No false positives:** Structural HTML (`<div>`, `<span>`) is acceptable

---

## Summary

Component library compliance ensures:
- Consistent UI patterns across TapScore
- Accessible components (ARIA, keyboard navigation built-in)
- Design system adherence (styling, behavior)
- Reduced maintenance burden

Run validation before committing frontend changes.
