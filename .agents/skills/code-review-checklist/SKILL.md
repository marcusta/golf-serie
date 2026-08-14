---
name: code-review-checklist
description: Systematic code review for TapScore focusing on code smells, duplication, architecture violations, and security issues. Use when reviewing code changes before commit or merge. Provides constructive feedback with specific fixes.
---

# TapScore Code Review Checklist Skill

This skill guides systematic code review. Use when reviewing ANY code changes before commit or merge.

---

## Review Workflow

Copy this checklist and track your progress:

```
Code Review Progress:
- [ ] Step 1: Detect code smells
- [ ] Step 2: Check for duplication (DRY violations)
- [ ] Step 3: Verify architecture compliance
- [ ] Step 4: Security review
- [ ] Step 5: Generate review report
```

---

## Step 1: Detect Code Smells

**Read for context:**
```bash
cat docs/CODE_REVIEW_GUIDE.md
```

### Check for Long Methods

**Look for**: Methods > 50 lines (excluding comments/blanks)

**Report format**: "Method `calculateLeaderboard` is 85 lines. Extract helper methods."

### Check for Deep Nesting

**Look for**: Nesting > 3 levels

**Report format**: "4 levels of nesting in `processScores`. Use early returns."

### Check for Magic Numbers

**Look for**: Unexplained numeric literals

```typescript
// ❌ CODE SMELL
if (holes === 18) {
  const slope = rating || 113;
}
```

**Report format**: "Replace magic number 18 with `GOLF.HOLES_PER_ROUND`, 113 with `GOLF.STANDARD_SLOPE_RATING`"

### Check for Generic Naming

**Look for**: Variables named `data`, `result`, `temp`, `item`, `info`, `obj`

**Report format**: "Variable `data` is too generic. Use descriptive name like `competitionData`"

---

## Step 2: Check for Duplication (DRY Violations)

### Code Duplication

**Look for**: Identical or very similar code blocks

```typescript
// ❌ DRY VIOLATION - Transform logic duplicated
getCompetitionById(id: number) {
  const row = ...;
  return {
    ...row,
    pars: JSON.parse(row.pars),
    is_finished: Boolean(row.is_finished),
  };
}

getCompetitionByDate(date: string) {
  const row = ...;
  return {
    ...row,
    pars: JSON.parse(row.pars),  // Duplicated
    is_finished: Boolean(row.is_finished),  // Duplicated
  };
}
```

**Report format**: "Transform logic duplicated in `getCompetitionById` and `getCompetitionByDate`. Extract to `transformCompetitionRow` method."

### Similar Logic Patterns

**Look for**: Multiple methods with nearly identical structure

**Report format**: "Similar validation pattern in `validateCompetitionName` and `validateCourseName`. Extract common `validateName` utility."

---

## Step 3: Verify Architecture Compliance

### Service Layer Violations

**Check**: Query vs logic separation

```typescript
// ❌ ARCHITECTURE VIOLATION
private findAndProcessParticipants(competitionId: number) {
  const rows = this.db.prepare("SELECT ...").all(competitionId);
  // Business logic in query method
  return rows.map(r => this.calculateScore(r));
}
```

**Report format**: "Method `findAndProcessParticipants` mixes query and logic. Separate into `findParticipants` (query) and `processParticipants` (logic)."

**Check**: Transform methods have explicit return types

```typescript
// ❌ ARCHITECTURE VIOLATION
private transformRow(row: ParticipantRow) {  // No return type
  return { ...row, score: JSON.parse(row.score) };
}
```

**Report format**: "Transform method `transformRow` missing explicit return type. Add `: Participant`"

### Design System Violations (Frontend)

**Check**: Uses shadcn/ui components

```tsx
// ❌ DESIGN VIOLATION
<button onClick={handleClick}>Click</button>
```

**Report format**: "Use shadcn Button component instead of raw `<button>`. Import from `@/components/ui/button`"

**Check**: Visual hierarchy rules

```tsx
// ❌ DESIGN VIOLATION
<div className="shadow-lg">
  <div className="shadow-lg">  {/* Nested shadow */}
```

**Report format**: "Nested shadows violate design system. Only outer container should have `shadow-lg`."

---

## Step 4: Security Review

### SQL Injection

**Check**: All queries use prepared statements

```typescript
// ❌ SECURITY VIOLATION
findPlayerByName(name: string) {
  return this.db.prepare(`SELECT * FROM players WHERE name = '${name}'`).get();
}
```

**Report format**: "CRITICAL: SQL injection vulnerability. Use prepared statement with `?` placeholder."

### Missing Validation

**Check**: Input validation before database operations

```typescript
// ❌ SECURITY ISSUE
createCompetition(data: CreateDto) {
  // No validation
  return this.db.prepare("INSERT ...").get(data.name, ...);
}
```

**Report format**: "Missing input validation. Call `validateCompetitionData(data)` before database operation."

