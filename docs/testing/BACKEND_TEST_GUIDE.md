# Backend Testing Guide

**For Backend Test Sub-Agent Use Only**

This guide contains all backend testing patterns and practices. When you receive a backend testing task, follow these guidelines strictly.

---

## 📋 Table of Contents

- [Testing Commands](#testing-commands)
- [Testing Architecture](#testing-architecture)
- [Service Layer Testing](#service-layer-testing)
- [API Endpoint Testing](#api-endpoint-testing)
- [Database Testing](#database-testing)
- [Important Constraints](#important-constraints)

---

## Testing Commands

```bash
# Run tests
bun run test:server     # Server tests only (recommended)
bun test                # All tests (includes frontend)
bun test --watch        # Watch mode

# Type checking
bun run type-check      # TypeScript validation
```

---

## Testing Architecture

### Test Organization

```
src/
├── api/
│   └── __tests__/      # API endpoint tests
│       └── courses.test.ts
├── services/
│   └── __tests__/      # Service layer tests
│       └── CourseService.test.ts
└── database/
    └── migrations/     # Migration tests (inline)
```

### Test Strategy

- **In-memory SQLite**: Each test file gets its own database
- **No mocking**: Test real database operations
- **Comprehensive CRUD**: Test all operations with validation
- **HTTP testing**: Test actual API endpoints with proper status codes
- **Business logic**: Test calculations and domain rules

---

## Service Layer Testing

### Test Structure

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import Database from "bun:sqlite";
import { CourseService } from "../CourseService";

describe("CourseService", () => {
  let db: Database;
  let service: CourseService;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(":memory:");

    // Run migrations
    db.exec(`
      CREATE TABLE courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pars TEXT NOT NULL
      )
    `);

    // Initialize service
    service = new CourseService(db);
  });

  test("creates course with valid data", () => {
    const course = service.createCourse({
      name: "Test Course",
      pars: [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],
    });

    expect(course.id).toBeGreaterThan(0);
    expect(course.name).toBe("Test Course");
    expect(JSON.parse(course.pars)).toHaveLength(18);
  });

  test("throws error for invalid par count", () => {
    expect(() =>
      service.createCourse({
        name: "Invalid Course",
        pars: [4, 3, 5],  // Only 3 pars
      })
    ).toThrow("Course must have exactly 18 holes");
  });

  test("throws error for invalid par values", () => {
    expect(() =>
      service.createCourse({
        name: "Invalid Course",
        pars: [2, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],  // Par 2
      })
    ).toThrow("Par must be between 3 and 6");
  });
});
```

### Testing CRUD Operations

```typescript
describe("CourseService CRUD", () => {
  // ... setup

  test("creates course", () => {
    const course = service.createCourse(validCourseData);
    expect(course.id).toBeGreaterThan(0);
  });

  test("reads course by id", () => {
    const created = service.createCourse(validCourseData);
    const found = service.getCourseById(created.id);

    expect(found).not.toBeNull();
    expect(found!.name).toBe(validCourseData.name);
  });

  test("updates course", () => {
    const created = service.createCourse(validCourseData);

    const updated = service.updateCourse(created.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
  });

  test("deletes course", () => {
    const created = service.createCourse(validCourseData);

    service.deleteCourse(created.id);

    const found = service.getCourseById(created.id);
    expect(found).toBeNull();
  });

  test("lists all courses", () => {
    service.createCourse({ name: "Course 1", pars: validPars });
    service.createCourse({ name: "Course 2", pars: validPars });

    const courses = service.getAllCourses();
    expect(courses).toHaveLength(2);
  });
});
```

### Testing Business Logic

```typescript
describe("LeaderboardService calculations", () => {
  // ... setup

  test("calculates relative to par correctly", () => {
    const participant = createTestParticipant({
      score: [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],  // 72
    });

    const competition = createTestCompetition({
      pars: [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],   // Par 72
    });

    const entry = service.calculateLeaderboardEntry(participant, competition);

    expect(entry.totalScore).toBe(72);
    expect(entry.relativeToPar).toBe(0);  // Even par
  });

  test("calculates under par correctly", () => {
    const participant = createTestParticipant({
      score: [3, 3, 4, 4, 4, 3, 4, 4, 4, 3, 3, 4, 4, 4, 3, 4, 4, 4],  // 66
    });

    const competition = createTestCompetition({
      pars: [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],   // Par 72
    });

    const entry = service.calculateLeaderboardEntry(participant, competition);

    expect(entry.relativeToPar).toBe(-6);  // 6 under par
  });

  test("sorts leaderboard by score", () => {
    const leaderboard = service.getLeaderboard(competitionId);

    // Verify sorted ascending by total score
    for (let i = 0; i < leaderboard.length - 1; i++) {
      expect(leaderboard[i].totalScore)
        .toBeLessThanOrEqual(leaderboard[i + 1].totalScore);
    }
  });
});
```

### Testing Transactions

```typescript
describe("CompetitionService transactions", () => {
  test("rolls back on error", () => {
    expect(() =>
      service.createCompetitionWithTeeTimes(
        validCompetitionData,
        ["invalid-time-format"]  // Will cause error
      )
    ).toThrow();

    // Verify nothing was created
    const competitions = service.getAllCompetitions();
    expect(competitions).toHaveLength(0);
  });

  test("commits all changes atomically", () => {
    const result = service.createCompetitionWithTeeTimes(
      validCompetitionData,
      ["08:00", "08:10", "08:20"]
    );

    expect(result.competition.id).toBeGreaterThan(0);
    expect(result.teeTimes).toHaveLength(3);

    // Verify all tee times were created
    const teeTimes = service.getTeeTimesByCompetition(result.competition.id);
    expect(teeTimes).toHaveLength(3);
  });
});
```

---

## API Endpoint Testing

### Test Structure with Hono

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import { createCoursesApi } from "../courses";
import Database from "bun:sqlite";

describe("Courses API", () => {
  let app: any;
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");

    // Run migrations
    db.exec(`CREATE TABLE courses (...)`);

    // Create API
    app = createCoursesApi(db);
  });

  test("GET /api/courses returns all courses", async () => {
    // Seed data
    db.prepare(`INSERT INTO courses (name, pars) VALUES (?, ?)`)
      .run("Course 1", JSON.stringify(validPars));

    // Make request
    const response = await app.request("/api/courses");

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Course 1");
  });

  test("GET /api/courses/:id returns single course", async () => {
    const course = db.prepare(`
      INSERT INTO courses (name, pars) VALUES (?, ?) RETURNING *
    `).get("Course 1", JSON.stringify(validPars));

    const response = await app.request(`/api/courses/${course.id}`);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.name).toBe("Course 1");
  });

  test("GET /api/courses/:id returns 404 for non-existent", async () => {
    const response = await app.request("/api/courses/999");

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toContain("not found");
  });

  test("POST /api/courses creates new course", async () => {
    const response = await app.request("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Course",
        pars: validPars,
      }),
    });

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBeGreaterThan(0);
    expect(data.name).toBe("New Course");
  });

  test("POST /api/courses returns 400 for invalid data", async () => {
    const response = await app.request("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Invalid",
        pars: [4, 3, 5],  // Only 3 pars
      }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("18 holes");
  });

  test("PUT /api/courses/:id updates course", async () => {
    const course = db.prepare(`
      INSERT INTO courses (name, pars) VALUES (?, ?) RETURNING *
    `).get("Course 1", JSON.stringify(validPars));

    const response = await app.request(`/api/courses/${course.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Name",
      }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.name).toBe("Updated Name");
  });

  test("DELETE /api/courses/:id deletes course", async () => {
    const course = db.prepare(`
      INSERT INTO courses (name, pars) VALUES (?, ?) RETURNING *
    `).get("Course 1", JSON.stringify(validPars));

    const response = await app.request(`/api/courses/${course.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);

    // Verify deleted
    const check = await app.request(`/api/courses/${course.id}`);
    expect(check.status).toBe(404);
  });
});
```

### Testing Error Responses

```typescript
describe("API error handling", () => {
  test("returns 400 for validation errors", async () => {
    const response = await app.request("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ /* invalid data */ }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("error");
  });

  test("returns 404 for not found", async () => {
    const response = await app.request("/api/courses/999");

    expect(response.status).toBe(404);
  });

  test("returns 500 for server errors", async () => {
    // Force database error by closing connection
    db.close();

    const response = await app.request("/api/courses");

    expect(response.status).toBe(500);
  });
});
```

---

## Database Testing

### Testing Migrations

```typescript
describe("Migration 001 - Initial Schema", () => {
  test("creates all required tables", () => {
    const db = new Database(":memory:");
    const migration = new Migration001();

    migration.up(db);

    // Verify tables exist
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all();

    const tableNames = tables.map((t: any) => t.name);
    expect(tableNames).toContain("courses");
    expect(tableNames).toContain("competitions");
    expect(tableNames).toContain("participants");
  });

  test("creates foreign key constraints", () => {
    const db = new Database(":memory:");
    const migration = new Migration001();

    migration.up(db);

    // Try to insert participant with invalid competition_id
    expect(() =>
      db.prepare(`
        INSERT INTO participants (competition_id, score)
        VALUES (999, '[]')
      `).run()
    ).toThrow("FOREIGN KEY constraint failed");
  });
});
```

### Testing Data Integrity

```typescript
describe("Database constraints", () => {
  test("enforces NOT NULL constraints", () => {
    expect(() =>
      db.prepare("INSERT INTO courses (pars) VALUES (?)").run(JSON.stringify(validPars))
    ).toThrow("NOT NULL constraint failed: courses.name");
  });

  test("enforces UNIQUE constraints", () => {
    db.prepare("INSERT INTO teams (name) VALUES (?)").run("Team 1");

    expect(() =>
      db.prepare("INSERT INTO teams (name) VALUES (?)").run("Team 1")
    ).toThrow("UNIQUE constraint failed");
  });

  test("cascades deletes correctly", () => {
    const competition = createTestCompetition();
    const participant = createTestParticipant({ competition_id: competition.id });

    // Delete competition
    db.prepare("DELETE FROM competitions WHERE id = ?").run(competition.id);

    // Verify participant was deleted (CASCADE)
    const found = db.prepare("SELECT * FROM participants WHERE id = ?")
      .get(participant.id);

    expect(found).toBeNull();
  });
});
```

---

## Important Constraints

### Test Isolation

- Each test file gets its own in-memory database
- Tests within a file share the same database (use `beforeEach` to reset)
- Tests should not depend on execution order
- Clean up test data between tests

### No Mocking

- Test real database operations (no mocks)
- Use in-memory SQLite for speed
- Test actual SQL query results
- Verify business logic with real data

### Comprehensive Coverage

- Test happy path (valid data succeeds)
- Test validation (invalid data fails with correct error)
- Test edge cases (empty arrays, null values, boundary values)
- Test error handling (database errors, constraint violations)

---

## Best Practices

### Do's

✅ Test all CRUD operations
✅ Test validation rules
✅ Test business logic calculations
✅ Test transaction rollback
✅ Test API status codes
✅ Test error messages
✅ Use descriptive test names
✅ Keep tests focused and independent

### Don'ts

❌ Don't mock the database
❌ Don't share state between tests
❌ Don't rely on test execution order
❌ Don't skip error case testing
❌ Don't test implementation details
❌ Don't use hard-coded IDs (except in test data)

---

## Example: Complete Test Suite

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import Database from "bun:sqlite";
import { CompetitionService } from "../CompetitionService";

describe("CompetitionService", () => {
  let db: Database;
  let service: CompetitionService;

  beforeEach(() => {
    db = new Database(":memory:");

    // Run migrations
    db.exec(`
      CREATE TABLE courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pars TEXT NOT NULL
      );

      CREATE TABLE competitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    // Seed test course
    db.prepare("INSERT INTO courses (name, pars) VALUES (?, ?)")
      .run("Test Course", JSON.stringify([4,3,5,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4]));

    service = new CompetitionService(db);
  });

  test("creates competition with valid data", () => {
    const competition = service.createCompetition({
      name: "Test Competition",
      date: "2025-09-15",
      course_id: 1,
    });

    expect(competition.id).toBeGreaterThan(0);
    expect(competition.name).toBe("Test Competition");
  });

  test("throws error for missing name", () => {
    expect(() =>
      service.createCompetition({
        name: "",
        date: "2025-09-15",
        course_id: 1,
      })
    ).toThrow("Name required");
  });

  test("throws error for invalid date format", () => {
    expect(() =>
      service.createCompetition({
        name: "Test",
        date: "15/09/2025",  // Wrong format
        course_id: 1,
      })
    ).toThrow("Date must be in YYYY-MM-DD format");
  });

  test("throws error for non-existent course", () => {
    expect(() =>
      service.createCompetition({
        name: "Test",
        date: "2025-09-15",
        course_id: 999,  // Doesn't exist
      })
    ).toThrow("Course not found");
  });
});
```

---

## Summary

**Backend testing approach**: In-memory SQLite testing with comprehensive CRUD coverage, real database operations, and proper HTTP endpoint testing.

**Every test must**:
- Use in-memory database (no mocks)
- Test CRUD operations completely
- Test validation and error cases
- Verify HTTP status codes
- Be isolated and independent
- Test business logic with real data

Build tests that give confidence in the backend implementation.
