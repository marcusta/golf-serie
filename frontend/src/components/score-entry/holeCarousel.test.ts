import { describe, expect, it } from "vitest";
import {
  calculateCarouselSteps,
  getHoleAtOffset,
  wrapCarouselIndex,
} from "./holeCarousel";

describe("hole carousel math", () => {
  it("wraps indexes in both directions", () => {
    expect(wrapCarouselIndex(18, 18)).toBe(0);
    expect(wrapCarouselIndex(-1, 18)).toBe(17);
  });

  it("wraps through a front-nine active-hole list", () => {
    const activeHoles = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(getHoleAtOffset(activeHoles, 9, 1)).toBe(1);
    expect(getHoleAtOffset(activeHoles, 1, -1)).toBe(9);
  });

  it("wraps through a back-nine active-hole list", () => {
    const activeHoles = [10, 11, 12, 13, 14, 15, 16, 17, 18];
    expect(getHoleAtOffset(activeHoles, 18, 1)).toBe(10);
    expect(getHoleAtOffset(activeHoles, 10, -1)).toBe(18);
  });

  it("projects velocity into travel across several holes", () => {
    expect(
      calculateCarouselSteps({
        dragDistance: -80,
        velocity: -0.8,
        itemWidth: 72,
      })
    ).toBe(3);
  });

  it("limits momentum travel to four holes", () => {
    expect(
      calculateCarouselSteps({
        dragDistance: -500,
        velocity: -5,
        itemWidth: 72,
      })
    ).toBe(4);
  });

  it("returns zero for a small slow movement", () => {
    expect(
      calculateCarouselSteps({
        dragDistance: -10,
        velocity: -0.01,
        itemWidth: 72,
      })
    ).toBe(0);
  });
});
