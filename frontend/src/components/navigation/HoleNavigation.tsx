import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  return (
    <div
      className={cn(
        "bg-coral text-charcoal px-4 py-2",
        "shadow-lg border-t border-coral/20",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <button
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
