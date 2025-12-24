import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import {
  TourAdminService,
  createTourAdminService,
} from "../src/services/tour-admin.service";

describe("TourAdminService", () => {
  let db: Database;
  let service: TourAdminService;

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
    service = createTourAdminService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("addTourAdmin", () => {
    test("should add a user as tour admin", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      const tourAdmin = service.addTourAdmin(tour.id, adminUser.id);

      expect(tourAdmin.id).toBeGreaterThan(0);
      expect(tourAdmin.tour_id).toBe(tour.id);
      expect(tourAdmin.user_id).toBe(adminUser.id);
      expect(tourAdmin.created_at).toBeDefined();
    });

    test("should throw if tour does not exist", () => {
      const user = createUser("user@test.com", "PLAYER");

      expect(() => {
        service.addTourAdmin(999, user.id);
      }).toThrow("Tour not found");
    });

    test("should throw if user does not exist", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      expect(() => {
        service.addTourAdmin(tour.id, 999);
      }).toThrow("User not found");
    });

    test("should throw if user is already a tour admin", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      service.addTourAdmin(tour.id, adminUser.id);

      expect(() => {
        service.addTourAdmin(tour.id, adminUser.id);
      }).toThrow("User is already an admin for this tour");
    });

    test("should allow same user as admin on different tours", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour1 = createTour("Tour 1", owner.id);
      const tour2 = createTour("Tour 2", owner.id);

      const admin1 = service.addTourAdmin(tour1.id, adminUser.id);
      const admin2 = service.addTourAdmin(tour2.id, adminUser.id);

      expect(admin1.tour_id).toBe(tour1.id);
      expect(admin2.tour_id).toBe(tour2.id);
      expect(admin1.user_id).toBe(adminUser.id);
      expect(admin2.user_id).toBe(adminUser.id);
    });
  });

  describe("removeTourAdmin", () => {
    test("should remove a tour admin", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      service.addTourAdmin(tour.id, adminUser.id);
      service.removeTourAdmin(tour.id, adminUser.id);

      const isAdmin = service.isTourAdmin(tour.id, adminUser.id);
      expect(isAdmin).toBe(false);
    });

    test("should throw if tour admin not found", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const user = createUser("user@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      expect(() => {
        service.removeTourAdmin(tour.id, user.id);
      }).toThrow("Tour admin not found");
    });

    test("should throw if removing from non-existent tour", () => {
      const user = createUser("user@test.com", "PLAYER");

      expect(() => {
        service.removeTourAdmin(999, user.id);
      }).toThrow("Tour admin not found");
    });
  });

  describe("getTourAdmins", () => {
    test("should return all admins for a tour with user details", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const admin1 = createUser("admin1@test.com", "PLAYER");
      const admin2 = createUser("admin2@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      service.addTourAdmin(tour.id, admin1.id);
      service.addTourAdmin(tour.id, admin2.id);

      const admins = service.getTourAdmins(tour.id);

      expect(admins).toHaveLength(2);
      expect(admins[0].email).toBe("admin1@test.com");
      expect(admins[0].role).toBe("PLAYER");
      expect(admins[1].email).toBe("admin2@test.com");
      expect(admins[1].role).toBe("ADMIN");
    });

    test("should return empty array if no admins assigned", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      const admins = service.getTourAdmins(tour.id);

      expect(admins).toHaveLength(0);
    });

    test("should throw if tour does not exist", () => {
      expect(() => {
        service.getTourAdmins(999);
      }).toThrow("Tour not found");
    });

    test("should order admins by created_at", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const admin1 = createUser("first@test.com", "PLAYER");
      const admin2 = createUser("second@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      service.addTourAdmin(tour.id, admin1.id);
      service.addTourAdmin(tour.id, admin2.id);

      const admins = service.getTourAdmins(tour.id);

      expect(admins[0].email).toBe("first@test.com");
      expect(admins[1].email).toBe("second@test.com");
    });
  });

  describe("isTourAdmin", () => {
    test("should return true if user is a tour admin", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      service.addTourAdmin(tour.id, adminUser.id);

      expect(service.isTourAdmin(tour.id, adminUser.id)).toBe(true);
    });

    test("should return false if user is not a tour admin", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const regularUser = createUser("regular@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      expect(service.isTourAdmin(tour.id, regularUser.id)).toBe(false);
    });

    test("should return false for non-existent tour", () => {
      const user = createUser("user@test.com", "PLAYER");

      expect(service.isTourAdmin(999, user.id)).toBe(false);
    });
  });

  describe("getToursForAdmin", () => {
    test("should return all tours where user is admin", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour1 = createTour("Alpha Tour", owner.id);
      const tour2 = createTour("Beta Tour", owner.id);

      service.addTourAdmin(tour1.id, adminUser.id);
      service.addTourAdmin(tour2.id, adminUser.id);

      const tours = service.getToursForAdmin(adminUser.id);

      expect(tours).toHaveLength(2);
      expect(tours[0].tour_name).toBe("Alpha Tour");
      expect(tours[1].tour_name).toBe("Beta Tour");
    });

    test("should return empty array if user is not admin of any tour", () => {
      const user = createUser("user@test.com", "PLAYER");

      const tours = service.getToursForAdmin(user.id);

      expect(tours).toHaveLength(0);
    });

    test("should order tours by name", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour1 = createTour("Zebra Tour", owner.id);
      const tour2 = createTour("Alpha Tour", owner.id);

      service.addTourAdmin(tour1.id, adminUser.id);
      service.addTourAdmin(tour2.id, adminUser.id);

      const tours = service.getToursForAdmin(adminUser.id);

      expect(tours[0].tour_name).toBe("Alpha Tour");
      expect(tours[1].tour_name).toBe("Zebra Tour");
    });
  });

  describe("canManageTour", () => {
    test("should allow SUPER_ADMIN to manage any tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const superAdmin = createUser("super@test.com", "SUPER_ADMIN");
      const tour = createTour("Test Tour", owner.id);

      expect(service.canManageTour(tour.id, superAdmin.id)).toBe(true);
    });

    test("should allow tour owner to manage their tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      expect(service.canManageTour(tour.id, owner.id)).toBe(true);
    });

    test("should allow tour admin to manage the tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tourAdmin = createUser("touradmin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      service.addTourAdmin(tour.id, tourAdmin.id);

      expect(service.canManageTour(tour.id, tourAdmin.id)).toBe(true);
    });

    test("should deny regular user from managing tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const regularUser = createUser("regular@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      expect(service.canManageTour(tour.id, regularUser.id)).toBe(false);
    });

    test("should return false for non-existent tour", () => {
      const user = createUser("user@test.com", "ADMIN");

      expect(service.canManageTour(999, user.id)).toBe(false);
    });
  });

  describe("canManageTourAdmins", () => {
    test("should allow SUPER_ADMIN to manage tour admins", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const superAdmin = createUser("super@test.com", "SUPER_ADMIN");
      const tour = createTour("Test Tour", owner.id);

      expect(service.canManageTourAdmins(tour.id, superAdmin.id)).toBe(true);
    });

    test("should allow tour owner to manage tour admins", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);

      expect(service.canManageTourAdmins(tour.id, owner.id)).toBe(true);
    });

    test("should NOT allow tour admin to manage other tour admins", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tourAdmin = createUser("touradmin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      service.addTourAdmin(tour.id, tourAdmin.id);

      // Tour admins can manage the tour but NOT manage other admins
      expect(service.canManageTourAdmins(tour.id, tourAdmin.id)).toBe(false);
    });

    test("should deny regular user from managing tour admins", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const regularUser = createUser("regular@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      expect(service.canManageTourAdmins(tour.id, regularUser.id)).toBe(false);
    });

    test("should return false for non-existent tour", () => {
      const user = createUser("user@test.com", "ADMIN");

      expect(service.canManageTourAdmins(999, user.id)).toBe(false);
    });
  });

  describe("findById", () => {
    test("should find tour admin by id", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      const created = service.addTourAdmin(tour.id, adminUser.id);
      const found = service.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.tour_id).toBe(tour.id);
      expect(found!.user_id).toBe(adminUser.id);
    });

    test("should return null for non-existent id", () => {
      const found = service.findById(999);

      expect(found).toBeNull();
    });
  });

  describe("cascade delete behavior", () => {
    test("should delete tour admins when tour is deleted", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      const tourAdmin = service.addTourAdmin(tour.id, adminUser.id);

      // Delete the tour
      db.prepare("DELETE FROM tours WHERE id = ?").run(tour.id);

      // Tour admin should be deleted too
      const found = service.findById(tourAdmin.id);
      expect(found).toBeNull();
    });

    test("should delete tour admins when user is deleted", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const adminUser = createUser("admin@test.com", "PLAYER");
      const tour = createTour("Test Tour", owner.id);

      const tourAdmin = service.addTourAdmin(tour.id, adminUser.id);

      // Delete the user
      db.prepare("DELETE FROM users WHERE id = ?").run(adminUser.id);

      // Tour admin should be deleted too
      const found = service.findById(tourAdmin.id);
      expect(found).toBeNull();
    });
  });

  describe("factory function", () => {
    test("createTourAdminService should create a service instance", () => {
      const svc = createTourAdminService(db);
      expect(svc).toBeInstanceOf(TourAdminService);
    });
  });
});
