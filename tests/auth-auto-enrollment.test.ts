import { Database } from "bun:sqlite";
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { AuthService, createAuthService } from "../src/services/auth.service";
import { TourEnrollmentService, createTourEnrollmentService } from "../src/services/tour-enrollment.service";
import { PlayerService, createPlayerService } from "../src/services/player.service";
import { createTestDatabase } from "../src/database/db";

describe("AuthService - Auto-Enrollment", () => {
  let db: Database;
  let authService: AuthService;
  let tourEnrollmentService: TourEnrollmentService;
  let playerService: PlayerService;
  let adminUserId: number;
  let tourId: number;

  beforeEach(async () => {
    db = await createTestDatabase();

    // Create services
    tourEnrollmentService = createTourEnrollmentService(db);
    playerService = createPlayerService(db);
    authService = createAuthService(db, {
      tourEnrollmentService,
      playerService,
    });

    // Create an admin user to own tours
    db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
    ).run("admin@test.com", "hash", "ADMIN");
    adminUserId = (
      db.prepare("SELECT id FROM users WHERE email = ?").get("admin@test.com") as {
        id: number;
      }
    ).id;

    // Create a tour
    const tour = db
      .prepare(
        "INSERT INTO tours (name, owner_id, enrollment_mode, visibility) VALUES (?, ?, ?, ?) RETURNING *"
      )
      .get("Test Tour", adminUserId, "closed", "private") as { id: number };
    tourId = tour.id;
  });

  afterEach(() => {
    db.close();
  });

  describe("registration without pending enrollments", () => {
    test("should register user normally when no pending enrollments", async () => {
      const result = await authService.register(
        "player@test.com",
        "password123"
      );

      expect(result.id).toBeDefined();
      expect(result.email).toBe("player@test.com");
      expect(result.role).toBe("PLAYER");
      expect(result.player_id).toBeUndefined();
      expect(result.auto_enrollments).toBeUndefined();
    });

    test("should not create player profile when no pending enrollments", async () => {
      await authService.register("player@test.com", "password123");

      const players = db.prepare("SELECT * FROM players").all();
      expect(players.length).toBe(0);
    });
  });

  describe("registration with pending enrollments", () => {
    beforeEach(() => {
      // Add pending enrollment for the email we'll register
      tourEnrollmentService.addPendingEnrollment(tourId, "newplayer@test.com");
    });

    test("should auto-enroll user with pending enrollment", async () => {
      const result = await authService.register(
        "newplayer@test.com",
        "password123"
      );

      expect(result.id).toBeDefined();
      expect(result.email).toBe("newplayer@test.com");
      expect(result.player_id).toBeDefined();
      expect(result.auto_enrollments).toBeDefined();
      expect(result.auto_enrollments!.length).toBe(1);
      expect(result.auto_enrollments![0].tour_id).toBe(tourId);
      expect(result.auto_enrollments![0].tour_name).toBe("Test Tour");
    });

    test("should create player profile when auto-enrolling", async () => {
      const result = await authService.register(
        "newplayer@test.com",
        "password123"
      );

      const player = playerService.findById(result.player_id!);
      expect(player).toBeDefined();
      expect(player!.name).toBe("newplayer"); // Uses email prefix
      expect(player!.user_id).toBe(result.id);
    });

    test("should change enrollment status from pending to active", async () => {
      await authService.register("newplayer@test.com", "password123");

      const enrollment = tourEnrollmentService.getEnrollmentByEmail(
        tourId,
        "newplayer@test.com"
      );
      expect(enrollment).toBeDefined();
      expect(enrollment!.status).toBe("active");
      expect(enrollment!.player_id).toBeDefined();
    });

    test("should handle case-insensitive email matching", async () => {
      const result = await authService.register(
        "NEWPLAYER@TEST.COM",
        "password123"
      );

      expect(result.auto_enrollments).toBeDefined();
      expect(result.auto_enrollments!.length).toBe(1);

      // Verify the enrollment is activated
      const enrollment = tourEnrollmentService.getEnrollmentByEmail(
        tourId,
        "newplayer@test.com"
      );
      expect(enrollment!.status).toBe("active");
    });
  });

  describe("registration with multiple pending enrollments", () => {
    let tourId2: number;

    beforeEach(() => {
      // Create a second tour
      const tour2 = db
        .prepare(
          "INSERT INTO tours (name, owner_id, enrollment_mode, visibility) VALUES (?, ?, ?, ?) RETURNING *"
        )
        .get("Second Tour", adminUserId, "closed", "public") as { id: number };
      tourId2 = tour2.id;

      // Add pending enrollments for both tours
      tourEnrollmentService.addPendingEnrollment(tourId, "multi@test.com");
      tourEnrollmentService.addPendingEnrollment(tourId2, "multi@test.com");
    });

    test("should auto-enroll in all pending tours", async () => {
      const result = await authService.register("multi@test.com", "password123");

      expect(result.auto_enrollments).toBeDefined();
      expect(result.auto_enrollments!.length).toBe(2);

      const tourIds = result.auto_enrollments!.map((e) => e.tour_id).sort();
      expect(tourIds).toEqual([tourId, tourId2].sort());
    });

    test("should activate all enrollments", async () => {
      await authService.register("multi@test.com", "password123");

      const enrollment1 = tourEnrollmentService.getEnrollmentByEmail(
        tourId,
        "multi@test.com"
      );
      const enrollment2 = tourEnrollmentService.getEnrollmentByEmail(
        tourId2,
        "multi@test.com"
      );

      expect(enrollment1!.status).toBe("active");
      expect(enrollment2!.status).toBe("active");
    });

    test("should link same player to all enrollments", async () => {
      const result = await authService.register("multi@test.com", "password123");

      const enrollment1 = tourEnrollmentService.getEnrollmentByEmail(
        tourId,
        "multi@test.com"
      );
      const enrollment2 = tourEnrollmentService.getEnrollmentByEmail(
        tourId2,
        "multi@test.com"
      );

      expect(enrollment1!.player_id).toBe(result.player_id);
      expect(enrollment2!.player_id).toBe(result.player_id);
    });
  });

  describe("registration without services (backward compatibility)", () => {
    test("should work without tour enrollment service", async () => {
      const basicAuthService = createAuthService(db);

      const result = await basicAuthService.register(
        "noservice@test.com",
        "password123"
      );

      expect(result.id).toBeDefined();
      expect(result.email).toBe("noservice@test.com");
      expect(result.player_id).toBeUndefined();
      expect(result.auto_enrollments).toBeUndefined();
    });

    test("should work with only player service", async () => {
      const partialAuthService = createAuthService(db, {
        playerService,
      });

      // Add pending enrollment
      tourEnrollmentService.addPendingEnrollment(tourId, "partial@test.com");

      const result = await partialAuthService.register(
        "partial@test.com",
        "password123"
      );

      // Should not auto-enroll since tourEnrollmentService is not provided
      expect(result.player_id).toBeUndefined();
      expect(result.auto_enrollments).toBeUndefined();
    });
  });

  describe("error handling", () => {
    test("should still register user if enrollment activation fails", async () => {
      // Add enrollment then delete the tour (which should cascade delete enrollment)
      tourEnrollmentService.addPendingEnrollment(tourId, "error@test.com");

      // Mock a failure scenario by directly manipulating the enrollment
      db.prepare(
        "UPDATE tour_enrollments SET status = 'active' WHERE email = ?"
      ).run("error@test.com");

      // Registration should still succeed
      const result = await authService.register("error@test.com", "password123");

      expect(result.id).toBeDefined();
      expect(result.email).toBe("error@test.com");
      // auto_enrollments may be empty or undefined due to the error
    });

    test("should reject registration for existing email", async () => {
      // First registration
      await authService.register("existing@test.com", "password123");

      // Second registration should fail
      await expect(
        authService.register("existing@test.com", "password456")
      ).rejects.toThrow("User already exists");
    });
  });

  describe("edge cases", () => {
    test("should handle email with special characters in prefix", async () => {
      tourEnrollmentService.addPendingEnrollment(tourId, "john.doe+test@test.com");

      const result = await authService.register(
        "john.doe+test@test.com",
        "password123"
      );

      expect(result.player_id).toBeDefined();
      const player = playerService.findById(result.player_id!);
      expect(player!.name).toBe("john.doe+test");
    });

    test("should not affect enrollments with 'requested' status", async () => {
      // Create a player and user for request enrollment
      db.prepare(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
      ).run("requester@test.com", "hash", "PLAYER");
      const requesterId = (
        db.prepare("SELECT id FROM users WHERE email = ?").get("requester@test.com") as {
          id: number;
        }
      ).id;
      const player = playerService.create(
        { name: "Requester", user_id: requesterId },
        requesterId
      );

      // Make tour allow requests and create a requested enrollment
      db.prepare("UPDATE tours SET enrollment_mode = 'request' WHERE id = ?").run(
        tourId
      );
      tourEnrollmentService.requestEnrollment(tourId, player.id);

      // Now try to register with the same email - should fail since user exists
      await expect(
        authService.register("requester@test.com", "newpassword")
      ).rejects.toThrow("User already exists");
    });
  });
});
