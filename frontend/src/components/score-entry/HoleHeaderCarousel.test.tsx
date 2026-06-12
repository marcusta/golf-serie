import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HoleHeaderCarousel } from "./HoleHeaderCarousel";

const holes = Array.from({ length: 18 }, (_, index) => ({
  number: index + 1,
  par: 4,
}));

function renderCarousel({
  currentHole = 1,
  activeHoles = holes.map((hole) => hole.number),
} = {}) {
  const onHoleChange = vi.fn();
  const onSettlingChange = vi.fn();

  render(
    <HoleHeaderCarousel
      holes={holes}
      activeHoles={activeHoles}
      currentHole={currentHole}
      onHoleChange={onHoleChange}
      onSettlingChange={onSettlingChange}
    />
  );

  return {
    carousel: screen.getByTestId("score-entry-hole-header"),
    track: screen.getByTestId("hole-carousel-track"),
    onHoleChange,
    onSettlingChange,
  };
}

function pointer(
  element: HTMLElement,
  type: "pointerDown" | "pointerMove" | "pointerUp",
  x: number,
  y = 20
) {
  fireEvent[type](element, { clientX: x, clientY: y, pointerId: 1 });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("HoleHeaderCarousel", () => {
  it("moves the track with the pointer", () => {
    const { carousel, track } = renderCarousel();

    pointer(carousel, "pointerDown", 200);
    pointer(carousel, "pointerMove", 135);

    expect(track.style.transform).toContain("-65px");
    expect(track.style.transition).toBe("none");
  });

  it("softly snaps and changes hole only after settling", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { carousel, track, onHoleChange, onSettlingChange } =
      renderCarousel();

    pointer(carousel, "pointerDown", 200);
    vi.advanceTimersByTime(300);
    pointer(carousel, "pointerMove", 135);
    vi.advanceTimersByTime(300);
    pointer(carousel, "pointerUp", 135);

    expect(track.style.transition).toContain("cubic-bezier");
    expect(onSettlingChange).toHaveBeenCalledWith(true);
    expect(onHoleChange).not.toHaveBeenCalled();

    fireEvent.transitionEnd(track, { propertyName: "transform" });

    expect(onHoleChange).toHaveBeenCalledWith(2);
  });

  it("completes the snap when the browser emits no transitionend", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { carousel, onHoleChange } = renderCarousel();

    pointer(carousel, "pointerDown", 200);
    vi.advanceTimersByTime(300);
    pointer(carousel, "pointerMove", 128);
    vi.advanceTimersByTime(300);
    pointer(carousel, "pointerUp", 128);

    expect(onHoleChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(400));
    expect(onHoleChange).toHaveBeenCalledWith(2);
  });

  it("uses swipe velocity to advance several holes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { carousel, track, onHoleChange } = renderCarousel();

    pointer(carousel, "pointerDown", 240);
    vi.advanceTimersByTime(20);
    pointer(carousel, "pointerMove", 170);
    vi.advanceTimersByTime(20);
    pointer(carousel, "pointerUp", 140);
    fireEvent.transitionEnd(track, { propertyName: "transform" });

    expect(onHoleChange).toHaveBeenCalledWith(5);
  });

  it("wraps forward through the supplied back-nine holes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { carousel, track, onHoleChange } = renderCarousel({
      currentHole: 18,
      activeHoles: [10, 11, 12, 13, 14, 15, 16, 17, 18],
    });

    pointer(carousel, "pointerDown", 200);
    vi.advanceTimersByTime(200);
    pointer(carousel, "pointerMove", 130);
    vi.advanceTimersByTime(200);
    pointer(carousel, "pointerUp", 130);
    fireEvent.transitionEnd(track, { propertyName: "transform" });

    expect(onHoleChange).toHaveBeenCalledWith(10);
  });

  it("ignores predominantly vertical gestures", () => {
    const { carousel, track, onHoleChange } = renderCarousel();

    pointer(carousel, "pointerDown", 200, 20);
    pointer(carousel, "pointerMove", 170, 90);
    pointer(carousel, "pointerUp", 170, 90);
    fireEvent.transitionEnd(track, { propertyName: "transform" });

    expect(onHoleChange).not.toHaveBeenCalled();
  });
});