### Missing Error Handling

**Check**: JSON.parse wrapped with try/catch

```typescript
// ❌ SECURITY ISSUE
const pars = JSON.parse(competition.pars);
```

**Report format**: "Wrap JSON.parse with try/catch. Use `parseParsArray` helper with descriptive error message."

---

## Step 5: Generate Review Report

### Report Template

```markdown
# Code Review Report

## Summary
[Approve / Request Changes / Reject]

## Critical Issues (Must Fix)
[Security, architecture violations, SQL injection]

## Code Smells (Should Fix)
[Long methods, deep nesting, magic numbers, generic names]

## DRY Violations (Consider Refactoring)
[Duplicated code, repeated patterns]

## Positive Observations
[What was done well]

## Recommendation
[Approve with suggestions / Request changes before merge]
```

---

## Review Checklist

### Code Quality
- [ ] No methods over 50 lines (except query methods)
- [ ] No nesting deeper than 3 levels
- [ ] No magic numbers (use GOLF constants)
- [ ] No generic names (`data`, `result`, `temp`)
- [ ] No `any` type
- [ ] Explicit return types on methods
- [ ] Descriptive naming

### Architecture
- [ ] Query methods: single SQL query only
- [ ] Logic methods: no database access
- [ ] Transform methods: explicit return types
- [ ] Transactions: validation outside
- [ ] Player display names handled correctly

### DRY
- [ ] No duplicated code blocks
- [ ] No repeated logic patterns
- [ ] Common logic extracted

### Security
- [ ] All SQL uses prepared statements
- [ ] No string concatenation in queries
- [ ] Input validation before database ops
- [ ] JSON.parse wrapped with error handling
- [ ] No SQL injection vulnerabilities

### Frontend (if applicable)
- [ ] Uses shadcn/ui components
- [ ] Follows visual hierarchy (one level shadows)
- [ ] Proper roundness hierarchy
- [ ] WCAG AA contrast (4.5:1)
- [ ] Touch targets 44px minimum

### Testing
- [ ] Tests exist for new code
- [ ] CRUD operations tested
- [ ] Validation tested
- [ ] Error cases tested

---

## Example Review Report

```markdown
# Code Review Report - Competition API Endpoint

## Summary
**Request Changes** - Several code quality and security issues found

## Critical Issues (Must Fix)

1. **SQL Injection Vulnerability** in `CompetitionService.findByName`
   - Location: `src/services/CompetitionService.ts:45`
   - Issue: Uses string interpolation in SQL
   - Fix: Use prepared statement with `?` placeholder
   ```typescript
   // Current (UNSAFE)
   return this.db.prepare(`SELECT * FROM competitions WHERE name = '${name}'`).get();

   // Fix
   return this.db.prepare("SELECT * FROM competitions WHERE name = ?").get(name);
   ```

2. **Missing Input Validation**
   - Location: `src/api/competitions.ts:78`
   - Issue: No validation before database insert
   - Fix: Add validation call before transaction
   ```typescript
   this.validateCompetitionData(data);
   ```

## Code Smells (Should Fix)

1. **Long Method**: `calculateLeaderboard` (72 lines)
   - Extract helper methods: `calculateEntry`, `sortByScore`, `assignRanks`

2. **Magic Numbers**
   - Line 92: Replace `18` with `GOLF.HOLES_PER_ROUND`
   - Line 105: Replace `113` with `GOLF.STANDARD_SLOPE_RATING`

3. **Deep Nesting**: 4 levels in `processScores` (line 134)
   - Use early returns to flatten

## DRY Violations (Consider Refactoring)

1. **Duplicated Transform Logic**
   - Methods: `getCompetitionById`, `getCompetitionByDate`
   - Fix: Extract `transformCompetitionRow` method

## Positive Observations

✅ Good use of transaction for multi-step operation
✅ Comprehensive error messages
✅ Proper use of RETURNING clause
✅ Tests cover all CRUD operations

## Recommendation
**Request Changes** - Fix critical security issues and code smells before merge.
```

---

## Best Practices

### Do's

✅ Be specific about location (file:line)
✅ Suggest concrete fixes with code examples
✅ Prioritize security over style
✅ Acknowledge good code
✅ Explain *why* something is a problem

### Don'ts

❌ Don't be vague ("this is bad")
❌ Don't nitpick formatting
❌ Don't focus only on negatives
❌ Don't require perfection for non-critical issues

---

## Summary

**Code review approach**: Systematic analysis for smells, duplication, architecture violations, and security. Constructive, actionable feedback.

**Every review must**:
- Detect and report code smells
- Identify DRY violations
- Verify architecture compliance
- Check for security vulnerabilities
- Provide specific, actionable fixes
- Generate comprehensive report

For detailed patterns, see `docs/CODE_REVIEW_GUIDE.md`.
