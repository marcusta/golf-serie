import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import {
  TourCompetitionRegistrationService,
  createTourCompetitionRegistrationService,
} from "../src/services/tour-competition-registration.service";

describe("TourCompetitionRegistrationService", () => {
  let db: Database;
  let service: TourCompetitionRegistrationService;

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
    userId?: number,
    handicap: number = 15
  ): { id: number; name: string; handicap: number } => {
    db.prepare(
      "INSERT INTO players (name, user_id, handicap) VALUES (?, ?, ?)"
    ).run(name, userId ?? null, handicap);
    return db
      .prepare("SELECT id, name, handicap FROM players WHERE name = ?")
      .get(name) as { id: number; name: string; handicap: number };
  };

  // Helper to create a course
  const createCourse = (
    name: string
  ): { id: number; name: string } => {
    const pars = JSON.stringify([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]);
    db.prepare("INSERT INTO courses (name, pars) VALUES (?, ?)").run(name, pars);
    return db
      .prepare("SELECT id, name FROM courses WHERE name = ?")
      .get(name) as { id: number; name: string };
  };

  // Helper to create an open competition
  const createOpenCompetition = (
    name: string,
    tourId: number,
    courseId: number
  ): { id: number } => {
    const now = new Date();
    const openStart = new Date(now.getTime() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    const openEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours from now

    db.prepare(
      `INSERT INTO competitions (name, date, course_id, tour_id, start_mode, open_start, open_end)
       VALUES (?, ?, ?, ?, 'open', ?, ?)`
    ).run(name, "2025-12-25", courseId, tourId, openStart, openEnd);
    return db
      .prepare("SELECT id FROM competitions WHERE name = ?")
      .get(name) as { id: number };
  };

  // Helper to create an enrollment
  const createEnrollment = (
    tourId: number,
    email: string,
    playerId: number
  ): { id: number } => {
    db.prepare(
      "INSERT INTO tour_enrollments (tour_id, email, status, player_id) VALUES (?, ?, 'active', ?)"
    ).run(tourId, email, playerId);
    return db
      .prepare("SELECT id FROM tour_enrollments WHERE tour_id = ? AND player_id = ?")
      .get(tourId, playerId) as { id: number };
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    service = createTourCompetitionRegistrationService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("register", () => {
    test("should register a player in solo mode", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15.4);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      const result = await service.register(competition.id, player.id, "solo");

      expect(result.registration).toBeDefined();
      expect(result.registration.competition_id).toBe(competition.id);
      expect(result.registration.player_id).toBe(player.id);
      expect(result.registration.status).toBe("registered");
      expect(result.registration.tee_time_id).toBeDefined();
      expect(result.registration.participant_id).toBeDefined();
      expect(result.group).toBeDefined();
      expect(result.group!.players.length).toBe(1);
      expect(result.group!.players[0].name).toBe("Marcus T.");
    });

    test("should register a player in looking_for_group mode", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Johan S.", undefined, 12.1);
      createEnrollment(tour.id, "johan@test.com", player.id);

      const result = await service.register(competition.id, player.id, "looking_for_group");

      expect(result.registration.status).toBe("looking_for_group");
      expect(result.group).toBeUndefined(); // No group info for LFG
    });

    test("should register a player in create_group mode", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Erik B.", undefined, 8.2);
      createEnrollment(tour.id, "erik@test.com", player.id);

      const result = await service.register(competition.id, player.id, "create_group");

      expect(result.registration.status).toBe("registered");
      expect(result.registration.group_created_by).toBe(player.id);
      expect(result.group).toBeDefined();
    });

    test("should throw if player not enrolled", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Not Enrolled", undefined, 20);

      await expect(
        service.register(competition.id, player.id, "solo")
      ).rejects.toThrow("Player is not enrolled in this tour");
    });

    test("should throw if competition is not open mode", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      // Create scheduled competition
      db.prepare(
        `INSERT INTO competitions (name, date, course_id, tour_id, start_mode)
         VALUES (?, ?, ?, ?, 'scheduled')`
      ).run("Scheduled Comp", "2025-12-25", course.id, tour.id);
      const comp = db.prepare("SELECT id FROM competitions WHERE name = ?").get("Scheduled Comp") as { id: number };

      await expect(
        service.register(comp.id, player.id, "solo")
      ).rejects.toThrow("Competition is not in open-start mode");
    });

    test("should throw if already registered", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await service.register(competition.id, player.id, "solo");

      await expect(
        service.register(competition.id, player.id, "solo")
      ).rejects.toThrow("Player is already registered for this competition");
    });

    test("should create tee_time and participant", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      const result = await service.register(competition.id, player.id, "solo");

      // Verify tee_time was created
      const teeTime = db
        .prepare("SELECT * FROM tee_times WHERE id = ?")
        .get(result.registration.tee_time_id);
      expect(teeTime).toBeDefined();

      // Verify participant was created with player_id
      const participant = db
        .prepare("SELECT * FROM participants WHERE id = ?")
        .get(result.registration.participant_id) as any;
      expect(participant).toBeDefined();
      expect(participant.player_id).toBe(player.id);
    });
  });

  describe("withdraw", () => {
    test("should withdraw a registration", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      const result = await service.register(competition.id, player.id, "solo");
      await service.withdraw(competition.id, player.id);

      const registration = await service.getRegistration(competition.id, player.id);
      expect(registration).toBeNull();

      // Verify participant was deleted
      const participant = db
        .prepare("SELECT * FROM participants WHERE id = ?")
        .get(result.registration.participant_id);
      expect(participant).toBeNull();
    });

    test("should throw if not registered", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await expect(
        service.withdraw(competition.id, player.id)
      ).rejects.toThrow("Registration not found");
    });

    test("should throw if already playing", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await service.register(competition.id, player.id, "solo");
      await service.startPlaying(competition.id, player.id);

      await expect(
        service.withdraw(competition.id, player.id)
      ).rejects.toThrow("Cannot withdraw after starting to play");
    });
  });

  describe("getAvailablePlayers", () => {
    test("should return enrolled players with status", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const player1 = createPlayer("Marcus T.", undefined, 15.4);
      const player2 = createPlayer("Johan S.", undefined, 12.1);
      const player3 = createPlayer("Maria L.", undefined, 18.3);
      createEnrollment(tour.id, "marcus@test.com", player1.id);
      createEnrollment(tour.id, "johan@test.com", player2.id);
      createEnrollment(tour.id, "maria@test.com", player3.id);

      // Marcus is solo, Johan is LFG, Maria not registered
      await service.register(competition.id, player1.id, "solo");
      await service.register(competition.id, player2.id, "looking_for_group");

      const available = await service.getAvailablePlayers(competition.id);

      expect(available.length).toBe(3);

      // LFG players should come first
      const johanEntry = available.find(p => p.player_id === player2.id);
      expect(johanEntry?.status).toBe("looking_for_group");

      const marcusEntry = available.find(p => p.player_id === player1.id);
      expect(marcusEntry?.status).toBe("in_group");

      const mariaEntry = available.find(p => p.player_id === player3.id);
      expect(mariaEntry?.status).toBe("available");
    });
  });

  describe("addToGroup", () => {
    test("should add LFG player to group", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const player1 = createPlayer("Marcus T.", undefined, 15.4);
      const player2 = createPlayer("Johan S.", undefined, 12.1);
      createEnrollment(tour.id, "marcus@test.com", player1.id);
      createEnrollment(tour.id, "johan@test.com", player2.id);

      // Marcus creates group, Johan is LFG
      await service.register(competition.id, player1.id, "create_group");
      await service.register(competition.id, player2.id, "looking_for_group");

      const group = await service.addToGroup(competition.id, player1.id, [player2.id]);

      expect(group.players.length).toBe(2);
      expect(group.players.some(p => p.player_id === player1.id)).toBe(true);
      expect(group.players.some(p => p.player_id === player2.id)).toBe(true);

      // Johan's registration should be updated
      const johanReg = await service.getRegistration(competition.id, player2.id);
      expect(johanReg?.status).toBe("registered");
      expect(johanReg?.tee_time_id).toBe(group.tee_time_id);
    });

    test("should add unregistered player to group", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const player1 = createPlayer("Marcus T.", undefined, 15.4);
      const player2 = createPlayer("Johan S.", undefined, 12.1);
      createEnrollment(tour.id, "marcus@test.com", player1.id);
      createEnrollment(tour.id, "johan@test.com", player2.id);

      // Marcus creates group, Johan not registered yet
      await service.register(competition.id, player1.id, "create_group");

      const group = await service.addToGroup(competition.id, player1.id, [player2.id]);

      expect(group.players.length).toBe(2);

      // Johan should now be registered
      const johanReg = await service.getRegistration(competition.id, player2.id);
      expect(johanReg).toBeDefined();
      expect(johanReg?.status).toBe("registered");
    });

    test("should throw if group would exceed max size", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const players = [];
      for (let i = 0; i < 5; i++) {
        const player = createPlayer(`Player ${i}`, undefined, 15);
        createEnrollment(tour.id, `player${i}@test.com`, player.id);
        players.push(player);
      }

      // First player creates group
      await service.register(competition.id, players[0].id, "create_group");

      // Add 3 more (total 4)
      await service.addToGroup(competition.id, players[0].id, [
        players[1].id,
        players[2].id,
        players[3].id,
      ]);

      // Try to add 5th player
      await expect(
        service.addToGroup(competition.id, players[0].id, [players[4].id])
      ).rejects.toThrow("would exceed 4 players");
    });

    test("should throw if player not enrolled", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const player1 = createPlayer("Marcus T.", undefined, 15.4);
      const player2 = createPlayer("Not Enrolled", undefined, 20);
      createEnrollment(tour.id, "marcus@test.com", player1.id);

      await service.register(competition.id, player1.id, "create_group");

      await expect(
        service.addToGroup(competition.id, player1.id, [player2.id])
      ).rejects.toThrow("not enrolled in this tour");
    });
  });

  describe("removeFromGroup", () => {
    test("should remove player from group", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const player1 = createPlayer("Marcus T.", undefined, 15.4);
      const player2 = createPlayer("Johan S.", undefined, 12.1);
      createEnrollment(tour.id, "marcus@test.com", player1.id);
      createEnrollment(tour.id, "johan@test.com", player2.id);

      await service.register(competition.id, player1.id, "create_group");
      await service.addToGroup(competition.id, player1.id, [player2.id]);

      const group = await service.removeFromGroup(competition.id, player1.id, player2.id);

      expect(group.players.length).toBe(1);
      expect(group.players[0].player_id).toBe(player1.id);

      // Johan should be in a solo group now
      const johanReg = await service.getRegistration(competition.id, player2.id);
      expect(johanReg?.tee_time_id).not.toBe(group.tee_time_id);
    });

    test("should throw if trying to remove self", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const player1 = createPlayer("Marcus T.", undefined, 15.4);
      createEnrollment(tour.id, "marcus@test.com", player1.id);

      await service.register(competition.id, player1.id, "create_group");

      await expect(
        service.removeFromGroup(competition.id, player1.id, player1.id)
      ).rejects.toThrow("Use leaveGroup to remove yourself");
    });
  });

  describe("leaveGroup", () => {
    test("should leave group and become solo", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const player1 = createPlayer("Marcus T.", undefined, 15.4);
      const player2 = createPlayer("Johan S.", undefined, 12.1);
      createEnrollment(tour.id, "marcus@test.com", player1.id);
      createEnrollment(tour.id, "johan@test.com", player2.id);

      await service.register(competition.id, player1.id, "create_group");
      await service.addToGroup(competition.id, player1.id, [player2.id]);

      const originalTeeTimeId = (await service.getRegistration(competition.id, player2.id))?.tee_time_id;

      const soloGroup = await service.leaveGroup(competition.id, player2.id);

      expect(soloGroup.players.length).toBe(1);
      expect(soloGroup.players[0].player_id).toBe(player2.id);
      expect(soloGroup.tee_time_id).not.toBe(originalTeeTimeId);
    });
  });

  describe("startPlaying and finishPlaying", () => {
    test("should update status to playing", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await service.register(competition.id, player.id, "solo");
      await service.startPlaying(competition.id, player.id);

      const registration = await service.getRegistration(competition.id, player.id);
      expect(registration?.status).toBe("playing");
      expect(registration?.started_at).toBeDefined();
    });

    test("should update status to finished", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await service.register(competition.id, player.id, "solo");
      await service.startPlaying(competition.id, player.id);
      await service.finishPlaying(competition.id, player.id);

      const registration = await service.getRegistration(competition.id, player.id);
      expect(registration?.status).toBe("finished");
      expect(registration?.finished_at).toBeDefined();
    });

    test("should throw if starting from wrong status", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await service.register(competition.id, player.id, "solo");
      await service.startPlaying(competition.id, player.id);
      await service.finishPlaying(competition.id, player.id);

      // Can't start again after finishing
      await expect(
        service.startPlaying(competition.id, player.id)
      ).rejects.toThrow("Invalid status for starting play");
    });
  });

  describe("getActiveRounds", () => {
    test("should return active rounds for player", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await service.register(competition.id, player.id, "solo");

      const activeRounds = await service.getActiveRounds(player.id);

      expect(activeRounds.length).toBe(1);
      expect(activeRounds[0].tour_name).toBe("Test Tour");
      expect(activeRounds[0].competition_name).toBe("Round 1");
      expect(activeRounds[0].holes_played).toBe(0);
      expect(activeRounds[0].current_score).toBe("E");
    });

    test("should not return finished rounds", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await service.register(competition.id, player.id, "solo");
      await service.startPlaying(competition.id, player.id);
      await service.finishPlaying(competition.id, player.id);

      const activeRounds = await service.getActiveRounds(player.id);

      expect(activeRounds.length).toBe(0);
    });
  });

  describe("Tour team creation", () => {
    test("should create tour team on first registration", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);
      const player = createPlayer("Marcus T.", undefined, 15);
      createEnrollment(tour.id, "marcus@test.com", player.id);

      await service.register(competition.id, player.id, "solo");

      const team = db
        .prepare("SELECT * FROM teams WHERE name = ?")
        .get(`Tour ${tour.id} Players`);
      expect(team).toBeDefined();
    });

    test("should reuse existing tour team", async () => {
      const owner = createUser("owner@test.com", "ADMIN");
      const tour = createTour("Test Tour", owner.id);
      const course = createCourse("Test Course");
      const competition = createOpenCompetition("Round 1", tour.id, course.id);

      const player1 = createPlayer("Marcus T.", undefined, 15);
      const player2 = createPlayer("Johan S.", undefined, 12);
      createEnrollment(tour.id, "marcus@test.com", player1.id);
      createEnrollment(tour.id, "johan@test.com", player2.id);

      await service.register(competition.id, player1.id, "solo");
      await service.register(competition.id, player2.id, "solo");

      const teams = db
        .prepare("SELECT * FROM teams WHERE name = ?")
        .all(`Tour ${tour.id} Players`);
      expect(teams.length).toBe(1);
    });
  });
});
