import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { useCompetition } from "../../api/competitions";
import { useCourse } from "../../api/courses";
import { useTeams } from "../../api/teams";
import { useSeriesTeams } from "../../api/series";
import { useTourEnrollments } from "../../api/tours";
import {
  useTeeTimesForCompetition,
  useCreateTeeTime,
  useDeleteTeeTime,
  useUpdateTeeTime,
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
  Pencil,
  Ban,
  FileEdit,
} from "lucide-react";
import ParticipantAssignment from "../../components/ParticipantAssignment";
import TourPlayerAssignment from "../../components/TourPlayerAssignment";
import { EditParticipantHandicapDialog } from "../../components/EditParticipantHandicapDialog";
import { AdminEditScoreDialog } from "../../components/admin/AdminEditScoreDialog";
import { AdminDQDialog } from "../../components/admin/AdminDQDialog";

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

  // Fetch tour enrollments for tour competitions (only approved/active players)
  const { data: tourEnrollments } = useTourEnrollments(
    competition?.tour_id || 0,
    "active"
  );

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
  const [bulkStartHole, setBulkStartHole] = useState<number>(1);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Specific tee time creation state (outdoor)
  const [specificTime, setSpecificTime] = useState("");
  const [specificStartHole, setSpecificStartHole] = useState<number>(1);
  const [specificHittingBay, setSpecificHittingBay] = useState<number>(1);

  // Indoor wave management state (UI-only, no server calls until participants assigned)
  const [waves, setWaves] = useState<Array<{ time: string; numberOfBays: number }>>([]);
  const [newWaveTime, setNewWaveTime] = useState("");
  const [newWaveNumberOfBays, setNewWaveNumberOfBays] = useState(1);

  // Tour player assignment state - selected enrollments to include in start list
  const [selectedEnrollments, setSelectedEnrollments] = useState<number[]>([]);

  // Handicap edit dialog state
  const [editHandicapDialogOpen, setEditHandicapDialogOpen] = useState(false);
  const [selectedParticipantForHandicap, setSelectedParticipantForHandicap] = useState<{
    id: number;
    name: string;
    handicap_index?: number;
  } | null>(null);

  // Score edit dialog state
  const [editScoreDialogOpen, setEditScoreDialogOpen] = useState(false);
  const [selectedParticipantForScore, setSelectedParticipantForScore] = useState<{
    id: number;
    name: string;
    score: number[];
  } | null>(null);

  // DQ dialog state
  const [dqDialogOpen, setDqDialogOpen] = useState(false);
  const [selectedParticipantForDQ, setSelectedParticipantForDQ] = useState<{
    id: number;
    name: string;
    isDQ: boolean;
  } | null>(null);

  // Fetch course to get pars for score editing
  const { data: course } = useCourse(competition?.course_id || 0);

  const createTeeTimeMutation = useCreateTeeTime();
  const deleteTeeTimeMutation = useDeleteTeeTime();
  const updateTeeTimeMutation = useUpdateTeeTime();
  const lockParticipantMutation = useLockParticipant();
  const unlockParticipantMutation = useUnlockParticipant();

  // Analyze existing tee times and prefill teams/participant types
  // Only runs once on initial load if there are tee times with actual participants
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

      // Only prefill if we found actual participants
      // This prevents overwriting user's manual selections when creating empty tee times
      if (foundTeamIds.size > 0 || foundParticipantTypes.size > 0) {
        // Prefill selected teams
        const teamIdsArray = Array.from(foundTeamIds);
        setSelectedTeams(teamIdsArray);

        // Prefill participant types
        const typesArray = Array.from(foundParticipantTypes).map((name) => ({
          id: crypto.randomUUID(),
          name,
        }));
        setParticipantTypes(typesArray);
      }

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

  // Indoor wave management handlers
  const handleAddWave = () => {
    if (!newWaveTime) return;
    setWaves([...waves, { time: newWaveTime, numberOfBays: newWaveNumberOfBays }]);
    setNewWaveTime("");
    setNewWaveNumberOfBays(1);
  };

  const handleRemoveWave = (index: number) => {
    setWaves(waves.filter((_, i) => i !== index));
  };

  const handleCreateTeeTimesFromWaves = async () => {
    if (!competitionId || waves.length === 0) return;

    const totalBays = waves.reduce((sum, wave) => sum + wave.numberOfBays, 0);
    const wavesList = waves.map(w => `${w.time} (${w.numberOfBays} bays)`).join(', ');

    if (!confirm(`Create ${totalBays} bay slots from ${waves.length} wave(s)?\n\n${wavesList}\n\nYou can then assign participants to each bay below.`)) {
      return;
    }

    setIsCreating(true);
    try {
      // Create a tee_time record for each wave+bay combination
      for (const wave of waves) {
        for (let bay = 1; bay <= wave.numberOfBays; bay++) {
          await createTeeTimeMutation.mutateAsync({
            competitionId: parseInt(competitionId),
            teetime: wave.time,
            start_hole: 1, // Not used for indoor, but required
            hitting_bay: bay,
          });
        }
      }

      // Clear the waves UI state after creating
      setWaves([]);

      // Refresh tee times list
      await refetchTeeTimes();
    } catch (error) {
      console.error("Error creating tee times from waves:", error);
      alert("Failed to create tee times. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateNextTeeTime = async (useStartHole: number, useHittingBay?: number) => {
    if (!competitionId) return;

    setIsCreating(true);
    try {
      let newTeeTime: string;

      // If there are existing tee times, use the latest one as base and add interval
      if (teeTimes && teeTimes.length > 0) {
        const latestTeeTime = teeTimes[teeTimes.length - 1].teetime;
        const currentTime = new Date(`2000-01-01T${latestTeeTime}`);
        // Add the time interval to get the next tee time
        const nextTime = new Date(
          currentTime.getTime() + timeBetweenTeeTimes * 60000
        );
        newTeeTime = nextTime.toTimeString().slice(0, 5);
      } else {
        // If no existing tee times, use the first tee time input directly
        newTeeTime = firstTeeTime;
      }

      // Create the empty tee time
      await createTeeTimeMutation.mutateAsync({
        competitionId: parseInt(competitionId),
        teetime: newTeeTime,
        start_hole: useStartHole,
        hitting_bay: useHittingBay,
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

  const handleCreateSpecificTeeTime = async () => {
    if (!competitionId || !specificTime) return;

    setIsCreating(true);
    try {
      // Create the tee time with the specific time and hole or bay
      await createTeeTimeMutation.mutateAsync({
        competitionId: parseInt(competitionId),
        teetime: specificTime,
        start_hole: competition?.venue_type === "indoor" ? 1 : specificStartHole,
        hitting_bay: competition?.venue_type === "indoor" ? specificHittingBay : undefined,
      });

      // Refresh the tee times list
      await refetchTeeTimes();
      // Reset form
      setSpecificTime("");
      setSpecificStartHole(1);
      setSpecificHittingBay(1);
    } catch (error) {
      console.error("Error creating specific tee time:", error);
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

  // Tour enrollment selection handler
  const handleEnrollmentSelection = (enrollmentId: number) => {
    setSelectedEnrollments((prev) =>
      prev.includes(enrollmentId)
        ? prev.filter((id) => id !== enrollmentId)
        : [...prev, enrollmentId]
    );
  };

  // Select all / deselect all enrollments
  const handleSelectAllEnrollments = () => {
    if (!tourEnrollments) return;
    const unassignedIds = tourEnrollments
      .filter((e) => !teeTimes?.some((tt) => tt.participants.some((p) => p.player_id === e.player_id)))
      .map((e) => e.id);

    if (selectedEnrollments.length === unassignedIds.length) {
      setSelectedEnrollments([]);
    } else {
      setSelectedEnrollments(unassignedIds);
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

      {/* Auto-prefill notification - Only for Series competitions */}
      {competition?.series_id && hasAnalyzedExistingData && teeTimes && teeTimes.length > 0 && (
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

      {/* Participant Types & Team Selection - Only for Series competitions */}
      {competition?.series_id && (
        <>
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
                  onClick={() => handleTeamSelection(team.id)}
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
      )}

      {/* Tour Enrollments Section - Only for Tour competitions */}
      {competition?.tour_id && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Select Players for Start List
                <span className="ml-2 text-sm font-normal text-blue-600">
                  ({tourEnrollments?.length || 0} enrolled)
                </span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Select which enrolled players should participate in this competition.
              </p>
            </div>
            {tourEnrollments && tourEnrollments.length > 0 && (
              <button
                onClick={handleSelectAllEnrollments}
                className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {selectedEnrollments.length === tourEnrollments.filter((e) =>
                  !teeTimes?.some((tt) => tt.participants.some((p) => p.player_id === e.player_id))
                ).length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            )}
          </div>

          {tourEnrollments && tourEnrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tourEnrollments.map((enrollment) => {
                // Check if this player is already assigned to a tee time
                const isAssigned = teeTimes?.some((tt) =>
                  tt.participants.some((p) => p.player_id === enrollment.player_id)
                );
                const isSelected = selectedEnrollments.includes(enrollment.id);

                return (
                  <div
                    key={enrollment.id}
                    onClick={() => !isAssigned && handleEnrollmentSelection(enrollment.id)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      isAssigned
                        ? "border-green-300 bg-green-50 cursor-not-allowed"
                        : isSelected
                        ? "border-blue-500 bg-blue-50 cursor-pointer"
                        : "border-gray-200 hover:border-blue-300 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!isAssigned && (
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {enrollment.player_name || enrollment.email}
                          </span>
                          {enrollment.handicap !== undefined && (
                            <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                              HCP {enrollment.handicap.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {enrollment.category_name && (
                          <div className="text-sm text-gray-500">
                            {enrollment.category_name}
                          </div>
                        )}
                        {isAssigned && (
                          <div className="text-xs text-green-600 mt-1">
                            Already assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No active enrollments found. Players need to be enrolled in the tour first.
            </div>
          )}

          {selectedEnrollments.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>{selectedEnrollments.length}</strong> player(s) selected for start list.
                Create tee times below, then assign players using the assignment panel.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Wave & Bay Management Section (Indoor) OR Tee Time Creation Section (Outdoor) */}
      {competition?.venue_type === "indoor" ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Define Wave Times and Bays
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Set up wave times and the number of bays for each wave. Participants will be assigned to specific bays later.
          </p>

          {/* Add Wave Form */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Add Wave</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wave Time
                </label>
                <input
                  type="time"
                  value={newWaveTime}
                  onChange={(e) => setNewWaveTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Bays
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newWaveNumberOfBays}
                  onChange={(e) => setNewWaveNumberOfBays(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddWave}
                  disabled={!newWaveTime}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 inline-block mr-2" />
                  Add Wave
                </button>
              </div>
            </div>
          </div>

          {/* Defined Waves List */}
          {waves.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-semibold text-gray-900">Defined Waves</h4>
                <button
                  onClick={handleCreateTeeTimesFromWaves}
                  disabled={isCreating || createTeeTimeMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? "Creating..." : `Create ${waves.reduce((sum, w) => sum + w.numberOfBays, 0)} Bay Slots`}
                </button>
              </div>
              {waves.map((wave, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-4">
                        <div>
                          <Clock className="h-4 w-4 inline-block mr-2 text-blue-600" />
                          <span className="font-semibold text-gray-900">{wave.time}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {wave.numberOfBays} {wave.numberOfBays === 1 ? 'bay' : 'bays'}
                          {' '}(Bay {Array.from({length: wave.numberOfBays}, (_, i) => i + 1).join(', ')})
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveWave(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Note:</strong> Click "Create Bay Slots" to generate the tee times. Then you can assign participants to each bay.
              </p>
            </div>
          )}

          {waves.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">
              No waves defined yet. Add wave times above to get started.
            </div>
          )}
        </div>
      ) : (
        /* Outdoor Tee Time Creation */
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Create Tee Times
          </h3>

          {/* Quick Sequential Creation */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Quick Sequential Creation
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              {teeTimes && teeTimes.length > 0
                ? `Add tee times sequentially. Next time will be ${timeBetweenTeeTimes} minutes after ${teeTimes[teeTimes.length - 1].teetime}.`
                : "Set the first tee time and interval to start creating tee times."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Only show first tee time input when there are no existing tee times */}
              {(!teeTimes || teeTimes.length === 0) && (
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
              )}

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

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleCreateNextTeeTime(1)}
                disabled={
                  ((!teeTimes || teeTimes.length === 0) && !firstTeeTime) ||
                  isCreating ||
                  createTeeTimeMutation.isPending
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Add Next Tee Time (Hole 1)"}
              </button>
              <button
                onClick={() => handleCreateNextTeeTime(10)}
                disabled={
                  ((!teeTimes || teeTimes.length === 0) && !firstTeeTime) ||
                  isCreating ||
                  createTeeTimeMutation.isPending
                }
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Add Next Tee Time (Hole 10)"}
              </button>
            </div>
          </div>

          {/* Specific Time Creation */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Add Specific Tee Time
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Create a tee time at an exact time and hole (useful for simultaneous starts on different holes).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specific Time
                </label>
                <input
                  type="time"
                  value={specificTime}
                  onChange={(e) => setSpecificTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Hole
                </label>
                <select
                  value={specificStartHole}
                  onChange={(e) => setSpecificStartHole(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Hole 1</option>
                  <option value={10}>Hole 10</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleCreateSpecificTeeTime}
              disabled={
                !specificTime ||
                isCreating ||
                createTeeTimeMutation.isPending
              }
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Add Specific Tee Time"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Start Hole Setter (Outdoor only) */}
      {competition?.venue_type === "outdoor" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">
            Apply Start Hole To All Tee Times
          </h4>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Start hole for all:</label>
            <select
              value={bulkStartHole}
              onChange={(e) => setBulkStartHole(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Hole 1</option>
              <option value={10}>Hole 10</option>
            </select>
            <button
              onClick={async () => {
                if (!teeTimes || teeTimes.length === 0) return;
                if (
                  !confirm(
                    `Set start hole to ${bulkStartHole} for all ${teeTimes.length} tee times?`
                  )
                )
                  return;
                setIsBulkUpdating(true);
                try {
                  await Promise.all(
                    teeTimes.map((tt) =>
                      updateTeeTimeMutation.mutateAsync({
                        id: tt.id,
                        data: { start_hole: bulkStartHole },
                      })
                    )
                  );
                  await refetchTeeTimes();
                } catch (err) {
                  console.error(err);
                  alert(
                    "Failed to update start hole for all tee times. Please try again."
                  );
                } finally {
                  setIsBulkUpdating(false);
                }
              }}
              disabled={
                isBulkUpdating ||
                updateTeeTimeMutation.isPending ||
                !teeTimes ||
                teeTimes.length === 0
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isBulkUpdating ? "Applying..." : "Apply to All"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Useful when shotgun start is determined after tee times are created.
          </p>
        </div>
      )}


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
                    {competition?.venue_type === "indoor" && teeTime.hitting_bay && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-semibold">
                        Bay {teeTime.hitting_bay}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {competition?.venue_type === "outdoor" && (
                      <>
                        <label className="text-sm text-gray-600">Start hole:</label>
                        <select
                          value={teeTime.start_hole ?? 1}
                          onChange={async (e) => {
                            const value = parseInt(e.target.value);
                            try {
                              await updateTeeTimeMutation.mutateAsync({
                                id: teeTime.id,
                                data: { start_hole: value },
                              });
                              await refetchTeeTimes();
                            } catch (err) {
                              alert(
                                "Failed to update start hole. Please try again."
                              );
                            }
                          }}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value={1}>1</option>
                          <option value={10}>10</option>
                        </select>
                      </>
                    )}
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
                  {teeTime.participants.map((participant) => {
                    // Look up handicap from enrollments for tour competitions
                    const enrollment = competition?.tour_id && participant.player_id
                      ? tourEnrollments?.find((e) => e.player_id === participant.player_id)
                      : null;
                    // Check if the round has been played (has any scores)
                    const hasPlayed = participant.score?.some((s: number) => s > 0 || s === -1);
                    // Display the snapshot handicap if available, otherwise fall back to enrollment handicap
                    const displayHandicap = participant.handicap_index ?? enrollment?.handicap;
                    const participantName = competition?.tour_id
                      ? participant.player_names || participant.position_name
                      : `${participant.team_name} ${participant.position_name}`;
                    const isDQ = Boolean(participant.is_dq);
                    return (
                    <div
                      key={participant.id}
                      className={`p-3 rounded-lg border ${
                        isDQ
                          ? "bg-red-50 border-red-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {participantName}
                          </span>
                          {isDQ && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              DQ
                            </span>
                          )}
                          {!isDQ && displayHandicap !== undefined && (
                            <span className="text-xs text-gray-500 font-mono">
                              HCP {displayHandicap.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Edit handicap button - only visible when round has been played */}
                          {hasPlayed && (
                            <button
                              onClick={() => {
                                setSelectedParticipantForHandicap({
                                  id: participant.id,
                                  name: participantName,
                                  handicap_index: participant.handicap_index,
                                });
                                setEditHandicapDialogOpen(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit handicap for this round"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
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
                      {!competition?.tour_id && participant.player_names && (
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
                      {/* Admin action buttons - show when player has played */}
                      {hasPlayed && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => {
                              setSelectedParticipantForScore({
                                id: participant.id,
                                name: participantName,
                                score: participant.score || [],
                              });
                              setEditScoreDialogOpen(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit scores"
                          >
                            <FileEdit className="h-3 w-3" />
                            Edit Score
                          </button>
                          <button
                            onClick={() => {
                              setSelectedParticipantForDQ({
                                id: participant.id,
                                name: participantName,
                                isDQ: isDQ,
                              });
                              setDqDialogOpen(true);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                              isDQ
                                ? "text-green-600 hover:bg-green-50"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                            title={isDQ ? "Remove DQ" : "Disqualify"}
                          >
                            <Ban className="h-3 w-3" />
                            {isDQ ? "Remove DQ" : "DQ"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participant Assignment Section - Series competitions */}
      {competition?.series_id &&
        selectedTeams.length > 0 &&
        participantTypes.length > 0 &&
        teeTimes &&
        teeTimes.length > 0 && (
          <ParticipantAssignment
            selectedTeams={
              teams?.filter((team) => selectedTeams.includes(team.id)) || []
            }
            participantTypes={participantTypes}
            teeTimes={teeTimes}
            onAssignmentsChange={() => {
              // Refresh tee times to show updated assignments
              refetchTeeTimes();
            }}
          />
        )}

      {/* Tour Player Assignment Section - Tour competitions */}
      {competition?.tour_id &&
        selectedEnrollments.length > 0 &&
        teeTimes &&
        teeTimes.length > 0 &&
        teams &&
        teams.length > 0 && (
          <TourPlayerAssignment
            selectedEnrollments={
              tourEnrollments?.filter((e) => selectedEnrollments.includes(e.id)) || []
            }
            allEnrollments={tourEnrollments || []}
            teeTimes={teeTimes}
            defaultTeamId={teams[0].id}
            onAssignmentsChange={() => {
              refetchTeeTimes();
            }}
          />
        )}

      {/* Edit Handicap Dialog */}
      {selectedParticipantForHandicap && (
        <EditParticipantHandicapDialog
          open={editHandicapDialogOpen}
          onOpenChange={(open) => {
            setEditHandicapDialogOpen(open);
            if (!open) {
              refetchTeeTimes();
            }
          }}
          participantId={selectedParticipantForHandicap.id}
          participantName={selectedParticipantForHandicap.name}
          currentHandicap={selectedParticipantForHandicap.handicap_index}
        />
      )}

      {/* Edit Score Dialog */}
      {selectedParticipantForScore && (
        <AdminEditScoreDialog
          open={editScoreDialogOpen}
          onOpenChange={(open) => {
            setEditScoreDialogOpen(open);
            if (!open) {
              refetchTeeTimes();
            }
          }}
          participantId={selectedParticipantForScore.id}
          participantName={selectedParticipantForScore.name}
          currentScore={selectedParticipantForScore.score}
          pars={course?.pars?.holes || []}
        />
      )}

      {/* DQ Dialog */}
      {selectedParticipantForDQ && (
        <AdminDQDialog
          open={dqDialogOpen}
          onOpenChange={(open) => {
            setDqDialogOpen(open);
            if (!open) {
              refetchTeeTimes();
            }
          }}
          participantId={selectedParticipantForDQ.id}
          participantName={selectedParticipantForDQ.name}
          currentlyDQ={selectedParticipantForDQ.isDQ}
        />
      )}
    </div>
  );
}
