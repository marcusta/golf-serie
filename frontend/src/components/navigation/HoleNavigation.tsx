import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

const SWIPE_THRESHOLD = 50;

interface HoleNavigationProps {
  currentHole: number;
  holePar: number;
  holeHcp?: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  className?: string;
}

export function HoleNavigation({
  currentHole,
  holePar,
  holeHcp,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  className,
}: HoleNavigationProps) {
  const pointerStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const clearPointer = (
    element: HTMLDivElement,
    pointerId: number,
    releaseCapture: boolean
  ) => {
    if (pointerStart.current?.pointerId !== pointerId) {
      return false;
    }

    pointerStart.current = null;

    if (releaseCapture && element.releasePointerCapture) {
      try {
        element.releasePointerCapture(pointerId);
      } catch {
        // Capture may already have been released by the browser.
      }
    }

    return true;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      pointerStart.current ||
      (event.target instanceof Element && event.target.closest("button"))
    ) {
      return;
    }

    pointerStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;

    if (
      !start ||
      !clearPointer(event.currentTarget, event.pointerId, true)
    ) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD ||
      Math.abs(deltaX) <= Math.abs(deltaY)
    ) {
      return;
    }

    if (deltaX < 0 && canGoNext) {
      onNext();
    } else if (deltaX > 0 && canGoPrevious) {
      onPrevious();
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    clearPointer(event.currentTarget, event.pointerId, true);
  };

  const handleLostPointerCapture = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    clearPointer(event.currentTarget, event.pointerId, false);
  };

  return (
    <div
      data-testid="hole-navigation"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      className={cn(
        "bg-coral text-charcoal px-4 py-2 touch-pan-y",
        "shadow-lg border-t border-coral/20",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <button
          aria-label="Previous hole"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={cn(
            "p-2 rounded-lg transition-all duration-200 touch-manipulation",
            canGoPrevious
              ? "hover:bg-coral/20 active:bg-coral/30"
              : "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-8 text-center">
          <div className="text-center">
            <span className="text-label-sm font-medium text-charcoal">Par</span>
            <div className="text-display-sm font-bold text-charcoal font-display">
              {holePar}
            </div>
          </div>

          <div className="text-center">
            <span className="text-label-sm font-medium text-charcoal">
              Holes
            </span>
            <div className="text-display-sm font-bold text-charcoal font-display">
              {currentHole}
            </div>
          </div>

          {holeHcp !== undefined && (
            <div className="text-center">
              <span className="text-label-sm font-medium text-charcoal">
                SI
              </span>
              <div className="text-display-sm font-bold text-charcoal font-display">
                {holeHcp}
              </div>
            </div>
          )}
        </div>

        <button
          aria-label="Next hole"
          onClick={onNext}
          disabled={!canGoNext}
          className={cn(
            "p-2 rounded-lg transition-all duration-200 touch-manipulation",
            canGoNext
              ? "hover:bg-coral/20 active:bg-coral/30"
              : "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
