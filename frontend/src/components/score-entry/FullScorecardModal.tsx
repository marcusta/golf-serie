import { useState } from "react";
import { X, ChevronLeft, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface FullScorecardModalProps {
  visible: boolean;
  teeTimeGroup: TeeTimeGroup;
  course: Course;
  currentHole: number;
  onClose: () => void;
  onContinueEntry: (hole?: number) => void;
  onLockRound?: () => void;
}

export function FullScorecardModal({
  visible,
  teeTimeGroup,
  course,
  currentHole,
  onClose,
  onContinueEntry,
  onLockRound,
}: FullScorecardModalProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div
        className={cn(
          "bg-scorecard w-full max-h-[90vh] rounded-t-2xl transition-transform duration-300 ease-in-out border-t border-soft-grey",
          "transform translate-y-0"
        )}
      >
        {/* Header with TapScore Styling */}
        <div className="flex items-center justify-between p-4 border-b border-soft-grey">
          <button
            onClick={onClose}
            className="p-2 hover:bg-rough hover:bg-opacity-30 rounded-xl transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-fairway" />
          </button>
          <h2 className="text-lg font-semibold font-display text-fairway">
            Full Scorecard
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-flag hover:bg-opacity-10 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-flag" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-2 py-4 space-y-6">
            {teeTimeGroup.players.map((player) => (
              <Scorecard
                key={player.participantId}
                participant={{
                  id: player.participantId,
                  name: player.participantName,
                  type: player.participantType,
                  isMultiPlayer: player.isMultiPlayer,
                  scores: player.scores,
                }}
                course={course}
                currentHole={currentHole}
              />
            ))}
          </div>
        </div>

        {/* Footer with TapScore Button Styling */}
        <div className="p-4 border-t border-soft-grey space-y-3">
          <button
            onClick={() => onContinueEntry(currentHole)}
            className="w-full bg-turf text-scorecard py-3 px-4 rounded-xl font-medium hover:bg-fairway transition-colors font-primary"
          >
            Continue Entry on Hole {currentHole}
          </button>

          {onLockRound && (
            <button
              onClick={() => setShowConfirmation(true)}
              className="w-full bg-coral text-scorecard py-3 px-4 rounded-xl font-medium hover:bg-orange-600 transition-colors font-primary"
            >
              Finalize and Lock Round
            </button>
          )}
        </div>
      </div>

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
