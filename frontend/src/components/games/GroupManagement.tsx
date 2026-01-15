import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  X,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getGamePlayerDisplayName } from "@/utils/player-display";
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable,
  DragOverlay,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { GamePlayer } from "../../../../src/types";

// ============================================================================
// Types
// ============================================================================

export interface LocalGroup {
  id: number | null;
  name: string;
  playerIds: number[];
}

export interface GroupManagementProps {
  /** List of all players in the game */
  players: GamePlayer[];
  /** Current groups configuration */
  groups: LocalGroup[];
  /** Callback when groups change */
  onGroupsChange: (groups: LocalGroup[]) => void;
  /** Optional callback to remove a player from the game entirely */
  onRemovePlayer?: (playerId: number, playerName: string) => void;
  /** Optional callback when a group is removed */
  onRemoveGroup?: (groupIndex: number, group: LocalGroup) => Promise<void>;
  /** Whether to show the tap-to-assign modal for empty slots */
  showTapToAssign?: boolean;
  /** Layout variant - 'setup' has different container styling than 'modal' */
  variant?: "setup" | "modal";
}

// ============================================================================
// Droppable Group Component
// ============================================================================

function DroppableGroup({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`transition-colors ${isOver ? "bg-turf/10 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Draggable Player Component
// ============================================================================

function DraggablePlayer({
  id,
  displayName,
  isGuest,
  playHandicap,
  showDragHandle = true,
}: {
  id: number;
  displayName: string;
  isGuest: boolean;
  playHandicap: number | null | undefined;
  showDragHandle?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center py-3 hover:bg-turf/5 transition-colors min-h-[44px] ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{ touchAction: "none" }}
    >
      {showDragHandle && (
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing text-charcoal/40 hover:text-turf mr-3 touch-none"
          style={{ WebkitUserSelect: "none", userSelect: "none" }}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1">
        <div className="text-sm font-medium text-charcoal">{displayName}</div>
        <div className="text-xs text-charcoal/70 mt-0.5">
          {isGuest && "Guest • "}PHCP: {playHandicap?.toFixed(1) || "0.0"}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Draggable Player In Group Component (with slot number)
// ============================================================================

function DraggablePlayerInGroup({
  id,
  slotNumber,
  displayName,
  isGuest,
  playHandicap,
  onRemove,
}: {
  id: number;
  slotNumber: number;
  displayName: string;
  isGuest: boolean;
  playHandicap: number | null | undefined;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center py-3 hover:bg-turf/5 transition-colors min-h-[44px] ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{ touchAction: "none" }}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-charcoal/40 hover:text-turf mr-3 touch-none"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-charcoal/40 mr-3 w-4">
        {slotNumber}.
      </span>
      <div className="flex-1">
        <div className="text-sm font-medium text-charcoal">{displayName}</div>
        <div className="text-xs text-charcoal/70 mt-0.5">
          {isGuest && "Guest • "}PHCP: {playHandicap?.toFixed(1) || "0.0"}
        </div>
      </div>
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        variant="ghost"
        size="icon"
        className="text-coral hover:text-flag h-7 w-7"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GroupManagement({
  players,
  groups,
  onGroupsChange,
  onRemovePlayer,
  onRemoveGroup,
  showTapToAssign = true,
  variant = "modal",
}: GroupManagementProps) {
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);
  const [groupsCollapsed, setGroupsCollapsed] = useState<
    Record<number, boolean>
  >({});
  const [unassignedCollapsed, setUnassignedCollapsed] = useState(false);

  // Tap-to-assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    groupIndex: number;
    slotIndex: number;
  } | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get unassigned players
  const unassignedPlayers = players.filter(
    (p) => !groups.some((g) => g.playerIds.includes(p.id))
  );

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleDragStart = (event: DragStartEvent) => {
    setActivePlayerId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayerId(null);

    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    const activeGroupIndex = groups.findIndex((g) =>
      g.playerIds.includes(activeId)
    );
    const isActiveUnassigned = activeGroupIndex === -1;

    let targetGroupIndex = -1;
    let targetIsUnassigned = false;

    if (typeof overId === "string") {
      if (overId === "unassigned") {
        targetIsUnassigned = true;
      } else if (overId.startsWith("group-")) {
        targetGroupIndex = parseInt(overId.replace("group-", ""));
      }
    }

    if (
      (isActiveUnassigned && targetIsUnassigned) ||
      (!isActiveUnassigned &&
        !targetIsUnassigned &&
        activeGroupIndex === targetGroupIndex)
    ) {
      return;
    }

    // Moving from unassigned to a group
    if (isActiveUnassigned && !targetIsUnassigned && targetGroupIndex !== -1) {
      const targetGroup = groups[targetGroupIndex];
      const firstEmptySlot = targetGroup.playerIds.findIndex((id) => !id);

      if (firstEmptySlot !== -1) {
        const newPlayerIds = [...targetGroup.playerIds];
        newPlayerIds[firstEmptySlot] = activeId;
        const newGroups = groups.map((group, idx) =>
          idx === targetGroupIndex ? { ...group, playerIds: newPlayerIds } : group
        );
        onGroupsChange(newGroups);
      } else if (targetGroup.playerIds.length < 4) {
        const newGroups = groups.map((group, idx) =>
          idx === targetGroupIndex
            ? { ...group, playerIds: [...group.playerIds, activeId] }
            : group
        );
        onGroupsChange(newGroups);
      } else {
        toast.error("Group limit: maximum 4 players per group");
      }
      return;
    }

    // Moving from a group to unassigned
    if (!isActiveUnassigned && targetIsUnassigned) {
      const newGroups = groups.map((group, idx) =>
        idx === activeGroupIndex
          ? { ...group, playerIds: group.playerIds.filter((id) => id !== activeId) }
          : group
      );
      onGroupsChange(newGroups);
      return;
    }

    // Moving between different groups
    if (
      !isActiveUnassigned &&
      !targetIsUnassigned &&
      activeGroupIndex !== targetGroupIndex &&
      targetGroupIndex !== -1
    ) {
      const targetGroup = groups[targetGroupIndex];
      const firstEmptySlot = targetGroup.playerIds.findIndex((id) => !id);

      const newGroups = groups.map((group, idx) => {
        if (idx === activeGroupIndex) {
          return {
            ...group,
            playerIds: group.playerIds.filter((id) => id !== activeId),
          };
        }
        if (idx === targetGroupIndex) {
          if (firstEmptySlot !== -1) {
            const newPlayerIds = [...group.playerIds];
            newPlayerIds[firstEmptySlot] = activeId;
            return { ...group, playerIds: newPlayerIds };
          } else if (group.playerIds.length < 4) {
            return { ...group, playerIds: [...group.playerIds, activeId] };
          } else {
            toast.error("Group limit: maximum 4 players per group");
            return group;
          }
        }
        return group;
      });
      onGroupsChange(newGroups);
    }
  };

  const handleAddGroup = () => {
    onGroupsChange([
      ...groups,
      { id: null, name: `Group ${groups.length + 1}`, playerIds: [] },
    ]);
  };

  const handleRemoveGroup = async (groupIndex: number) => {
    const group = groups[groupIndex];
    if (onRemoveGroup) {
      await onRemoveGroup(groupIndex, group);
    }
    onGroupsChange(groups.filter((_, i) => i !== groupIndex));
  };

  const handleRemovePlayerFromGroup = (
    gamePlayerId: number,
    groupIndex: number
  ) => {
    const newGroups = groups.map((group, idx) => {
      if (idx !== groupIndex) return group;
      return {
        ...group,
        playerIds: group.playerIds.filter((id) => id !== gamePlayerId),
      };
    });
    onGroupsChange(newGroups);
  };

  const handleAssignPlayerToGroup = (
    gamePlayerId: number,
    groupIndex: number
  ) => {
    if (groups[groupIndex].playerIds.includes(gamePlayerId)) {
      return;
    }

    if (groups[groupIndex].playerIds.length >= 4) {
      toast.error("Group limit: maximum 4 players per group");
      return;
    }

    const newGroups = groups.map((group, idx) => {
      const filteredIds = group.playerIds.filter((id) => id !== gamePlayerId);
      if (idx === groupIndex) {
        return { ...group, playerIds: [...filteredIds, gamePlayerId] };
      }
      return { ...group, playerIds: filteredIds };
    });
    onGroupsChange(newGroups);
  };

  const handleToggleGroupCollapse = (groupIndex: number) => {
    setGroupsCollapsed((prev) => ({
      ...prev,
      [groupIndex]: !prev[groupIndex],
    }));
  };

  const handleOpenAssignModal = (groupIndex: number, slotIndex: number) => {
    setAssignTarget({ groupIndex, slotIndex });
    setAssignModalOpen(true);
  };

  const handleAssignPlayerToSlot = (gamePlayerId: number) => {
    if (!assignTarget) return;

    const newGroups = groups.map((group, idx) => {
      const filteredIds = group.playerIds.filter((id) => id !== gamePlayerId);

      if (idx === assignTarget.groupIndex) {
        const newPlayerIds = [...filteredIds];
        while (newPlayerIds.length <= assignTarget.slotIndex) {
          newPlayerIds.push(0);
        }
        newPlayerIds[assignTarget.slotIndex] = gamePlayerId;
        return { ...group, playerIds: newPlayerIds };
      }

      return { ...group, playerIds: filteredIds };
    });

    onGroupsChange(newGroups);
    setAssignModalOpen(false);
    setAssignTarget(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  const activePlayer = activePlayerId
    ? players.find((p) => p.id === activePlayerId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Unassigned Players */}
      {unassignedPlayers.length > 0 && (
        <div className={variant === "setup" ? "bg-soft-grey/30 rounded-b-2xl shadow-lg p-6 mb-4" : "mb-4"}>
          <Collapsible
            open={!unassignedCollapsed}
            onOpenChange={() => setUnassignedCollapsed(!unassignedCollapsed)}
          >
            <div className={`border-l-4 border-coral bg-white rounded overflow-hidden ${variant === "setup" ? "sticky top-0 z-10" : ""}`}>
              <div className="bg-coral/10">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-4 py-3 hover:bg-coral/20 transition-colors text-left">
                    {unassignedCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-charcoal" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-charcoal" />
                    )}
                    <span className="text-sm font-bold uppercase tracking-wide text-charcoal">
                      Unassigned
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-coral text-white border-0 font-semibold"
                    >
                      {unassignedPlayers.length}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <DroppableGroup id="unassigned">
                  <div className="divide-y divide-soft-grey max-h-[400px] overflow-y-auto px-3">
                    {unassignedPlayers.map((gp) => {
                      const displayName = getGamePlayerDisplayName(gp);
                      const isGuest = Boolean(gp.guest_name);
                      return (
                        <div key={gp.id} className="relative">
                          <DraggablePlayer
                            id={gp.id}
                            displayName={displayName}
                            isGuest={isGuest}
                            playHandicap={gp.play_handicap}
                            showDragHandle={true}
                          />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-charcoal/60 hover:text-turf"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="z-50 bg-scorecard shadow-lg"
                              >
                                {groups.map((group, idx) => (
                                  <DropdownMenuItem
                                    key={idx}
                                    onClick={() =>
                                      handleAssignPlayerToGroup(gp.id, idx)
                                    }
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Assign to {group.name}
                                  </DropdownMenuItem>
                                ))}
                                {onRemovePlayer && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onRemovePlayer(gp.id, displayName)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove from game
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </DroppableGroup>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      )}

      {/* Groups */}
      <div className={variant === "setup" ? "max-w-4xl mx-auto px-2 mb-6" : ""}>
        <div className="space-y-3">
          {groups.map((group, groupIndex) => (
            <Collapsible
              key={groupIndex}
              open={!groupsCollapsed[groupIndex]}
              onOpenChange={() => handleToggleGroupCollapse(groupIndex)}
            >
              <div className="border-l-4 border-turf bg-white rounded overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-turf/10">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 hover:bg-turf/20 -mx-2 -my-1 px-2 py-1 rounded transition-colors">
                      {groupsCollapsed[groupIndex] ? (
                        <ChevronRight className="h-4 w-4 text-charcoal" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-charcoal" />
                      )}
                      <span className="text-sm font-bold uppercase tracking-wide text-charcoal">
                        {group.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-turf text-white border-0 font-semibold"
                      >
                        {group.playerIds.filter(Boolean).length}/4
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  {groups.length > 1 && (
                    <Button
                      onClick={() => handleRemoveGroup(groupIndex)}
                      variant="ghost"
                      size="icon"
                      className="text-coral hover:text-flag hover:bg-coral/10 h-7 w-7"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <CollapsibleContent>
                  <DroppableGroup id={`group-${groupIndex}`}>
                    <div className="divide-y divide-soft-grey px-4">
                      {[0, 1, 2, 3].map((slotIndex) => {
                        const playerId = group.playerIds[slotIndex];
                        const player = playerId
                          ? players.find((gp) => gp.id === playerId)
                          : null;

                        if (player) {
                          return (
                            <DraggablePlayerInGroup
                              key={slotIndex}
                              id={playerId}
                              slotNumber={slotIndex + 1}
                              displayName={getGamePlayerDisplayName(player)}
                              isGuest={Boolean(player.guest_name)}
                              playHandicap={player.play_handicap}
                              onRemove={() =>
                                handleRemovePlayerFromGroup(
                                  playerId,
                                  groupIndex
                                )
                              }
                            />
                          );
                        } else {
                          return (
                            <div
                              key={slotIndex}
                              onClick={
                                showTapToAssign
                                  ? () =>
                                      handleOpenAssignModal(
                                        groupIndex,
                                        slotIndex
                                      )
                                  : undefined
                              }
                              className={`flex items-center py-3 min-h-[44px] ${
                                showTapToAssign
                                  ? "cursor-pointer hover:bg-turf/10 transition-colors"
                                  : ""
                              }`}
                            >
                              <GripVertical className="h-4 w-4 text-charcoal/20 mr-3" />
                              <span className="text-sm font-medium text-charcoal/40 mr-3 w-4">
                                {slotIndex + 1}.
                              </span>
                              <span className="flex-1 text-sm italic text-charcoal/50">
                                {showTapToAssign
                                  ? "Tap to assign player"
                                  : "Drag player here"}
                              </span>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </DroppableGroup>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}

          <Button
            onClick={handleAddGroup}
            variant="outline"
            className="w-full border-2 border-dashed border-turf/40 bg-white text-turf hover:bg-turf/10 hover:border-turf/60 h-11 font-semibold rounded"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Group
          </Button>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activePlayer ? (
          <div className="bg-scorecard rounded-lg border-2 border-turf shadow-xl px-4 py-3 min-h-[56px] flex items-center">
            <GripVertical className="h-5 w-5 text-turf mr-3" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-charcoal">
                {getGamePlayerDisplayName(activePlayer)}
              </div>
              <div className="text-xs text-charcoal/70 mt-0.5">
                Drag to assign
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Tap-to-Assign Sheet Modal */}
      {showTapToAssign && (
        <Sheet open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                Assign to{" "}
                {assignTarget ? groups[assignTarget.groupIndex].name : ""} -
                Slot {assignTarget ? assignTarget.slotIndex + 1 : ""}
              </SheetTitle>
              <SheetDescription>
                Select a player to assign to this slot
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {/* Unassigned Players Section */}
              {unassignedPlayers.length > 0 && (
                <div>
                  <div className="border-l-4 border-coral pl-3 mb-2">
                    <h3 className="text-sm font-medium text-charcoal">
                      Unassigned
                    </h3>
                  </div>
                  <div className="divide-y divide-soft-grey border border-soft-grey rounded-lg overflow-hidden">
                    {unassignedPlayers.map((gp) => {
                      const displayName = getGamePlayerDisplayName(gp);
                      const isGuest = Boolean(gp.guest_name);
                      return (
                        <button
                          key={gp.id}
                          onClick={() => handleAssignPlayerToSlot(gp.id)}
                          className="w-full px-4 py-3 text-left hover:bg-sky/5 transition-colors"
                        >
                          <div className="text-sm font-medium text-charcoal">
                            {displayName}
                          </div>
                          <div className="text-xs text-charcoal/70 mt-0.5">
                            {isGuest && "Guest • "}PHCP:{" "}
                            {gp.play_handicap?.toFixed(1) || "0.0"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other Groups Section */}
              {groups.map((group, idx) => {
                const playersInGroup = group.playerIds
                  .filter(Boolean)
                  .map((id) => players.find((gp) => gp.id === id))
                  .filter(Boolean);
                if (playersInGroup.length === 0) return null;

                return (
                  <div key={idx}>
                    <div className="border-l-4 border-soft-grey pl-3 mb-2">
                      <h3 className="text-sm font-medium text-charcoal">
                        {group.name}
                      </h3>
                    </div>
                    <div className="divide-y divide-soft-grey border border-soft-grey rounded-lg overflow-hidden">
                      {playersInGroup.map((player) => {
                        if (!player) return null;
                        const displayName = getGamePlayerDisplayName(player);
                        const isGuest = Boolean(player.guest_name);
                        return (
                          <button
                            key={player.id}
                            onClick={() => handleAssignPlayerToSlot(player.id)}
                            className="w-full px-4 py-3 text-left hover:bg-sky/5 transition-colors"
                          >
                            <div className="text-sm font-medium text-charcoal">
                              {displayName}
                            </div>
                            <div className="text-xs text-charcoal/70 mt-0.5">
                              {isGuest && "Guest • "}PHCP:{" "}
                              {player.play_handicap?.toFixed(1) || "0.0"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </DndContext>
  );
}

export default GroupManagement;
