import { describe, expect, test } from "bun:test";
import { resolveTeeForCourse } from "./resolveTeeForCourse";

const yellowHome = { id: 10, color: "yellow" };
const whiteHome = { id: 11, color: "white" };
const yellowAway = { id: 20, color: "Yellow" };
const redAway = { id: 21, color: "red" };

describe("resolveTeeForCourse", () => {
  test("prefers the exact tee when it belongs to the course", () => {
    const resolved = resolveTeeForCourse({
      tees: [yellowHome, whiteHome],
      preferredTeeId: 10,
      preferredColor: "white",
    });
    expect(resolved).toBe(10);
  });

  test("matches tee color case-insensitively when the exact tee is missing", () => {
    const resolved = resolveTeeForCourse({
      tees: [yellowAway, redAway],
      preferredTeeId: 10,
      preferredColor: "yellow",
    });
    expect(resolved).toBe(20);
  });

  test("returns null when neither exact tee nor color exists", () => {
    const resolved = resolveTeeForCourse({
      tees: [redAway],
      preferredTeeId: 10,
      preferredColor: "yellow",
    });
    expect(resolved).toBeNull();
  });

  test("matches by color alone when no preferred tee is given", () => {
    const resolved = resolveTeeForCourse({
      tees: [yellowAway, redAway],
      preferredColor: "red",
    });
    expect(resolved).toBe(21);
  });
});
