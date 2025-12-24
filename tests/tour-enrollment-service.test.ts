import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import {
  TourEnrollmentService,
  createTourEnrollmentService,
} from "../src/services/tour-enrollment.service";

describe("TourEnrollmentService", () => {
  let db: Database;
  let service: TourEnrollmentService;

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
    ownerId: number,
    options: { enrollment_mode?: string; visibility?: string } = {}
  ): { id: number } => {
    const { enrollment_mode = "closed", visibility = "private" } = options;
    db.prepare(
      "INSERT INTO tours (name, owner_id, enrollment_mode, visibility) VALUES (?, ?, ?, ?)"
    ).run(name, ownerId, enrollment_mode, visibility);
    return db
      .prepare("SELECT id FROM tours WHERE name = ?")
      .get(name) as { id: number };
  };

  // Helper to create a player
  const createPlayer = (
    name: string,
    userId: number | null = null
  ): { id: number } => {
    db.prepare(
      "INSERT INTO players (name, handicap, user_id) VALUES (?, ?, ?)"
    ).run(name, 0, userId);
    return db
      .prepare("SELECT id FROM players WHERE name = ?")
      .get(name) as { id: number };
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    service = createTourEnrollmentService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("addPendingEnrollment", () => {
    test("should add a pending enrollment with email", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      const enrollment = service.addPendingEnrollment(
        tour.id,
        "player@test.com"
      );

      expect(enrollment.id).toBeGreaterThan(0);
      expect(enrollment.tour_id).toBe(tour.id);
      expect(enrollment.email).toBe("player@test.com");
      expect(enrollment.status).toBe("pending");
      expect(enrollment.player_id).toBeNull();
    });

    test("should normalize email to lowercase", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      const enrollment = service.addPendingEnrollment(
        tour.id,
        "Player@Test.COM"
      );

      expect(enrollment.email).toBe("player@test.com");
    });

    test("should throw if tour does not exist", () => {
      expect(() => {
        service.addPendingEnrollment(999, "player@test.com");
      }).toThrow("Tour not found");
    });

    test("should throw if email is already enrolled", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      service.addPendingEnrollment(tour.id, "player@test.com");

      expect(() => {
        service.addPendingEnrollment(tour.id, "player@test.com");
      }).toThrow("Email is already enrolled in this tour");
    });

    test("should allow same email in different tours", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", admin.id);
      const tour2 = createTour("Tour 2", admin.id);

      const enrollment1 = service.addPendingEnrollment(
        tour1.id,
        "player@test.com"
      );
      const enrollment2 = service.addPendingEnrollment(
        tour2.id,
        "player@test.com"
      );

      expect(enrollment1.tour_id).toBe(tour1.id);
      expect(enrollment2.tour_id).toBe(tour2.id);
    });

    test("should auto-activate enrollment if user already exists", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const existingUser = createUser("existing@test.com", "PLAYER");
      createPlayer("Existing Player", existingUser.id);
      const tour = createTour("Test Tour", admin.id);

      // Adding enrollment for existing user should auto-activate
      const enrollment = service.addPendingEnrollment(
        tour.id,
        "existing@test.com"
      );

      expect(enrollment.status).toBe("active");
      expect(enrollment.player_id).not.toBeNull();
    });

    test("should create player profile if user exists but has no player", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const userWithoutPlayer = createUser("noplayerprofile@test.com", "PLAYER");
      const tour = createTour("Test Tour", admin.id);

      // No player profile yet for this user
      const playerBefore = db
        .prepare("SELECT id FROM players WHERE user_id = ?")
        .get(userWithoutPlayer.id);
      expect(playerBefore).toBeNull();

      // Adding enrollment should create player and auto-activate
      const enrollment = service.addPendingEnrollment(
        tour.id,
        "noplayerprofile@test.com"
      );

      expect(enrollment.status).toBe("active");
      expect(enrollment.player_id).not.toBeNull();

      // Player profile should now exist
      const playerAfter = db
        .prepare("SELECT id FROM players WHERE user_id = ?")
        .get(userWithoutPlayer.id);
      expect(playerAfter).not.toBeNull();
    });
  });

  describe("requestEnrollment", () => {
    test("should create a requested enrollment for player", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "request",
      });

      const enrollment = service.requestEnrollment(tour.id, player.id);

      expect(enrollment.id).toBeGreaterThan(0);
      expect(enrollment.tour_id).toBe(tour.id);
      expect(enrollment.player_id).toBe(player.id);
      expect(enrollment.email).toBe("player@test.com");
      expect(enrollment.status).toBe("requested");
    });

    test("should throw if tour does not accept requests", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "closed",
      });

      expect(() => {
        service.requestEnrollment(tour.id, player.id);
      }).toThrow("This tour does not accept enrollment requests");
    });

    test("should throw if player is not linked to a user", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const player = createPlayer("Unlinked Player", null);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "request",
      });

      expect(() => {
        service.requestEnrollment(tour.id, player.id);
      }).toThrow("Player not found or not linked to a user account");
    });

    test("should throw if player is already enrolled", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "request",
      });

      service.requestEnrollment(tour.id, player.id);

      expect(() => {
        service.requestEnrollment(tour.id, player.id);
      }).toThrow("Player is already enrolled or has a pending request");
    });

    test("should throw if tour does not exist", () => {
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);

      expect(() => {
        service.requestEnrollment(999, player.id);
      }).toThrow("Tour not found");
    });
  });

  describe("approveEnrollment", () => {
    test("should approve a requested enrollment", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "request",
      });

      const requestedEnrollment = service.requestEnrollment(tour.id, player.id);
      const approvedEnrollment = service.approveEnrollment(
        requestedEnrollment.id
      );

      expect(approvedEnrollment.status).toBe("active");
      expect(approvedEnrollment.id).toBe(requestedEnrollment.id);
    });

    test("should throw if enrollment not found", () => {
      expect(() => {
        service.approveEnrollment(999);
      }).toThrow("Enrollment not found");
    });

    test("should throw if enrollment is not in requested status", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      // Create a pending enrollment (not requested)
      const enrollment = service.addPendingEnrollment(
        tour.id,
        "player@test.com"
      );

      expect(() => {
        service.approveEnrollment(enrollment.id);
      }).toThrow("Can only approve enrollments with 'requested' status");
    });
  });

  describe("rejectEnrollment", () => {
    test("should delete the enrollment", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "request",
      });

      const enrollment = service.requestEnrollment(tour.id, player.id);
      service.rejectEnrollment(enrollment.id);

      const found = service.findById(enrollment.id);
      expect(found).toBeNull();
    });

    test("should throw if enrollment not found", () => {
      expect(() => {
        service.rejectEnrollment(999);
      }).toThrow("Enrollment not found");
    });
  });

  describe("getEnrollments", () => {
    test("should return all enrollments for a tour", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      service.addPendingEnrollment(tour.id, "player1@test.com");
      service.addPendingEnrollment(tour.id, "player2@test.com");

      const enrollments = service.getEnrollments(tour.id);

      expect(enrollments).toHaveLength(2);
    });

    test("should filter by status when provided", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "request",
      });

      // Create pending enrollment
      service.addPendingEnrollment(tour.id, "pending@test.com");

      // Create requested enrollment
      service.requestEnrollment(tour.id, player.id);

      const pendingEnrollments = service.getEnrollments(tour.id, "pending");
      const requestedEnrollments = service.getEnrollments(tour.id, "requested");

      expect(pendingEnrollments).toHaveLength(1);
      expect(pendingEnrollments[0].email).toBe("pending@test.com");

      expect(requestedEnrollments).toHaveLength(1);
      expect(requestedEnrollments[0].email).toBe("player@test.com");
    });

    test("should include player name when available", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("John Doe", playerUser.id);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "request",
      });

      service.requestEnrollment(tour.id, player.id);

      const enrollments = service.getEnrollments(tour.id);

      expect(enrollments[0].player_name).toBe("John Doe");
    });

    test("should return null player_name for pending enrollments without player", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      service.addPendingEnrollment(tour.id, "player@test.com");

      const enrollments = service.getEnrollments(tour.id);

      expect(enrollments[0].player_name).toBeNull();
    });
  });

  describe("getEnrollmentByEmail", () => {
    test("should find enrollment by email (case insensitive)", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      service.addPendingEnrollment(tour.id, "player@test.com");

      const found = service.getEnrollmentByEmail(tour.id, "PLAYER@TEST.COM");

      expect(found).not.toBeNull();
      expect(found!.email).toBe("player@test.com");
    });

    test("should return null if not found", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      const found = service.getEnrollmentByEmail(
        tour.id,
        "nonexistent@test.com"
      );

      expect(found).toBeNull();
    });
  });

  describe("activateEnrollment", () => {
    test("should activate a pending enrollment and link player", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      // Use email that doesn't exist yet to get pending status
      service.addPendingEnrollment(tour.id, "newplayer@test.com");

      // Now create the user and player
      const playerUser = createUser("newplayer@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);

      const activated = service.activateEnrollment(
        tour.id,
        "newplayer@test.com",
        player.id
      );

      expect(activated.status).toBe("active");
      expect(activated.player_id).toBe(player.id);
    });

    test("should throw if enrollment not found", () => {
      const player = createPlayer("Test Player");

      expect(() => {
        service.activateEnrollment(999, "player@test.com", player.id);
      }).toThrow("Enrollment not found for this email");
    });

    test("should throw if enrollment is not pending", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);
      const tour = createTour("Test Tour", admin.id, {
        enrollment_mode: "request",
      });

      // Create requested (not pending) enrollment
      const enrollment = service.requestEnrollment(tour.id, player.id);

      // Try to activate it
      expect(() => {
        service.activateEnrollment(tour.id, "player@test.com", player.id);
      }).toThrow("Can only activate enrollments with 'pending' status");
    });
  });

  describe("getPendingEnrollmentsForEmail", () => {
    test("should return all pending enrollments across tours", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", admin.id);
      const tour2 = createTour("Tour 2", admin.id);

      service.addPendingEnrollment(tour1.id, "player@test.com");
      service.addPendingEnrollment(tour2.id, "player@test.com");

      const enrollments = service.getPendingEnrollmentsForEmail(
        "player@test.com"
      );

      expect(enrollments).toHaveLength(2);
    });

    test("should only return pending status enrollments", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);

      const tour1 = createTour("Tour 1", admin.id);
      const tour2 = createTour("Tour 2", admin.id, {
        enrollment_mode: "request",
      });
      const tour3 = createTour("Tour 3", admin.id);

      // Use a non-existent email for pending enrollment
      service.addPendingEnrollment(tour1.id, "newplayer@test.com");

      // Requested enrollment (not pending) for existing user
      service.requestEnrollment(tour2.id, player.id);

      // Active enrollment (existing user gets auto-activated)
      service.addPendingEnrollment(tour3.id, "player@test.com");

      const enrollments = service.getPendingEnrollmentsForEmail(
        "newplayer@test.com"
      );

      expect(enrollments).toHaveLength(1);
      expect(enrollments[0].tour_id).toBe(tour1.id);
    });
  });

  describe("canViewTour", () => {
    test("should allow anyone to view public tours", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Public Tour", admin.id, { visibility: "public" });

      expect(service.canViewTour(tour.id, null)).toBe(true);
      expect(service.canViewTour(tour.id, 999)).toBe(true);
    });

    test("should deny anonymous users for private tours", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Private Tour", admin.id, {
        visibility: "private",
      });

      expect(service.canViewTour(tour.id, null)).toBe(false);
    });

    test("should allow SUPER_ADMIN to view any tour", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const superAdmin = createUser("super@test.com", "SUPER_ADMIN");
      const tour = createTour("Private Tour", admin.id, {
        visibility: "private",
      });

      expect(service.canViewTour(tour.id, superAdmin.id)).toBe(true);
    });

    test("should allow tour owner to view their tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Private Tour", owner.id, {
        visibility: "private",
      });

      expect(service.canViewTour(tour.id, owner.id)).toBe(true);
    });

    test("should allow tour admin to view the tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tourAdmin = createUser("touradmin@test.com", "PLAYER");
      const tour = createTour("Private Tour", owner.id, {
        visibility: "private",
      });

      // Add tour admin
      db.prepare(
        "INSERT INTO tour_admins (tour_id, user_id) VALUES (?, ?)"
      ).run(tour.id, tourAdmin.id);

      expect(service.canViewTour(tour.id, tourAdmin.id)).toBe(true);
    });

    test("should allow actively enrolled player to view the tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      createPlayer("Test Player", playerUser.id);
      const tour = createTour("Private Tour", owner.id, {
        visibility: "private",
      });

      // Adding enrollment for existing user auto-activates it
      service.addPendingEnrollment(tour.id, "player@test.com");

      expect(service.canViewTour(tour.id, playerUser.id)).toBe(true);
    });

    test("should deny pending enrollee from viewing private tour", () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Private Tour", owner.id, {
        visibility: "private",
      });

      // Add pending enrollment for non-existent user
      service.addPendingEnrollment(tour.id, "newplayer@test.com");

      // Create the user AFTER the enrollment (so it stays pending)
      const playerUser = createUser("newplayer@test.com", "PLAYER");
      createPlayer("Test Player", playerUser.id);

      // User has a pending enrollment but it's not active, so denied
      expect(service.canViewTour(tour.id, playerUser.id)).toBe(false);
    });

    test("should return false for non-existent tour", () => {
      expect(service.canViewTour(999, null)).toBe(false);
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

      db.prepare(
        "INSERT INTO tour_admins (tour_id, user_id) VALUES (?, ?)"
      ).run(tour.id, tourAdmin.id);

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

  describe("getEnrollmentsForPlayer", () => {
    test("should return all enrollments for a player", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const playerUser = createUser("player@test.com", "PLAYER");
      const player = createPlayer("Test Player", playerUser.id);

      const tour1 = createTour("Tour 1", admin.id, {
        enrollment_mode: "request",
      });
      const tour2 = createTour("Tour 2", admin.id, {
        enrollment_mode: "request",
      });

      service.requestEnrollment(tour1.id, player.id);
      service.requestEnrollment(tour2.id, player.id);

      const enrollments = service.getEnrollmentsForPlayer(player.id);

      expect(enrollments).toHaveLength(2);
    });
  });

  describe("removeEnrollment", () => {
    test("should remove an enrollment", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      const enrollment = service.addPendingEnrollment(
        tour.id,
        "player@test.com"
      );
      service.removeEnrollment(tour.id, enrollment.id);

      const found = service.findById(enrollment.id);
      expect(found).toBeNull();
    });

    test("should throw if enrollment not found", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour = createTour("Test Tour", admin.id);

      expect(() => {
        service.removeEnrollment(tour.id, 999);
      }).toThrow("Enrollment not found");
    });

    test("should throw if enrollment belongs to different tour", () => {
      const admin = createUser("admin@test.com", "ADMIN");
      const tour1 = createTour("Tour 1", admin.id);
      const tour2 = createTour("Tour 2", admin.id);

      const enrollment = service.addPendingEnrollment(
        tour1.id,
        "player@test.com"
      );

      expect(() => {
        service.removeEnrollment(tour2.id, enrollment.id);
      }).toThrow("Enrollment not found");
    });
  });

  describe("factory function", () => {
    test("createTourEnrollmentService should create a service instance", () => {
      const svc = createTourEnrollmentService(db);
      expect(svc).toBeInstanceOf(TourEnrollmentService);
    });
  });
});
