import { describe, expect, test } from "bun:test";
import {
  assignPositionsWithTies,
  sortAndRank,
  assignPositionsMap,
} from "../src/utils/ranking";

describe("Ranking Utilities", () => {
  describe("assignPositionsWithTies", () => {
    test("handles empty array", () => {
      const items: { value: number; position?: number }[] = [];
      const result = assignPositionsWithTies(
        items,
        (item) => item.value,
        (item, pos) => (item.position = pos)
      );
      expect(result).toEqual([]);
      expect(result).toBe(items); // Returns same array reference
    });

    test("handles single item", () => {
      const items = [{ value: 100, position: 0 }];
      assignPositionsWithTies(
        items,
        (item) => item.value,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1);
    });

    test("assigns positions to multiple items with no ties", () => {
      const items = [
        { value: 100, position: 0 },
        { value: 80, position: 0 },
        { value: 60, position: 0 },
      ];
      assignPositionsWithTies(
        items,
        (item) => item.value,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(2);
      expect(items[2].position).toBe(3);
    });

    test("handles ties at the start", () => {
      const items = [
        { points: 100, position: 0 },
        { points: 100, position: 0 },
        { points: 80, position: 0 },
      ];
      assignPositionsWithTies(
        items,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(1);
      expect(items[2].position).toBe(3); // Skips position 2
    });

    test("handles ties in the middle", () => {
      const items = [
        { points: 100, position: 0 },
        { points: 80, position: 0 },
        { points: 80, position: 0 },
        { points: 60, position: 0 },
      ];
      assignPositionsWithTies(
        items,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(2);
      expect(items[2].position).toBe(2);
      expect(items[3].position).toBe(4); // Skips position 3
    });

    test("handles ties at the end", () => {
      const items = [
        { points: 100, position: 0 },
        { points: 80, position: 0 },
        { points: 60, position: 0 },
        { points: 60, position: 0 },
      ];
      assignPositionsWithTies(
        items,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(2);
      expect(items[2].position).toBe(3);
      expect(items[3].position).toBe(3);
    });

    test("handles all items tied", () => {
      const items = [
        { points: 100, position: 0 },
        { points: 100, position: 0 },
        { points: 100, position: 0 },
        { points: 100, position: 0 },
      ];
      assignPositionsWithTies(
        items,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(1);
      expect(items[2].position).toBe(1);
      expect(items[3].position).toBe(1);
    });

    test("handles multiple tie groups", () => {
      const items = [
        { points: 100, position: 0 },
        { points: 100, position: 0 },
        { points: 80, position: 0 },
        { points: 80, position: 0 },
        { points: 60, position: 0 },
      ];
      assignPositionsWithTies(
        items,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(1);
      expect(items[2].position).toBe(3);
      expect(items[3].position).toBe(3);
      expect(items[4].position).toBe(5);
    });

    test("works with string values", () => {
      const items = [
        { name: "Alice", position: 0 },
        { name: "Alice", position: 0 },
        { name: "Bob", position: 0 },
        { name: "Charlie", position: 0 },
      ];
      assignPositionsWithTies(
        items,
        (item) => item.name,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(1);
      expect(items[2].position).toBe(3);
      expect(items[3].position).toBe(4);
    });

    test("works with composite string values for multi-criteria ties", () => {
      const items = [
        { points: 100, gamesPlayed: 5, position: 0 },
        { points: 100, gamesPlayed: 5, position: 0 },
        { points: 100, gamesPlayed: 3, position: 0 },
        { points: 80, gamesPlayed: 5, position: 0 },
      ];
      assignPositionsWithTies(
        items,
        (item) => `${item.points}|${item.gamesPlayed}`,
        (item, pos) => (item.position = pos)
      );
      expect(items[0].position).toBe(1); // 100|5
      expect(items[1].position).toBe(1); // 100|5 (tied)
      expect(items[2].position).toBe(3); // 100|3 (different)
      expect(items[3].position).toBe(4); // 80|5
    });

    test("returns the same array reference", () => {
      const items = [
        { value: 100, position: 0 },
        { value: 80, position: 0 },
      ];
      const result = assignPositionsWithTies(
        items,
        (item) => item.value,
        (item, pos) => (item.position = pos)
      );
      expect(result).toBe(items);
    });
  });

  describe("sortAndRank", () => {
    test("sorts and assigns positions in one operation", () => {
      const items = [
        { points: 60, position: 0 },
        { points: 100, position: 0 },
        { points: 80, position: 0 },
      ];
      const result = sortAndRank(
        items,
        (a, b) => b.points - a.points, // Sort descending
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      // Should be sorted in descending order
      expect(result[0].points).toBe(100);
      expect(result[1].points).toBe(80);
      expect(result[2].points).toBe(60);
      // Positions should be assigned
      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(2);
      expect(result[2].position).toBe(3);
    });

    test("does not mutate original array", () => {
      const original = [
        { points: 60, position: 0 },
        { points: 100, position: 0 },
        { points: 80, position: 0 },
      ];
      const result = sortAndRank(
        original,
        (a, b) => b.points - a.points,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      // Original array should maintain order
      expect(original[0].points).toBe(60);
      expect(original[1].points).toBe(100);
      expect(original[2].points).toBe(80);
      // Result should be different array
      expect(result).not.toBe(original);
      expect(result[0].points).toBe(100);
    });

    test("handles ties correctly after sorting", () => {
      const items = [
        { points: 80, position: 0 },
        { points: 100, position: 0 },
        { points: 100, position: 0 },
        { points: 60, position: 0 },
      ];
      const result = sortAndRank(
        items,
        (a, b) => b.points - a.points,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(3);
      expect(result[3].position).toBe(4);
    });

    test("handles empty array", () => {
      const items: { points: number; position: number }[] = [];
      const result = sortAndRank(
        items,
        (a, b) => b.points - a.points,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      expect(result).toEqual([]);
    });

    test("handles single item", () => {
      const items = [{ points: 100, position: 0 }];
      const result = sortAndRank(
        items,
        (a, b) => b.points - a.points,
        (item) => item.points,
        (item, pos) => (item.position = pos)
      );
      expect(result).toHaveLength(1);
      expect(result[0].points).toBe(100);
      expect(result[0].position).toBe(1);
    });

    test("works with ascending sort order", () => {
      const items = [
        { score: 80, position: 0 },
        { score: 72, position: 0 },
        { score: 85, position: 0 },
      ];
      const result = sortAndRank(
        items,
        (a, b) => a.score - b.score, // Sort ascending (golf: lower is better)
        (item) => item.score,
        (item, pos) => (item.position = pos)
      );
      expect(result[0].score).toBe(72);
      expect(result[1].score).toBe(80);
      expect(result[2].score).toBe(85);
      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(2);
      expect(result[2].position).toBe(3);
    });
  });

  describe("assignPositionsMap", () => {
    test("returns new array with position property", () => {
      const items = [{ points: 100 }, { points: 80 }, { points: 60 }];
      const result = assignPositionsMap(items, (item) => item.points);
      expect(result[0]).toEqual({ points: 100, position: 1 });
      expect(result[1]).toEqual({ points: 80, position: 2 });
      expect(result[2]).toEqual({ points: 60, position: 3 });
    });

    test("does not mutate original items", () => {
      const items = [{ points: 100 }, { points: 80 }];
      const result = assignPositionsMap(items, (item) => item.points);
      expect(items[0]).not.toHaveProperty("position");
      expect(result[0]).toHaveProperty("position");
    });

    test("handles empty array", () => {
      const items: { points: number }[] = [];
      const result = assignPositionsMap(items, (item) => item.points);
      expect(result).toEqual([]);
    });

    test("handles ties correctly", () => {
      const items = [{ points: 100 }, { points: 100 }, { points: 80 }];
      const result = assignPositionsMap(items, (item) => item.points);
      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(3);
    });

    test("works with string values", () => {
      const items = [{ grade: "A" }, { grade: "A" }, { grade: "B" }];
      const result = assignPositionsMap(items, (item) => item.grade);
      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(3);
    });

    test("preserves all original properties", () => {
      const items = [
        { name: "Alice", points: 100, team: "A" },
        { name: "Bob", points: 80, team: "B" },
      ];
      const result = assignPositionsMap(items, (item) => item.points);
      expect(result[0]).toEqual({ name: "Alice", points: 100, team: "A", position: 1 });
      expect(result[1]).toEqual({ name: "Bob", points: 80, team: "B", position: 2 });
    });
  });

  describe("Real-world golf scenarios", () => {
    test("leaderboard with stroke play ties", () => {
      interface LeaderboardEntry {
        playerName: string;
        relativeToPar: number;
        position: number;
      }
      const leaderboard: LeaderboardEntry[] = [
        { playerName: "Tiger", relativeToPar: -5, position: 0 },
        { playerName: "Rory", relativeToPar: -3, position: 0 },
        { playerName: "Jon", relativeToPar: -3, position: 0 },
        { playerName: "Scottie", relativeToPar: -1, position: 0 },
        { playerName: "Xander", relativeToPar: 0, position: 0 },
      ];
      assignPositionsWithTies(
        leaderboard,
        (entry) => entry.relativeToPar,
        (entry, pos) => (entry.position = pos)
      );
      expect(leaderboard[0].position).toBe(1); // Tiger at -5
      expect(leaderboard[1].position).toBe(2); // Rory at -3
      expect(leaderboard[2].position).toBe(2); // Jon at -3 (tied)
      expect(leaderboard[3].position).toBe(4); // Scottie at -1 (skips 3)
      expect(leaderboard[4].position).toBe(5); // Xander at E
    });

    test("tour standings with points", () => {
      interface TourStanding {
        teamName: string;
        totalPoints: number;
        competitionsPlayed: number;
        position: number;
      }
      const standings: TourStanding[] = [
        { teamName: "Eagles", totalPoints: 150, competitionsPlayed: 5, position: 0 },
        { teamName: "Birdies", totalPoints: 150, competitionsPlayed: 5, position: 0 },
        { teamName: "Pars", totalPoints: 120, competitionsPlayed: 4, position: 0 },
        { teamName: "Bogeys", totalPoints: 100, competitionsPlayed: 5, position: 0 },
      ];
      // Use composite key for tie-breaking: points then competitions played
      assignPositionsWithTies(
        standings,
        (s) => `${s.totalPoints}|${s.competitionsPlayed}`,
        (s, pos) => (s.position = pos)
      );
      expect(standings[0].position).toBe(1); // Eagles (150 pts, 5 comps)
      expect(standings[1].position).toBe(1); // Birdies (150 pts, 5 comps) - tied
      expect(standings[2].position).toBe(3); // Pars (120 pts, 4 comps)
      expect(standings[3].position).toBe(4); // Bogeys (100 pts, 5 comps)
    });

    test("sortAndRank for unsorted leaderboard", () => {
      interface Entry {
        player: string;
        gross: number;
        position: number;
      }
      const unsorted: Entry[] = [
        { player: "Alice", gross: 85, position: 0 },
        { player: "Bob", gross: 78, position: 0 },
        { player: "Carol", gross: 82, position: 0 },
        { player: "David", gross: 78, position: 0 },
      ];
      const leaderboard = sortAndRank(
        unsorted,
        (a, b) => a.gross - b.gross, // Lower is better in golf
        (entry) => entry.gross,
        (entry, pos) => (entry.position = pos)
      );
      expect(leaderboard[0]).toMatchObject({ player: "Bob", gross: 78, position: 1 });
      expect(leaderboard[1]).toMatchObject({ player: "David", gross: 78, position: 1 });
      expect(leaderboard[2]).toMatchObject({ player: "Carol", gross: 82, position: 3 });
      expect(leaderboard[3]).toMatchObject({ player: "Alice", gross: 85, position: 4 });
    });
  });
});
