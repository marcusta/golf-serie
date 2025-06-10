import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { useCompetition } from "../../api/competitions";
import { useTeams } from "../../api/teams";
import { useSeriesTeams } from "../../api/series";
import {
  useTeeTimesForCompetition,
  useCreateTeeTime,
  useCreateParticipant,
  useDeleteTeeTime,
} from "../../api/tee-times";
import {
  useLockParticipant,
  useUnlockParticipant,
} from "../../api/participants";
import {
  Plus,
  Clock,
  Users,
  Trash2,
  AlertCircle,
  Lock,
  Unlock,
} from "lucide-react";
import ParticipantAssignment from "../../components/ParticipantAssignment";

interface ParticipantType {
  id: string;
  name: string;
}

export default function AdminCompetitionTeeTimes() {
  const { competitionId } = useParams({ strict: false });
  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );
  const { data: allTeams } = useTeams();
  const { data: seriesTeams } = useSeriesTeams(competition?.series_id || 0);
  const { data: teeTimes, refetch: refetchTeeTimes } =
    useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);

  // Use series teams if competition belongs to a series, otherwise use all teams
  // This ensures that when administering a competition that belongs to a series,
  // only teams that are part of that series are shown for participation
  const teams = competition?.series_id ? seriesTeams : allTeams;

  const [participantTypes, setParticipantTypes] = useState<ParticipantType[]>(
    []
  );
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [firstTeeTime, setFirstTeeTime] = useState("");
  const [timeBetweenTeeTimes, setTimeBetweenTeeTimes] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [hasAnalyzedExistingData, setHasAnalyzedExistingData] = useState(false);

  const createTeeTimeMutation = useCreateTeeTime();
  const createParticipantMutation = useCreateParticipant();
  const deleteTeeTimeMutation = useDeleteTeeTime();
  const lockParticipantMutation = useLockParticipant();
  const unlockParticipantMutation = useUnlockParticipant();

  // Analyze existing tee times and prefill teams/participant types
  useEffect(() => {
    if (teeTimes && teeTimes.length > 0 && teams && !hasAnalyzedExistingData) {
      const foundTeamIds = new Set<number>();
      const foundParticipantTypes = new Set<string>();

      teeTimes.forEach((teeTime) => {
        teeTime.participants.forEach((participant) => {
          foundTeamIds.add(participant.team_id);
          foundParticipantTypes.add(participant.position_name);
        });
      });

      // Prefill selected teams
      const teamIdsArray = Array.from(foundTeamIds);
      setSelectedTeams(teamIdsArray);

      // Prefill participant types
      const typesArray = Array.from(foundParticipantTypes).map((name) => ({
        id: crypto.randomUUID(),
        name,
      }));
      setParticipantTypes(typesArray);

      setHasAnalyzedExistingData(true);
    }
  }, [teeTimes, teams, hasAnalyzedExistingData]);

  if (competitionLoading) return <div>Loading competition...</div>;
  if (!competition) return <div>Competition not found</div>;

  const handleAddParticipantType = () => {
    setParticipantTypes([
      ...participantTypes,
      { id: crypto.randomUUID(), name: "" },
    ]);
  };

  const handleParticipantTypeChange = (id: string, name: string) => {
    setParticipantTypes(
      participantTypes.map((type) =>
        type.id === id ? { ...type, name } : type
      )
    );
  };

  const handleRemoveParticipantType = (id: string) => {
    setParticipantTypes(participantTypes.filter((type) => type.id !== id));
  };

  const handleTeamSelection = (teamId: number) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleCreateTeeTimes = async () => {
    if (!competitionId) return;

    setIsCreating(true);
    try {
      let currentTime: Date;

      // If there are existing tee times, use the latest one as base
      if (teeTimes && teeTimes.length > 0) {
        const latestTeeTime = teeTimes[teeTimes.length - 1].teetime;
        currentTime = new Date(`2000-01-01T${latestTeeTime}`);
      } else {
        // If no existing tee times, use the first tee time input
        currentTime = new Date(`2000-01-01T${firstTeeTime}`);
      }

      // Add the time interval to get the next tee time
      currentTime = new Date(
        currentTime.getTime() + timeBetweenTeeTimes * 60000
      );
      const newTeeTime = currentTime.toTimeString().slice(0, 5);

      // Create the empty tee time
      await createTeeTimeMutation.mutateAsync({
        competitionId: parseInt(competitionId),
        teetime: newTeeTime,
      });

      // Refresh the tee times list
      await refetchTeeTimes();
    } catch (error) {
      console.error("Error creating tee time:", error);
      alert("Failed to create tee time. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTeeTime = async (teeTimeId: number) => {
    if (!confirm("Are you sure you want to delete this tee time?")) return;

    try {
      await deleteTeeTimeMutation.mutateAsync(teeTimeId);
    } catch (error) {
      console.error("Error deleting tee time:", error);
      alert("Failed to delete tee time. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Manage Tee Times - {competition.name}
          </h2>
          <p className="text-gray-600">
            Set up participant types and create tee times
          </p>
        </div>
      </div>

      {/* Auto-prefill notification */}
      {hasAnalyzedExistingData && teeTimes && teeTimes.length > 0 && (
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
          <button
            onClick={handleAddParticipantType}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Type
          </button>
        </div>

        <div className="space-y-3">
          {participantTypes.map((type) => (
            <div
              key={type.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <input
                type="text"
                value={type.name}
                onChange={(e) =>
                  handleParticipantTypeChange(type.id, e.target.value)
                }
                placeholder="Enter participant type (e.g., Single 1)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleRemoveParticipantType(type.id)}
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
          {competition?.series_id && (
            <span className="ml-2 text-sm font-normal text-blue-600">
              (from series)
            </span>
          )}
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
              onClick={() => handleTeamSelection(team.id)}
            >
              <div className="font-medium text-gray-900">{team.name}</div>
            </div>
          ))}
        </div>

        {teams?.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            {competition?.series_id
              ? "No teams available in this series. Please add teams to the series first."
              : "No teams available. Please add teams first."}
          </div>
        )}
      </div>

      {/* Tee Time Settings Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tee Time Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Tee Time
            </label>
            <input
              type="time"
              value={firstTeeTime}
              onChange={(e) => setFirstTeeTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minutes Between Tee Times
            </label>
            <input
              type="number"
              min="5"
              max="30"
              value={timeBetweenTeeTimes}
              onChange={(e) =>
                setTimeBetweenTeeTimes(parseInt(e.target.value) || 10)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Create Tee Times Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCreateTeeTimes}
          disabled={
            participantTypes.length === 0 ||
            selectedTeams.length === 0 ||
            !firstTeeTime ||
            isCreating ||
            createTeeTimeMutation.isPending ||
            createParticipantMutation.isPending
          }
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? "Creating..." : "Create Tee Times"}
        </button>
      </div>

      {/* Existing Tee Times Section */}
      {teeTimes && teeTimes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Existing Tee Times
          </h3>

          <div className="space-y-4">
            {teeTimes.map((teeTime) => (
              <div
                key={teeTime.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {teeTime.teetime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      {teeTime.participants.length} participants
                    </span>
                    <button
                      onClick={() => handleDeleteTeeTime(teeTime.id)}
                      disabled={deleteTeeTimeMutation.isPending}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete tee time"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teeTime.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="p-3 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">
                          {participant.team_name} {participant.position_name}
                        </div>
                        <div className="flex items-center gap-2">
                          {participant.is_locked ? (
                            <Lock className="h-4 w-4 text-red-600" />
                          ) : (
                            <Unlock className="h-4 w-4 text-green-600" />
                          )}
                          <button
                            onClick={() => {
                              if (participant.is_locked) {
                                unlockParticipantMutation.mutate(
                                  participant.id
                                );
                              } else {
                                lockParticipantMutation.mutate(participant.id);
                              }
                            }}
                            disabled={
                              lockParticipantMutation.isPending ||
                              unlockParticipantMutation.isPending
                            }
                            className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                              participant.is_locked
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                            title={
                              participant.is_locked
                                ? "Unlock scorecard"
                                : "Lock scorecard"
                            }
                          >
                            {participant.is_locked ? "Unlock" : "Lock"}
                          </button>
                        </div>
                      </div>
                      {participant.player_names && (
                        <div className="text-sm text-gray-500">
                          {participant.player_names}
                        </div>
                      )}
                      {participant.locked_at && (
                        <div className="text-xs text-gray-400 mt-1">
                          Locked:{" "}
                          {new Date(participant.locked_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participant Assignment Section */}
      {selectedTeams.length > 0 &&
        participantTypes.length > 0 &&
        teeTimes &&
        teeTimes.length > 0 && (
          <ParticipantAssignment
            selectedTeams={
              teams?.filter((team) => selectedTeams.includes(team.id)) || []
            }
            participantTypes={participantTypes}
            teeTimes={teeTimes}
            onAssignmentsChange={(assignments) => {
              console.log("Assignments changed:", assignments);
              // Refresh tee times to show updated assignments
              refetchTeeTimes();
            }}
          />
        )}
    </div>
  );
}
