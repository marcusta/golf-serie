---
name: sql-security
description: Enforce SQL security and prepared statement usage in TapScore backend. Use when writing any SQL queries, database operations, or data access code. Prevents SQL injection vulnerabilities and ensures transaction safety.
---

# TapScore SQL Security Skill

This skill enforces SQL security best practices and prepared statement usage. Use for ANY database operation: queries, inserts, updates, deletes, or schema changes.

---

## Security Workflow

Copy this checklist and track your progress:

```
SQL Security Checklist:
- [ ] Step 1: Use prepared statements for all queries
- [ ] Step 2: Validate transaction patterns
- [ ] Step 3: Check for SQL injection risks
- [ ] Step 4: Verify error handling
- [ ] Step 5: Confirm foreign key constraints
```

---

## Step 1: Use Prepared Statements for All Queries

### CRITICAL RULE: NEVER use string concatenation or template literals for SQL

**Low Freedom**: This is non-negotiable. SQL injection is a critical security risk.

### Correct Pattern: Parameterized Queries

```typescript
// ✅ CORRECT - Prepared statement with parameters
findPlayerById(id: number): Player | null {
  return this.db.prepare("SELECT * FROM players WHERE id = ?")
    .get(id) as Player | null;
}

findPlayersByName(name: string): Player[] {
  return this.db.prepare("SELECT * FROM players WHERE name LIKE ?")
    .all(`%${name}%`) as Player[];
}

// Multiple parameters
findCompetitionByDateAndCourse(date: string, courseId: number): Competition | null {
  return this.db.prepare(`
    SELECT * FROM competitions
    WHERE date = ? AND course_id = ?
  `).get(date, courseId) as Competition | null;
}
```

### SQL Injection Vulnerabilities (NEVER DO THIS)

```typescript
// ❌ CRITICAL SECURITY RISK - String concatenation
findPlayerById(id: number): Player | null {
  return this.db.prepare("SELECT * FROM players WHERE id = " + id)
    .get() as Player | null;
}

// ❌ CRITICAL SECURITY RISK - Template literal interpolation
findPlayersByName(name: string): Player[] {
  return this.db.prepare(`SELECT * FROM players WHERE name = '${name}'`)
    .all() as Player[];
}

// ❌ CRITICAL SECURITY RISK - Dynamic SQL building
buildQuery(tableName: string, condition: string): any[] {
  return this.db.prepare(`SELECT * FROM ${tableName} WHERE ${condition}`)
    .all();
}
```

**Why this is dangerous**: Attacker can inject malicious SQL
```typescript
// User input: "'; DROP TABLE players; --"
findPlayersByName("'; DROP TABLE players; --")
// Resulting query: SELECT * FROM players WHERE name = ''; DROP TABLE players; --'
```

### Safe Dynamic Queries

If you need dynamic queries (table names, column names), use whitelisting:

```typescript
// ✅ CORRECT - Whitelist table names
private VALID_TABLES = ['players', 'competitions', 'courses'] as const;

findByTable(tableName: string, id: number): any | null {
  // Validate against whitelist
  if (!this.VALID_TABLES.includes(tableName as any)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  // Table name is validated, but still use ? for values
  return this.db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
    .get(id);
}
```

---

## Step 2: Validate Transaction Patterns

### Correct Transaction Usage

```typescript
// ✅ CORRECT - Transaction with validation before
createCompetitionWithTeeTimes(data: CreateDto, teeTimes: string[]) {
  // Validate BEFORE transaction (fail fast)
  this.validateCompetitionData(data);

  // Transaction boundary
  return this.db.transaction(() => {
    const competition = this.insertCompetition(data);

    const createdTeeTimes = teeTimes.map(time =>
      this.insertTeeTime(competition.id, time)
    );

    return { competition, teeTimes: createdTeeTimes };
  })();  // Note: () at end to execute immediately
}

// ✅ CORRECT - Single query doesn't need explicit transaction (auto-commit)
createCompetition(data: CreateDto): Competition {
  this.validateCompetitionData(data);

  return this.db.prepare(`
    INSERT INTO competitions (name, date, course_id)
    VALUES (?, ?, ?) RETURNING *
  `).get(data.name, data.date, data.course_id) as Competition;
}
```

### Transaction Anti-Patterns

