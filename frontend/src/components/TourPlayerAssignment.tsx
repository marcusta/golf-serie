import { useState, useCallback, useMemo } from "react";
import { Users, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { TeeTime, TeeTimeParticipant } from "../api/tee-times";
import type { TourEnrollment } from "../api/tours";
import { useCreateParticipant, useDeleteParticipant } from "../api/tee-times";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import TeeTimeAssignmentPanel, { type AssignableItem } from "./TeeTimeAssignmentPanel";

interface TourPlayerAssignmentProps {
  selectedEnrollments: TourEnrollment[];
  allEnrollments?: TourEnrollment[]; // For handicap lookup of already-assigned players
  teeTimes: TeeTime[];
  defaultTeamId: number;
  onAssignmentsChange?: () => void;
}

interface GeneratedPlayer {
  id: string;
  enrollmentId: number;
  playerId: number | undefined;
  playerName: string;
  categoryName?: string;
  handicap?: number;
  assignedToTeeTimeId?: number;
  assignedToTeeTime?: string;
}

interface AssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teeTime: TeeTime;
  availablePlayers: GeneratedPlayer[];
  onAssign: (playerId: string, teeTimeId: number) => void;
}

// Assignment Dialog Component
function AssignmentDialog({
  isOpen,
  onClose,
  teeTime,
  availablePlayers,
  onAssign,
}: AssignmentDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  const handleAssign = () => {
    if (selectedPlayer) {
      onAssign(selectedPlayer, teeTime.id);
      setSelectedPlayer("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Assign Player to {teeTime.teetime}
            {teeTime.hitting_bay && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-semibold">
                Bay {teeTime.hitting_bay}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto">
            {availablePlayers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>No available players</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availablePlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPlayer === player.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    onClick={() => setSelectedPlayer(player.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">
                        {player.playerName}
                      </div>
                      {player.handicap !== undefined && (
                        <span className="text-sm text-gray-500 font-mono">
                          HCP {player.handicap.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {player.categoryName && (
                      <div className="text-sm text-gray-500">
                        {player.categoryName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedPlayer}>
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Available Players Panel Component
function AvailablePlayersPanel({
  players,
  selected,
  setSelected,
  onDragStart,
}: {
  players: GeneratedPlayer[];
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  onDragStart: (e: React.DragEvent, player: GeneratedPlayer) => void;
}) {
  const availableCount = players.filter((p) => !p.assignedToTeeTimeId).length;

  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Group by category for better organization
  const groupedPlayers = useMemo(() => {
    const groups: { [category: string]: GeneratedPlayer[] } = {};
    players.forEach((player) => {
      const category = player.categoryName || "No Category";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(player);
    });
    return groups;
  }, [players]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Selected Players
        </h3>
        <span className="text-sm text-gray-500">
          ({availableCount} remaining)
        </span>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {Object.entries(groupedPlayers).map(([category, categoryPlayers]) => (
          <div key={category}>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">{category}</h4>
            <div className="space-y-2 pl-2">
              {categoryPlayers.map((player) => {
                const isExisting = player.id.startsWith("existing-");
                const isUnassigned = !player.assignedToTeeTimeId;

                // Convert to AssignableItem for drag data
                const dragData: AssignableItem = {
                  id: player.id,
                  displayName: player.playerName,
                  subText: player.categoryName,
                  handicap: player.handicap,
                  playerId: player.playerId,
                };

                return (
                  <div
                    key={player.id}
                    draggable={isUnassigned}
                    onDragStart={(e) => {
                      if (isUnassigned) {
                        e.dataTransfer.setData("application/json", JSON.stringify(dragData));
                        e.dataTransfer.effectAllowed = "move";
                        onDragStart(e, player);
                      }
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      player.assignedToTeeTimeId
                        ? isExisting
                          ? "bg-purple-50 border-purple-200 text-purple-700"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                        : "bg-white border-gray-200 hover:border-blue-300 cursor-grab"
                    } ${selected.includes(player.id) ? "ring-2 ring-blue-400" : ""}`}
                  >
                    {isUnassigned ? (
                      <button
                        type="button"
                        aria-label={
                          selected.includes(player.id) ? "Deselect" : "Select"
                        }
                        className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center mr-1 flex-shrink-0 ${
                          selected.includes(player.id)
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 bg-white"
                        }`}
                        onClick={(e) => handleCheckboxClick(e, player.id)}
                        tabIndex={0}
                      >
                        {selected.includes(player.id) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <Check
                        className={`h-4 w-4 flex-shrink-0 ${
                          isExisting ? "text-purple-500" : "text-green-500"
                        }`}
                      />
                    )}
                    <span className="flex-1 text-sm truncate">{player.playerName}</span>
                    {player.handicap !== undefined && (
                      <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                        {player.handicap.toFixed(1)}
                      </span>
                    )}
                    {player.assignedToTeeTime && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        @ {player.assignedToTeeTime}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {players.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <p className="font-medium mb-2">No players selected</p>
            <p className="text-sm">
              Select players from the enrollment list above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function TourPlayerAssignment({
  selectedEnrollments,
  allEnrollments,
  teeTimes,
  defaultTeamId,
  onAssignmentsChange,
}: TourPlayerAssignmentProps) {
  // Use allEnrollments for handicap lookup if provided, otherwise fall back to selectedEnrollments
  const enrollmentsForLookup = allEnrollments || selectedEnrollments;
  const [players, setPlayers] = useState<GeneratedPlayer[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTime | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const createParticipantMutation = useCreateParticipant();
  const deleteParticipantMutation = useDeleteParticipant();
  const queryClient = useQueryClient();

  // Build players list from selected enrollments and existing tee time participants
  useMemo(() => {
    const newPlayers: GeneratedPlayer[] = [];

    // Add existing participants from tee times
    teeTimes.forEach((teeTime) => {
      teeTime.participants.forEach((participant: TeeTimeParticipant) => {
        if (participant.player_id) {
          // Look up enrollment from all enrollments for handicap data
          const enrollment = enrollmentsForLookup.find(
            (e) => e.player_id === participant.player_id
          );
          newPlayers.push({
            id: `existing-${participant.id}`,
            enrollmentId: enrollment?.id || 0,
            playerId: participant.player_id,
            playerName: participant.player_name || participant.position_name,
            categoryName: enrollment?.category_name,
            handicap: enrollment?.handicap,
            assignedToTeeTimeId: teeTime.id,
            assignedToTeeTime: teeTime.teetime,
          });
        }
      });
    });

    // Add selected enrollments that aren't already assigned
    selectedEnrollments.forEach((enrollment) => {
      const isAlreadyAssigned = newPlayers.some(
        (p) => p.playerId === enrollment.player_id
      );
      if (!isAlreadyAssigned) {
        newPlayers.push({
          id: `enrollment-${enrollment.id}`,
          enrollmentId: enrollment.id,
          playerId: enrollment.player_id,
          playerName: enrollment.player_name || enrollment.email,
          categoryName: enrollment.category_name,
          handicap: enrollment.handicap,
        });
      }
    });

    setPlayers(newPlayers);
  }, [selectedEnrollments, enrollmentsForLookup, teeTimes]);

  const availablePlayers = players.filter((p) => !p.assignedToTeeTimeId);

  // Get participant display info for the shared panel
  const getParticipantDisplay = useCallback(
    (participant: TeeTimeParticipant) => {
      // First try to find in players array, then fall back to enrollment lookup
      const playerData = players.find((p) => p.playerId === participant.player_id);
      const enrollment = !playerData?.handicap && participant.player_id
        ? enrollmentsForLookup.find((e) => e.player_id === participant.player_id)
        : null;
      return {
        displayName: participant.player_name || participant.position_name,
        handicap: playerData?.handicap ?? enrollment?.handicap,
      };
    },
    [players, enrollmentsForLookup]
  );

  // Handle drop from left panel
  const handleDropItem = useCallback(
    async (teeTimeId: number, item: AssignableItem) => {
      const player = players.find((p) => p.id === item.id);
      if (!player || player.assignedToTeeTimeId) return;

      const teeTime = teeTimes.find((t) => t.id === teeTimeId);
      if (!teeTime || teeTime.participants.length >= 4) return;

      // Update local state
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id
            ? {
                ...p,
                assignedToTeeTimeId: teeTimeId,
                assignedToTeeTime: teeTime.teetime,
              }
            : p
        )
      );

      const teeOrder = teeTime.participants.length + 1;

      try {
        await createParticipantMutation.mutateAsync({
          tee_time_id: teeTimeId,
          team_id: defaultTeamId,
          position_name: player.playerName,
          player_names: player.playerName,
          player_id: player.playerId,
          tee_order: teeOrder,
        });

        onAssignmentsChange?.();
        queryClient.invalidateQueries({ queryKey: ["tee-times"] });
      } catch (error) {
        console.error("Failed to assign player:", error);
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id
              ? { ...p, assignedToTeeTimeId: undefined, assignedToTeeTime: undefined }
              : p
          )
        );
        alert("Failed to assign player. Please try again.");
      }
    },
    [players, teeTimes, defaultTeamId, createParticipantMutation, onAssignmentsChange, queryClient]
  );

  // Handle assignment from dialog
  const handleAssign = useCallback(
    (playerId: string, teeTimeId: number) => {
      const player = players.find((p) => p.id === playerId);
      if (player) {
        const item: AssignableItem = {
          id: player.id,
          displayName: player.playerName,
          handicap: player.handicap,
          playerId: player.playerId,
        };
        handleDropItem(teeTimeId, item);
      }
    },
    [players, handleDropItem]
  );

  // Handle removal
  const handleRemoveParticipant = useCallback(
    async (participantId: number) => {
      try {
        await deleteParticipantMutation.mutateAsync(participantId);
        onAssignmentsChange?.();
        queryClient.invalidateQueries({ queryKey: ["tee-times"] });
      } catch (error) {
        console.error("Failed to remove player:", error);
        alert("Failed to remove player. Please try again.");
      }
    },
    [deleteParticipantMutation, onAssignmentsChange, queryClient]
  );

  // Batch assign selected players
  const handleBatchAssign = useCallback(
    async (teeTime: TeeTime) => {
      let currentCount = teeTime.participants.length;
      const toAssign = players.filter(
        (p) => selected.includes(p.id) && !p.assignedToTeeTimeId
      );

      for (const player of toAssign) {
        if (currentCount >= 4) {
          alert(`Cannot assign more players. Tee time ${teeTime.teetime} is full.`);
          break;
        }
        const item: AssignableItem = {
          id: player.id,
          displayName: player.playerName,
          handicap: player.handicap,
          playerId: player.playerId,
        };
        await handleDropItem(teeTime.id, item);
        currentCount++;
      }
      setSelected([]);
    },
    [players, selected, handleDropItem]
  );

  // Dummy drag start handler (actual data is set in the panel)
  const handleDragStart = useCallback(() => {}, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Player Assignment
        </h3>
        <p className="text-gray-600">
          Drag players from the left panel to tee times, or select multiple and click "+ Assign".
          Drag within a tee time to reorder players.
        </p>
      </div>

      {/* Two-panel assignment interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-96">
        {/* Left Panel - Available Players */}
        <div className="lg:col-span-1">
          <AvailablePlayersPanel
            players={players}
            selected={selected}
            setSelected={setSelected}
            onDragStart={handleDragStart}
          />
        </div>

        {/* Right Panel - Tee Times (shared component) */}
        <div className="lg:col-span-2">
          <TeeTimeAssignmentPanel
            teeTimes={teeTimes}
            getParticipantDisplay={getParticipantDisplay}
            onRemoveParticipant={handleRemoveParticipant}
            onOpenAssignDialog={(teeTime) => {
              if (selected.length > 0) {
                handleBatchAssign(teeTime);
              } else {
                setSelectedTeeTime(teeTime);
                setAssignDialogOpen(true);
              }
            }}
            onDropItem={handleDropItem}
          />
        </div>
      </div>

      {/* Assignment Dialog */}
      {selectedTeeTime && (
        <AssignmentDialog
          isOpen={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          teeTime={selectedTeeTime}
          availablePlayers={availablePlayers}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}
