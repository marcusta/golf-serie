---
name: contrast-validator
description: Validates WCAG AA contrast ratios (minimum 4.5:1) for text and background color combinations in frontend code. Use when reviewing UI implementations to ensure accessibility compliance and catch poor contrast before deployment.
---

# WCAG Contrast Ratio Validator

Validates text and background color combinations meet WCAG AA standards (4.5:1 minimum). Use before committing frontend changes or during code review.

---

## Validation Workflow

Copy this checklist to track progress:

```
Contrast Validation Progress:
- [ ] Step 1: Identify files or components to check
- [ ] Step 2: Extract color combinations
- [ ] Step 3: Validate against approved combinations
- [ ] Step 4: Calculate ratios for unknown combinations
- [ ] Step 5: Generate violation report with fixes
```

---

## Step 1: Identify Files or Components

**For specific files:**
User provides file paths to check.

**For recent UI changes:**
```bash
git diff --name-only --diff-filter=AM 'frontend/src/**/*.tsx' 'frontend/src/**/*.jsx'
```

**For specific component directories:**
```bash
find frontend/src/components -name "*.tsx" -o -name "*.jsx"
```

---

## Step 2: Extract Color Combinations

Search for Tailwind color classes in pattern `bg-{color}.*text-{color}`:

```bash
grep -oE "(bg-[a-z-]+|text-[a-z-]+)" [file_path] | sort | uniq
```

Look for combinations where background and text colors appear together:

### Common Patterns

```bash
# className with both bg- and text-
grep -n 'className=.*bg-.*text-' [file_path]

# Nested elements (parent bg, child text)
grep -A2 -B2 'bg-[a-z-]+' [file_path] | grep 'text-[a-z-]+'
```

**Extract combinations:**
- `bg-scorecard text-charcoal`
- `bg-fairway text-scorecard`
- `bg-turf text-scorecard`
- `bg-coral text-scorecard`
- etc.

---

## Step 3: Validate Against Approved Combinations

### TapScore Brand Colors (Reference)

```css
--fairway: #1B4332    /* Deep forest green */
--turf: #2D6A4F       /* Medium green */
--rough: #95D5B2      /* Light sage */
--coral: #FF9F1C      /* Orange */
--flag: #EF476F       /* Red */
--sky: #118AB2        /* Blue */
--scorecard: #F8F9FA  /* Off-white */
--charcoal: #1C1C1E   /* Dark gray */
--soft-grey: #CED4DA  /* Light gray */
```

### Approved High Contrast (WCAG AAA - 7:1+)

These combinations PASS and are preferred:

```tsx
"bg-scorecard text-charcoal"    // 16.75:1 ✅ Excellent
"bg-fairway text-scorecard"     // 13.94:1 ✅ Excellent
"bg-turf text-scorecard"        //  9.2:1  ✅ Excellent
"bg-charcoal text-scorecard"    // 16.75:1 ✅ Excellent
"bg-flag text-scorecard"        //  4.9:1  ✅ Good
"bg-coral text-scorecard"       //  4.9:1  ✅ Good
"bg-sky text-scorecard"         //  5.8:1  ✅ Good
```

### Approved Medium Contrast (WCAG AA - 4.5:1+)

These combinations PASS minimum standards:

```tsx
"bg-scorecard text-turf"        // 4.5:1 ✅ Acceptable
"bg-rough text-charcoal"        // 4.2:1 ⚠️  Marginal (use with caution)
"bg-soft-grey text-charcoal"    // 8.9:1 ✅ Good
```

### Prohibited Combinations (FAIL WCAG AA)

These combinations FAIL and must not be used:

```tsx
"bg-scorecard text-scorecard"   // 1.05:1 ❌ Invisible
"bg-scorecard text-rough"       // 1.8:1  ❌ Poor contrast
"bg-scorecard text-soft-grey"   // 1.9:1  ❌ Poor contrast
"bg-fairway text-charcoal"      // 1.2:1  ❌ Poor contrast
"bg-fairway text-turf"          // 1.5:1  ❌ Poor contrast
"bg-turf text-fairway"          // 1.5:1  ❌ Poor contrast
"bg-rough text-scorecard"       // 1.8:1  ❌ Poor contrast
"bg-rough text-soft-grey"       // 1.05:1 ❌ Invisible
"bg-coral text-charcoal"        // 3.4:1  ❌ Below WCAG AA
"bg-flag text-charcoal"         // 3.8:1  ❌ Below WCAG AA
"bg-sky text-charcoal"          // 2.9:1  ❌ Below WCAG AA
```

