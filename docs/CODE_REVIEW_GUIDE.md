# Code Review Guide

**For Code Review Sub-Agent Use Only**

This guide contains all code review standards and checklist items. When you receive a code review task, analyze code against these criteria.

---

## 📋 Table of Contents

- [Review Workflow](#review-workflow)
- [Code Smells Detection](#code-smells-detection)
- [DRY Violations](#dry-violations-duplication)
- [Architecture Review](#architecture-review)
- [Security Review](#security-review)
- [Review Checklist](#review-checklist)

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

## Code Smells Detection

### Long Methods

**Indicator**: Method exceeds 50 lines (excluding comments/blanks)

```typescript
// ❌ CODE SMELL - Too long
calculateLeaderboard(participants: Participant[]): LeaderboardEntry[] {
  // 80+ lines of logic
  // Extract smaller methods!
}
```

**Fix**: Extract helper methods, each with single responsibility

### Deep Nesting

**Indicator**: More than 3 levels of nesting

```typescript
// ❌ CODE SMELL - 4 levels deep
for (const p of participants) {  // 1
  if (p.player_id) {  // 2
    for (const s of scores) {  // 3
      if (s > 0) {  // 4 - TOO DEEP
```

**Fix**: Use early returns, extract methods

### Magic Numbers

**Indicator**: Unexplained numeric literals (not 0, 1, -1 in obvious contexts)

```typescript
// ❌ CODE SMELL - What's 18? What's 113?
if (holes === 18) {
  const slope = rating || 113;
}
```

**Fix**: Use GOLF constants

### Generic Naming

**Indicator**: Variables named `data`, `result`, `temp`, `item`, `info`, `obj`

```typescript
// ❌ CODE SMELL - Generic names
const data = getData();
const result = process(data);
```

**Fix**: Use descriptive domain names

### God Objects/Classes

**Indicator**: Service class with > 20 methods or > 500 lines

**Fix**: Split into focused services by domain

### Primitive Obsession

**Indicator**: Using primitives instead of domain types

```typescript
// ❌ CODE SMELL - Primitive obsession
function calculateHandicap(
  scores: number[],
  courseRating: number,
  slopeRating: number,
  gender: string
): number { ... }
```

**Fix**: Create domain types

```typescript
// ✅ BETTER
interface HandicapCalculationInput {
  scores: number[];
  tee: CourseTee;  // Contains rating, slope, gender
}

function calculateHandicap(input: HandicapCalculationInput): number { ... }
```

### Shotgun Surgery

**Indicator**: Single change requires modifying many files

**Example**: Adding a new field requires changes in:
- Database schema
- Row type
- Domain type
- Transform method
- API response type
- Frontend type
- Multiple components

**Note**: Some shotgun surgery is unavoidable for cross-cutting changes. Flag only if excessive (> 10 files for minor change).

---

## DRY Violations (Duplication)

### Code Duplication

**Indicator**: Same or very similar code blocks appear multiple times

```typescript
// ❌ DRY VIOLATION - Duplicated logic
class CompetitionService {
  getCompetitionById(id: number): Competition {
    const row = this.db.prepare("SELECT * FROM competitions WHERE id = ?").get(id);
    if (!row) throw new Error("Competition not found");
    return {
      ...row,
      pars: JSON.parse(row.pars),
      is_finished: Boolean(row.is_finished),
    };
  }

  getCompetitionByDate(date: string): Competition {
    const row = this.db.prepare("SELECT * FROM competitions WHERE date = ?").get(date);
    if (!row) throw new Error("Competition not found");
    return {
      ...row,
      pars: JSON.parse(row.pars),  // Duplicated transformation
      is_finished: Boolean(row.is_finished),  // Duplicated transformation
    };
  }
}
```

**Fix**: Extract transform method

```typescript
// ✅ FIX - Extract common logic
class CompetitionService {
  private transformRow(row: CompetitionRow): Competition {
    return {
      ...row,
      pars: JSON.parse(row.pars),
      is_finished: Boolean(row.is_finished),
    };
  }

  getCompetitionById(id: number): Competition {
    const row = this.db.prepare("SELECT * FROM competitions WHERE id = ?").get(id);
    if (!row) throw new Error("Competition not found");
    return this.transformRow(row);
  }

  getCompetitionByDate(date: string): Competition {
    const row = this.db.prepare("SELECT * FROM competitions WHERE date = ?").get(date);
    if (!row) throw new Error("Competition not found");
    return this.transformRow(row);
  }
}
```

### Similar Logic Patterns

**Indicator**: Multiple methods with nearly identical structure

```typescript
// ❌ DRY VIOLATION - Similar pattern repeated
validateCompetitionName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Name required");
  }
  if (name.length > 100) {
    throw new Error("Name too long");
  }
}

validateCourseName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Name required");
  }
  if (name.length > 100) {
    throw new Error("Name too long");
  }
}
```

**Fix**: Extract common validator

```typescript
// ✅ FIX - Common validator
private validateName(name: string, entityType: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error(`${entityType} name required`);
  }
  if (name.length > 100) {
    throw new Error(`${entityType} name too long`);
  }
}

validateCompetitionName(name: string): void {
  this.validateName(name, "Competition");
}
```

### Copy-Paste Code

**Detection**: Search for identical or near-identical blocks

**Fix**: Extract to shared utility or method

---

## Architecture Review

### Service Layer Violations

**Check**: Methods follow query vs logic separation

```typescript
// ❌ ARCHITECTURE VIOLATION - Query + logic mixed
private findAndProcessParticipants(competitionId: number): ProcessedParticipant[] {
  const rows = this.db.prepare("SELECT * FROM participants WHERE competition_id = ?")
    .all(competitionId);

  // Business logic in query method
  return rows.map(r => ({
    ...r,
    totalScore: JSON.parse(r.score).reduce((a, b) => a + b, 0),
    relativeToPar: this.calculateRelative(r),
  }));
}
```

**Fix**: Separate into query method and logic method

**Check**: Transform methods have explicit return types

```typescript
// ❌ ARCHITECTURE VIOLATION - No return type
private transformRow(row: ParticipantRow) {
  return { ...row, score: JSON.parse(row.score) };
}

// ✅ CORRECT
private transformRow(row: ParticipantRow): Participant {
  return { ...row, score: JSON.parse(row.score) };
}
```

### SQL Security Violations

**Check**: All queries use prepared statements

```typescript
// ❌ SECURITY VIOLATION - String concatenation
findPlayerByName(name: string): Player {
  return this.db.prepare(`SELECT * FROM players WHERE name = '${name}'`).get();
}

// ✅ CORRECT
findPlayerByName(name: string): Player {
  return this.db.prepare("SELECT * FROM players WHERE name = ?").get(name);
}
```

**Check**: No SQL injection risks

### Design System Violations (Frontend)

**Check**: Uses shadcn/ui components, not raw HTML

```tsx
// ❌ DESIGN VIOLATION
<button onClick={handleClick}>Click Me</button>

// ✅ CORRECT
import { Button } from "@/components/ui/button"
<Button onClick={handleClick}>Click Me</Button>
```

**Check**: Follows visual hierarchy rules

```tsx
// ❌ DESIGN VIOLATION - Nested shadows
<div className="shadow-lg">
  <div className="shadow-lg">  {/* Nested shadow */}
    Content
  </div>
</div>

// ✅ CORRECT - One level of shadows
<div className="bg-soft-grey/30 rounded-2xl shadow-lg">
  <div className="bg-white rounded">  {/* No shadow */}
    Content
  </div>
</div>
```

---

## Security Review

### SQL Injection

**Check**: All user input goes through prepared statements

**Check**: No string concatenation in SQL

### Missing Validation

**Check**: Input validation before database operations

```typescript
// ❌ SECURITY ISSUE - No validation
createCompetition(data: CreateDto): Competition {
  return this.db.prepare(`
    INSERT INTO competitions (name, date, course_id)
    VALUES (?, ?, ?) RETURNING *
  `).get(data.name, data.date, data.course_id);
}

// ✅ CORRECT - Validation first
createCompetition(data: CreateDto): Competition {
  this.validateCompetitionData(data);  // Validate before insert

  return this.db.prepare(`
    INSERT INTO competitions (name, date, course_id)
    VALUES (?, ?, ?) RETURNING *
  `).get(data.name, data.date, data.course_id);
}
```

### Exposed Sensitive Data

**Check**: No passwords, tokens, or secrets in logs or responses

**Check**: Proper error messages (not exposing internal details)

### Missing Error Handling

**Check**: Try/catch around JSON.parse

**Check**: Null checks before accessing properties

---

## Review Checklist

### Code Quality

- [ ] No methods over 50 lines (except query methods with long SQL)
- [ ] No nesting deeper than 3 levels
- [ ] No magic numbers (use GOLF constants)
- [ ] No generic variable names (`data`, `result`, `temp`)
- [ ] No use of `any` type
- [ ] Explicit return types on all methods
- [ ] Descriptive naming following conventions

### Architecture

- [ ] Query methods contain only single SQL query
- [ ] Logic methods contain no database access
- [ ] Transform methods have explicit return types
- [ ] Public API methods orchestrate query + logic
- [ ] Transactions used correctly (validation outside)
- [ ] Player display names handled correctly

### DRY (Don't Repeat Yourself)

- [ ] No duplicated code blocks
- [ ] No repeated logic patterns
- [ ] Common logic extracted to utilities
- [ ] Transform logic not duplicated

### Security

- [ ] All SQL uses prepared statements
- [ ] No string concatenation in queries
- [ ] Input validation before database operations
- [ ] JSON.parse wrapped with error handling
- [ ] Foreign key validation where needed
- [ ] No SQL injection vulnerabilities

### Frontend (if applicable)

- [ ] Uses shadcn/ui components (not raw HTML)
- [ ] Follows visual hierarchy rules (one level shadows)
- [ ] Proper roundness hierarchy (outer soft, inner sharp)
- [ ] WCAG AA contrast ratios (4.5:1 minimum)
- [ ] Touch targets minimum 44px
- [ ] PlayerPageLayout used correctly

### Testing

- [ ] Tests exist for new code
- [ ] CRUD operations tested
- [ ] Validation tested
- [ ] Error cases tested
- [ ] Business logic tested

---

## Review Report Template

```markdown
# Code Review Report

## Summary
[Overall assessment: Approve / Request Changes / Reject]

## Critical Issues (Must Fix)
- [List any security issues, architecture violations, SQL injection risks]

## Code Smells (Should Fix)
- [List long methods, deep nesting, magic numbers, generic names]

## DRY Violations (Consider Refactoring)
- [List duplicated code, repeated patterns]

## Design/Architecture Suggestions
- [Optional improvements, refactoring suggestions]

## Positive Observations
- [What was done well]

## Checklist Status
- [ ] Code Quality: Pass/Fail
- [ ] Architecture: Pass/Fail
- [ ] DRY: Pass/Fail
- [ ] Security: Pass/Fail
- [ ] Testing: Pass/Fail
```

---

## Best Practices

### Do's

✅ Be constructive and specific
✅ Suggest fixes, not just problems
✅ Prioritize security and architecture issues
✅ Acknowledge good code
✅ Link to relevant documentation
✅ Explain why something is a problem

### Don'ts

❌ Don't be vague ("this is bad")
❌ Don't nitpick formatting (if linter passes)
❌ Don't require perfection (code can improve iteratively)
❌ Don't focus only on negatives
❌ Don't review style over substance

---

## Summary

**Code review approach**: Systematic analysis for code smells, duplication, architecture violations, and security issues. Focus on maintainability, security, and adherence to TapScore patterns.

**Every review must**:
- Detect code smells and suggest fixes
- Identify DRY violations
- Verify architecture compliance
- Check for security vulnerabilities
- Provide constructive, actionable feedback
- Generate comprehensive review report

Build confidence in code quality before merge.
