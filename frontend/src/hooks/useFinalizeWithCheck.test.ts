import { describe, expect, it } from "vitest";
import { buildFinalizeDescription, describeUnfinished } from "./useFinalizeWithCheck";

const base = "This will calculate and store the final standings and points.";

describe("describeUnfinished", () => {
  it("explains a full but unlocked scorecard", () => {
    expect(
      describeUnfinished({
        participant_id: 1,
        player_name: "Leo Jigerström",
        holes_played: 9,
        expected_holes: 9,
        is_locked: false,
      })
    ).toBe("Leo Jigerström (all 9 holes scored, scorecard not locked)");
  });

  it("shows holes scored for an incomplete round", () => {
    expect(
      describeUnfinished({
        participant_id: 2,
        player_name: "Ola Rådeström",
        holes_played: 4,
        expected_holes: 18,
        is_locked: false,
      })
    ).toBe("Ola Rådeström (4 of 18 holes scored)");
  });
});

describe("buildFinalizeDescription", () => {
  it("returns the base text when all scorecards are finished", () => {
    expect(buildFinalizeDescription(base, [])).toBe(base);
  });

  it("lists unfinished players with a warning", () => {
    const text = buildFinalizeDescription(base, [
      { participant_id: 1, player_name: "Leo", holes_played: 9, expected_holes: 9, is_locked: false },
      { participant_id: 2, player_name: "Johan", holes_played: 5, expected_holes: 9, is_locked: false },
    ]);
    expect(text).toContain(base);
    expect(text).toContain("Warning: 2 players will get no result or points");
    expect(text).toContain("• Leo (all 9 holes scored, scorecard not locked)");
    expect(text).toContain("• Johan (5 of 9 holes scored)");
  });

  it("uses singular wording for one player", () => {
    const text = buildFinalizeDescription(base, [
      { participant_id: 1, player_name: "Leo", holes_played: 9, expected_holes: 9, is_locked: false },
    ]);
    expect(text).toContain("Warning: 1 player will get");
  });

  it("notes when the check itself failed", () => {
    expect(buildFinalizeDescription(base, null)).toContain(
      "Could not check whether all scorecards are finished."
    );
  });
});
