import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HoleNavigation } from "./HoleNavigation";

interface RenderNavigationOptions {
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

function renderNavigation({
  canGoPrevious = true,
  canGoNext = true,
}: RenderNavigationOptions = {}) {
  const onPrevious = vi.fn();
  const onNext = vi.fn();

  render(
    <HoleNavigation
      currentHole={9}
      holePar={4}
      holeHcp={7}
      onPrevious={onPrevious}
      onNext={onNext}
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext}
    />
  );

  const navigation = screen.getByTestId("hole-navigation");
  const [previousButton, nextButton] = navigation.querySelectorAll("button");

  return {
    navigation,
    previousButton,
    nextButton,
    onPrevious,
    onNext,
  };
}

function swipe(
  element: HTMLElement,
  start: { x: number; y: number },
  end: { x: number; y: number },
  pointerId = 1
) {
  fireEvent.pointerDown(element, {
    clientX: start.x,
    clientY: start.y,
    pointerId,
  });
  fireEvent.pointerUp(element, {
    clientX: end.x,
    clientY: end.y,
    pointerId,
  });
}

function stubPointerCapture(element: HTMLElement) {
  const setPointerCapture = vi.fn();
  const releasePointerCapture = vi.fn();

  Object.defineProperties(element, {
    setPointerCapture: { configurable: true, value: setPointerCapture },
    releasePointerCapture: {
      configurable: true,
      value: releasePointerCapture,
    },
  });

  return { setPointerCapture, releasePointerCapture };
}

describe("HoleNavigation swipe gestures", () => {
  it("labels the arrow buttons for assistive technology", () => {
    renderNavigation();

    expect(
      screen.getByRole("button", { name: "Previous hole" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next hole" })).toBeTruthy();
  });

  it("moves to the next hole on a left swipe", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    swipe(navigation, { x: 120, y: 20 }, { x: 60, y: 20 });

    expect(onNext).toHaveBeenCalledOnce();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("moves to the previous hole on a right swipe", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    swipe(navigation, { x: 60, y: 20 }, { x: 120, y: 20 });

    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("ignores horizontal gestures shorter than 50 pixels", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    swipe(navigation, { x: 100, y: 20 }, { x: 51, y: 20 });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("accepts a horizontal gesture of exactly 50 pixels", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    swipe(navigation, { x: 100, y: 20 }, { x: 50, y: 20 });

    expect(onNext).toHaveBeenCalledOnce();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("ignores predominantly vertical gestures", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    swipe(navigation, { x: 100, y: 20 }, { x: 40, y: 100 });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("does not move previous when the previous boundary is disabled", () => {
    const { navigation, onNext, onPrevious } = renderNavigation({
      canGoPrevious: false,
    });

    swipe(navigation, { x: 60, y: 20 }, { x: 120, y: 20 });

    expect(onPrevious).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("does not move next when the next boundary is disabled", () => {
    const { navigation, onNext, onPrevious } = renderNavigation({
      canGoNext: false,
    });

    swipe(navigation, { x: 120, y: 20 }, { x: 60, y: 20 });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("clears the gesture when its pointer is cancelled", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    fireEvent.pointerDown(navigation, {
      clientX: 120,
      clientY: 20,
      pointerId: 7,
    });
    fireEvent.pointerCancel(navigation, { pointerId: 7 });
    fireEvent.pointerUp(navigation, {
      clientX: 60,
      clientY: 20,
      pointerId: 7,
    });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("does not let a different pointer complete the gesture", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    fireEvent.pointerDown(navigation, {
      clientX: 120,
      clientY: 20,
      pointerId: 7,
    });
    fireEvent.pointerUp(navigation, {
      clientX: 60,
      clientY: 20,
      pointerId: 8,
    });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("does not let a different pointer cancel the gesture", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    fireEvent.pointerDown(navigation, {
      clientX: 120,
      clientY: 20,
      pointerId: 7,
    });
    fireEvent.pointerCancel(navigation, { pointerId: 8 });
    fireEvent.pointerUp(navigation, {
      clientX: 60,
      clientY: 20,
      pointerId: 7,
    });

    expect(onNext).toHaveBeenCalledOnce();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("does not treat an arrow-origin gesture as a swipe", () => {
    const { navigation, nextButton, onNext, onPrevious } = renderNavigation();

    fireEvent.pointerDown(nextButton, {
      clientX: 120,
      clientY: 20,
      pointerId: 3,
    });
    fireEvent.pointerUp(navigation, {
      clientX: 60,
      clientY: 20,
      pointerId: 3,
    });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();

    fireEvent.click(nextButton);

    expect(onNext).toHaveBeenCalledOnce();
  });

  it("captures and releases the initiating pointer when supported", () => {
    const { navigation } = renderNavigation();
    const { setPointerCapture, releasePointerCapture } =
      stubPointerCapture(navigation);

    swipe(navigation, { x: 120, y: 20 }, { x: 60, y: 20 }, 11);

    expect(setPointerCapture).toHaveBeenCalledWith(11);
    expect(releasePointerCapture).toHaveBeenCalledWith(11);
  });

  it("clears the gesture when pointer capture is lost", () => {
    const { navigation, onNext, onPrevious } = renderNavigation();

    fireEvent.pointerDown(navigation, {
      clientX: 120,
      clientY: 20,
      pointerId: 9,
    });
    fireEvent.lostPointerCapture(navigation, { pointerId: 9 });
    fireEvent.pointerUp(navigation, {
      clientX: 60,
      clientY: 20,
      pointerId: 9,
    });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });
});
