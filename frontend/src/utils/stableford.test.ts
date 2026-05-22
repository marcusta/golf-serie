import { describe, it, expect } from "vitest";
import {
  calculateStablefordPointsForHole,
  calculateStablefordDelta,
} from "./stableford";

describe("calculateStablefordPointsForHole", () => {
  it("returns null for unscored hole", () => {
    expect(calculateStablefordPointsForHole(0, 4)).toBeNull();
  });

  it("returns 0 for invalid score (-1)", () => {
    expect(calculateStablefordPointsForHole(-1, 4)).toBe(0);
  });

  it("computes gross points (2 + par - score)", () => {
    expect(calculateStablefordPointsForHole(4, 4)).toBe(2);
    expect(calculateStablefordPointsForHole(3, 4)).toBe(3);
    expect(calculateStablefordPointsForHole(6, 4)).toBe(0);
  });

  it("applies handicap strokes", () => {
    expect(calculateStablefordPointsForHole(5, 4, 1)).toBe(2);
  });
});

describe("calculateStablefordDelta", () => {
  it("returns null when no holes played", () => {
    expect(calculateStablefordDelta(0, 0)).toBeNull();
  });

  it("returns null when netPoints undefined", () => {
    expect(calculateStablefordDelta(undefined, 4)).toBeNull();
  });

  it("returns negative when better than expected", () => {
    expect(calculateStablefordDelta(10, 4)).toBe(-2);
  });

  it("returns positive when worse than expected", () => {
    expect(calculateStablefordDelta(7, 4)).toBe(1);
  });

  it("returns 0 when matching expectation", () => {
    expect(calculateStablefordDelta(8, 4)).toBe(0);
  });
});