---

## Step 4: Calculate Ratios for Unknown Combinations

If you encounter a combination not in the approved list:

### Manual Calculation Reference

**Formula:**
```
Contrast Ratio = (L1 + 0.05) / (L2 + 0.05)
```

Where L1 is relative luminance of the lighter color, L2 is relative luminance of the darker color.

**WCAG Standards:**
- **WCAG AAA (Large text):** 4.5:1 minimum
- **WCAG AA (Normal text):** 4.5:1 minimum ← **TapScore requirement**
- **WCAG AAA (Normal text):** 7:1 minimum
- **Large text:** 18pt (24px) or 14pt (18.66px) bold

### Use Online Tool for Verification

If uncertain about a custom color or opacity combination:

```markdown
Use WebContrastChecker tool or similar:
1. Input background hex color
2. Input text hex color
3. Check if ratio >= 4.5:1 for WCAG AA compliance
```

For TapScore brand colors, **always reference the approved list** first.

---

## Step 5: Generate Violation Report with Fixes

Create structured report:

```markdown
## Contrast Ratio Violations Report

### File: [file_path]

**Total Violations:** [count]

---

#### Line [X]: FAIL - `bg-scorecard text-rough`

**Current:**
```tsx
<div className="bg-scorecard text-rough">
  Low contrast text
</div>
```

**Issue:** Contrast ratio 1.8:1 fails WCAG AA (needs 4.5:1 minimum)

**Fix Option 1 (Recommended):**
```tsx
<div className="bg-scorecard text-charcoal">
  Accessible text
</div>
```
Contrast ratio: 16.75:1 ✅ WCAG AAA

**Fix Option 2:**
```tsx
<div className="bg-scorecard text-turf">
  Accessible text
</div>
```
Contrast ratio: 4.5:1 ✅ WCAG AA

---

#### Line [Y]: FAIL - `bg-coral text-charcoal`

**Current:**
```tsx
<Button className="bg-coral text-charcoal">
  Click Me
</Button>
```

**Issue:** Contrast ratio 3.4:1 fails WCAG AA

**Fix (Use approved combination):**
```tsx
<Button className="bg-coral text-scorecard">
  Click Me
</Button>
```
Contrast ratio: 4.9:1 ✅ WCAG AA

---

### Summary

- **Violations Found:** [count]
- **Files Affected:** [count]
- **Fix Status:** All fixes provided above

**Approval needed:** Should I apply these fixes now?
```

---

## Common Violation Patterns

### Pattern 1: Light on Light

**Violation:**
```tsx
<div className="bg-scorecard text-soft-grey">
  Invisible text
</div>
```

**Fix:**
```tsx
<div className="bg-scorecard text-charcoal">
  Visible text
</div>
```

**Why:** Light gray on off-white has insufficient contrast.

### Pattern 2: Dark on Dark

**Violation:**
```tsx
<div className="bg-fairway text-charcoal">
  Hard to read
</div>
```

**Fix:**
```tsx
<div className="bg-fairway text-scorecard">
  Easy to read
</div>
```

**Why:** Dark green on dark gray fails contrast requirements.

### Pattern 3: Similar Hues

**Violation:**
```tsx
<div className="bg-fairway text-turf">
  Blends together
</div>
```

**Fix:**
```tsx
<div className="bg-fairway text-scorecard">
  Clear contrast
</div>
```

**Why:** Two greens of similar luminance fail contrast.

### Pattern 4: Opacity Issues

**Violation:**
```tsx
<div className="bg-scorecard text-charcoal/50">
  Faded text
</div>
```

**Issue:** Opacity reduces contrast ratio. `charcoal/50` may fail WCAG AA.

