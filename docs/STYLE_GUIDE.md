# TapScore Style Guide
*Golf Series Management Platform - Complete Design System Documentation*

## 🎨 Overview

TapScore uses a custom design system built on Tailwind CSS v4 with carefully crafted brand colors, typography, and component patterns optimized for golf tournament management interfaces.

---

## 🌈 Color System

### Core Brand Colors

```css
/* TapScore Brand Palette */
--fairway-green: #1B4332    /* Deep forest green - headers, navigation, primary text */
--turf-green: #2D6A4F       /* Medium green - buttons, highlights, success states */
--light-rough: #95D5B2      /* Light sage - fills, hover states, light backgrounds */
--sunset-coral: #FF9F1C     /* Orange - primary CTAs, active states, warnings */
--flag-red: #EF476F         /* Red - errors, delete actions, critical alerts */
--sky-blue: #118AB2         /* Blue - info states, notifications, links */
--scorecard-white: #F8F9FA  /* Off-white - backgrounds, cards, surfaces */
--charcoal-text: #1C1C1E    /* Dark gray - primary text, strong contrast */
--soft-grey: #CED4DA        /* Light gray - borders, inactive states, subtle text */
```

### Semantic Color Usage

| Use Case | Primary | Secondary | Background |
|----------|---------|-----------|------------|
| **Success** | `bg-turf text-scorecard` | `bg-rough text-fairway` | `bg-rough/20` |
| **Warning** | `bg-coral text-scorecard` | `bg-coral/10 text-coral` | `bg-coral/5` |
| **Error** | `bg-flag text-scorecard` | `bg-flag/10 text-flag` | `bg-flag/5` |
| **Info** | `bg-sky text-scorecard` | `bg-sky/10 text-sky` | `bg-sky/5` |
| **Neutral** | `bg-charcoal text-scorecard` | `bg-soft-grey text-charcoal` | `bg-scorecard` |

---

## 🔧 Tailwind CSS v4 Configuration

### Critical Setup for Custom Colors

TapScore uses Tailwind CSS v4, which requires custom colors to be defined in the `@theme` directive for gradient utilities to work:

```css
@import "tailwindcss";

@theme {
  /* TapScore Brand Colors for Tailwind v4 */
  --color-fairway: #1b4332;
  --color-turf: #2d6a4f;
  --color-rough: #95d5b2;
  --color-coral: #ff9f1c;
  --color-flag: #ef476f;
  --color-sky: #118ab2;
  --color-scorecard: #f8f9fa;
  --color-charcoal: #1c1c1e;
  --color-soft-grey: #ced4da;
}
```

### Available Custom Classes

#### Color Utilities
```css
/* Background Colors */
.bg-fairway, .bg-turf, .bg-rough, .bg-coral, .bg-flag, 
.bg-sky, .bg-scorecard, .bg-charcoal, .bg-soft-grey

/* Text Colors */
.text-fairway, .text-turf, .text-rough, .text-coral, .text-flag,
.text-sky, .text-scorecard, .text-charcoal, .text-soft-grey

/* Border Colors */
.border-fairway, .border-turf, .border-rough, .border-coral, .border-flag,
.border-sky, .border-scorecard, .border-charcoal, .border-soft-grey

/* Gradients (Tailwind v4 compatible) */
.from-coral, .to-flag, .from-fairway, .to-turf
```

---

## 📝 Typography System

### Font Stack
- **Primary**: `Inter` - Body text, UI elements, labels
- **Display**: `DM Sans` - Headings, titles, prominent text

### Typography Scale

#### Display Headings (DM Sans)
```css
.text-display-xl  /* 3.5rem, line-height 1.1, weight 700 - Hero titles */
.text-display-lg  /* 2.5rem, line-height 1.2, weight 700 - Page titles */
.text-display-md  /* 2rem, line-height 1.3, weight 600 - Section headers */
.text-display-sm  /* 1.5rem, line-height 1.4, weight 600 - Card titles */
```

#### Body Text (Inter)
```css
.text-body-xl     /* 1.25rem, line-height 1.6, weight 400 - Large body */
.text-body-lg     /* 1.125rem, line-height 1.6, weight 400 - Default body */
.text-body-md     /* 1rem, line-height 1.5, weight 400 - Standard text */
.text-body-sm     /* 0.875rem, line-height 1.5, weight 400 - Small text */
.text-body-xs     /* 0.75rem, line-height 1.4, weight 400 - Caption text */
```

