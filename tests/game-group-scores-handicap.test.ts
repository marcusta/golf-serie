import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { GameService } from "../src/services/game.service";
import { GameGroupService } from "../src/services/game-group.service";
import { GameScoreService } from "../src/services/game-score.service";
import type { CreateGameDto } from "../src/types";

describe("Game Group Scores with Handicap Data", () => {
  let db: Database;
  let gameService: GameService;
  let groupService: GameGroupService;
  let scoreService: GameScoreService;
  let courseId: number;
  let ownerId: number;
  let whiteTeeId: number;

  beforeEach(async () => {
    db = await createTestDatabase();
    gameService = new GameService(db);
    groupService = new GameGroupService(db);
    scoreService = new GameScoreService(db);

    // Create a test user
    const userStmt = db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id"
    );
    const user = userStmt.get("test@example.com", "hashed_password", "player") as { id: number };
    ownerId = user.id;

    // Create a test course with pars and stroke index
    const pars = JSON.stringify({
      holes: [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4],
      out: 36,
      in: 36,
      total: 72,
    });
    const strokeIndex = JSON.stringify([7, 15, 3, 11, 1, 9, 5, 17, 13, 8, 16, 4, 12, 2, 10, 6, 18, 14]);
    const courseStmt = db.prepare(
      "INSERT INTO courses (name, pars, stroke_index) VALUES (?, ?, ?) RETURNING id"
    );
    const course = courseStmt.get("Test Course", pars, strokeIndex) as { id: number };
    courseId = course.id;

    // Create white tee with ratings
    const teeStmt = db.prepare(
      "INSERT INTO course_tees (course_id, name, color, course_rating, slope_rating, stroke_index) VALUES (?, ?, ?, ?, ?, ?) RETURNING id"
    );
    const whiteTee = teeStmt.get(courseId, "White Tees", "white", 71.3, 125, strokeIndex) as { id: number };
    whiteTeeId = whiteTee.id;

    // Add tee rating for men
    const ratingStmt = db.prepare(
      "INSERT INTO course_tee_ratings (tee_id, gender, course_rating, slope_rating) VALUES (?, ?, ?, ?)"
    );
    ratingStmt.run(whiteTeeId, "men", 71.3, 125);
  });

  afterEach(() => {
    db.close();
  });

  test("should return handicap data for players with tee assignments", () => {
    // Create a player with handicap index 10.5
    const playerStmt = db.prepare(
      "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
    );
    const player = playerStmt.get(ownerId, "Test Player", 10.5) as { id: number };

    // Create a game with net scoring
    const gameData: CreateGameDto = {
      course_id: courseId,
      name: "Net Score Test",
      game_type: "stroke_play",
      scoring_mode: "net",
    };
    const game = gameService.createGame(ownerId, gameData);

    // Add player with white tee assignment
    const gamePlayer = gameService.addPlayer(game.id, { player_id: player.id, tee_id: whiteTeeId }, ownerId);

    // Create a group and add the player
    const group = groupService.createGroup(game.id, { start_hole: 1 });
    const member = groupService.addMemberToGroup(group.id, gamePlayer.id);

    // Submit a few scores
    scoreService.updateScore(member.id, 1, 4);
    scoreService.updateScore(member.id, 2, 3);
    scoreService.updateScore(member.id, 3, 5);

    // Get scores for group with details
    const scores = scoreService.findScoresForGroupWithDetails(group.id);

    expect(scores).toHaveLength(1);
    const scoreDetails = scores[0];

    // Verify basic score data
    expect(scoreDetails.member_name).toBe("Test Player");
    expect(scoreDetails.game_player_id).toBe(gamePlayer.id);
    expect(scoreDetails.player_id).toBe(player.id);
    expect(scoreDetails.score).toEqual([4, 3, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // Verify handicap data is returned
    expect(scoreDetails.tee_id).toBe(whiteTeeId);
    expect(scoreDetails.course_rating).toBe(71.3);
    expect(scoreDetails.slope_rating).toBe(125);

    // Verify stroke index is returned (18-element array)
    expect(scoreDetails.stroke_index).toBeDefined();
    expect(scoreDetails.stroke_index).toHaveLength(18);
    expect(scoreDetails.stroke_index).toEqual([7, 15, 3, 11, 1, 9, 5, 17, 13, 8, 16, 4, 12, 2, 10, 6, 18, 14]);

    // Verify course handicap is calculated
    // Expected: (10.5 * 125 / 113) + (71.3 - 72) = 11.616... - 0.7 = 10.916... → 11
    expect(scoreDetails.course_handicap).toBe(11);

    // Verify handicap strokes per hole is returned (18-element array)
    expect(scoreDetails.handicap_strokes_per_hole).toBeDefined();
    expect(scoreDetails.handicap_strokes_per_hole).toHaveLength(18);

    // With course handicap of 11, strokes should be distributed to the 11 hardest holes
    // (stroke index 1-11 get 1 stroke, 12-18 get 0 strokes)
    const expectedStrokes = scoreDetails.stroke_index!.map((si) => si <= 11 ? 1 : 0);
    expect(scoreDetails.handicap_strokes_per_hole).toEqual(expectedStrokes);
  });

  test("should return null handicap data for players without tee assignments", () => {
    // Create a player with handicap
    const playerStmt = db.prepare(
      "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
    );
    const player = playerStmt.get(ownerId, "No Tee Player", 10.5) as { id: number };

    // Create a game
    const gameData: CreateGameDto = {
      course_id: courseId,
      name: "No Tee Test",
      game_type: "stroke_play",
      scoring_mode: "net",
    };
    const game = gameService.createGame(ownerId, gameData);

    // Add player WITHOUT tee assignment
    const gamePlayer = gameService.addPlayer(game.id, { player_id: player.id }, ownerId);

    // Create a group and add the player
    const group = groupService.createGroup(game.id, { start_hole: 1 });
    const member = groupService.addMemberToGroup(group.id, gamePlayer.id);

    // Get scores for group with details
    const scores = scoreService.findScoresForGroupWithDetails(group.id);

    expect(scores).toHaveLength(1);
    const scoreDetails = scores[0];

    // Verify handicap data is null when no tee assigned
    expect(scoreDetails.tee_id).toBeNull();
    expect(scoreDetails.course_rating).toBeNull();
    expect(scoreDetails.slope_rating).toBeNull();
    expect(scoreDetails.course_handicap).toBeNull();
    expect(scoreDetails.stroke_index).toBeNull();
    expect(scoreDetails.handicap_strokes_per_hole).toBeNull();
  });

  test("should return null handicap data for players without handicap index", () => {
    // Create a player without handicap
    const playerStmt = db.prepare(
      "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
    );
    const player = playerStmt.get(ownerId, "No Handicap Player", null) as { id: number };

    // Create a game
    const gameData: CreateGameDto = {
      course_id: courseId,
      name: "No Handicap Test",
      game_type: "stroke_play",
      scoring_mode: "net",
    };
    const game = gameService.createGame(ownerId, gameData);

    // Add player with tee assignment but no handicap
    const gamePlayer = gameService.addPlayer(game.id, { player_id: player.id, tee_id: whiteTeeId }, ownerId);

    // Create a group and add the player
    const group = groupService.createGroup(game.id, { start_hole: 1 });
    const member = groupService.addMemberToGroup(group.id, gamePlayer.id);

    // Get scores for group with details
    const scores = scoreService.findScoresForGroupWithDetails(group.id);

    expect(scores).toHaveLength(1);
    const scoreDetails = scores[0];

    // Verify handicap data is null when player has no handicap
    expect(scoreDetails.tee_id).toBe(whiteTeeId);
    expect(scoreDetails.course_rating).toBe(71.3);
    expect(scoreDetails.slope_rating).toBe(125);
    expect(scoreDetails.course_handicap).toBeNull();
    expect(scoreDetails.stroke_index).toBeNull();
    expect(scoreDetails.handicap_strokes_per_hole).toBeNull();
  });

  test("should use course stroke index when tee has no stroke index", () => {
    // Create a tee without stroke index
    const teeStmt = db.prepare(
      "INSERT INTO course_tees (course_id, name, color, course_rating, slope_rating) VALUES (?, ?, ?, ?, ?) RETURNING id"
    );
    const blueTee = teeStmt.get(courseId, "Blue Tees", "blue", 73.5, 135) as { id: number };

    // Add tee rating
    const ratingStmt = db.prepare(
      "INSERT INTO course_tee_ratings (tee_id, gender, course_rating, slope_rating) VALUES (?, ?, ?, ?)"
    );
    ratingStmt.run(blueTee.id, "men", 73.5, 135);

    // Create a player
    const playerStmt = db.prepare(
      "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
    );
    const player = playerStmt.get(ownerId, "Blue Tee Player", 10.0) as { id: number };

    // Create a game
    const gameData: CreateGameDto = {
      course_id: courseId,
      name: "Fallback Stroke Index Test",
      game_type: "stroke_play",
      scoring_mode: "net",
    };
    const game = gameService.createGame(ownerId, gameData);

    // Add player with blue tee
    const gamePlayer = gameService.addPlayer(game.id, { player_id: player.id, tee_id: blueTee.id }, ownerId);

    // Create a group and add the player
    const group = groupService.createGroup(game.id, { start_hole: 1 });
    const member = groupService.addMemberToGroup(group.id, gamePlayer.id);

    // Get scores for group with details
    const scores = scoreService.findScoresForGroupWithDetails(group.id);

    expect(scores).toHaveLength(1);
    const scoreDetails = scores[0];

    // Should fall back to course stroke index
    expect(scoreDetails.stroke_index).toBeDefined();
    expect(scoreDetails.stroke_index).toEqual([7, 15, 3, 11, 1, 9, 5, 17, 13, 8, 16, 4, 12, 2, 10, 6, 18, 14]);

    // Course handicap should still be calculated
    // (10.0 * 135 / 113) + (73.5 - 72) = 11.946... + 1.5 = 13.446... → 13
    expect(scoreDetails.course_handicap).toBe(13);
    expect(scoreDetails.handicap_strokes_per_hole).toHaveLength(18);
  });
});