**Fix:**
```tsx
<div className="bg-scorecard text-charcoal/70">
  Better contrast
</div>
```

**Or better:**
```tsx
<div className="bg-scorecard text-charcoal">
  Full contrast
</div>
```

**Rule:** Avoid opacity on text unless absolutely necessary. If used, verify contrast ratio.

---

## Special Cases

### Hover States

Hover states should also meet WCAG AA:

**Bad:**
```tsx
className="bg-scorecard text-charcoal hover:bg-rough hover:text-scorecard"
```

**Issue:** `bg-rough text-scorecard` fails contrast (1.8:1).

**Good:**
```tsx
className="bg-scorecard text-charcoal hover:bg-turf/5"
```

**Why:** Keep text color unchanged, use subtle background tint.

### Status Indicators

**Success indicators:**
```tsx
// ✅ Good
<span className="text-turf">Success</span>

// ❌ Bad
<span className="bg-scorecard text-rough">Success</span>
```

**Error indicators:**
```tsx
// ✅ Good
<span className="text-flag">Error</span>

// ✅ Good (with background)
<span className="bg-flag text-scorecard">Error</span>
```

### Badges and Pills

Always use solid backgrounds with approved contrasts:

**Good:**
```tsx
<Badge className="bg-turf text-scorecard">Active</Badge>
<Badge className="bg-coral text-scorecard">Pending</Badge>
<Badge className="bg-flag text-scorecard">Error</Badge>
```

**Bad:**
```tsx
<Badge className="bg-rough text-scorecard">Active</Badge> {/* Fails */}
<Badge className="bg-scorecard text-rough">Active</Badge> {/* Fails */}
```

---

## Automated Validation Script

Check all files for common violations:

```bash
# Check for prohibited combinations
for file in $(find frontend/src -name "*.tsx"); do
  echo "=== $file ==="

  # Check for known bad combinations
  if grep -q "bg-scorecard.*text-rough\|bg-rough.*text-scorecard" "$file"; then
    echo "❌ FAIL: bg-scorecard + text-rough detected"
    grep -n "bg-scorecard.*text-rough\|bg-rough.*text-scorecard" "$file"
  fi

  if grep -q "bg-fairway.*text-charcoal\|bg-fairway.*text-turf" "$file"; then
    echo "❌ FAIL: bg-fairway + dark text detected"
    grep -n "bg-fairway.*text-charcoal\|bg-fairway.*text-turf" "$file"
  fi

  if grep -q "bg-coral.*text-charcoal" "$file"; then
    echo "❌ FAIL: bg-coral + text-charcoal detected"
    grep -n "bg-coral.*text-charcoal" "$file"
  fi

  echo ""
done
```

---

## Feedback Loop

After generating report:

1. **Review violations** with user
2. **Verify each violation** against approved combinations list
3. **Ask:** Should I apply these fixes now?
4. **If yes:** Apply fixes file by file
5. **Re-validate:** Run checks again after fixes
6. **Confirm:** All violations resolved, all text meets 4.5:1 minimum

---

## Key Constraints

- **Minimum 4.5:1 ratio** for all text (WCAG AA requirement)
- **Prefer 7:1+ ratios** when possible (WCAG AAA)
- **Always check approved list first** before calculating custom ratios
- **No opacity on critical text** unless verified to meet contrast requirements
- **Hover states must also pass** WCAG AA standards
- **Large text (18pt+)** can use 3:1 minimum, but TapScore uses 4.5:1 for all text

---

## Reference: Full Approved Combinations

For complete reference, see `docs/STYLE_GUIDE.md` sections:
- "Approved Color Combinations"
- "Semantic Color Usage"

Quick reminder:
- **Dark backgrounds:** Use `text-scorecard` (off-white)
- **Light backgrounds:** Use `text-charcoal` (dark gray)
- **Colored backgrounds:** Use `text-scorecard` unless otherwise approved

---

## Summary

Contrast validation ensures:
- WCAG AA accessibility compliance
- Readability for all users
- Consistent brand color usage
- Professional, accessible UI

Run validation before committing any UI changes with text/background color combinations.
