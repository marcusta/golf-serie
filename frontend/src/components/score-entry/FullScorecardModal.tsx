import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Scorecard } from "@/components/scorecard/Scorecard";

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
        <div className="p-4 border-t border-soft-grey">
          <button
            onClick={() => onContinueEntry(currentHole)}
            className="w-full bg-turf text-scorecard py-3 px-4 rounded-xl font-medium hover:bg-fairway transition-colors font-primary"
          >
            Continue Entry on Hole {currentHole}
          </button>
        </div>
      </div>
    </div>
  );
}
