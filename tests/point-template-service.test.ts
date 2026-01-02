import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import {
  PointTemplateService,
  createPointTemplateService,
} from "../src/services/point-template.service";

describe("PointTemplateService", () => {
  let db: Database;
  let service: PointTemplateService;

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

  beforeEach(async () => {
    db = await createTestDatabase();
    service = createPointTemplateService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("create (global template)", () => {
    test("should create a global point template", () => {
      const admin = createUser("admin@test.com", "ADMIN");

      const template = service.create(
        { name: "Standard Points", points_structure: { "1": 100, "2": 80, "default": 10 } },
        admin.id
      );

      expect(template.id).toBeGreaterThan(0);
      expect(template.name).toBe("Standard Points");
      expect(template.tour_id).toBeNull();
      expect(template.created_by).toBe(admin.id);
      expect(JSON.parse(template.points_structure)).toEqual({
        "1": 100,
        "2": 80,
        "default": 10,
      });
    });
  });

  describe("createForTour", () => {
    test("should create a tour-scoped point template", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      const template = service.createForTour(
        tour.id,
        { name: "Tour Points", points_structure: { "1": 100, "2": 80, "default": 10 } },
        owner.id
      );

      expect(template.id).toBeGreaterThan(0);
      expect(template.name).toBe("Tour Points");
      expect(template.tour_id).toBe(tour.id);
      expect(template.created_by).toBe(owner.id);
    });

    test("should create multiple templates for the same tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      const template1 = service.createForTour(
        tour.id,
        { name: "Standard", points_structure: { "1": 100 } },
        owner.id
      );
      const template2 = service.createForTour(
        tour.id,
        { name: "Major", points_structure: { "1": 200 } },
        owner.id
      );

      expect(template1.id).not.toBe(template2.id);
      expect(template1.tour_id).toBe(tour.id);
      expect(template2.tour_id).toBe(tour.id);
    });
  });

  describe("findByTour", () => {
    test("should return only templates for the specified tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", owner.id);
      const tour2 = createTour("Tour 2", owner.id);

      // Create templates for tour1
      service.createForTour(tour1.id, { name: "Tour 1 Standard", points_structure: { "1": 100 } }, owner.id);
      service.createForTour(tour1.id, { name: "Tour 1 Major", points_structure: { "1": 200 } }, owner.id);

      // Create template for tour2
      service.createForTour(tour2.id, { name: "Tour 2 Points", points_structure: { "1": 150 } }, owner.id);

      // Create global template
      service.create({ name: "Global Points", points_structure: { "1": 50 } }, owner.id);

      const tour1Templates = service.findByTour(tour1.id);
      const tour2Templates = service.findByTour(tour2.id);

      expect(tour1Templates).toHaveLength(2);
      expect(tour1Templates.map(t => t.name).sort()).toEqual(["Tour 1 Major", "Tour 1 Standard"]);
      expect(tour1Templates.every(t => t.tour_id === tour1.id)).toBe(true);

      expect(tour2Templates).toHaveLength(1);
      expect(tour2Templates[0].name).toBe("Tour 2 Points");
      expect(tour2Templates[0].tour_id).toBe(tour2.id);
    });

    test("should return empty array when tour has no templates", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Empty Tour", owner.id);

      const templates = service.findByTour(tour.id);

      expect(templates).toHaveLength(0);
    });

    test("should not return global templates", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      // Create global template
      service.create({ name: "Global Points", points_structure: { "1": 100 } }, owner.id);

      const templates = service.findByTour(tour.id);

      expect(templates).toHaveLength(0);
    });

    test("should return templates ordered by name", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      service.createForTour(tour.id, { name: "Zebra Points", points_structure: { "1": 100 } }, owner.id);
      service.createForTour(tour.id, { name: "Alpha Points", points_structure: { "1": 100 } }, owner.id);
      service.createForTour(tour.id, { name: "Beta Points", points_structure: { "1": 100 } }, owner.id);

      const templates = service.findByTour(tour.id);

      expect(templates[0].name).toBe("Alpha Points");
      expect(templates[1].name).toBe("Beta Points");
      expect(templates[2].name).toBe("Zebra Points");
    });
  });

  describe("belongsToTour", () => {
    test("should return true when template belongs to the tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const template = service.createForTour(
        tour.id,
        { name: "Tour Points", points_structure: { "1": 100 } },
        owner.id
      );

      expect(service.belongsToTour(template.id, tour.id)).toBe(true);
    });

    test("should return false when template belongs to different tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", owner.id);
      const tour2 = createTour("Tour 2", owner.id);
      const template = service.createForTour(
        tour1.id,
        { name: "Tour 1 Points", points_structure: { "1": 100 } },
        owner.id
      );

      expect(service.belongsToTour(template.id, tour2.id)).toBe(false);
    });

    test("should return false for global template", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const globalTemplate = service.create(
        { name: "Global Points", points_structure: { "1": 100 } },
        owner.id
      );

      expect(service.belongsToTour(globalTemplate.id, tour.id)).toBe(false);
    });

    test("should return false for non-existent template", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      expect(service.belongsToTour(999, tour.id)).toBe(false);
    });
  });

  describe("update", () => {
    test("should update tour-scoped template", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const template = service.createForTour(
        tour.id,
        { name: "Original", points_structure: { "1": 100 } },
        owner.id
      );

      const updated = service.update(template.id, {
        name: "Updated",
        points_structure: { "1": 150, "2": 100 },
      });

      expect(updated.name).toBe("Updated");
      expect(updated.tour_id).toBe(tour.id); // tour_id should remain unchanged
      expect(JSON.parse(updated.points_structure)).toEqual({ "1": 150, "2": 100 });
    });
  });

  describe("delete", () => {
    test("should delete tour-scoped template", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const template = service.createForTour(
        tour.id,
        { name: "To Delete", points_structure: { "1": 100 } },
        owner.id
      );

      service.delete(template.id);

      expect(service.findById(template.id)).toBeNull();
    });

    test("should not affect templates from other tours", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", owner.id);
      const tour2 = createTour("Tour 2", owner.id);

      const template1 = service.createForTour(tour1.id, { name: "T1", points_structure: { "1": 100 } }, owner.id);
      const template2 = service.createForTour(tour2.id, { name: "T2", points_structure: { "1": 200 } }, owner.id);

      service.delete(template1.id);

      expect(service.findById(template1.id)).toBeNull();
      expect(service.findById(template2.id)).not.toBeNull();
    });
  });

  describe("calculatePoints", () => {
    test("should calculate points for tour-scoped template", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const template = service.createForTour(
        tour.id,
        { name: "Points", points_structure: { "1": 100, "2": 80, "3": 60, "default": 10 } },
        owner.id
      );

      expect(service.calculatePoints(template.id, 1)).toBe(100);
      expect(service.calculatePoints(template.id, 2)).toBe(80);
      expect(service.calculatePoints(template.id, 3)).toBe(60);
      expect(service.calculatePoints(template.id, 10)).toBe(10); // default
    });
  });

  describe("findAll", () => {
    test("should return all templates including tour-scoped and global", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      service.create({ name: "Global", points_structure: { "1": 100 } }, owner.id);
      service.createForTour(tour.id, { name: "Tour Scoped", points_structure: { "1": 100 } }, owner.id);

      const all = service.findAll();

      expect(all).toHaveLength(2);
      expect(all.map(t => t.name).sort()).toEqual(["Global", "Tour Scoped"]);
    });
  });

  describe("factory function", () => {
    test("createPointTemplateService should create a service instance", () => {
      const testService = createPointTemplateService(db);
      expect(testService).toBeInstanceOf(PointTemplateService);
    });
  });
});
