import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { GameService } from "../src/services/game.service";
import type { CreateGameDto } from "../src/types";

describe("Game Name Field", () => {
  let db: Database;
  let gameService: GameService;
  let courseId: number;
  let ownerId: number;

  beforeEach(async () => {
    db = await createTestDatabase();
    gameService = new GameService(db);

    // Create a test user
    const stmt = db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id"
    );
    const user = stmt.get("test@example.com", "hashed_password", "player") as { id: number };
    ownerId = user.id;

    // Create a test player
    const playerStmt = db.prepare(
      "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
    );
    playerStmt.run(ownerId, "Test Player", 10.5);

    // Create a test course with pars
    const pars = JSON.stringify({
      holes: [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],
      out: 36,
      in: 36,
      total: 72,
    });
    const courseStmt = db.prepare(
      "INSERT INTO courses (name, pars) VALUES (?, ?) RETURNING id"
    );
    const course = courseStmt.get("Test Course", pars) as { id: number };
    courseId = course.id;
  });

  afterEach(() => {
    db.close();
  });

  test("should create a game with a name", () => {
    const gameData: CreateGameDto = {
      course_id: courseId,
      name: "Friday Night Golf",
      game_type: "stroke_play",
      scoring_mode: "gross",
    };

    const game = gameService.createGame(ownerId, gameData);

    expect(game).toBeDefined();
    expect(game.name).toBe("Friday Night Golf");
    expect(game.course_id).toBe(courseId);
    expect(game.owner_id).toBe(ownerId);
  });

  test("should create a game without a name (name is optional)", () => {
    const gameData: CreateGameDto = {
      course_id: courseId,
      game_type: "stroke_play",
      scoring_mode: "gross",
    };

    const game = gameService.createGame(ownerId, gameData);

    expect(game).toBeDefined();
    expect(game.name).toBeUndefined();
    expect(game.course_id).toBe(courseId);
  });

  test("should update a game name", () => {
    // Create game without name
    const gameData: CreateGameDto = {
      course_id: courseId,
      game_type: "stroke_play",
      scoring_mode: "gross",
    };

    const game = gameService.createGame(ownerId, gameData);
    expect(game.name).toBeUndefined();

    // Update with a name
    const updatedGame = gameService.updateGame(
      game.id,
      { name: "Saturday Morning Round" },
      ownerId
    );

    expect(updatedGame.name).toBe("Saturday Morning Round");
  });

  test("should retrieve game with name", () => {
    const gameData: CreateGameDto = {
      course_id: courseId,
      name: "Weekend Warriors",
      game_type: "stroke_play",
      scoring_mode: "gross",
    };

    const createdGame = gameService.createGame(ownerId, gameData);
    const retrievedGame = gameService.findById(createdGame.id);

    expect(retrievedGame).toBeDefined();
    expect(retrievedGame?.name).toBe("Weekend Warriors");
  });

  test("should retrieve game with details including name", () => {
    const gameData: CreateGameDto = {
      course_id: courseId,
      name: "Monthly Tournament",
      game_type: "stroke_play",
      scoring_mode: "gross",
    };

    const createdGame = gameService.createGame(ownerId, gameData);
    const gameWithDetails = gameService.findByIdWithDetails(createdGame.id);

    expect(gameWithDetails).toBeDefined();
    expect(gameWithDetails?.name).toBe("Monthly Tournament");
    expect(gameWithDetails?.course_name).toBe("Test Course");
  });
});
