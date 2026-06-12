import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HoleNavigation } from "./HoleNavigation";

function renderNavigation() {
  const onPrevious = vi.fn();
  const onNext = vi.fn();
  render(
    <HoleNavigation
      currentHole={5}
      holePar={4}
      onPrevious={onPrevious}
      onNext={onNext}
      canGoPrevious
      canGoNext
    />
  );
  return {
    footer: screen.getByTestId("hole-navigation"),
    onPrevious,
    onNext,
  };
}

describe("HoleNavigation footer", () => {
  it("keeps the arrow buttons accessible and functional", () => {
    const { onPrevious, onNext } = renderNavigation();

    fireEvent.click(screen.getByRole("button", { name: "Previous hole" }));
    fireEvent.click(screen.getByRole("button", { name: "Next hole" }));

    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("does not navigate when the footer is dragged", () => {
    const { footer, onPrevious, onNext } = renderNavigation();

    fireEvent.pointerDown(footer, {
      clientX: 180,
      clientY: 20,
      pointerId: 1,
    });
    fireEvent.pointerUp(footer, {
      clientX: 80,
      clientY: 20,
      pointerId: 1,
    });

    expect(onPrevious).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });
});
