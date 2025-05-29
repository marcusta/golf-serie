import { useState } from "react";
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

interface TeeTimeGroup {
  id: string;
  players: PlayerScore[];
}

interface Course {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface FullScorecardModalProps {
  visible: boolean;
  teeTimeGroup: TeeTimeGroup;
  course: Course;
  currentHole: number;
  onClose: () => void;
  onContinueEntry: (hole: number) => void;
}

export function FullScorecardModal({
  visible,
  teeTimeGroup,
  course,
  currentHole,
  onClose,
  onContinueEntry,
}: FullScorecardModalProps) {
  const [currentView, setCurrentView] = useState<"front" | "back">("front");

  if (!visible) return null;

  const frontNine = course.holes.slice(0, 9);
  const backNine = course.holes.slice(9, 18);
  const displayHoles = currentView === "front" ? frontNine : backNine;

  const calculateTotal = (
    playerScores: number[],
    holes: { number: number }[]
  ) => {
    return holes.reduce((total, hole) => {
      const score = playerScores[hole.number - 1];
      return total + (score || 0);
    }, 0);
  };

  const getPlayerTotals = (player: PlayerScore) => {
    const frontTotal = calculateTotal(player.scores, frontNine);
    const backTotal = calculateTotal(player.scores, backNine);
    const totalScore = frontTotal + backTotal;

    const frontPar = frontNine.reduce((sum, hole) => sum + hole.par, 0);
    const backPar = backNine.reduce((sum, hole) => sum + hole.par, 0);
    const totalPar = frontPar + backPar;

    return {
      frontTotal,
      backTotal,
      totalScore,
      toPar: totalScore - totalPar,
      frontToPar: frontTotal - frontPar,
      backToPar: backTotal - backPar,
    };
  };

  const formatToPar = (toPar: number) => {
    if (toPar === 0) return "E";
    return toPar > 0 ? `+${toPar}` : `${toPar}`;
  };

  const abbreviateName = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1].charAt(0)}.`;
    }
    return name.length > 12 ? `${name.substring(0, 12)}...` : name;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div
        className={cn(
          "bg-white w-full max-h-[90vh] rounded-t-2xl transition-transform duration-300 ease-in-out",
          "transform translate-y-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">Full Scorecard</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-180px)]">
          {/* Nine selector */}
          <div className="flex bg-gray-50 m-4 rounded-lg p-1">
            <button
              onClick={() => setCurrentView("front")}
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                currentView === "front"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Front 9
            </button>
            <button
              onClick={() => setCurrentView("back")}
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                currentView === "back"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Back 9
            </button>
          </div>

          {/* Scorecard table */}
          <div className="px-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Header row */}
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-11 gap-0 text-xs font-medium text-gray-700">
                  <div className="p-2 border-r border-gray-200">Player</div>
                  {displayHoles.map((hole) => (
                    <div
                      key={hole.number}
                      className={cn(
                        "p-2 text-center border-r border-gray-200",
                        hole.number === currentHole &&
                          "bg-blue-100 text-blue-900"
                      )}
                    >
                      {hole.number}
                    </div>
                  ))}
                  <div className="p-2 text-center">Total</div>
                </div>
              </div>

              {/* Par row */}
              <div className="border-b border-gray-200 bg-gray-25">
                <div className="grid grid-cols-11 gap-0 text-xs font-medium">
                  <div className="p-2 border-r border-gray-200 text-gray-600">
                    Par
                  </div>
                  {displayHoles.map((hole) => (
                    <div
                      key={hole.number}
                      className="p-2 text-center border-r border-gray-200 text-gray-600"
                    >
                      {hole.par}
                    </div>
                  ))}
                  <div className="p-2 text-center text-gray-600">
                    {displayHoles.reduce((sum, hole) => sum + hole.par, 0)}
                  </div>
                </div>
              </div>

              {/* Player rows */}
              {teeTimeGroup.players.map((player) => {
                const totals = getPlayerTotals(player);
                const displayTotal =
                  currentView === "front"
                    ? totals.frontTotal
                    : totals.backTotal;
                const displayToPar =
                  currentView === "front"
                    ? totals.frontToPar
                    : totals.backToPar;

                return (
                  <div
                    key={player.participantId}
                    className="border-b border-gray-200 last:border-b-0"
                  >
                    <div className="grid grid-cols-11 gap-0 text-sm">
                      <div className="p-2 border-r border-gray-200 font-medium text-gray-900 text-xs flex items-center gap-1">
                        <span>{abbreviateName(player.participantName)}</span>
                        {player.isMultiPlayer && (
                          <span className="text-blue-500 text-[10px]">👥</span>
                        )}
                      </div>
                      {displayHoles.map((hole) => {
                        const score = player.scores[hole.number - 1];
                        const par = hole.par;
                        let scoreColor = "text-gray-900";

                        if (score) {
                          if (score === 1)
                            scoreColor = "text-purple-600 font-bold";
                          // Hole in one
                          else if (score < par - 1)
                            scoreColor = "text-purple-600 font-bold";
                          // Eagle or better
                          else if (score === par - 1)
                            scoreColor = "text-blue-600 font-bold"; // Birdie
                          else if (score === par)
                            scoreColor = "text-gray-900"; // Par
                          else if (score === par + 1)
                            scoreColor = "text-orange-600"; // Bogey
                          else if (score >= par + 2)
                            scoreColor = "text-red-600"; // Double bogey or worse
                        }

                        return (
                          <div
                            key={hole.number}
                            className={cn(
                              "p-2 text-center border-r border-gray-200",
                              hole.number === currentHole && "bg-blue-50",
                              scoreColor
                            )}
                          >
                            {score || "-"}
                          </div>
                        );
                      })}
                      <div className="p-2 text-center font-medium">
                        <div>{displayTotal || "-"}</div>
                        {displayTotal > 0 && (
                          <div className="text-xs text-gray-500">
                            {formatToPar(displayToPar)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall totals */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Overall Totals
              </h3>
              <div className="space-y-2">
                {teeTimeGroup.players.map((player) => {
                  const totals = getPlayerTotals(player);
                  return (
                    <div
                      key={player.participantId}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="font-medium text-gray-900 flex items-center gap-1">
                        <span>{abbreviateName(player.participantName)}</span>
                        {player.isMultiPlayer && (
                          <span className="text-blue-500 text-xs">👥</span>
                        )}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          F: {totals.frontTotal || "-"} | B:{" "}
                          {totals.backTotal || "-"}
                        </span>
                        <span className="font-bold text-gray-900">
                          {totals.totalScore || "-"}
                          {totals.totalScore > 0 && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({formatToPar(totals.toPar)})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onContinueEntry(currentHole)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue Entry on Hole {currentHole}
          </button>
        </div>
      </div>
    </div>
  );
}
