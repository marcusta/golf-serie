import { describe, expect, it } from "vitest";
import { tourSettingsSchema } from "./TourSettingsTab";

describe("tourSettingsSchema counting_competitions", () => {
  const base = {
    name: "Test Tour",
    visibility: "public" as const,
    enrollment_mode: "closed" as const,
    scoring_mode: "gross" as const,
    scoring_format: "stroke_play" as const,
    default_course_id: null,
    default_tee_id: null,
  };

  it("accepts empty string to clear the cap", () => {
    const result = tourSettingsSchema.safeParse({
      ...base,
      counting_competitions: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts positive integers", () => {
    const result = tourSettingsSchema.safeParse({
      ...base,
      counting_competitions: "10",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero, negative, and non-integer values", () => {
    for (const value of ["0", "-1", "1.5", "abc"]) {
      const result = tourSettingsSchema.safeParse({
        ...base,
        counting_competitions: value,
      });
      expect(result.success).toBe(false);
    }
  });
});

function parseCountingCompetitions(value: string): number | null {
  return value.trim() === "" ? null : Number.parseInt(value, 10);
}

describe("counting_competitions submit mapping", () => {
  it("maps empty input to null", () => {
    expect(parseCountingCompetitions("")).toBeNull();
    expect(parseCountingCompetitions("   ")).toBeNull();
  });

  it("maps numeric input to integer", () => {
    expect(parseCountingCompetitions("10")).toBe(10);
  });
});
