import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";

describe("Tour Enrollment Schema", () => {
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  describe("tour_enrollments table", () => {
    test("should exist with correct columns", () => {
      const columns = db
        .prepare("PRAGMA table_info(tour_enrollments)")
        .all() as { name: string; type: string; notnull: number }[];

      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("tour_id");
      expect(columnNames).toContain("player_id");
      expect(columnNames).toContain("email");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("created_at");
      expect(columnNames).toContain("updated_at");
    });

    test("should have correct default status", () => {
      // First create a user and tour
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const userId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id) VALUES (?, ?)"
      ).run("Test Tour", userId.id);

      const tourId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      // Insert enrollment without specifying status
      db.prepare(
        "INSERT INTO tour_enrollments (tour_id, email) VALUES (?, ?)"
      ).run(tourId.id, "player@test.com");

      const enrollment = db
        .prepare("SELECT status FROM tour_enrollments WHERE email = ?")
        .get("player@test.com") as { status: string };

      expect(enrollment.status).toBe("pending");
    });

    test("should enforce unique tour_id + email constraint", () => {
      // Create user and tour
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const userId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id) VALUES (?, ?)"
      ).run("Test Tour", userId.id);

      const tourId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      // First insert should succeed
      db.prepare(
        "INSERT INTO tour_enrollments (tour_id, email) VALUES (?, ?)"
      ).run(tourId.id, "player@test.com");

      // Second insert with same tour_id and email should fail
      expect(() => {
        db.prepare(
          "INSERT INTO tour_enrollments (tour_id, email) VALUES (?, ?)"
        ).run(tourId.id, "player@test.com");
      }).toThrow();
    });

    test("should cascade delete when tour is deleted", () => {
      // Create user and tour
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const userId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id) VALUES (?, ?)"
      ).run("Test Tour", userId.id);

      const tourId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      // Add enrollment
      db.prepare(
        "INSERT INTO tour_enrollments (tour_id, email) VALUES (?, ?)"
      ).run(tourId.id, "player@test.com");

      // Verify enrollment exists
      let count = db
        .prepare("SELECT COUNT(*) as count FROM tour_enrollments WHERE tour_id = ?")
        .get(tourId.id) as { count: number };
      expect(count.count).toBe(1);

      // Delete tour
      db.prepare("DELETE FROM tours WHERE id = ?").run(tourId.id);

      // Verify enrollment was cascaded
      count = db
        .prepare("SELECT COUNT(*) as count FROM tour_enrollments WHERE tour_id = ?")
        .get(tourId.id) as { count: number };
      expect(count.count).toBe(0);
    });
  });

  describe("tour_admins table", () => {
    test("should exist with correct columns", () => {
      const columns = db
        .prepare("PRAGMA table_info(tour_admins)")
        .all() as { name: string }[];

      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("tour_id");
      expect(columnNames).toContain("user_id");
      expect(columnNames).toContain("created_at");
    });

    test("should enforce unique tour_id + user_id constraint", () => {
      // Create users and tour
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const adminId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("touradmin@test.com", "hash", "PLAYER");

      const tourAdminId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id) VALUES (?, ?)"
      ).run("Test Tour", adminId.id);

      const tourId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      // First insert should succeed
      db.prepare(
        "INSERT INTO tour_admins (tour_id, user_id) VALUES (?, ?)"
      ).run(tourId.id, tourAdminId.id);

      // Second insert with same tour_id and user_id should fail
      expect(() => {
        db.prepare(
          "INSERT INTO tour_admins (tour_id, user_id) VALUES (?, ?)"
        ).run(tourId.id, tourAdminId.id);
      }).toThrow();
    });

    test("should cascade delete when tour is deleted", () => {
      // Create users and tour
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const adminId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("touradmin@test.com", "hash", "PLAYER");

      const tourAdminId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id) VALUES (?, ?)"
      ).run("Test Tour", adminId.id);

      const tourId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      // Add tour admin
      db.prepare(
        "INSERT INTO tour_admins (tour_id, user_id) VALUES (?, ?)"
      ).run(tourId.id, tourAdminId.id);

      // Delete tour
      db.prepare("DELETE FROM tours WHERE id = ?").run(tourId.id);

      // Verify tour_admin was cascaded
      const count = db
        .prepare("SELECT COUNT(*) as count FROM tour_admins WHERE tour_id = ?")
        .get(tourId.id) as { count: number };
      expect(count.count).toBe(0);
    });
  });

  describe("tours table new columns", () => {
    test("should have enrollment_mode column with default 'closed'", () => {
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const userId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id) VALUES (?, ?)"
      ).run("Test Tour", userId.id);

      const tour = db
        .prepare("SELECT enrollment_mode FROM tours WHERE name = ?")
        .get("Test Tour") as { enrollment_mode: string };

      expect(tour.enrollment_mode).toBe("closed");
    });

    test("should have visibility column with default 'private'", () => {
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const userId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id) VALUES (?, ?)"
      ).run("Test Tour", userId.id);

      const tour = db
        .prepare("SELECT visibility FROM tours WHERE name = ?")
        .get("Test Tour") as { visibility: string };

      expect(tour.visibility).toBe("private");
    });

    test("should allow setting enrollment_mode to 'request'", () => {
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const userId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id, enrollment_mode) VALUES (?, ?, ?)"
      ).run("Test Tour", userId.id, "request");

      const tour = db
        .prepare("SELECT enrollment_mode FROM tours WHERE name = ?")
        .get("Test Tour") as { enrollment_mode: string };

      expect(tour.enrollment_mode).toBe("request");
    });

    test("should allow setting visibility to 'public'", () => {
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("admin@test.com", "hash", "ADMIN");

      const userId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      db.prepare(
        "INSERT INTO tours (name, owner_id, visibility) VALUES (?, ?, ?)"
      ).run("Test Tour", userId.id, "public");

      const tour = db
        .prepare("SELECT visibility FROM tours WHERE name = ?")
        .get("Test Tour") as { visibility: string };

      expect(tour.visibility).toBe("public");
    });
  });
});
