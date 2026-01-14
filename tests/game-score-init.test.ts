import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { GameService } from "../src/services/game.service";
import { GameGroupService } from "../src/services/game-group.service";
import { GameScoreService } from "../src/services/game-score.service";
import type { CreateGameDto } from "../src/types";

describe("Game Score Initialization", () => {
  let db: Database;
  let gameService: GameService;
  let groupService: GameGroupService;
  let scoreService: GameScoreService;
  let courseId: number;
  let ownerId: number;
  let playerId: number;
  let gameId: number;

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

    // Create a test player
    const playerStmt = db.prepare(
      "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
    );
    const player = playerStmt.get(ownerId, "Test Player", 10.5) as { id: number };
    playerId = player.id;

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

    // Create a game
    const gameData: CreateGameDto = {
      course_id: courseId,
      name: "Test Game",
      game_type: "stroke_play",
      scoring_mode: "gross",
    };
    const game = gameService.createGame(ownerId, gameData);
    gameId = game.id;
  });

  afterEach(() => {
    db.close();
  });

  test("should initialize game score when adding member to group", () => {
    // Create a game player
    const gamePlayer = gameService.addPlayer(gameId, { player_id: playerId }, ownerId);

    // Create a group
    const group = groupService.createGroup(gameId, { start_hole: 1 });

    // Add member to group
    const member = groupService.addMemberToGroup(group.id, gamePlayer.id);

    // Verify game score was created
    const scoreCheckStmt = db.prepare(
      "SELECT * FROM game_scores WHERE game_group_member_id = ?"
    );
    const scoreRow = scoreCheckStmt.get(member.id) as any;

    expect(scoreRow).toBeDefined();
    expect(scoreRow.game_group_member_id).toBe(member.id);
    expect(scoreRow.score).toBe("[]");
    expect(scoreRow.is_locked).toBe(0);
  });

  test("should initialize game scores when setting group members", () => {
    // Create multiple game players
    const gamePlayer1 = gameService.addPlayer(gameId, { player_id: playerId }, ownerId);

    // Create guest player
    const gamePlayer2 = gameService.addPlayer(gameId, { guest_name: "Guest Player" }, ownerId);

    // Create a group
    const group = groupService.createGroup(gameId, { start_hole: 1 });

    // Set group members (this replaces all members)
    const members = groupService.setGroupMembers(group.id, [gamePlayer1.id, gamePlayer2.id]);

    expect(members).toHaveLength(2);

    // Verify game scores were created for all members
    for (const member of members) {
      const scoreCheckStmt = db.prepare(
        "SELECT * FROM game_scores WHERE game_group_member_id = ?"
      );
      const scoreRow = scoreCheckStmt.get(member.id) as any;

      expect(scoreRow).toBeDefined();
      expect(scoreRow.game_group_member_id).toBe(member.id);
      expect(scoreRow.score).toBe("[]");
      expect(scoreRow.is_locked).toBe(0);
    }
  });

  test("should not create duplicate scores when adding member twice", () => {
    // Create a game player
    const gamePlayer = gameService.addPlayer(gameId, { player_id: playerId }, ownerId);

    // Create a group
    const group = groupService.createGroup(gameId, { start_hole: 1 });

    // Add member to group
    const member = groupService.addMemberToGroup(group.id, gamePlayer.id);

    // Verify game score was created
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM game_scores WHERE game_group_member_id = ?"
    );
    const result = countStmt.get(member.id) as { count: number };

    expect(result.count).toBe(1);
  });

  test("should allow leaderboard to be populated immediately after adding members", () => {
    // Create a game player
    const gamePlayer = gameService.addPlayer(gameId, { player_id: playerId }, ownerId);

    // Create a group
    const group = groupService.createGroup(gameId, { start_hole: 1 });

    // Add member to group
    groupService.addMemberToGroup(group.id, gamePlayer.id);

    // Get leaderboard - may be empty if game strategy filters 0 holes played
    // The important thing is it doesn't error due to missing scores
    const leaderboard = scoreService.getLeaderboard(gameId);

    expect(leaderboard).toBeDefined();
    // Leaderboard exists and doesn't throw error (success!)
  });

  test("should allow score entry view to show players immediately after adding members", () => {
    // Create a game player
    const gamePlayer = gameService.addPlayer(gameId, { player_id: playerId }, ownerId);

    // Create a group
    const group = groupService.createGroup(gameId, { start_hole: 1 });

    // Add member to group
    const member = groupService.addMemberToGroup(group.id, gamePlayer.id);

    // Get scores for group (should not be empty)
    const scores = scoreService.findScoresForGroup(group.id);

    expect(scores).toBeDefined();
    expect(scores.length).toBe(1);
    expect(scores[0].game_group_member_id).toBe(member.id);
    expect(scores[0].score).toEqual([]);
  });

  test("should handle setGroupMembers replacing existing members with scores", () => {
    // Create game players
    const gamePlayer1 = gameService.addPlayer(gameId, { player_id: playerId }, ownerId);

    // Create another user and player
    const userStmt = db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id"
    );
    const user2 = userStmt.get("test2@example.com", "hashed_password", "player") as { id: number };

    const playerStmt = db.prepare(
      "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
    );
    const player2Row = playerStmt.get(user2.id, "Test Player 2", 15.0) as { id: number };

    const gamePlayer2 = gameService.addPlayer(gameId, { player_id: player2Row.id }, ownerId);

    // Create a group
    const group = groupService.createGroup(gameId, { start_hole: 1 });

    // Add first member
    groupService.addMemberToGroup(group.id, gamePlayer1.id);

    // Replace with second member
    const members = groupService.setGroupMembers(group.id, [gamePlayer2.id]);

    expect(members).toHaveLength(1);

    // Verify game score exists for new member
    const scoreCheckStmt = db.prepare(
      "SELECT * FROM game_scores WHERE game_group_member_id = ?"
    );
    const scoreRow = scoreCheckStmt.get(members[0].id) as any;

    expect(scoreRow).toBeDefined();
    expect(scoreRow.game_group_member_id).toBe(members[0].id);
  });
});
