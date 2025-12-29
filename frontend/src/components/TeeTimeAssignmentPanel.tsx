import { useState, useEffect } from "react";
import { Clock, Users, X, UserX } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { TeeTime, TeeTimeParticipant } from "../api/tee-times";
import { API_BASE_URL } from "../api/config";

// Common interface for assignable items (works for both Series participants and Tour players)
export interface AssignableItem {
  id: string;
  displayName: string;
  subText?: string;
  handicap?: number;
  playerId?: number;
}

interface TeeTimeAssignmentPanelProps {
  teeTimes: TeeTime[];
  // Function to get display info for a participant
  getParticipantDisplay: (participant: TeeTimeParticipant) => {
    displayName: string;
    subText?: string;
    handicap?: number;
  };
  onRemoveParticipant: (participantId: number) => void;
  onOpenAssignDialog: (teeTime: TeeTime) => void;
  onDropItem?: (teeTimeId: number, item: AssignableItem) => void;
  // Optional: Calculate actual player count (for multi-player formats like Foursome)
  // If not provided, uses participants.length
  calculateTotalPlayers?: (participants: TeeTimeParticipant[]) => number;
}

// API call to update participant order within a tee time
async function updateTeeTimeParticipantOrder(
  teeTimeId: number,
  participantIds: number[]
) {
  const res = await fetch(
    `${API_BASE_URL}/tee-times/${teeTimeId}/participants/order`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds }),
    }
  );
  if (!res.ok) throw new Error("Failed to update participant order");
}

