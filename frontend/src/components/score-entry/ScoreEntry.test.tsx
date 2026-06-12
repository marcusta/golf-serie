import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoreEntry } from "./ScoreEntry";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const course = {
  id: "course-1",
  name: "Test Course",
  holes: Array.from({ length: 18 }, (_, index) => ({
    number: index + 1,
    par: 4,
  })),
};

const teeTimeGroup = {
  id: "group-1",
  players: [
    {
      participantId: "participant-1",
      participantName: "Player One",
      playerNames: "Player One",
      scores: Array(18).fill(0),
    },
  ],
};

function renderScoreEntry({
  currentHole,
  activeHoles,
}: {
  currentHole: number;
  activeHoles?: number[];
}) {
  const onHoleChange = vi.fn();
  render(
    <ScoreEntry
      teeTimeGroup={teeTimeGroup}
      course={course}
      onScoreUpdate={vi.fn()}
      onComplete={vi.fn()}
      currentHole={currentHole}
      onHoleChange={onHoleChange}
      activeHoles={activeHoles}
    />
  );

  return {
    carousel: screen.getByTestId("score-entry-hole-header"),
    track: screen.getByTestId("hole-carousel-track"),
    scoreColumns: screen.getAllByTestId("player-score-columns")[0],
    onHoleChange,
  };
}

function slowSwipeLeft(element: HTMLElement) {
  fireEvent.pointerDown(element, {
    clientX: 200,
    clientY: 20,
    pointerId: 1,
  });
  vi.advanceTimersByTime(250);
  fireEvent.pointerMove(element, {
    clientX: 130,
    clientY: 20,
    pointerId: 1,
  });
  vi.advanceTimersByTime(250);
  fireEvent.pointerUp(element, {
    clientX: 130,
    clientY: 20,
    pointerId: 1,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ScoreEntry animated hole changes", () => {
  it("crossfades the score columns after the header settles", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { carousel, track, scoreColumns, onHoleChange } = renderScoreEntry({
      currentHole: 1,
    });

    slowSwipeLeft(carousel);

    expect(scoreColumns.className).toContain("opacity-0");
    expect(onHoleChange).not.toHaveBeenCalled();

    fireEvent.transitionEnd(track, { propertyName: "transform" });
    expect(onHoleChange).toHaveBeenCalledWith(2);

    act(() => vi.advanceTimersByTime(60));
    expect(scoreColumns.className).toContain("opacity-100");
  });

  it("wraps from hole 18 to 10 for a back-nine round", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { carousel, track, onHoleChange } = renderScoreEntry({
      currentHole: 18,
      activeHoles: [10, 11, 12, 13, 14, 15, 16, 17, 18],
    });

    slowSwipeLeft(carousel);
    fireEvent.transitionEnd(track, { propertyName: "transform" });

    expect(onHoleChange).toHaveBeenCalledWith(10);
  });
});