#### UI Labels (Inter)
```css
.text-label-lg    /* 1rem, line-height 1.4, weight 500 - Button text */
.text-label-md    /* 0.875rem, line-height 1.4, weight 500 - Form labels */
.text-label-sm    /* 0.75rem, line-height 1.4, weight 500 - Small labels */
```

---

## 🎯 Component Patterns

### Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--sunset-coral);
  color: var(--scorecard-white);
  border: 2px solid var(--sunset-coral);
  border-radius: 0.75rem;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  transition: all 0.2s ease;
}
```

**Usage:**
```html
<button class="btn-primary">Create Competition</button>
```

#### Secondary Button
```css
.btn-secondary {
  background: transparent;
  color: var(--turf-green);
  border: 2px solid var(--turf-green);
  border-radius: 0.75rem;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
}
```

### Cards

#### Standard Card
```css
.card {
  background: var(--scorecard-white);
  border: 1px solid var(--soft-grey);
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(27, 67, 50, 0.08);
  padding: 1.5rem;
  transition: all 0.2s ease;
}
```

**Usage:**
```html
<div class="card">
  <div class="card-header">
    <h3 class="text-display-sm text-charcoal">Competition Results</h3>
  </div>
  <!-- Content -->
</div>
```

### Form Elements

#### Input Fields
```css
.input {
  border: 2px solid var(--soft-grey);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--scorecard-white);
  transition: border-color 0.2s ease;
}

.input:focus {
  border-color: var(--turf-green);
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.1);
}
```

---

## ⚠️ Critical Contrast Guidelines

### ✅ Approved Contrast Combinations

#### High Contrast (WCAG AAA)
```css
/* Dark text on light backgrounds */
.bg-scorecard .text-charcoal    /* 16.75:1 ratio */
.bg-rough .text-fairway         /* 4.8:1 ratio */

/* Light text on dark backgrounds */
.bg-fairway .text-scorecard     /* 13.94:1 ratio */
.bg-turf .text-scorecard        /* 9.2:1 ratio */
.bg-coral .text-scorecard       /* 4.9:1 ratio */
```

#### Medium Contrast (WCAG AA)
```css
.bg-scorecard .text-turf        /* 4.5:1 ratio */
.bg-rough .text-charcoal        /* 4.2:1 ratio */
.bg-sky .text-scorecard         /* 4.7:1 ratio */
```

### ❌ Poor Contrast Combinations (Never Use)

```css
/* Light text on light backgrounds */
.bg-scorecard .text-scorecard           /* Poor: 1.05:1 */
.bg-rough .text-scorecard               /* Poor: 1.8:1 */
.bg-scorecard-transparent .text-scorecard  /* Poor: Variable, unreliable */

/* Dark text on dark backgrounds */
.bg-fairway .text-charcoal             /* Poor: 1.2:1 */
.bg-turf .text-fairway                 /* Poor: 1.6:1 */

/* Similar intensity combinations */
.bg-coral .text-flag                   /* Poor: 1.9:1 */
.bg-sky .text-turf                     /* Poor: 2.1:1 */
```

---

## 🚨 Common Styling Mistakes & Fixes

### Issue 1: Transparent Backgrounds with Poor Contrast

**❌ Problematic Pattern:**
```html
<div class="bg-scorecard-transparent text-scorecard">
  White text on transparent light background
</div>
```

**✅ Fixed Pattern:**
```html
<div class="bg-scorecard text-fairway shadow-sm">
  Dark green text on solid white background
</div>
```

### Issue 2: Tailwind v4 Gradients Not Working

**❌ Problem:**
```css
/* This won't work without @theme configuration */
.from-coral .to-flag { /* No gradient appears */ }
```

**✅ Solution:**
```css
/* First, add to @theme directive */
@theme {
  --color-coral: #ff9f1c;
  --color-flag: #ef476f;
}

/* Then gradients work properly */
.from-coral .to-flag { /* Beautiful gradient! */ }
```

### Issue 3: Missing Visual Hierarchy

**❌ Flat Design:**
```html
<button class="bg-coral text-scorecard">Submit</button>
```

**✅ Enhanced Design:**
```html
<button class="bg-coral text-scorecard shadow-sm hover:bg-coral/90 transition-colors">
  Submit