export default function TeeTimeAssignmentPanel({
  teeTimes,
  getParticipantDisplay,
  onRemoveParticipant,
  onOpenAssignDialog,
  onDropItem,
  calculateTotalPlayers,
}: TeeTimeAssignmentPanelProps) {
  const queryClient = useQueryClient();

  // Drag state for reordering within tee times
  const [dragOverTeeTime, setDragOverTeeTime] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedTeeTimeId, setDraggedTeeTimeId] = useState<number | null>(null);
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number | null>(null);
  const [localOrders, setLocalOrders] = useState<{ [teeTimeId: number]: number[] }>({});
  const [isSavingOrder, setIsSavingOrder] = useState<{ [teeTimeId: number]: boolean }>({});

  // Initialize local orders from tee times
  useEffect(() => {
    const newOrders: { [teeTimeId: number]: number[] } = {};
    teeTimes.forEach((teeTime) => {
      newOrders[teeTime.id] = teeTime.participants
        .slice()
        .sort((a, b) => a.tee_order - b.tee_order)
        .map((p: TeeTimeParticipant) => p.id);
    });
    setLocalOrders(newOrders);
  }, [teeTimes]);

  const getOrderedParticipants = (teeTime: TeeTime): TeeTimeParticipant[] => {
    const ids = localOrders[teeTime.id];
    if (!ids) return teeTime.participants;
    return ids
      .map((id) => teeTime.participants.find((p: TeeTimeParticipant) => p.id === id))
      .filter(Boolean) as TeeTimeParticipant[];
  };

  // Handle drop from external source (left panel)
  const handleExternalDrop = (e: React.DragEvent, teeTimeId: number) => {
    e.preventDefault();
    setDragOverTeeTime(null);

    const itemData = e.dataTransfer.getData("application/json");
    if (itemData && onDropItem) {
      try {
        const item = JSON.parse(itemData) as AssignableItem;
        onDropItem(teeTimeId, item);
      } catch (err) {
        console.error("Failed to parse dropped item data:", err);
      }
    }
  };

  // Handle reorder drag start
  const handleReorderDragStart = (
    e: React.DragEvent,
    teeTimeId: number,
    index: number
  ) => {
    e.stopPropagation();
    setDraggedIndex(index);
    setDraggedTeeTimeId(teeTimeId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "reorder");
  };

  // Handle drag over for reordering
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle reorder drop
  const handleReorderDrop = async (
    e: React.DragEvent,
    teeTime: TeeTime,
    dropIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      draggedIndex === null ||
      draggedIndex === dropIndex ||
      draggedTeeTimeId !== teeTime.id
    ) {
      resetDragState();
      return;
    }

    const ids = localOrders[teeTime.id].slice();
    const [removed] = ids.splice(draggedIndex, 1);
    ids.splice(dropIndex, 0, removed);

    setLocalOrders((prev) => ({ ...prev, [teeTime.id]: ids }));
    resetDragState();

    // Save to server
    setIsSavingOrder((prev) => ({ ...prev, [teeTime.id]: true }));
    try {
      await updateTeeTimeParticipantOrder(teeTime.id, ids);
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    } catch (error) {
      console.error("Failed to reorder participants:", error);
      alert("Failed to update order. Please try again.");
    } finally {
      setIsSavingOrder((prev) => ({ ...prev, [teeTime.id]: false }));
    }
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDraggedTeeTimeId(null);
    setDragOverTeeTime(null);
    setHoveredDropIndex(null);
  };

  // Scramble handler
  const handleScramble = async (teeTime: TeeTime) => {
    const ids = localOrders[teeTime.id].slice();
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setLocalOrders((prev) => ({ ...prev, [teeTime.id]: ids }));
    setIsSavingOrder((prev) => ({ ...prev, [teeTime.id]: true }));
    try {
      await updateTeeTimeParticipantOrder(teeTime.id, ids);
      queryClient.invalidateQueries({ queryKey: ["tee-times"] });
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Failed to update order");
    } finally {
      setIsSavingOrder((prev) => ({ ...prev, [teeTime.id]: false }));
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
          const actualPlayerCount = calculateTotalPlayers
            ? calculateTotalPlayers(teeTime.participants)
            : teeTime.participants.length;
          const isOverLimit = actualPlayerCount > 4;
          const isAtLimit = actualPlayerCount >= 4;
          const isDragOver = dragOverTeeTime === teeTime.id;
          const orderedParticipants = getOrderedParticipants(teeTime);

          return (
            <div
              key={teeTime.id}
              className={`border rounded-lg p-4 transition-all ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : isOverLimit
                  ? "border-red-300 bg-red-50"
                  : isAtLimit
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                // Only show drop highlight if not reordering and not at limit
                if (draggedTeeTimeId === null && !isAtLimit) {
                  setDragOverTeeTime(teeTime.id);
                }
              }}
              onDragLeave={(e) => {
                // Only clear if leaving the container entirely
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                  setDragOverTeeTime(null);
                }
              }}
              onDrop={(e) => {
                if (draggedTeeTimeId === null && !isAtLimit) {
                  handleExternalDrop(e, teeTime.id);
                }
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{teeTime.teetime}</span>
                  {teeTime.hitting_bay && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-semibold">
                      Bay {teeTime.hitting_bay}
                    </span>
                  )}
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      isOverLimit
                        ? "bg-red-100 text-red-800"
                        : isAtLimit
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {actualPlayerCount}/4 players
                  </div>
                  {isOverLimit && <UserX className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex items-center gap-2">
                  {orderedParticipants.length > 1 && (
                    <button
                      onClick={() => handleScramble(teeTime)}
                      className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                      disabled={isSavingOrder[teeTime.id]}
                    >
                      Scramble
                    </button>
                  )}
                  {!isAtLimit && (
                    <button
                      onClick={() => onOpenAssignDialog(teeTime)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Assign
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 min-h-[40px]">
                {orderedParticipants.length === 0 ? (
                  <div className="text-gray-400 text-sm italic text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                    Drop participants here
                  </div>
                ) : (
                  orderedParticipants.map((participant, idx) => {
                    const display = getParticipantDisplay(participant);
                    const isDragging =
                      draggedIndex === idx && draggedTeeTimeId === teeTime.id;

                    return (
                      <div key={`participant-${participant.id}`}>
                        {/* Drop zone indicator above each item */}
                        {draggedTeeTimeId === teeTime.id && draggedIndex !== null && (
                          <div
                            className={`h-2 transition-all duration-200 ${
                              hoveredDropIndex === idx
                                ? "bg-blue-500 rounded-full opacity-100 my-2 shadow-lg"
                                : "opacity-0"
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setHoveredDropIndex(idx);
                            }}
                            onDragLeave={(e) => {
                              e.stopPropagation();
                              setHoveredDropIndex(null);
                            }}
                            onDrop={(e) => handleReorderDrop(e, teeTime, idx)}
                          />
                        )}
                        <div
                          className={`flex items-center justify-between bg-blue-100 rounded-lg p-3 transition-all ${
                            isDragging ? "opacity-50 rotate-2 scale-105" : ""
                          }`}
                          draggable
                          onDragStart={(e) => handleReorderDragStart(e, teeTime.id, idx)}
                          onDragOver={handleDragOver}
                          onDragEnd={resetDragState}
                          style={{ cursor: isDragging ? "grabbing" : "grab" }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-gray-400 cursor-grab flex-shrink-0">☰</span>
                            <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {display.displayName}
                            </span>
                            {display.subText && (
                              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded flex-shrink-0">
                                {display.subText}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {display.handicap !== undefined && (
                              <span className="text-xs text-blue-700 font-mono">
                                {display.handicap.toFixed(1)}
                              </span>
                            )}
                            <button
                              onClick={() => onRemoveParticipant(participant.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Drop zone at the end for adding to bottom */}
                {draggedTeeTimeId === teeTime.id && draggedIndex !== null && (
                  <div
                    className={`h-2 transition-all duration-200 ${
                      hoveredDropIndex === orderedParticipants.length
                        ? "bg-blue-500 rounded-full opacity-100 my-2 shadow-lg"
                        : "opacity-0"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHoveredDropIndex(orderedParticipants.length);
                    }}
                    onDragLeave={(e) => {
                      e.stopPropagation();
                      setHoveredDropIndex(null);
                    }}
                    onDrop={(e) => handleReorderDrop(e, teeTime, orderedParticipants.length)}
                  />
                )}
              </div>

              {isOverLimit && (
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
              Create tee times above to start assigning participants.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
