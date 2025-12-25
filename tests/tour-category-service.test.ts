import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import {
  TourCategoryService,
  createTourCategoryService,
} from "../src/services/tour-category.service";

describe("TourCategoryService", () => {
  let db: Database;
  let service: TourCategoryService;

  // Helper to create a user
  const createUser = (
    email: string,
    role: string = "PLAYER"
  ): { id: number; email: string; role: string } => {
    db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
    ).run(email, "hash", role);
    return db
      .prepare("SELECT id, email, role FROM users WHERE email = ?")
      .get(email) as { id: number; email: string; role: string };
  };

  // Helper to create a tour
  const createTour = (
    name: string,
    ownerId: number
  ): { id: number; owner_id: number } => {
    db.prepare(
      "INSERT INTO tours (name, owner_id, enrollment_mode, visibility) VALUES (?, ?, 'closed', 'private')"
    ).run(name, ownerId);
    return db
      .prepare("SELECT id, owner_id FROM tours WHERE name = ?")
      .get(name) as { id: number; owner_id: number };
  };

  // Helper to create a player
  const createPlayer = (
    name: string,
    userId?: number
  ): { id: number; name: string } => {
    db.prepare(
      "INSERT INTO players (name, user_id) VALUES (?, ?)"
    ).run(name, userId ?? null);
    return db
      .prepare("SELECT id, name FROM players WHERE name = ?")
      .get(name) as { id: number; name: string };
  };

  // Helper to create an enrollment
  const createEnrollment = (
    tourId: number,
    email: string,
    playerId?: number,
    categoryId?: number
  ): { id: number } => {
    db.prepare(
      "INSERT INTO tour_enrollments (tour_id, email, status, player_id, category_id) VALUES (?, ?, 'active', ?, ?)"
    ).run(tourId, email, playerId ?? null, categoryId ?? null);
    return db
      .prepare("SELECT id FROM tour_enrollments WHERE tour_id = ? AND email = ?")
      .get(tourId, email) as { id: number };
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    service = createTourCategoryService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("create", () => {
    test("should create a category", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      const category = service.create(tour.id, {
        name: "Men",
        description: "Male players",
      });

      expect(category.id).toBeGreaterThan(0);
      expect(category.tour_id).toBe(tour.id);
      expect(category.name).toBe("Men");
      expect(category.description).toBe("Male players");
      expect(category.sort_order).toBe(0);
    });

    test("should auto-increment sort_order", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      const cat1 = service.create(tour.id, { name: "Men" });
      const cat2 = service.create(tour.id, { name: "Women" });
      const cat3 = service.create(tour.id, { name: "Seniors" });

      expect(cat1.sort_order).toBe(0);
      expect(cat2.sort_order).toBe(1);
      expect(cat3.sort_order).toBe(2);
    });

    test("should allow custom sort_order", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      const category = service.create(tour.id, {
        name: "Men",
        sort_order: 5,
      });

      expect(category.sort_order).toBe(5);
    });

    test("should throw error for duplicate category name", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      service.create(tour.id, { name: "Men" });

      expect(() => service.create(tour.id, { name: "Men" })).toThrow(
        "A category with this name already exists in this tour"
      );
    });

    test("should throw error for non-existent tour", () => {
      expect(() => service.create(999, { name: "Men" })).toThrow(
        "Tour not found"
      );
    });
  });

  describe("update", () => {
    test("should update category name", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const category = service.create(tour.id, { name: "Men" });

      const updated = service.update(category.id, { name: "Male" });

      expect(updated.name).toBe("Male");
    });

    test("should update category description", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const category = service.create(tour.id, { name: "Men" });

      const updated = service.update(category.id, { description: "Updated description" });

      expect(updated.description).toBe("Updated description");
    });

    test("should throw error for duplicate name on update", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      service.create(tour.id, { name: "Men" });
      const cat2 = service.create(tour.id, { name: "Women" });

      expect(() => service.update(cat2.id, { name: "Men" })).toThrow(
        "A category with this name already exists in this tour"
      );
    });

    test("should throw error for non-existent category", () => {
      expect(() => service.update(999, { name: "Updated" })).toThrow(
        "Category not found"
      );
    });
  });

  describe("delete", () => {
    test("should delete category", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const category = service.create(tour.id, { name: "Men" });

      service.delete(category.id);

      expect(service.findById(category.id)).toBeNull();
    });

    test("should set enrollment category_id to NULL on delete", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const category = service.create(tour.id, { name: "Men" });
      const player = createPlayer("John", owner.id);
      const enrollment = createEnrollment(tour.id, "john@test.com", player.id, category.id);

      service.delete(category.id);

      const updatedEnrollment = db
        .prepare("SELECT category_id FROM tour_enrollments WHERE id = ?")
        .get(enrollment.id) as { category_id: number | null };
      expect(updatedEnrollment.category_id).toBeNull();
    });

    test("should throw error for non-existent category", () => {
      expect(() => service.delete(999)).toThrow("Category not found");
    });
  });

  describe("findByTour", () => {
    test("should return categories ordered by sort_order", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      service.create(tour.id, { name: "Seniors", sort_order: 2 });
      service.create(tour.id, { name: "Men", sort_order: 0 });
      service.create(tour.id, { name: "Women", sort_order: 1 });

      const categories = service.findByTour(tour.id);

      expect(categories).toHaveLength(3);
      expect(categories[0].name).toBe("Men");
      expect(categories[1].name).toBe("Women");
      expect(categories[2].name).toBe("Seniors");
    });

    test("should include enrollment count", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const menCategory = service.create(tour.id, { name: "Men" });
      const womenCategory = service.create(tour.id, { name: "Women" });

      const player1 = createPlayer("John", owner.id);
      const player2 = createPlayer("Jane");
      createEnrollment(tour.id, "john@test.com", player1.id, menCategory.id);
      createEnrollment(tour.id, "jane@test.com", player2.id, menCategory.id);
      createEnrollment(tour.id, "mary@test.com", undefined, womenCategory.id);

      const categories = service.findByTour(tour.id);

      const men = categories.find(c => c.name === "Men")!;
      const women = categories.find(c => c.name === "Women")!;
      expect(men.enrollment_count).toBe(2);
      expect(women.enrollment_count).toBe(1);
    });

    test("should throw error for non-existent tour", () => {
      expect(() => service.findByTour(999)).toThrow("Tour not found");
    });
  });

  describe("reorder", () => {
    test("should update sort_order for categories", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      const cat1 = service.create(tour.id, { name: "Men" });
      const cat2 = service.create(tour.id, { name: "Women" });
      const cat3 = service.create(tour.id, { name: "Seniors" });

      service.reorder(tour.id, [cat3.id, cat1.id, cat2.id]);

      const categories = service.findByTour(tour.id);
      expect(categories[0].name).toBe("Seniors");
      expect(categories[1].name).toBe("Men");
      expect(categories[2].name).toBe("Women");
    });

    test("should throw error for category from different tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", owner.id);
      const tour2 = createTour("Tour 2", owner.id);

      const cat1 = service.create(tour1.id, { name: "Men" });
      const cat2 = service.create(tour2.id, { name: "Women" });

      expect(() => service.reorder(tour1.id, [cat1.id, cat2.id])).toThrow(
        /Category \d+ does not belong to this tour/
      );
    });
  });

  describe("assignToEnrollment", () => {
    test("should assign category to enrollment", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const category = service.create(tour.id, { name: "Men" });
      const player = createPlayer("John", owner.id);
      const enrollment = createEnrollment(tour.id, "john@test.com", player.id);

      service.assignToEnrollment(enrollment.id, category.id);

      const updated = db
        .prepare("SELECT category_id FROM tour_enrollments WHERE id = ?")
        .get(enrollment.id) as { category_id: number };
      expect(updated.category_id).toBe(category.id);
    });

    test("should allow clearing category", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const category = service.create(tour.id, { name: "Men" });
      const player = createPlayer("John", owner.id);
      const enrollment = createEnrollment(tour.id, "john@test.com", player.id, category.id);

      service.assignToEnrollment(enrollment.id, null);

      const updated = db
        .prepare("SELECT category_id FROM tour_enrollments WHERE id = ?")
        .get(enrollment.id) as { category_id: number | null };
      expect(updated.category_id).toBeNull();
    });

    test("should throw error for non-existent enrollment", () => {
      expect(() => service.assignToEnrollment(999, 1)).toThrow(
        "Enrollment not found"
      );
    });

    test("should throw error for category from different tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", owner.id);
      const tour2 = createTour("Tour 2", owner.id);
      const category = service.create(tour2.id, { name: "Men" });
      const player = createPlayer("John", owner.id);
      const enrollment = createEnrollment(tour1.id, "john@test.com", player.id);

      expect(() => service.assignToEnrollment(enrollment.id, category.id)).toThrow(
        "Category does not belong to the same tour as the enrollment"
      );
    });
  });

  describe("bulkAssign", () => {
    test("should assign category to multiple enrollments", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const category = service.create(tour.id, { name: "Men" });
      const player1 = createPlayer("John", owner.id);
      const player2 = createPlayer("Jane");
      const e1 = createEnrollment(tour.id, "john@test.com", player1.id);
      const e2 = createEnrollment(tour.id, "jane@test.com", player2.id);

      const updated = service.bulkAssign([e1.id, e2.id], category.id);

      expect(updated).toBe(2);

      const enrollments = db
        .prepare("SELECT category_id FROM tour_enrollments WHERE id IN (?, ?)")
        .all(e1.id, e2.id) as { category_id: number }[];
      expect(enrollments.every(e => e.category_id === category.id)).toBe(true);
    });

    test("should return 0 for empty array", () => {
      const updated = service.bulkAssign([], 1);
      expect(updated).toBe(0);
    });

    test("should throw error for enrollments from different tours", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", owner.id);
      const tour2 = createTour("Tour 2", owner.id);
      const e1 = createEnrollment(tour1.id, "john@test.com");
      const e2 = createEnrollment(tour2.id, "jane@test.com");

      expect(() => service.bulkAssign([e1.id, e2.id], null)).toThrow(
        "All enrollments must belong to the same tour"
      );
    });
  });

  describe("getEnrollmentsByCategory", () => {
    test("should return enrollments for category", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const category = service.create(tour.id, { name: "Men" });
      const player = createPlayer("John Doe", owner.id);
      createEnrollment(tour.id, "john@test.com", player.id, category.id);
      createEnrollment(tour.id, "jane@test.com", undefined, category.id);

      const enrollments = service.getEnrollmentsByCategory(category.id);

      expect(enrollments).toHaveLength(2);
      expect(enrollments.some(e => e.player_name === "John Doe")).toBe(true);
      expect(enrollments.some(e => e.email === "jane@test.com")).toBe(true);
    });

    test("should throw error for non-existent category", () => {
      expect(() => service.getEnrollmentsByCategory(999)).toThrow(
        "Category not found"
      );
    });
  });

  describe("factory function", () => {
    test("createTourCategoryService should create a service instance", () => {
      const testService = createTourCategoryService(db);
      expect(testService).toBeInstanceOf(TourCategoryService);
    });
  });
});
