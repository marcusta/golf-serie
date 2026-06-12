import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEventHandler, TransitionEventHandler } from "react";
import {
  calculateCarouselSteps,
  getHoleAtOffset,
} from "./holeCarousel";

// Matches the score columns below: w-12 (48px) cells with a 16px gap,
// so cell centers sit exactly above the previous-score and current-score columns.
const ITEM_WIDTH = 64;
const CELL_WIDTH = 48;
const RIGHT_PADDING = 16;
const WINDOW_RADIUS = 6;
const SNAP_TRANSITION = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)";

interface Hole {
  number: number;
  par: number;
}

interface HoleHeaderCarouselProps {
  holes: Hole[];
  activeHoles: number[];
  currentHole: number;
  onHoleChange: (hole: number) => void;
  onSettlingChange?: (isSettling: boolean) => void;
}

interface PointerState {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  isHorizontal: boolean;
}

export function HoleHeaderCarousel({
  holes,
  activeHoles,
  currentHole,
  onHoleChange,
  onSettlingChange,
}: HoleHeaderCarouselProps) {
  const pointer = useRef<PointerState | null>(null);
  const settlingSteps = useRef<number | null>(null);
  const settleTimeout = useRef<number | null>(null);
  const onSettlingChangeRef = useRef(onSettlingChange);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const holePars = useMemo(
    () => new Map(holes.map((hole) => [hole.number, hole.par])),
    [holes]
  );
  const carouselItems = useMemo(
    () =>
      Array.from({ length: WINDOW_RADIUS * 2 + 1 }, (_, index) => {
        const offset = index - WINDOW_RADIUS;
        return {
          offset,
          hole: getHoleAtOffset(activeHoles, currentHole, offset),
        };
      }),
    [activeHoles, currentHole]
  );

  const clearPointer = (element: HTMLDivElement, pointerId: number) => {
    if (pointer.current?.pointerId !== pointerId) return false;
    pointer.current = null;
    try {
      element.releasePointerCapture?.(pointerId);
    } catch {
      // The browser may have already released capture.
    }
    return true;
  };

  useEffect(
    () => () => {
      if (settleTimeout.current !== null) {
        window.clearTimeout(settleTimeout.current);
      }
    },
    []
  );

  useEffect(() => {
    onSettlingChangeRef.current = onSettlingChange;
  }, [onSettlingChange]);

  useEffect(() => {
    if (settlingSteps.current === null) return;

    settlingSteps.current = null;
    if (settleTimeout.current !== null) {
      window.clearTimeout(settleTimeout.current);
      settleTimeout.current = null;
    }
    setIsAnimating(false);
    setDragOffset(0);
    onSettlingChangeRef.current?.(false);
  }, [currentHole]);

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (pointer.current || isAnimating || activeHoles.length <= 1) return;

    pointer.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: Date.now(),
      velocity: 0,
      isHorizontal: false,
    };
    setDragOffset(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const current = pointer.current;
    if (!current || current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    if (!current.isHorizontal) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) return;
      if (Math.abs(deltaX) <= 8) return;
      current.isHorizontal = true;
      setIsDragging(true);
    }

    const now = Date.now();
    const elapsed = Math.max(1, now - current.lastTime);
    current.velocity = (event.clientX - current.lastX) / elapsed;
    current.lastX = event.clientX;
    current.lastTime = now;
    setDragOffset(deltaX);
  };

  const finishSettlement = () => {
    const completedSteps = settlingSteps.current;
    if (completedSteps === null) return;

    settlingSteps.current = null;
    if (settleTimeout.current !== null) {
      window.clearTimeout(settleTimeout.current);
      settleTimeout.current = null;
    }
    setIsAnimating(false);
    setDragOffset(0);

    if (completedSteps !== 0) {
      onHoleChange(
        getHoleAtOffset(activeHoles, currentHole, completedSteps)
      );
    } else {
      onSettlingChangeRef.current?.(false);
    }
  };

  const settle = (steps: number) => {
    setIsAnimating(true);
    settlingSteps.current = steps;
    setDragOffset(-steps * ITEM_WIDTH);
    if (steps !== 0) onSettlingChange?.(true);
    settleTimeout.current = window.setTimeout(finishSettlement, 400);
  };

  const handlePointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    const current = pointer.current;
    if (!current || current.pointerId !== event.pointerId) return;

    const dragDistance = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    const releaseElapsed = Math.max(1, Date.now() - current.lastTime);
    const releaseVelocity = (event.clientX - current.lastX) / releaseElapsed;
    const velocity =
      Math.abs(releaseVelocity) > 0.01
        ? releaseVelocity
        : releaseElapsed <= 80
          ? current.velocity
          : 0;
    const wasHorizontal = current.isHorizontal;
    clearPointer(event.currentTarget, event.pointerId);
    setIsDragging(false);

    if (!wasHorizontal || Math.abs(dragDistance) <= Math.abs(deltaY)) {
      setDragOffset(0);
      return;
    }

    settle(
      calculateCarouselSteps({
        dragDistance,
        velocity,
        itemWidth: ITEM_WIDTH,
      })
    );
  };

  const handlePointerCancel: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!clearPointer(event.currentTarget, event.pointerId)) return;
    setIsDragging(false);
    settle(0);
  };

  const handleTransitionEnd: TransitionEventHandler<HTMLDivElement> = (
    event
  ) => {
    if (event.propertyName && event.propertyName !== "transform") return;
    finishSettlement();
  };

  return (
    <div
      data-testid="score-entry-hole-header"
      aria-label="Hole selector"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="relative h-[60px] overflow-hidden bg-rough bg-opacity-30 border-b border-soft-grey border-l-4 border-l-transparent touch-pan-y select-none"
    >
      {/* Clip viewport covering only the previous + current hole slots,
          so holes outside the two score columns are never visible. */}
      <div
        className="absolute inset-y-0 overflow-hidden"
        style={{
          width: ITEM_WIDTH * 2,
          right: RIGHT_PADDING - (ITEM_WIDTH - CELL_WIDTH) / 2,
        }}
      >
        <div
          data-testid="hole-carousel-track"
          onTransitionEnd={handleTransitionEnd}
          className="absolute inset-y-0 flex items-center will-change-transform"
          style={{
            right: -WINDOW_RADIUS * ITEM_WIDTH,
            transform: `translate3d(${dragOffset}px, 0, 0)`,
            transition: isAnimating ? SNAP_TRANSITION : "none",
          }}
        >
          {carouselItems.map(({ offset, hole }) => {
            // At rest, match the static header: current hole plus the
            // previous hole (which the score column below only shows on hole 2+).
            const restingHidden =
              offset === -1 && currentHole <= 1 && !isDragging && !isAnimating;
            return (
              <div
                key={`${offset}-${hole}`}
                className="flex-shrink-0"
                style={{
                  width: ITEM_WIDTH,
                  opacity: offset === 0 ? 1 : restingHidden ? 0 : 0.55,
                  transform: `scale(${offset === 0 ? 1 : 0.88})`,
                  transition: "opacity 180ms ease, transform 180ms ease",
                }}
              >
                <div className="w-12 mx-auto text-center">
                  <div className="text-lg font-bold text-fairway font-display">
                    {hole}
                  </div>
                  <div className="text-xs text-fairway/70 font-primary">
                    Par {holePars.get(hole) ?? 4}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