```typescript
// ❌ WRONG - Validation inside transaction (waste if validation fails)
createCompetition(data: CreateDto) {
  return this.db.transaction(() => {
    this.validateCompetitionData(data);  // Should be outside
    // ...
  })();
}

// ❌ WRONG - Forgot to execute transaction (missing final parentheses)
createCompetition(data: CreateDto) {
  return this.db.transaction(() => {
    // ...
  });  // Missing () - returns function, doesn't execute
}

// ❌ WRONG - Try/catch inside transaction (automatic rollback on error)
createCompetition(data: CreateDto) {
  return this.db.transaction(() => {
    try {  // Unnecessary - transaction auto-rolls back on error
      // ...
    } catch (e) {
      // Won't work as expected - transaction already aborted
      console.log("Error");
    }
  })();
}
```

### Cross-Service Transactions

```typescript
// ✅ CORRECT - All services share same db instance
createFullCompetition(data: FullCompetitionDto) {
  return this.db.transaction(() => {
    // Both services use same transaction automatically
    const comp = this.competitionService.insertCompetition(data);
    const times = this.teeTimeService.createTeeTimes(comp.id, data.teeTimes);
    return { comp, times };
  })();
}
```

---

## Step 3: Check for SQL Injection Risks

### Checklist for Every Query

When writing or reviewing SQL queries:

- [ ] **ALL values use `?` placeholders** (never string concatenation)
- [ ] **Table/column names are static or whitelisted** (never from user input)
- [ ] **LIKE patterns built safely** (`%${value}%` passed as parameter)
- [ ] **IN clauses use correct parameter syntax** (see below)
- [ ] **JSON fields properly escaped** (use parameterized queries)
- [ ] **ORDER BY uses whitelist if dynamic** (never direct user input)

### IN Clause Pattern

```typescript
// ✅ CORRECT - Multiple parameters for IN clause
findPlayersByIds(ids: number[]): Player[] {
  const placeholders = ids.map(() => '?').join(',');
  return this.db.prepare(`
    SELECT * FROM players WHERE id IN (${placeholders})
  `).all(...ids) as Player[];
}

// ❌ WRONG - String interpolation in IN clause
findPlayersByIds(ids: number[]): Player[] {
  const idsStr = ids.join(',');
  return this.db.prepare(`
    SELECT * FROM players WHERE id IN (${idsStr})
  `).all() as Player[];
}
```

### ORDER BY with Dynamic Columns

```typescript
// ✅ CORRECT - Whitelist columns
private VALID_SORT_COLUMNS = ['name', 'date', 'score'] as const;

findPlayersOrdered(sortBy: string): Player[] {
  if (!this.VALID_SORT_COLUMNS.includes(sortBy as any)) {
    throw new Error(`Invalid sort column: ${sortBy}`);
  }

  // Column name validated, safe to interpolate
  return this.db.prepare(`
    SELECT * FROM players ORDER BY ${sortBy}
  `).all() as Player[];
}
```

---

## Step 4: Verify Error Handling

### Defensive JSON Parsing

```typescript
// ✅ CORRECT - Wrapped with error handling
private parseParsArray(json: string): number[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error("Pars must be an array");
    }
    return parsed;
  } catch (e) {
    throw new Error(
      `Invalid pars format: ${e instanceof Error ? e.message : 'unknown error'}`
    );
  }
}

// ❌ WRONG - Naked JSON.parse (cryptic error if invalid)
private parseParsArray(json: string): number[] {
  return JSON.parse(json);
}
```

### Query Error Handling

```typescript
// ✅ CORRECT - Descriptive errors
async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
  const competition = this.findCompetitionById(competitionId);
  if (!competition) {
    throw new Error(`Competition not found: ${competitionId}`);
  }

  const participants = this.findParticipantsByCompetition(competitionId);
  if (participants.length === 0) {
    return [];  // Empty leaderboard is valid
  }

  // ... process
}

// ❌ WRONG - Generic errors
async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
  const competition = this.findCompetitionById(competitionId);
  if (!competition) {
    throw new Error("Not found");  // Not helpful
  }
  // ...
}
```

---

## Step 5: Confirm Foreign Key Constraints

### Foreign Keys in Migrations

```typescript
// ✅ CORRECT - Foreign key with CASCADE
this.db.exec(`
  CREATE TABLE participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    player_id INTEGER,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
  )
`);
```

### Foreign Key Validation in Services

