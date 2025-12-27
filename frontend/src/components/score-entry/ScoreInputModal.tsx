import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Settings } from "lucide-react";
import type { PlayerNetScoringData } from "./FullScorecardModal";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
  playerNames?: string | null;
}

interface ScoreInputModalProps {
  visible: boolean;
  players: PlayerScore[];
  currentPlayerIndex: number;
  currentHole: number;
  holePar: number;
  netScoringData?: Map<string, PlayerNetScoringData>;
  onScoreSelect: (score: number) => void;
  onPlayerSelect: (playerIndex: number) => void;
  onClose: () => void;
  onSpecialAction: (action: "more" | "clear" | "unreported") => void;
  isTourCompetition?: boolean;
}

export function ScoreInputModal({
  visible,
  players,
  currentPlayerIndex,
  currentHole,
  holePar,
  netScoringData,
  onScoreSelect,
  onPlayerSelect,
  onClose,
  onSpecialAction,
  isTourCompetition = false,
}: ScoreInputModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle animation states
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for fade out animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Function to get scoring terminology based on score relative to par
  const getScoreLabel = (score: number): string => {
    if (score === 1) return "HIO";

    const difference = score - holePar;

    if (difference <= -4) return "OTHER";
    if (difference === -3) return "ALBA";
    if (difference === -2) return "EAGLE";
    if (difference === -1) return "BIRDIE";
    if (difference === 0) return "PAR";
    if (difference === 1) return "BOGEY";
    if (difference === 2) return "DOUBLE";
    if (difference === 3) return "TRIPLE";
    if (difference === 4) return "QUAD";
    if (difference >= 5) return "OTHER";

    return "";
  };

  const isPar = (score: number): boolean => {
    return score === holePar;
  };

  const abbreviateName = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[1];

      if (name.length <= 14) return name;
      if (firstName.length <= 8) return `${firstName} ${lastName.charAt(0)}.`;
      if (lastName.length <= 8) return `${firstName.charAt(0)}. ${lastName}`;
      return `${firstName.charAt(0)}. ${lastName.charAt(0)}.`;
    }
    return name.length > 12 ? `${name.substring(0, 11)}...` : name;
  };

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col transition-opacity duration-300 ease-in-out",
        isAnimating ? "opacity-100" : "opacity-0"
      )}
      style={{ backgroundColor: "#121212" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="text-center">
          <span className="text-lg font-bold text-white font-display">
            HÅL {currentHole} | PAR {holePar}
          </span>
        </div>
        <button className="p-2 rounded-full hover:bg-white/10 transition-colors touch-manipulation opacity-50">
          <Settings className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Player List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {players.map((player, index) => {
          const isSelected = index === currentPlayerIndex;
          const currentScore = player.scores[currentHole - 1] ?? 0;
          const playerNetData = netScoringData?.get(player.participantId);
          const strokesOnThisHole = playerNetData?.handicapStrokesPerHole?.[currentHole - 1] ?? 0;
          const courseHandicap = playerNetData?.courseHandicap;
          const netScore = currentScore > 0 ? currentScore - strokesOnThisHole : null;

          const displayName = player.playerNames
            ? abbreviateName(player.playerNames)
            : isTourCompetition
            ? "Player"
            : `${player.participantName} ${player.participantType || ""}`.trim();

          return (
            <button
              key={player.participantId}
              onClick={() => onPlayerSelect(index)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-4 rounded-lg mb-2 transition-all duration-200 touch-manipulation",
                isSelected
                  ? "bg-turf/90"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              <div className="flex flex-col items-start">
                <span className={cn(
                  "text-base font-semibold font-display",
                  isSelected ? "text-white" : "text-white/90"
                )}>
                  {displayName}
                </span>
                {courseHandicap !== undefined && (
                  <span className={cn(
                    "text-sm font-primary",
                    isSelected ? "text-white/80" : "text-white/50"
                  )}>
                    HCP {courseHandicap}
                  </span>
                )}
              </div>

              {/* Score circle */}
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center relative",
                  isSelected ? "bg-white" : "bg-turf"
                )}
              >
                <span className={cn(
                  "text-xl font-bold font-display",
                  isSelected ? "text-turf" : "text-white"
                )}>
                  {currentScore > 0
                    ? currentScore
                    : currentScore === -1
                    ? "−"
                    : netScoringData && strokesOnThisHole > 0
                    ? `-${strokesOnThisHole}`
                    : "0"}
                </span>
                {/* Net score subscript - only show when score entered */}
                {netScoringData && currentScore > 0 && (
                  <span className={cn(
                    "absolute bottom-1.5 right-2 text-sm font-medium font-primary",
                    isSelected ? "text-charcoal/60" : "text-white/60"
                  )}>
                    {netScore}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Keyboard */}
      <div className="p-2 pb-6 bg-[#1c1c1e]">
        {/* Row 1: 1, 2, 3 */}
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onMouseDown={(e) => {
                e.preventDefault();
                onScoreSelect(num);
              }}
              className={cn(
                "h-14 rounded-xl text-xl font-bold transition-colors touch-manipulation flex flex-col items-center justify-center font-primary",
                isPar(num)
                  ? "bg-turf text-white"
                  : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
              )}
            >
              <span>{num}</span>
              <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-75">
                {getScoreLabel(num)}
              </span>
            </button>
          ))}
        </div>

        {/* Row 2: 4, 5, 6 */}
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          {[4, 5, 6].map((num) => (
            <button
              key={num}
              onMouseDown={(e) => {
                e.preventDefault();
                onScoreSelect(num);
              }}
              className={cn(
                "h-14 rounded-xl text-xl font-bold transition-colors touch-manipulation flex flex-col items-center justify-center font-primary",
                isPar(num)
                  ? "bg-turf text-white"
                  : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
              )}
            >
              <span>{num}</span>
              <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-75">
                {getScoreLabel(num)}
              </span>
            </button>
          ))}
        </div>

        {/* Row 3: 7, 8, 9 */}
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          {[7, 8, 9].map((num) => (
            <button
              key={num}
              onMouseDown={(e) => {
                e.preventDefault();
                onScoreSelect(num);
              }}
              className={cn(
                "h-14 rounded-xl text-xl font-bold transition-colors touch-manipulation flex flex-col items-center justify-center font-primary",
                isPar(num)
                  ? "bg-turf text-white"
                  : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
              )}
            >
              <span>{num}</span>
              <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-75">
                {getScoreLabel(num)}
              </span>
            </button>
          ))}
        </div>

        {/* Row 4: 10+, -, 0/Clear */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onSpecialAction("more");
            }}
            className="h-14 bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] rounded-xl text-xl font-bold transition-colors touch-manipulation flex flex-col items-center justify-center font-primary"
          >
            <span>10+</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-75">
              {getScoreLabel(10)}
            </span>
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onSpecialAction("clear");
            }}
            className="h-14 bg-[#2a2a2a] text-flag hover:bg-[#3a3a3a] rounded-xl text-xl font-bold transition-colors touch-manipulation flex flex-col items-center justify-center font-primary"
          >
            <span>−</span>
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onSpecialAction("unreported");
            }}
            className="h-14 bg-[#2a2a2a] text-white/50 hover:bg-[#3a3a3a] rounded-xl text-xl font-bold transition-colors touch-manipulation flex flex-col items-center justify-center font-primary"
          >
            <span>0</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none opacity-75">
              CLEAR
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
