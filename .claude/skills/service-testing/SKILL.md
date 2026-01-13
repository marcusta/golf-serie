---
name: service-testing
description: Guide backend service and API testing for TapScore. Use when writing or running backend tests for services, database operations, or API endpoints. Ensures in-memory database testing and comprehensive CRUD coverage.
---

# TapScore Service Testing Skill

This skill guides backend testing with in-memory SQLite. Use when writing or running ANY backend tests.

---

## Testing Workflow

Copy this checklist and track your progress:

```
Service Testing Progress:
- [ ] Step 1: Read testing patterns
- [ ] Step 2: Set up in-memory database
- [ ] Step 3: Write service tests (CRUD + validation)
- [ ] Step 4: Write API endpoint tests
- [ ] Step 5: Run tests and verify coverage
```

---

## Step 1: Read Testing Patterns

**MANDATORY - Read this file before testing:**

```bash
cat docs/testing/BACKEND_TEST_GUIDE.md
```

**What to extract:**
- In-memory database setup
- Service layer test patterns
- API endpoint testing with Hono
- Transaction testing patterns

---

## Step 2: Set Up In-Memory Database

### Test File Structure

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import Database from "bun:sqlite";
import { CourseService } from "../CourseService";

describe("CourseService", () => {
  let db: Database;
  let service: CourseService;

  beforeEach(() => {
    // Create fresh in-memory database for each test
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

  // Tests here
});
```

### No Mocking - Test Real Operations

```typescript
// ✅ CORRECT - Test real database
test("creates course", () => {
  const course = service.createCourse(validData);
  expect(course.id).toBeGreaterThan(0);
});

// ❌ WRONG - Don't mock database
const mockDb = { prepare: jest.fn() };  // Don't do this
```

---

## Step 3: Write Service Tests (CRUD + Validation)

### Test CRUD Operations

```typescript
describe("CourseService CRUD", () => {
  test("creates course with valid data", () => {
    const course = service.createCourse({
      name: "Test Course",
      pars: [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],
    });

    expect(course.id).toBeGreaterThan(0);
    expect(course.name).toBe("Test Course");
  });

  test("reads course by id", () => {
    const created = service.createCourse(validData);
    const found = service.getCourseById(created.id);

    expect(found).not.toBeNull();
    expect(found!.name).toBe(validData.name);
  });

  test("updates course", () => {
    const created = service.createCourse(validData);

    const updated = service.updateCourse(created.id, {
      name: "Updated Name",
    });

    expect(updated.name).toBe("Updated Name");
  });

  test("deletes course", () => {
    const created = service.createCourse(validData);

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

### Test Validation

```typescript
describe("CourseService validation", () => {
  test("throws error for missing name", () => {
    expect(() =>
      service.createCourse({ name: "", pars: validPars })
    ).toThrow("Name required");
  });

  test("throws error for wrong par count", () => {
    expect(() =>
      service.createCourse({ name: "Test", pars: [4, 3, 5] })
    ).toThrow("Course must have exactly 18 holes");
  });

  test("throws error for invalid par values", () => {
    const invalidPars = [2, 3, 5, ...validPars.slice(3)];  // Par 2

    expect(() =>
      service.createCourse({ name: "Test", pars: invalidPars })
    ).toThrow("Par must be between 3 and 6");
  });
});
```

### Test Business Logic

```typescript
describe("LeaderboardService calculations", () => {
  test("calculates relative to par correctly", () => {
    const entry = service.calculateEntry(
      { score: [4, 3, 5, ...] },  // 72
      { pars: [4, 3, 5, ...] }    // Par 72
    );

    expect(entry.totalScore).toBe(72);
    expect(entry.relativeToPar).toBe(0);  // Even par
  });

  test("sorts leaderboard ascending by score", () => {
    const leaderboard = service.getLeaderboard(competitionId);

    for (let i = 0; i < leaderboard.length - 1; i++) {
      expect(leaderboard[i].totalScore)
        .toBeLessThanOrEqual(leaderboard[i + 1].totalScore);
    }
  });
});
```

### Test Transactions

```typescript
describe("CompetitionService transactions", () => {
  test("rolls back on error", () => {
    expect(() =>
      service.createCompetitionWithTeeTimes(
        validData,
        ["invalid-time"]  // Causes error
      )
    ).toThrow();

    // Verify nothing created
    const competitions = service.getAllCompetitions();
    expect(competitions).toHaveLength(0);
  });

  test("commits atomically", () => {
    const result = service.createCompetitionWithTeeTimes(
      validData,
      ["08:00", "08:10", "08:20"]
    );

    expect(result.competition.id).toBeGreaterThan(0);
    expect(result.teeTimes).toHaveLength(3);
  });
});
```

---

## Step 4: Write API Endpoint Tests

### Test HTTP Endpoints

```typescript
import { createCoursesApi } from "../courses";

describe("Courses API", () => {
  let app: any;
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`CREATE TABLE courses (...)`);
    app = createCoursesApi(db);
  });

  test("GET /api/courses returns all courses", async () => {
    // Seed data
    db.prepare("INSERT INTO courses (name, pars) VALUES (?, ?)")
      .run("Course 1", JSON.stringify(validPars));

    const response = await app.request("/api/courses");

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveLength(1);
  });

  test("GET /api/courses/:id returns 404 for non-existent", async () => {
    const response = await app.request("/api/courses/999");

    expect(response.status).toBe(404);
    expect(await response.json()).toHaveProperty("error");
  });

  test("POST /api/courses creates new course", async () => {
    const response = await app.request("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New", pars: validPars }),
    });

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBeGreaterThan(0);
  });

  test("POST returns 400 for invalid data", async () => {
    const response = await app.request("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", pars: validPars }),
    });

    expect(response.status).toBe(400);
  });
});
```

---

## Step 5: Run Tests and Verify Coverage

### Run Commands

```bash
# Run server tests only
bun run test:server

# Run all tests
bun test

# Watch mode
bun test --watch
```

### Verify Test Coverage

- [ ] All CRUD operations tested
- [ ] All validation rules tested
- [ ] Business logic calculations tested
- [ ] Transaction rollback tested
- [ ] API status codes tested (200, 201, 400, 404, 500)
- [ ] Error messages verified

---

## Key Testing Patterns

### Test Data Helpers

```typescript
const validPars = [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4];

function createTestCourse(): Course {
  return db.prepare(`
    INSERT INTO courses (name, pars) VALUES (?, ?) RETURNING *
  `).get("Test Course", JSON.stringify(validPars)) as Course;
}

function createTestCompetition(courseId: number): Competition {
  return db.prepare(`
    INSERT INTO competitions (name, date, course_id)
    VALUES (?, ?, ?) RETURNING *
  `).get("Test Competition", "2025-09-15", courseId) as Competition;
}
```

### Edge Cases to Test

- Empty arrays
- Null values
- Boundary values (min/max)
- Non-existent IDs (404)
- Duplicate data (UNIQUE constraints)
- Foreign key violations
- Invalid formats

---

## Anti-Patterns to Avoid

1. ❌ Mocking the database (test real operations)
2. ❌ Shared state between tests (use beforeEach)
3. ❌ Skipping error case testing
4. ❌ Hard-coded IDs (except in test data)
5. ❌ Testing implementation details
6. ❌ Incomplete CRUD coverage
7. ❌ Not verifying HTTP status codes

---

## Summary

**Backend testing approach**: In-memory SQLite with comprehensive CRUD coverage, real database operations, and proper HTTP status code verification.

**Every test must**:
- Use in-memory database (no mocks)
- Test CRUD operations completely
- Test validation and error cases
- Verify HTTP status codes for APIs
- Be isolated and independent
- Test business logic with real data

For detailed patterns, see `docs/testing/BACKEND_TEST_GUIDE.md`.
