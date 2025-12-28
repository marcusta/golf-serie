import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Scorecard } from "@/components/scorecard/Scorecard";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
  playerNames?: string | null;
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

// Net scoring data per player for tour competitions
export interface PlayerNetScoringData {
  participantId: string;
  strokeIndex?: number[];
  handicapStrokesPerHole?: number[];
  courseHandicap?: number;
  handicapIndex?: number;
}

interface FullScorecardModalProps {
  visible: boolean;
  teeTimeGroup: TeeTimeGroup;
  course: Course;
  currentHole: number;
  onClose: () => void;
  onLockRound?: () => void;
  /** Net scoring data per player (keyed by participantId) */
  netScoringData?: Map<string, PlayerNetScoringData>;
}

export function FullScorecardModal({
  visible,
  teeTimeGroup,
  course,
  currentHole,
  onClose,
  onLockRound,
  netScoringData,
}: FullScorecardModalProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-scorecard z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-soft-grey">
          <h2 className="text-lg font-semibold font-display text-fairway">
            Full Scorecard
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-rough/30 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-charcoal" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-2 py-4 space-y-4">
            {teeTimeGroup.players.map((player) => {
              // Get net scoring data for this player if available
              const playerNetData = netScoringData?.get(player.participantId);

              return (
                <Scorecard
                  key={player.participantId}
                  participant={{
                    id: player.participantId,
                    name: player.playerNames || player.participantName,
                    type: player.participantType,
                    isMultiPlayer: player.isMultiPlayer,
                    scores: player.scores,
                  }}
                  course={course}
                  currentHole={currentHole}
                  strokeIndex={playerNetData?.strokeIndex}
                  handicapStrokesPerHole={playerNetData?.handicapStrokesPerHole}
                  courseHandicap={playerNetData?.courseHandicap}
                  handicapIndex={playerNetData?.handicapIndex}
                />
              );
            })}
          </div>
        </div>

        {/* Footer - only show if lock round is available */}
        {onLockRound && (
          <div className="p-4 border-t border-soft-grey bg-scorecard">
            <button
              onClick={() => setShowConfirmation(true)}
              className="w-full bg-coral text-scorecard py-3 px-4 rounded-xl font-medium hover:bg-orange-600 transition-colors font-primary"
            >
              Finalize and Lock Round
            </button>
          </div>
        )}

        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-scorecard rounded-2xl shadow-xl max-w-sm w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-coral bg-opacity-20 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-coral" />
                </div>
                <h2 className="text-xl font-bold text-center font-display text-fairway mb-2">
                  Finalize Round
                </h2>
                <p className="text-center text-charcoal mb-6 font-primary">
                  Are you sure you want to finalize and lock this round? This
                  action cannot be undone and will prevent any further score
                  changes.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 bg-soft-grey bg-opacity-30 text-charcoal py-3 px-4 rounded-xl font-medium hover:bg-soft-grey hover:bg-opacity-50 transition-colors font-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      onLockRound?.();
                    }}
                    className="flex-1 bg-coral text-scorecard py-3 px-4 rounded-xl font-medium hover:bg-orange-600 transition-colors font-primary"
                  >
                    Finalize & Lock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
