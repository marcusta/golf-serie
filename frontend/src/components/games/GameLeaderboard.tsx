import { useState } from "react";
import { formatToPar, getToParColor } from "../../utils/scoreCalculations";
import type { GameLeaderboardEntry } from "../../types/games";

interface GameLeaderboardProps {
  entries: GameLeaderboardEntry[] | undefined;
  isLoading: boolean;
  scoringMode: "gross" | "net" | "both";
  onPlayerClick: (playerId: number) => void;
}

export function GameLeaderboard({
  entries,
  isLoading,
  scoringMode,
  onPlayerClick,
}: GameLeaderboardProps) {
  // Sort mode for when scoring_mode is 'both'
  const [sortBy, setSortBy] = useState<"gross" | "net">(
    scoringMode === "net" || scoringMode === "both" ? "net" : "gross"
  );

  // Check if we should show net scores
  const showNetScores = scoringMode === "net" || scoringMode === "both";

  // Helper function to determine player status
  const getPlayerStatus = (entry: GameLeaderboardEntry) => {
    const hasStarted = entry.holesPlayed > 0;
    if (!hasStarted) return "NOT_STARTED";
    if (entry.isLocked) return "FINISHED";
    return "IN_PROGRESS";
  };

  // Helper function to get display progress
  const getDisplayProgress = (entry: GameLeaderboardEntry) => {
    const status = getPlayerStatus(entry);
    if (status === "NOT_STARTED") return "NS";
    if (status === "FINISHED") return "F";
    return entry.holesPlayed.toString();
  };

  // Sort leaderboard
  const sortedLeaderboard = entries
    ? [...entries].sort((a, b) => {
        // Check if players have started
        const aStarted = a.holesPlayed > 0;
        const bStarted = b.holesPlayed > 0;

        // Players with scores first, then not started
        if (aStarted && !bStarted) return -1;
        if (!aStarted && bStarted) return 1;

        // Both started - sort by score
        if (aStarted && bStarted) {
          // Use net score for sorting if sorting by net
          if (sortBy === "net") {
            const aNet = a.netRelativeToPar ?? a.relativeToPar;
            const bNet = b.netRelativeToPar ?? b.relativeToPar;
            return aNet - bNet;
          }
          return a.relativeToPar - b.relativeToPar;
        }

        // Both not started - maintain order
        return 0;
      })
    : [];

  // Helper function to get position styling
  const getPositionStyling = (index: number, holesPlayed: number) => {
    if (holesPlayed === 0) return "border-gray-300 text-gray-500";
    switch (index) {
      case 0:
        return "border-yellow-400 text-yellow-400"; // Gold
      case 1:
        return "border-gray-400 text-gray-400"; // Silver
      case 2:
        return "border-orange-400 text-orange-400"; // Bronze
      default:
        return "border-gray-300 text-gray-500";
    }
  };

  // Helper function to get row background for table
  const getRowBackground = (index: number, holesPlayed: number) => {
    if (holesPlayed === 0) return "bg-scorecard hover:bg-gray-50";
    switch (index) {
      case 0:
        return "bg-yellow-50 hover:bg-yellow-100"; // Gold
      case 1:
        return "bg-gray-50 hover:bg-gray-100"; // Silver
      case 2:
        return "bg-orange-50 hover:bg-orange-100"; // Bronze
      default:
        return "bg-scorecard hover:bg-gray-50";
    }
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Leaderboard
          </h2>
          <div className="text-xs text-turf font-primary mt-1">
            Live scoring
          </div>
        </div>
      </div>

      {/* Gross/Net toggle when scoring mode is 'both' */}
      {scoringMode === "both" && (
        <div className="flex items-center justify-end gap-2 pb-2">
          <div className="flex rounded-lg overflow-hidden border border-soft-grey">
            <button
              onClick={() => setSortBy("gross")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                sortBy === "gross"
                  ? "bg-turf text-scorecard"
                  : "bg-scorecard text-charcoal hover:bg-rough/30"
              }`}
            >
              Gross
            </button>
            <button
              onClick={() => setSortBy("net")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-soft-grey ${
                sortBy === "net"
                  ? "bg-turf text-scorecard"
                  : "bg-scorecard text-charcoal hover:bg-rough/30"
              }`}
            >
              Net
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-4 text-charcoal font-primary">
          Loading leaderboard...
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
          No scores reported yet.
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden">
            {/* Header Row */}
            <div className="flex items-center px-4 py-2 border-b-2 border-soft-grey bg-gray-50 text-xs text-gray-500 font-medium">
              <div className="w-7 mr-2">#</div>
              <div className="flex-1 min-w-0">Player</div>
              <div className={`flex items-center ${showNetScores ? 'gap-1' : ''}`}>
                <div className="w-10 text-center">Gross</div>
                {showNetScores && <div className="w-10 text-center">Net</div>}
                <div className="w-8 text-center">Thru</div>
              </div>
            </div>

            {sortedLeaderboard.map((entry, index) => {
              const isLeader = index === 0 && entry.holesPlayed > 0;
              const status = getPlayerStatus(entry);
              const displayProgress = getDisplayProgress(entry);

              return (
                <button
                  key={entry.gamePlayerId}
                  onClick={() => onPlayerClick(entry.gamePlayerId)}
                  className={`w-full text-left px-4 py-2.5 border-b border-soft-grey/50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                    isLeader ? "border-l-4 border-l-coral bg-coral/5" : ""
                  }`}
                >
                  <div className="flex items-center">
                    {/* Position Number */}
                    <div
                      className={`w-7 text-base font-bold mr-2 ${getPositionStyling(
                        index,
                        entry.holesPlayed
                      )}`}
                    >
                      {entry.holesPlayed === 0 ? "-" : index + 1}
                    </div>

                    {/* Player Name - truncate long names */}
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="text-sm font-semibold font-display truncate text-charcoal">
                        {entry.memberName}
                      </h3>
                    </div>

                    {/* Score Section - Gross/Net/Thru with fixed widths */}
                    <div className={`flex items-center ${showNetScores ? 'gap-1' : ''}`}>
                      {status === "NOT_STARTED" ? (
                        <>
                          <div className="w-10 text-center text-sm text-gray-500">
                            -
                          </div>
                          {showNetScores && (
                            <div className="w-10 text-center text-sm text-gray-500">
                              -
                            </div>
                          )}
                          <div className="w-8 text-center text-xs text-gray-500">
                            -
                          </div>
                        </>

                      ) : (
                        <>
                          {/* Gross Score */}
                          <div
                            className={`w-10 text-center text-lg font-bold ${getToParColor(
                              entry.relativeToPar
                            )}`}
                          >
                            {formatToPar(entry.relativeToPar)}
                          </div>

                          {/* Net Score */}
                          {showNetScores && (
                            <div
                              className={`w-10 text-center text-lg font-bold ${
                                entry.netRelativeToPar === undefined
                                  ? "text-gray-400"
                                  : getToParColor(entry.netRelativeToPar)
                              }`}
                            >
                              {entry.netRelativeToPar === undefined
                                ? "-"
                                : formatToPar(entry.netRelativeToPar)}
                            </div>
                          )}

                          {/* Thru (Hole progress) */}
                          <div className="w-8 text-center text-base font-semibold text-gray-600">
                            {displayProgress}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="bg-scorecard rounded-lg border border-soft-grey overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-soft-grey">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      Pos
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      Player
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      Hole & Score
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-charcoal font-display"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaderboard.map((entry, index) => {
                    const status = getPlayerStatus(entry);
                    const displayProgress = getDisplayProgress(entry);

                    return (
                      <tr
                        key={entry.gamePlayerId}
                        className={`border-b border-soft-grey last:border-b-0 transition-colors duration-200 ${getRowBackground(
                          index,
                          entry.holesPlayed
                        )}`}
                      >
                        <td className="py-4 px-4">
                          <div
                            className={`text-sm font-bold ${getPositionStyling(
                              index,
                              entry.holesPlayed
                            )}`}
                          >
                            {entry.holesPlayed === 0 ? "-" : index + 1}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-body-md font-semibold font-display text-charcoal">
                            {entry.memberName}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {status === "NOT_STARTED" ? (
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">
                                Not Started
                              </div>
                              <div className="text-xs text-gray-400">
                                Starting hole {entry.startHole}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-4">
                              {/* Hole Number */}
                              <div className="text-center">
                                <div className="text-xs text-gray-500">
                                  Hole
                                </div>
                                <div className="text-xl font-bold text-charcoal font-display">
                                  {displayProgress}
                                </div>
                              </div>

                              {/* Gross Score */}
                              {status === "FINISHED" ? (
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    {showNetScores ? "Gross" : "Total"}
                                  </div>
                                  <div className="text-xl font-bold text-charcoal font-display">
                                    {entry.grossTotal}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    {showNetScores ? "Gross" : "To Par"}
                                  </div>
                                  <div
                                    className={`text-xl font-bold font-display ${getToParColor(
                                      entry.relativeToPar
                                    )}`}
                                  >
                                    {formatToPar(entry.relativeToPar)}
                                  </div>
                                </div>
                              )}

                              {/* Net Score - only show when scoring mode includes net */}
                              {showNetScores && (
                                status === "FINISHED" ? (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">Net</div>
                                    <div className="text-xl font-bold text-charcoal font-display">
                                      {entry.netTotal === undefined
                                        ? "-"
                                        : entry.netTotal}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">Net</div>
                                    <div
                                      className={`text-xl font-bold font-display ${
                                        entry.netRelativeToPar === undefined
                                          ? "text-gray-500"
                                          : getToParColor(entry.netRelativeToPar)
                                      }`}
                                    >
                                      {entry.netRelativeToPar === undefined
                                        ? "-"
                                        : formatToPar(entry.netRelativeToPar)}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => onPlayerClick(entry.gamePlayerId)}
                            className="bg-turf text-scorecard px-3 py-2 rounded-md text-sm font-medium hover:bg-fairway transition-colors duration-200 font-primary"
                          >
                            View Card
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