</button>
```

---

## 🏌️ Golf-Specific Components

### Score Display
```css
.score-card {
  background: linear-gradient(135deg, var(--scorecard-white), var(--light-rough));
  border: 2px solid var(--turf-green);
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(27, 67, 50, 0.1);
}

.score-number {
  font-family: 'DM Sans', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--fairway-green);
}
```

### Leaderboard Items
```css
.leaderboard-item {
  border-left: 4px solid var(--light-rough);
  transition: all 0.2s ease;
  padding: 1rem;
  background: var(--scorecard-white);
}

/* Position-based styling */
.leaderboard-item:nth-child(1) { border-left-color: #FFD700; } /* Gold */
.leaderboard-item:nth-child(2) { border-left-color: #C0C0C0; } /* Silver */
.leaderboard-item:nth-child(3) { border-left-color: #CD7F32; } /* Bronze */
```

### Status Indicators
```css
.status-completed { color: var(--turf-green); }
.status-active { color: var(--sunset-coral); }
.status-pending { color: var(--sky-blue); }
.status-error { color: var(--flag-red); }
```

---

## 📱 Responsive Design Patterns

### Mobile-First Approach
```css
/* Mobile (default) */
.container { 
  padding: 1rem; 
  max-width: 100%;
}

.grid-responsive {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container { 
    padding: 1.5rem; 
    max-width: 768px;
    margin: 0 auto;
  }
  
  .grid-responsive {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container { 
    padding: 2rem;
    max-width: 1024px;
  }
  
  .grid-responsive {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}
```

### Touch Optimization
```css
/* Minimum touch targets for mobile */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem;
}

/* Enhanced mobile interactions */
.mobile-card:active {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}
```

---

## 🎨 Layout Principles

### Golf Interface Layouts

#### Admin Interface
```css
.admin-layout {
  background: linear-gradient(180deg, var(--scorecard-white), var(--light-rough));
}

.admin-sidebar {
  background: var(--fairway-green);
  color: var(--scorecard-white);
}

.admin-content {
  background: var(--scorecard-white);
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(27, 67, 50, 0.08);
}
```

#### Player Interface
```css
.player-layout {
  background: var(--scorecard-white);
}

.player-header {
  background: var(--turf-green);
  color: var(--scorecard-white);
}

.player-card {
  background: var(--scorecard-white);
  border: 1px solid var(--soft-grey);
  border-radius: 1rem;
}
```

---

## 🔍 Testing & Validation

### Contrast Testing Tools
1. **Chrome DevTools**: Accessibility panel shows contrast ratios
2. **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
3. **Colour Contrast Analyser**: Desktop tool for detailed testing

### Validation Checklist
- [ ] All text has minimum 4.5:1 contrast ratio (WCAG AA)
- [ ] Interactive elements have 3:1 contrast for focus indicators
- [ ] Color is not the only way to convey information
- [ ] Custom gradients work properly in Tailwind v4
- [ ] Components follow TapScore design patterns
- [ ] Mobile touch targets are minimum 44px
- [ ] Typography hierarchy is clear and consistent

---

## 📋 Implementation Checklist

### For New Components
- [ ] Use TapScore custom classes first
- [ ] Test contrast ratios in different contexts
- [ ] Add proper focus indicators
- [ ] Implement responsive behavior
- [ ] Add hover/active states
- [ ] Test on mobile devices
- [ ] Validate accessibility

### For Existing Component Updates
- [ ] Maintain backward compatibility
- [ ] Update related components for consistency
- [ ] Test contrast in all themes/modes
- [ ] Verify Tailwind v4 gradient support
- [ ] Update documentation if patterns change

---

## 🚀 Future Considerations

### Planned Enhancements
- Dark mode support with automatic contrast adjustments
- High contrast mode for accessibility compliance
- Custom theme builder for different golf organizations
- Component library with Storybook documentation
- Automated contrast testing in CI/CD pipeline

### Scalability Notes
- Color system designed for easy theme variations
- Component patterns support white-label customization
- Typography scale accommodates multiple languages
- Layout system works for different screen sizes and orientations

---

*This style guide is a living document. Update it when making significant design system changes or discovering new best practices.* 