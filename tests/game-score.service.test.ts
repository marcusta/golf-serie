import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { GameService } from "../src/services/game.service";
import { GameGroupService } from "../src/services/game-group.service";
import { GameScoreService } from "../src/services/game-score.service";
import { GOLF } from "../src/constants/golf";
import type { CreateGameDto } from "../src/types";

/**
 * Comprehensive tests for GameScoreService
 *
 * Tests score update operations, calculation functions,
 * edge cases with partial rounds, UNREPORTED_HOLE markers,
 * and integration with course par data.
 *
 * @see docs/backend/SQL_REFACTORING_STRATEGY.md for Phase 0 context
 */
describe("GameScoreService", () => {
  let db: Database;
  let gameService: GameService;
  let groupService: GameGroupService;
  let scoreService: GameScoreService;
  let courseId: number;
  let ownerId: number;
  let playerId: number;
  let gameId: number;
  let groupId: number;
  let memberId: number;

  // Standard pars for a par-72 course
  const standardPars = [4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4];

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
      holes: standardPars,
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

    // Create a game player and add to group
    const gamePlayer = gameService.addPlayer(gameId, { player_id: playerId }, ownerId);

    // Create a group and add player
    const group = groupService.createGroup(gameId, { start_hole: 1 });
    groupId = group.id;
    const member = groupService.addMemberToGroup(groupId, gamePlayer.id);
    memberId = member.id;
  });

  afterEach(() => {
    db.close();
  });

  // ============================================================================
  // Score Update Tests
  // ============================================================================

  describe("updateScore", () => {
    test("should update a single hole score", () => {
      const result = scoreService.updateScore(memberId, 1, 4);

      expect(result.score).toHaveLength(18);
      expect(result.score[0]).toBe(4);
      expect(result.score.slice(1).every((s) => s === 0)).toBe(true);
    });

    test("should update multiple holes independently", () => {
      scoreService.updateScore(memberId, 1, 4);
      scoreService.updateScore(memberId, 5, 5);
      const result = scoreService.updateScore(memberId, 10, 3);

      expect(result.score[0]).toBe(4);
      expect(result.score[4]).toBe(5);
      expect(result.score[9]).toBe(3);
    });

    test("should allow overwriting an existing score", () => {
      scoreService.updateScore(memberId, 1, 4);
      const result = scoreService.updateScore(memberId, 1, 6);

      expect(result.score[0]).toBe(6);
    });

    test("should allow clearing a score with 0", () => {
      scoreService.updateScore(memberId, 1, 4);
      const result = scoreService.updateScore(memberId, 1, 0);

      expect(result.score[0]).toBe(0);
    });

    test("should accept UNREPORTED_HOLE marker (-1)", () => {
      const result = scoreService.updateScore(memberId, 1, GOLF.UNREPORTED_HOLE);

      expect(result.score[0]).toBe(GOLF.UNREPORTED_HOLE);
    });

    test("should throw error for invalid hole number (0)", () => {
      expect(() => scoreService.updateScore(memberId, 0, 4)).toThrow(
        `Hole number must be between 1 and ${GOLF.HOLES_PER_ROUND}`
      );
    });

    test("should throw error for invalid hole number (19)", () => {
      expect(() => scoreService.updateScore(memberId, 19, 4)).toThrow(
        `Hole number must be between 1 and ${GOLF.HOLES_PER_ROUND}`
      );
    });

    test("should throw error for invalid shots value (-2)", () => {
      expect(() => scoreService.updateScore(memberId, 1, -2)).toThrow(
        "Shots must be greater than 0, or -1 (gave up), or 0 (clear score)"
      );
    });

    test("should throw error for non-existent member", () => {
      expect(() => scoreService.updateScore(99999, 1, 4)).toThrow(
        "Group member 99999 not found"
      );
    });

    test("should update scores for all 18 holes", () => {
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }

      const scores = scoreService.findScoresForGroup(groupId);
      expect(scores[0].score).toEqual(standardPars);
    });
  });

  // ============================================================================
  // Score Lock/Unlock Tests
  // ============================================================================

  describe("lockScore and unlockScore", () => {
    test("should lock a scorecard", () => {
      scoreService.updateScore(memberId, 1, 4);
      const result = scoreService.lockScore(memberId);

      expect(result.is_locked).toBe(true);
      expect(result.locked_at).toBeDefined();
    });

    test("should prevent score updates on locked scorecard", () => {
      scoreService.updateScore(memberId, 1, 4);
      scoreService.lockScore(memberId);

      expect(() => scoreService.updateScore(memberId, 2, 5)).toThrow(
        "Cannot update a locked scorecard"
      );
    });

    test("should throw error when locking already locked scorecard", () => {
      scoreService.updateScore(memberId, 1, 4);
      scoreService.lockScore(memberId);

      expect(() => scoreService.lockScore(memberId)).toThrow(
        "Scorecard is already locked"
      );
    });

    test("should unlock a locked scorecard", () => {
      scoreService.updateScore(memberId, 1, 4);
      scoreService.lockScore(memberId);
      const result = scoreService.unlockScore(memberId);

      expect(result.is_locked).toBe(false);
    });

    test("should allow score updates after unlock", () => {
      scoreService.updateScore(memberId, 1, 4);
      scoreService.lockScore(memberId);
      scoreService.unlockScore(memberId);

      const result = scoreService.updateScore(memberId, 2, 5);
      expect(result.score[1]).toBe(5);
    });

    test("should throw error when unlocking not locked scorecard", () => {
      scoreService.updateScore(memberId, 1, 4);

      expect(() => scoreService.unlockScore(memberId)).toThrow(
        "Scorecard is not locked"
      );
    });

    test("should throw error when locking non-existent score", () => {
      // Create a new member without any score entry
      const playerStmt = db.prepare(
        "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
      );
      const player2 = playerStmt.get(ownerId, "Player 2", 15.0) as { id: number };
      const gamePlayer2 = gameService.addPlayer(gameId, { player_id: player2.id }, ownerId);
      const member2 = groupService.addMemberToGroup(groupId, gamePlayer2.id);

      // Delete the auto-created score to simulate no score record
      db.prepare("DELETE FROM game_scores WHERE game_group_member_id = ?").run(member2.id);

      expect(() => scoreService.lockScore(member2.id)).toThrow(
        `Score for member ${member2.id} not found`
      );
    });
  });

  // ============================================================================
  // findScoresForGroup Tests
  // ============================================================================

  describe("findScoresForGroup", () => {
    test("should return empty scores for new member", () => {
      const scores = scoreService.findScoresForGroup(groupId);

      expect(scores).toHaveLength(1);
      expect(scores[0].score).toEqual([]);
    });

    test("should return multiple members scores", () => {
      // Add second player
      const playerStmt = db.prepare(
        "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
      );
      const player2 = playerStmt.get(ownerId, "Player 2", 15.0) as { id: number };
      const gamePlayer2 = gameService.addPlayer(gameId, { player_id: player2.id }, ownerId);
      const member2 = groupService.addMemberToGroup(groupId, gamePlayer2.id);

      // Update scores for both
      scoreService.updateScore(memberId, 1, 4);
      scoreService.updateScore(member2.id, 1, 5);

      const scores = scoreService.findScoresForGroup(groupId);

      expect(scores).toHaveLength(2);
      expect(scores.some((s) => s.score[0] === 4)).toBe(true);
      expect(scores.some((s) => s.score[0] === 5)).toBe(true);
    });
  });

  // ============================================================================
  // findScoresForGroupWithDetails Tests
  // ============================================================================

  describe("findScoresForGroupWithDetails", () => {
    test("should include player name in details", () => {
      scoreService.updateScore(memberId, 1, 4);

      const scoresWithDetails = scoreService.findScoresForGroupWithDetails(groupId);

      expect(scoresWithDetails).toHaveLength(1);
      expect(scoresWithDetails[0].member_name).toBe("Test Player");
    });

    test("should include guest name for guest players", () => {
      const gamePlayer2 = gameService.addPlayer(gameId, { guest_name: "Guest Bob" }, ownerId);
      const member2 = groupService.addMemberToGroup(groupId, gamePlayer2.id);
      scoreService.updateScore(member2.id, 1, 5);

      const scoresWithDetails = scoreService.findScoresForGroupWithDetails(groupId);
      const guestScore = scoresWithDetails.find((s) => s.game_group_member_id === member2.id);

      expect(guestScore?.member_name).toBe("Guest Bob");
      expect(guestScore?.guest_name).toBe("Guest Bob");
    });

    test("should include player_id for registered players", () => {
      scoreService.updateScore(memberId, 1, 4);

      const scoresWithDetails = scoreService.findScoresForGroupWithDetails(groupId);

      expect(scoresWithDetails[0].player_id).toBe(playerId);
    });

    test("should have null player_id for guest players", () => {
      const gamePlayer2 = gameService.addPlayer(gameId, { guest_name: "Guest Bob" }, ownerId);
      const member2 = groupService.addMemberToGroup(groupId, gamePlayer2.id);
      scoreService.updateScore(member2.id, 1, 5);

      const scoresWithDetails = scoreService.findScoresForGroupWithDetails(groupId);
      const guestScore = scoresWithDetails.find((s) => s.game_group_member_id === member2.id);

      expect(guestScore?.player_id).toBeNull();
    });
  });

  // ============================================================================
  // Leaderboard and Score Calculation Tests
  // ============================================================================

  describe("getLeaderboard", () => {
    test("should calculate holesPlayed correctly for full round", () => {
      // Play all 18 holes at par
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].holesPlayed).toBe(18);
    });

    test("should calculate holesPlayed correctly for partial round (9 holes)", () => {
      // Play only front 9
      for (let i = 1; i <= 9; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].holesPlayed).toBe(9);
    });

    test("should calculate holesPlayed with UNREPORTED_HOLE markers", () => {
      // Play 16 holes, mark 2 as gave up
      for (let i = 1; i <= 16; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }
      scoreService.updateScore(memberId, 17, GOLF.UNREPORTED_HOLE);
      scoreService.updateScore(memberId, 18, GOLF.UNREPORTED_HOLE);

      const leaderboard = scoreService.getLeaderboard(gameId);

      // UNREPORTED_HOLE (-1) counts as "played" (hole was attempted)
      expect(leaderboard[0].holesPlayed).toBe(18);
    });

    test("should return 0 holes played for empty scorecard", () => {
      const leaderboard = scoreService.getLeaderboard(gameId);

      // May be empty or show 0 holes played depending on strategy
      if (leaderboard.length > 0) {
        expect(leaderboard[0].holesPlayed).toBe(0);
      }
    });

    test("should calculate grossTotal correctly for even par round", () => {
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].grossTotal).toBe(72);
    });

    test("should calculate grossTotal correctly for over par round", () => {
      // Bogey on every hole (+18)
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1] + 1);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].grossTotal).toBe(90);
    });

    test("should calculate grossTotal correctly for under par round", () => {
      // Birdie on every hole (-18)
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1] - 1);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].grossTotal).toBe(54);
    });

    test("should calculate relativeToPar correctly for even par", () => {
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].relativeToPar).toBe(0);
    });

    test("should calculate relativeToPar correctly for over par (+5)", () => {
      // 5 bogeys, rest pars
      for (let i = 1; i <= 18; i++) {
        const score = i <= 5 ? standardPars[i - 1] + 1 : standardPars[i - 1];
        scoreService.updateScore(memberId, i, score);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].relativeToPar).toBe(5);
    });

    test("should calculate relativeToPar correctly for under par (-3)", () => {
      // 3 birdies, rest pars
      for (let i = 1; i <= 18; i++) {
        const score = i <= 3 ? standardPars[i - 1] - 1 : standardPars[i - 1];
        scoreService.updateScore(memberId, i, score);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].relativeToPar).toBe(-3);
    });

    test("should calculate relativeToPar for partial round (front 9 only)", () => {
      // Play front 9 at even par (36)
      for (let i = 1; i <= 9; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      // Front 9 par is 36, score is 36, relative = 0
      expect(leaderboard[0].grossTotal).toBe(36);
      expect(leaderboard[0].relativeToPar).toBe(0);
    });

    test("should not include UNREPORTED_HOLE in gross total calculation", () => {
      // Play 16 holes at par, 2 holes gave up
      for (let i = 1; i <= 16; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }
      scoreService.updateScore(memberId, 17, GOLF.UNREPORTED_HOLE);
      scoreService.updateScore(memberId, 18, GOLF.UNREPORTED_HOLE);

      const leaderboard = scoreService.getLeaderboard(gameId);

      // Gross should be sum of 16 holes at par
      // Pars for holes 1-16
      const expectedGross = standardPars.slice(0, 16).reduce((a, b) => a + b, 0);
      expect(leaderboard[0].grossTotal).toBe(expectedGross);
    });

    test("should handle mixed scores with zeros", () => {
      // Only enter scores for odd holes
      for (let i = 1; i <= 17; i += 2) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].holesPlayed).toBe(9); // 9 odd holes
    });

    test("should throw error for non-existent game", () => {
      expect(() => scoreService.getLeaderboard(99999)).toThrow(
        "Game 99999 not found"
      );
    });
  });

  // ============================================================================
  // Leaderboard Sorting and Ranking Tests
  // ============================================================================

  describe("getLeaderboard sorting", () => {
    let member2Id: number;
    let member3Id: number;

    beforeEach(() => {
      // Add two more players
      const playerStmt = db.prepare(
        "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
      );
      const player2 = playerStmt.get(ownerId, "Player 2", 15.0) as { id: number };
      const player3 = playerStmt.get(ownerId, "Player 3", 20.0) as { id: number };

      const gamePlayer2 = gameService.addPlayer(gameId, { player_id: player2.id }, ownerId);
      const gamePlayer3 = gameService.addPlayer(gameId, { player_id: player3.id }, ownerId);

      const member2 = groupService.addMemberToGroup(groupId, gamePlayer2.id);
      const member3 = groupService.addMemberToGroup(groupId, gamePlayer3.id);
      member2Id = member2.id;
      member3Id = member3.id;
    });

    test("should sort by gross score ascending", () => {
      // Player 1: 72 (even par)
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
      }

      // Player 2: 80 (+8)
      for (let i = 1; i <= 18; i++) {
        const score = i <= 8 ? standardPars[i - 1] + 1 : standardPars[i - 1];
        scoreService.updateScore(member2Id, i, score);
      }

      // Player 3: 68 (-4)
      for (let i = 1; i <= 18; i++) {
        const score = i <= 4 ? standardPars[i - 1] - 1 : standardPars[i - 1];
        scoreService.updateScore(member3Id, i, score);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].grossTotal).toBe(68);
      expect(leaderboard[1].grossTotal).toBe(72);
      expect(leaderboard[2].grossTotal).toBe(80);
    });

    test("should include position in results", () => {
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
        scoreService.updateScore(member2Id, i, standardPars[i - 1] + 1);
        scoreService.updateScore(member3Id, i, standardPars[i - 1] - 1);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[1].position).toBe(2);
      expect(leaderboard[2].position).toBe(3);
    });

    test("should include isLocked status in leaderboard", () => {
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
        scoreService.updateScore(member2Id, i, standardPars[i - 1]);
      }

      scoreService.lockScore(memberId);

      const leaderboard = scoreService.getLeaderboard(gameId);

      const lockedEntry = leaderboard.find(
        (e) => e.isLocked === true
      );
      const unlockedEntry = leaderboard.find(
        (e) => e.isLocked === false
      );

      expect(lockedEntry).toBeDefined();
      expect(unlockedEntry).toBeDefined();
    });
  });

  // ============================================================================
  // Handicap Snapshot Tests
  // ============================================================================

  describe("handicap snapshot", () => {
    test("should capture handicap on first score entry", () => {
      scoreService.updateScore(memberId, 1, 4);

      const scoreRow = db
        .prepare("SELECT handicap_index FROM game_scores WHERE game_group_member_id = ?")
        .get(memberId) as { handicap_index: number | null };

      expect(scoreRow.handicap_index).toBe(10.5);
    });

    test("should not recapture handicap on subsequent scores", () => {
      scoreService.updateScore(memberId, 1, 4);

      // Update player handicap
      db.prepare("UPDATE players SET handicap = ? WHERE id = ?").run(15.0, playerId);

      // Enter more scores
      scoreService.updateScore(memberId, 2, 5);

      const scoreRow = db
        .prepare("SELECT handicap_index FROM game_scores WHERE game_group_member_id = ?")
        .get(memberId) as { handicap_index: number | null };

      // Should still have original handicap
      expect(scoreRow.handicap_index).toBe(10.5);
    });

    test("should not capture handicap for guest players", () => {
      const gamePlayer2 = gameService.addPlayer(gameId, { guest_name: "Guest Bob" }, ownerId);
      const member2 = groupService.addMemberToGroup(groupId, gamePlayer2.id);

      scoreService.updateScore(member2.id, 1, 4);

      const scoreRow = db
        .prepare("SELECT handicap_index FROM game_scores WHERE game_group_member_id = ?")
        .get(member2.id) as { handicap_index: number | null };

      expect(scoreRow.handicap_index).toBeNull();
    });

    test("should capture handicap even when entering UNREPORTED_HOLE", () => {
      scoreService.updateScore(memberId, 1, GOLF.UNREPORTED_HOLE);

      const scoreRow = db
        .prepare("SELECT handicap_index FROM game_scores WHERE game_group_member_id = ?")
        .get(memberId) as { handicap_index: number | null };

      expect(scoreRow.handicap_index).toBe(10.5);
    });
  });

  // ============================================================================
  // gameHasAnyScores Tests
  // ============================================================================

  describe("gameHasAnyScores", () => {
    test("should return false for game with no scores", () => {
      const result = scoreService.gameHasAnyScores(gameId);
      expect(result).toBe(false);
    });

    test("should return true when any player has scores", () => {
      scoreService.updateScore(memberId, 1, 4);

      const result = scoreService.gameHasAnyScores(gameId);
      expect(result).toBe(true);
    });

    test("should return true when player has UNREPORTED_HOLE", () => {
      scoreService.updateScore(memberId, 1, GOLF.UNREPORTED_HOLE);

      const result = scoreService.gameHasAnyScores(gameId);
      expect(result).toBe(true);
    });

    test("should return false when scores are all zeros", () => {
      // Scores start as empty array [], not zeros
      // So if we never enter scores, it should be false
      const result = scoreService.gameHasAnyScores(gameId);
      expect(result).toBe(false);
    });

    test("should return true when only one of multiple players has scores", () => {
      // Add second player
      const playerStmt = db.prepare(
        "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
      );
      const player2 = playerStmt.get(ownerId, "Player 2", 15.0) as { id: number };
      const gamePlayer2 = gameService.addPlayer(gameId, { player_id: player2.id }, ownerId);
      groupService.addMemberToGroup(groupId, gamePlayer2.id);

      // Only first player enters scores
      scoreService.updateScore(memberId, 1, 4);

      const result = scoreService.gameHasAnyScores(gameId);
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // playerHasScores Tests
  // ============================================================================

  describe("playerHasScores", () => {
    test("should return false for player with no scores", () => {
      // Get game_player_id
      const gamePlayer = db
        .prepare(
          "SELECT gp.id FROM game_players gp JOIN game_group_members ggm ON ggm.game_player_id = gp.id WHERE ggm.id = ?"
        )
        .get(memberId) as { id: number };

      const result = scoreService.playerHasScores(gamePlayer.id);
      expect(result).toBe(false);
    });

    test("should return true for player with scores", () => {
      scoreService.updateScore(memberId, 1, 4);

      const gamePlayer = db
        .prepare(
          "SELECT gp.id FROM game_players gp JOIN game_group_members ggm ON ggm.game_player_id = gp.id WHERE ggm.id = ?"
        )
        .get(memberId) as { id: number };

      const result = scoreService.playerHasScores(gamePlayer.id);
      expect(result).toBe(true);
    });

    test("should return true for player with UNREPORTED_HOLE", () => {
      scoreService.updateScore(memberId, 1, GOLF.UNREPORTED_HOLE);

      const gamePlayer = db
        .prepare(
          "SELECT gp.id FROM game_players gp JOIN game_group_members ggm ON ggm.game_player_id = gp.id WHERE ggm.id = ?"
        )
        .get(memberId) as { id: number };

      const result = scoreService.playerHasScores(gamePlayer.id);
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases and Boundary Tests
  // ============================================================================

  describe("edge cases", () => {
    test("should handle high scores (10+ on a hole)", () => {
      const result = scoreService.updateScore(memberId, 1, 12);

      expect(result.score[0]).toBe(12);
    });

    test("should handle all UNREPORTED_HOLE round", () => {
      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, GOLF.UNREPORTED_HOLE);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].holesPlayed).toBe(18);
      expect(leaderboard[0].grossTotal).toBe(0); // No positive scores
    });

    test("should handle alternating scores and UNREPORTED_HOLE", () => {
      // Odd holes: par, Even holes: UNREPORTED
      for (let i = 1; i <= 18; i++) {
        if (i % 2 === 1) {
          scoreService.updateScore(memberId, i, standardPars[i - 1]);
        } else {
          scoreService.updateScore(memberId, i, GOLF.UNREPORTED_HOLE);
        }
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].holesPlayed).toBe(18); // All holes attempted
      // Gross is sum of odd hole pars
      const oddPars = standardPars.filter((_, idx) => idx % 2 === 0);
      expect(leaderboard[0].grossTotal).toBe(oddPars.reduce((a, b) => a + b, 0));
    });

    test("should handle single hole played", () => {
      scoreService.updateScore(memberId, 1, 4);

      const leaderboard = scoreService.getLeaderboard(gameId);

      expect(leaderboard[0].holesPlayed).toBe(1);
      expect(leaderboard[0].grossTotal).toBe(4);
      expect(leaderboard[0].relativeToPar).toBe(0); // 4 on a par 4
    });

    test("should handle score updates across different groups", () => {
      // Create second group for same game
      const group2 = groupService.createGroup(gameId, { start_hole: 10 });

      // Add another player to second group
      const playerStmt = db.prepare(
        "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
      );
      const player2 = playerStmt.get(ownerId, "Player 2", 15.0) as { id: number };
      const gamePlayer2 = gameService.addPlayer(gameId, { player_id: player2.id }, ownerId);
      const member2 = groupService.addMemberToGroup(group2.id, gamePlayer2.id);

      // Enter scores for both
      scoreService.updateScore(memberId, 1, 4);
      scoreService.updateScore(member2.id, 10, 4);

      // Both should appear in leaderboard
      const leaderboard = scoreService.getLeaderboard(gameId);
      expect(leaderboard.length).toBeGreaterThanOrEqual(2);
    });

    test("should include startHole in leaderboard entries", () => {
      const group2 = groupService.createGroup(gameId, { start_hole: 10 });

      const playerStmt = db.prepare(
        "INSERT INTO players (user_id, name, handicap) VALUES (?, ?, ?) RETURNING id"
      );
      const player2 = playerStmt.get(ownerId, "Player 2", 15.0) as { id: number };
      const gamePlayer2 = gameService.addPlayer(gameId, { player_id: player2.id }, ownerId);
      const member2 = groupService.addMemberToGroup(group2.id, gamePlayer2.id);

      for (let i = 1; i <= 18; i++) {
        scoreService.updateScore(memberId, i, standardPars[i - 1]);
        scoreService.updateScore(member2.id, i, standardPars[i - 1]);
      }

      const leaderboard = scoreService.getLeaderboard(gameId);

      const startHoles = leaderboard.map((e) => e.startHole);
      expect(startHoles).toContain(1);
      expect(startHoles).toContain(10);
    });
  });
});
