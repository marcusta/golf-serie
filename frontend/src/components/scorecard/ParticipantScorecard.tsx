import { X } from "lucide-react";
import { Scorecard } from "./Scorecard";

export interface ParticipantData {
  id: number;
  team_name: string;
  position_name: string;
  player_names: string | null;
  score: number[];
  tee_time_id: number;
}

export interface CourseData {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface ParticipantScorecardProps {
  visible: boolean;
  participant: ParticipantData | null;
  course: CourseData | null;
  onClose: () => void;
}

export function ParticipantScorecard({
  visible,
  participant,
  course,
  onClose,
}: ParticipantScorecardProps) {
  if (!visible || !participant || !course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              Team: {participant.team_name}
            </h2>
            <p className="text-sm text-blue-600 mt-1">
              {participant.position_name}
            </p>
            {participant.player_names && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                Players: {participant.player_names}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scorecard */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-2">
            <Scorecard
              participant={{
                id: participant.id.toString(),
                name: participant.team_name,
                type: participant.position_name,
                scores: participant.score,
              }}
              course={course}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}
