import { Plus, Trash2, AlertCircle } from "lucide-react";
import type { Team } from "../../../api/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ParticipantType {
  id: string;
  name: string;
}

interface SeriesTeamSelectorProps {
  teams: Team[] | undefined;
  selectedTeams: number[];
  participantTypes: ParticipantType[];
  hasAnalyzedExistingData: boolean;
  onTeamSelection: (teamId: number) => void;
  onAddParticipantType: () => void;
  onParticipantTypeChange: (id: string, name: string) => void;
  onRemoveParticipantType: (id: string) => void;
}

export function SeriesTeamSelector({
  teams,
  selectedTeams,
  participantTypes,
  hasAnalyzedExistingData,
  onTeamSelection,
  onAddParticipantType,
  onParticipantTypeChange,
  onRemoveParticipantType,
}: SeriesTeamSelectorProps) {
  return (
    <>
      {/* Auto-prefill notification */}
      {hasAnalyzedExistingData && selectedTeams.length > 0 && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-green-600" />
            <div className="text-sm text-green-800">
              <strong>Auto-prefilled:</strong> Found {selectedTeams.length}{" "}
              teams and {participantTypes.length} participant types from
              existing tee times. You can modify these selections below if
              needed.
            </div>
          </div>
        </div>
      )}

      {/* Participant Types Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Participant Types
            {hasAnalyzedExistingData && participantTypes.length > 0 && (
              <span className="ml-2 text-sm font-normal text-green-600">
                (auto-detected from existing)
              </span>
            )}
          </h3>
          <Button onClick={onAddParticipantType}>
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </div>

        <div className="space-y-3">
          {participantTypes.map((type) => (
            <div
              key={type.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <Input
                type="text"
                value={type.name}
                onChange={(e) => onParticipantTypeChange(type.id, e.target.value)}
                placeholder="Enter participant type (e.g., Single 1)"
                className="flex-1"
              />
              <button
                onClick={() => onRemoveParticipantType(type.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {participantTypes.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No participant types added yet. Add at least one type to continue.
            </div>
          )}
        </div>
      </div>

      {/* Team Selection Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Participating Teams
          <span className="ml-2 text-sm font-normal text-blue-600">
            (from series)
          </span>
          {hasAnalyzedExistingData && selectedTeams.length > 0 && (
            <span className="ml-2 text-sm font-normal text-green-600">
              (auto-selected from existing)
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams?.map((team) => (
            <div
              key={team.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedTeams.includes(team.id)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => onTeamSelection(team.id)}
            >
              <div className="font-medium text-gray-900">{team.name}</div>
            </div>
          ))}
        </div>

        {teams?.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No teams available in this series. Please add teams to the series first.
          </div>
        )}
      </div>
    </>
  );
}

export default SeriesTeamSelector;
