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
        "bg-yellow-400 text-gray-900 px-4 py-3 flex items-center justify-between",
        "shadow-lg border-t border-yellow-500",
        className
      )}
    >
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className={cn(
          "p-2 rounded-lg transition-all duration-200 touch-manipulation",
          canGoPrevious
            ? "hover:bg-yellow-300 active:bg-yellow-500"
            : "opacity-50 cursor-not-allowed"
        )}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-6 text-center">
        <div className="flex flex-col">
          <span className="text-xs font-medium opacity-80">Par</span>
          <span className="text-lg font-bold">{holePar}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium opacity-80">Hole</span>
          <span className="text-xl font-bold">{currentHole}</span>
        </div>

        {holeHcp !== undefined && (
          <div className="flex flex-col">
            <span className="text-xs font-medium opacity-80">HCP</span>
            <span className="text-lg font-bold">{holeHcp}</span>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={cn(
          "p-2 rounded-lg transition-all duration-200 touch-manipulation",
          canGoNext
            ? "hover:bg-yellow-300 active:bg-yellow-500"
            : "opacity-50 cursor-not-allowed"
        )}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