```typescript
// ✅ CORRECT - Validate foreign key exists
createParticipant(data: CreateParticipantDto): Participant {
  // Validate foreign key
  const competition = this.findCompetitionById(data.competition_id);
  if (!competition) {
    throw new Error(`Competition not found: ${data.competition_id}`);
  }

  if (data.player_id) {
    const player = this.playerService.findPlayerById(data.player_id);
    if (!player) {
      throw new Error(`Player not found: ${data.player_id}`);
    }
  }

  return this.db.prepare(`
    INSERT INTO participants (competition_id, player_id, score)
    VALUES (?, ?, ?) RETURNING *
  `).get(
    data.competition_id,
    data.player_id,
    JSON.stringify(data.score)
  ) as Participant;
}
```

---

## Common Security Anti-Patterns

### 1. String Concatenation in SQL

```typescript
// ❌ CRITICAL - SQL injection vulnerability
findPlayers(searchTerm: string) {
  return this.db.prepare(
    "SELECT * FROM players WHERE name = '" + searchTerm + "'"
  ).all();
}

// ✅ FIX - Use parameterized query
findPlayers(searchTerm: string) {
  return this.db.prepare("SELECT * FROM players WHERE name = ?")
    .all(searchTerm);
}
```

### 2. Template Literal Interpolation

```typescript
// ❌ CRITICAL - SQL injection vulnerability
findPlayersByEmail(email: string) {
  return this.db.prepare(`
    SELECT * FROM players WHERE email = '${email}'
  `).all();
}

// ✅ FIX - Use parameterized query
findPlayersByEmail(email: string) {
  return this.db.prepare("SELECT * FROM players WHERE email = ?")
    .all(email);
}
```

### 3. Dynamic Table/Column Names from User Input

```typescript
// ❌ CRITICAL - SQL injection vulnerability
sortPlayersBy(column: string) {
  return this.db.prepare(`SELECT * FROM players ORDER BY ${column}`)
    .all();
}

// ✅ FIX - Whitelist columns
private VALID_COLUMNS = ['name', 'email', 'handicap_index'] as const;

sortPlayersBy(column: string) {
  if (!this.VALID_COLUMNS.includes(column as any)) {
    throw new Error(`Invalid column: ${column}`);
  }
  return this.db.prepare(`SELECT * FROM players ORDER BY ${column}`)
    .all();
}
```

### 4. Unsafe LIKE Patterns

```typescript
// ❌ WRONG - Pattern interpolated directly
searchPlayers(term: string) {
  return this.db.prepare(`
    SELECT * FROM players WHERE name LIKE '%${term}%'
  `).all();
}

// ✅ CORRECT - Pattern built in parameter
searchPlayers(term: string) {
  return this.db.prepare("SELECT * FROM players WHERE name LIKE ?")
    .all(`%${term}%`);
}
```

---

## Migration Security

### Safe Schema Changes

```typescript
// ✅ CORRECT - Use helper for conditional changes
up(): void {
  if (!this.columnExists('players', 'handicap_index')) {
    this.db.exec(`
      ALTER TABLE players
      ADD COLUMN handicap_index REAL DEFAULT NULL
    `);
  }
}

// ✅ CORRECT - Enable foreign keys
up(): void {
  this.db.exec("PRAGMA foreign_keys = ON");

  this.db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
    )
  `);
}
```

---

## Security Checklist

Before merging any database code:

### Query Security
- [ ] ALL queries use prepared statements (`?` placeholders)
- [ ] NO string concatenation in SQL
- [ ] NO template literal interpolation in SQL
- [ ] Table/column names are static or whitelisted
- [ ] LIKE patterns passed as parameters
- [ ] IN clauses use multiple `?` placeholders
- [ ] ORDER BY uses whitelist if dynamic

### Transaction Safety
- [ ] Validation happens BEFORE `db.transaction()`
- [ ] Transaction executed with final `()`
- [ ] Cross-service transactions use same db instance
- [ ] Single-query operations use auto-commit (no explicit transaction)

### Data Integrity
- [ ] Foreign key constraints defined in schema
- [ ] Foreign key validation in service layer
- [ ] JSON.parse wrapped with error handling
- [ ] Descriptive error messages

### Type Safety
- [ ] Query return types properly cast
- [ ] NO use of `any` type
- [ ] Type guards before type assertions

---

## Summary

**TapScore SQL security approach**: Prepared statements for everything, validation before transactions, and rigorous error handling. Security through **discipline and zero tolerance for shortcuts**.

**Every database operation must**:
- Use prepared statements (NEVER string concatenation)
- Whitelist dynamic identifiers (table/column names)
- Validate before transactions
- Handle errors descriptively
- Respect foreign key constraints
- Use proper type casting

Build database operations that are secure, reliable, and maintainable.
