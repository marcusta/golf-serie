import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Users,
  Clock,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  UserX,
} from "lucide-react";
import type { Team } from "../api/teams";
import type { TeeTime } from "../api/tee-times";
import { useCreateParticipant, useDeleteParticipant } from "../api/tee-times";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  validatePlayerLimit,
  calculateTotalPlayers,
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "../utils/playerUtils";

// Interfaces
export interface GeneratedParticipant {
  id: string;
  teamId: number;
  teamName: string;
  participantType: string;
  assignedToTeeTimeId?: number;
  assignedToTeeTime?: string;
}

export interface Assignment {
  participantId: string;
  teeTimeId: number;
  teeOrder: number;
}

interface ParticipantAssignmentProps {
  selectedTeams: Team[];
  participantTypes: { id: string; name: string }[];
  teeTimes: TeeTime[];
  competitionId: number;
  onAssignmentsChange?: (assignments: Assignment[]) => void;
}

interface AssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teeTime: TeeTime;
  availableParticipants: GeneratedParticipant[];
  onAssign: (participantId: string, teeTimeId: number) => void;
}

// Assignment Dialog Component
function AssignmentDialog({
  isOpen,
  onClose,
  teeTime,
  availableParticipants,
  onAssign,
}: AssignmentDialogProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");

  const handleAssign = () => {
    if (selectedParticipant) {
      onAssign(selectedParticipant, teeTime.id);
      setSelectedParticipant("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Participant to {teeTime.teetime}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto">
            {availableParticipants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>No available participants</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedParticipant === participant.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    onClick={() => setSelectedParticipant(participant.id)}
                  >
                    <div className="font-medium text-gray-900">
                      {participant.teamName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {participant.participantType}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedParticipant}>
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Available Participants Panel Component
function AvailableParticipantsPanel({
  participants,
  onDragStart,
}: {
  participants: GeneratedParticipant[];
  onDragStart: (participant: GeneratedParticipant, e: React.DragEvent) => void;
}) {
  const groupedParticipants = useMemo(() => {
    const groups: { [teamName: string]: GeneratedParticipant[] } = {};
    participants.forEach((participant) => {
      if (!groups[participant.teamName]) {
        groups[participant.teamName] = [];
      }
      groups[participant.teamName].push(participant);
    });
    return groups;
  }, [participants]);

  const availableCount = participants.filter(
    (p) => !p.assignedToTeeTimeId
  ).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Available Participants
        </h3>
        <span className="text-sm text-gray-500">
          ({availableCount} remaining)
        </span>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {Object.entries(groupedParticipants).map(
          ([teamName, teamParticipants]) => (
            <div key={teamName}>
              <h4 className="font-medium text-gray-900 mb-2">{teamName}</h4>
              <div className="space-y-2 pl-4">
                {teamParticipants.map((participant) => {
                  const isExisting = participant.id.startsWith("existing-");
                  return (
                    <div
                      key={participant.id}
                      draggable={!participant.assignedToTeeTimeId}
                      onDragStart={(e) => onDragStart(participant, e)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                        participant.assignedToTeeTimeId
                          ? isExisting
                            ? "bg-purple-50 border-purple-200 text-purple-700 cursor-not-allowed"
                            : "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-white border-gray-200 hover:border-blue-300 cursor-move"
                      }`}
                    >
                      {participant.assignedToTeeTimeId ? (
                        <Check
                          className={`h-4 w-4 ${
                            isExisting ? "text-purple-500" : "text-green-500"
                          }`}
                        />
                      ) : (
                        <div className="w-4 h-4 border-2 border-gray-300 rounded-sm" />
                      )}
                      <span className="flex-1 text-sm">
                        {participant.participantType}
                        {isExisting && (
                          <span className="ml-2 text-xs text-purple-600 font-medium">
                            (existing)
                          </span>
                        )}
                      </span>
                      {participant.assignedToTeeTime && (
                        <span className="text-xs text-gray-500">
                          assigned to {participant.assignedToTeeTime}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {participants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <p className="font-medium mb-2">No participants generated</p>
            <p className="text-sm">
              Generate participants to start assigning them to tee times.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Tee Times Panel Component
function TeeTimesPanel({
  teeTimes,
  participants,
  onDrop,
  onRemoveAssignment,
  onOpenAssignDialog,
}: {
  teeTimes: TeeTime[];
  participants: GeneratedParticipant[];
  onDrop: (teeTimeId: number, participant: GeneratedParticipant) => void;
  onRemoveAssignment: (participantId: string) => void;
  onOpenAssignDialog: (teeTime: TeeTime) => void;
}) {
  const [dragOverTeeTime, setDragOverTeeTime] = useState<number | null>(null);

  const getAssignedParticipants = (teeTimeId: number) => {
    // Get local assigned participants that are NOT already in teeTime.participants
    const localAssigned = participants.filter(
      (p) => p.assignedToTeeTimeId === teeTimeId
    );
    const teeTime = teeTimes.find((t) => t.id === teeTimeId);

    if (!teeTime) return localAssigned;

    // Filter out participants that are already saved to the API (exist in teeTime.participants)
    return localAssigned.filter((localParticipant) => {
      const existsInAPI = teeTime.participants.some(
        (apiParticipant) =>
          localParticipant.teamId === apiParticipant.team_id &&
          localParticipant.participantType === apiParticipant.position_name
      );
      return !existsInAPI;
    });
  };

  const getTeeTimePlayerInfo = (teeTime: TeeTime) => {
    const actualPlayerCount = calculateTotalPlayers(teeTime.participants);
    const isOverLimit = actualPlayerCount > 4;
    const isAtLimit = actualPlayerCount === 4;

    return {
      actualPlayerCount,
      isOverLimit,
      isAtLimit,
      participantCount: teeTime.participants.length,
    };
  };

  const handleDragOver = (e: React.DragEvent, teeTimeId: number) => {
    e.preventDefault();
    setDragOverTeeTime(teeTimeId);
  };

  const handleDragLeave = () => {
    setDragOverTeeTime(null);
  };

  const handleDrop = (e: React.DragEvent, teeTimeId: number) => {
    e.preventDefault();
    setDragOverTeeTime(null);

    const participantData = e.dataTransfer.getData("application/json");
    if (participantData) {
      const participant: GeneratedParticipant = JSON.parse(participantData);
      onDrop(teeTimeId, participant);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Tee Times</h3>
        <span className="text-sm text-gray-500">({teeTimes.length} times)</span>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {teeTimes.map((teeTime) => {
          const assignedParticipants = getAssignedParticipants(teeTime.id);
          const playerInfo = getTeeTimePlayerInfo(teeTime);
          const isDragOver = dragOverTeeTime === teeTime.id;

          return (
            <div
              key={teeTime.id}
              className={`border rounded-lg p-4 transition-all ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : playerInfo.isOverLimit
                  ? "border-red-300 bg-red-50"
                  : playerInfo.isAtLimit
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              onDragOver={(e) => handleDragOver(e, teeTime.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, teeTime.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{teeTime.teetime}</span>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      playerInfo.isOverLimit
                        ? "bg-red-100 text-red-800"
                        : playerInfo.isAtLimit
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {playerInfo.actualPlayerCount}/4 players
                  </div>
                  {playerInfo.isOverLimit && (
                    <UserX className="h-4 w-4 text-red-500" />
                  )}
                </div>
                {!playerInfo.isAtLimit && (
                  <button
                    onClick={() => onOpenAssignDialog(teeTime)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Assign
                  </button>
                )}
              </div>

              <div className="space-y-2 min-h-[60px]">
                {teeTime.participants.length === 0 &&
                assignedParticipants.length === 0 ? (
                  <div className="text-gray-500 text-sm italic text-center py-4">
                    Drop participants here
                  </div>
                ) : (
                  <>
                    {/* Existing participants from API */}
                    {teeTime.participants.map((participant) => (
                      <div
                        key={`existing-${participant.id}`}
                        className="flex items-center justify-between bg-blue-100 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">
                            {participant.team_name}
                          </span>
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                            {formatParticipantTypeDisplay(
                              participant.position_name
                            )}
                          </span>
                          {isMultiPlayerFormat(participant.position_name) && (
                            <span className="text-blue-500 text-xs">👥</span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            onRemoveAssignment(`existing-${participant.id}`)
                          }
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {/* Newly assigned participants (only those not yet saved to API) */}
                    {assignedParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between bg-green-100 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">
                            {participant.teamName}
                          </span>
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                            {formatParticipantTypeDisplay(
                              participant.participantType
                            )}
                          </span>
                          {isMultiPlayerFormat(participant.participantType) && (
                            <span className="text-green-500 text-xs">👥</span>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveAssignment(participant.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {playerInfo.isOverLimit && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
                  ⚠️ This tee time exceeds the 4-player limit
                </div>
              )}
            </div>
          );
        })}

        {teeTimes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4" />
            <p className="font-medium mb-2">No tee times available</p>
            <p className="text-sm">
              Create tee times to start assigning participants.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function ParticipantAssignment({
  selectedTeams,
  participantTypes,
  teeTimes,
  onAssignmentsChange,
}: Omit<ParticipantAssignmentProps, "competitionId">) {
  const [participants, setParticipants] = useState<GeneratedParticipant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTime | null>(null);
  const [hasAnalyzedExisting, setHasAnalyzedExisting] = useState(false);

  const createParticipantMutation = useCreateParticipant();
  const deleteParticipantMutation = useDeleteParticipant();

  // Analyze existing tee times to extract teams and participant types
  const analyzeExistingTeeTimes = useCallback(() => {
    const existingParticipants: GeneratedParticipant[] = [];
    const foundTeamIds = new Set<number>();
    const foundParticipantTypes = new Set<string>();

    teeTimes.forEach((teeTime) => {
      teeTime.participants.forEach((participant) => {
        foundTeamIds.add(participant.team_id);
        foundParticipantTypes.add(participant.position_name);

        // Create GeneratedParticipant from existing participant
        existingParticipants.push({
          id: `existing-${participant.id}`,
          teamId: participant.team_id,
          teamName: participant.team_name,
          participantType: participant.position_name,
          assignedToTeeTimeId: teeTime.id,
          assignedToTeeTime: teeTime.teetime,
        });
      });
    });

    return {
      existingParticipants,
      foundTeamIds: Array.from(foundTeamIds),
      foundParticipantTypes: Array.from(foundParticipantTypes),
    };
  }, [teeTimes]);

  // Initialize participants from existing tee times on first load
  useEffect(() => {
    if (teeTimes.length > 0 && !hasAnalyzedExisting) {
      const { existingParticipants } = analyzeExistingTeeTimes();
      setParticipants(existingParticipants);
      setHasAnalyzedExisting(true);
    }
  }, [teeTimes, hasAnalyzedExisting, analyzeExistingTeeTimes]);

  // Get analysis of existing data for display
  const existingAnalysis = useMemo(() => {
    if (teeTimes.length === 0) return null;

    const { foundTeamIds, foundParticipantTypes } = analyzeExistingTeeTimes();
    const foundTeams = selectedTeams.filter((team) =>
      foundTeamIds.includes(team.id)
    );
    const missingTeams = selectedTeams.filter(
      (team) => !foundTeamIds.includes(team.id)
    );
    const foundTypes = participantTypes.filter((type) =>
      foundParticipantTypes.includes(type.name)
    );
    const missingTypes = participantTypes.filter(
      (type) => !foundParticipantTypes.includes(type.name)
    );

    return {
      foundTeams,
      missingTeams,
      foundTypes,
      missingTypes,
      foundTeamIds,
      foundParticipantTypes,
    };
  }, [teeTimes, selectedTeams, participantTypes, analyzeExistingTeeTimes]);

  // Enhanced generate participants that preserves existing
  const handleGenerateParticipants = useCallback(() => {
    setIsGenerating(true);

    // Get existing participants (already assigned)
    const { existingParticipants } = analyzeExistingTeeTimes();

    // Generate new participants for combinations that don't exist yet
    const newParticipants: GeneratedParticipant[] = [...existingParticipants];

    selectedTeams.forEach((team) => {
      participantTypes.forEach((type) => {
        // Check if this combination already exists
        const exists = existingParticipants.some(
          (p) => p.teamId === team.id && p.participantType === type.name
        );

        if (!exists) {
          newParticipants.push({
            id: crypto.randomUUID(),
            teamId: team.id,
            teamName: team.name,
            participantType: type.name,
          });
        }
      });
    });

    setParticipants(newParticipants);
    setIsGenerating(false);
  }, [selectedTeams, participantTypes, analyzeExistingTeeTimes]);

  // Handle drag start
  const handleDragStart = useCallback(
    (participant: GeneratedParticipant, e: React.DragEvent) => {
      if (!participant.assignedToTeeTimeId) {
        e.dataTransfer.setData("application/json", JSON.stringify(participant));
        e.dataTransfer.effectAllowed = "move";
      }
    },
    []
  );

  // Handle drop assignment
  const handleDrop = useCallback(
    async (teeTimeId: number, participant: GeneratedParticipant) => {
      if (participant.assignedToTeeTimeId) return;

      const teeTime = teeTimes.find((t) => t.id === teeTimeId);
      if (!teeTime) return;

      // Validate player limit before assignment
      const validation = validatePlayerLimit(
        teeTime.participants,
        participant.participantType
      );

      if (!validation.isValid) {
        alert(validation.message);
        return;
      }

      // Update local state immediately for responsive UI
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participant.id
            ? {
                ...p,
                assignedToTeeTimeId: teeTimeId,
                assignedToTeeTime: teeTime.teetime,
              }
            : p
        )
      );

      // Calculate tee order (position in tee time)
      const currentAssignments = participants.filter(
        (p) => p.assignedToTeeTimeId === teeTimeId
      );
      const teeOrder = currentAssignments.length + 1;

      // Create the assignment via API
      try {
        await createParticipantMutation.mutateAsync({
          tee_time_id: teeTimeId,
          team_id: participant.teamId,
          position_name: participant.participantType,
          tee_order: teeOrder,
        });

        // Notify parent component
        if (onAssignmentsChange) {
          const newAssignment: Assignment = {
            participantId: participant.id,
            teeTimeId: teeTimeId,
            teeOrder: teeOrder,
          };
          onAssignmentsChange([newAssignment]);
        }
      } catch (error) {
        console.error("Failed to create participant assignment:", error);
        // Revert local state on error
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participant.id
              ? {
                  ...p,
                  assignedToTeeTimeId: undefined,
                  assignedToTeeTime: undefined,
                }
              : p
          )
        );
        alert("Failed to assign participant. Please try again.");
      }
    },
    [participants, teeTimes, createParticipantMutation, onAssignmentsChange]
  );

  // Handle removing assignment
  const handleRemoveAssignment = useCallback(
    async (participantId: string) => {
      // Check if this is an existing participant (starts with "existing-")
      if (participantId.startsWith("existing-")) {
        const actualParticipantId = parseInt(
          participantId.replace("existing-", "")
        );

        try {
          // Make the API call to delete the participant
          await deleteParticipantMutation.mutateAsync(actualParticipantId);

          // Update local state after successful deletion
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === participantId
                ? {
                    ...p,
                    assignedToTeeTimeId: undefined,
                    assignedToTeeTime: undefined,
                  }
                : p
            )
          );
        } catch (error) {
          console.error("Failed to delete participant:", error);
          alert("Failed to remove participant assignment. Please try again.");
        }
      } else {
        // For newly created participants that haven't been saved yet, just update local state
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  assignedToTeeTimeId: undefined,
                  assignedToTeeTime: undefined,
                }
              : p
          )
        );
      }
    },
    [deleteParticipantMutation]
  );

  // Handle assignment dialog
  const handleOpenAssignDialog = useCallback((teeTime: TeeTime) => {
    setSelectedTeeTime(teeTime);
    setAssignDialogOpen(true);
  }, []);

  const handleAssignFromDialog = useCallback(
    (participantId: string, teeTimeId: number) => {
      const participant = participants.find((p) => p.id === participantId);
      if (participant) {
        handleDrop(teeTimeId, participant);
      }
    },
    [participants, handleDrop]
  );

  // Get statistics
  const totalParticipants = participants.length;
  const assignedParticipants = participants.filter(
    (p) => p.assignedToTeeTimeId
  ).length;
  const availableParticipants = participants.filter(
    (p) => !p.assignedToTeeTimeId
  );
  const existingAssignments = participants.filter((p) =>
    p.id.startsWith("existing-")
  ).length;

  return (
    <div className="space-y-6">
      {/* Existing Analysis Section */}
      {existingAnalysis && existingAnalysis.foundTeams.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              Existing Assignments Detected
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">
                Teams with Existing Participants (
                {existingAnalysis.foundTeams.length})
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {existingAnalysis.foundTeams.map((team) => (
                  <li key={team.id}>✓ {team.name}</li>
                ))}
              </ul>
              {existingAnalysis.missingTeams.length > 0 && (
                <>
                  <h5 className="font-medium text-blue-900 mt-3 mb-1">
                    Selected Teams Without Participants (
                    {existingAnalysis.missingTeams.length})
                  </h5>
                  <ul className="text-sm text-blue-600 space-y-1">
                    {existingAnalysis.missingTeams.map((team) => (
                      <li key={team.id}>○ {team.name}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div>
              <h4 className="font-medium text-blue-900 mb-2">
                Participant Types Found ({existingAnalysis.foundTypes.length})
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {existingAnalysis.foundTypes.map((type) => (
                  <li key={type.id}>✓ {type.name}</li>
                ))}
              </ul>
              {existingAnalysis.missingTypes.length > 0 && (
                <>
                  <h5 className="font-medium text-blue-900 mt-3 mb-1">
                    Defined Types Not Used (
                    {existingAnalysis.missingTypes.length})
                  </h5>
                  <ul className="text-sm text-blue-600 space-y-1">
                    {existingAnalysis.missingTypes.map((type) => (
                      <li key={type.id}>○ {type.name}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Existing assignments have been
              automatically loaded. Click "Generate All Participants" to create
              missing combinations while preserving current assignments.
            </p>
          </div>
        </div>
      )}

      {/* Header with Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Participant Assignment
            </h3>
            <p className="text-gray-600">
              Assign generated participants to tee times
            </p>
          </div>

          <Button
            onClick={handleGenerateParticipants}
            disabled={
              selectedTeams.length === 0 ||
              participantTypes.length === 0 ||
              isGenerating
            }
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            {isGenerating
              ? "Generating..."
              : existingAssignments > 0
              ? "Generate Missing Participants"
              : "Generate All Participants"}
          </Button>
        </div>

        {/* Enhanced Statistics */}
        {totalParticipants > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Total Participants
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {totalParticipants}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Assigned</span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {assignedParticipants}
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-900">Remaining</span>
              </div>
              <div className="text-2xl font-bold text-orange-900 mt-1">
                {totalParticipants - assignedParticipants}
              </div>
            </div>

            {existingAssignments > 0 && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Existing</span>
                </div>
                <div className="text-2xl font-bold text-purple-900 mt-1">
                  {existingAssignments}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expected vs Actual Comparison */}
        {selectedTeams.length > 0 &&
          participantTypes.length > 0 &&
          totalParticipants > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Expected:</strong> {selectedTeams.length} teams ×{" "}
                {participantTypes.length} types ={" "}
                {selectedTeams.length * participantTypes.length} participants
                {totalParticipants <
                  selectedTeams.length * participantTypes.length && (
                  <span className="text-orange-600 ml-2">
                    (
                    {selectedTeams.length * participantTypes.length -
                      totalParticipants}{" "}
                    missing)
                  </span>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Two-panel assignment interface */}
      {totalParticipants > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-96">
          {/* Left Panel - Available Participants */}
          <div className="lg:col-span-1">
            <AvailableParticipantsPanel
              participants={participants}
              onDragStart={handleDragStart}
            />
          </div>

          {/* Right Panel - Tee Times */}
          <div className="lg:col-span-2">
            <TeeTimesPanel
              teeTimes={teeTimes}
              participants={participants}
              onDrop={handleDrop}
              onRemoveAssignment={handleRemoveAssignment}
              onOpenAssignDialog={handleOpenAssignDialog}
            />
          </div>
        </div>
      )}

      {/* Assignment Dialog */}
      {selectedTeeTime && (
        <AssignmentDialog
          isOpen={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          teeTime={selectedTeeTime}
          availableParticipants={availableParticipants}
          onAssign={handleAssignFromDialog}
        />
      )}
    </div>
  );
}
