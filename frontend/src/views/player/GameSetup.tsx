import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useCourses, type CourseTee } from "@/api/courses";
import { usePlayers, type Player } from "@/api/players";
import {
  useCreateGame,
  useUpdateGame,
  useAddGamePlayer,
  useRemoveGamePlayer,
  useAssignTee,
  useCreateGameGroup,
  useSetGroupMembers,
  useGamePlayers,
  useUpdateGameStatus,
} from "@/api/games";
import { useCourseTees } from "@/api/courses";
import type { GameScoringMode } from "@/types/games";
import { Loader2, ChevronLeft, ChevronRight, Search, X, Plus, GripVertical, MoreVertical, ChevronDown, Trash2, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ItemGroup, Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator } from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { DndContext, pointerWithin, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, useDroppable, DragOverlay } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import { getGamePlayerDisplayName } from "@/utils/player-display";

// ============================================================================
// Types
// ============================================================================

interface GameSetupState {
  gameId: number | null;
  courseId: number | null;
  courseName: string | null;
  groups: Array<{ name: string; playerIds: number[] }>;
  gameType: string;
  scoringMode: GameScoringMode;
}

// ============================================================================
// Droppable Group Component
// ============================================================================

interface DroppableGroupProps {
  id: string;
  children: React.ReactNode;
}

function DroppableGroup({ id, children }: DroppableGroupProps) {
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
// Main Component
// ============================================================================

export default function GameSetup() {
  useAuth();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState(1);
  const [state, setState] = useState<GameSetupState>({
    gameId: null,
    courseId: null,
    courseName: null,
    groups: [{ name: "Group 1", playerIds: [] }],
    gameType: "stroke_play",
    scoringMode: "gross",
  });

  // Step 1 state (Course)
  const [courseSearchQuery, setCourseSearchQuery] = useState("");

  // Step 2 state (Tee Box)
  const [selectedTeeId, setSelectedTeeId] = useState<string>("");

  // Step 3 state (Players)
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestHandicap, setGuestHandicap] = useState("0");
  const [guestGender, setGuestGender] = useState<"male" | "female">("male");

  // Step 4 state (Groups - drag and drop)
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);

  // Step 4 collapse states
  const [unassignedCollapsed, setUnassignedCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState<Record<number, boolean>>({});

  // Step 4 tap-to-assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ groupIndex: number; slotIndex: number } | null>(null);

  // Step 5 scoring mode multiselect state
  const [selectedScoringModes, setSelectedScoringModes] = useState<Set<'gross' | 'net'>>(
    state.scoringMode === 'both' ? new Set(['gross', 'net']) :
    state.scoringMode === 'gross' ? new Set(['gross']) :
    new Set(['net'])
  );

  // API hooks
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: allPlayers, isLoading: playersLoading } = usePlayers();
  const { data: courseTees } = useCourseTees(state.courseId || 0);
  const { data: gamePlayers, refetch: refetchGamePlayers } = useGamePlayers(state.gameId || 0);

  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const addGamePlayer = useAddGamePlayer();
  const removeGamePlayer = useRemoveGamePlayer();
  const assignTee = useAssignTee();
  const createGameGroup = useCreateGameGroup();
  const setGroupMembers = useSetGroupMembers();
  const updateGameStatus = useUpdateGameStatus();

  // Filtered courses for search
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    const query = courseSearchQuery.toLowerCase();
    return courses.filter((c) =>
      c.name.toLowerCase().includes(query) ||
      c.club_name?.toLowerCase().includes(query)
    );
  }, [courses, courseSearchQuery]);

  // Filtered players for search (exclude already added players)
  const filteredPlayers = useMemo(() => {
    if (!allPlayers) return [];
    const query = playerSearchQuery.toLowerCase();
    const alreadyAddedPlayerIds = gamePlayers?.map((gp) => gp.player_id).filter(Boolean) || [];
    return allPlayers.filter(
      (p) => p.name.toLowerCase().includes(query) && !alreadyAddedPlayerIds.includes(p.id)
    );
  }, [allPlayers, playerSearchQuery, gamePlayers]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (allows scrolling)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms press and hold before drag starts (allows scrolling)
        tolerance: 5, // Allow 5px of movement during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Refetch players when returning to step 3 (players)
  useEffect(() => {
    if (step === 3 && state.gameId) {
      refetchGamePlayers();
    }
  }, [step, state.gameId, refetchGamePlayers]);

  // Auto-assign players to Group 1 if ≤4 total players
  useEffect(() => {
    if (step === 4 && gamePlayers && gamePlayers.length > 0 && gamePlayers.length <= 4) {
      // Check if any players are unassigned
      const unassignedPlayers = gamePlayers.filter(
        (gp) => !state.groups.some((g) => g.playerIds.includes(gp.id))
      );

      if (unassignedPlayers.length > 0) {
        // Auto-assign all unassigned players to Group 1 (no duplicates)
        setState((prev) => {
          const newGroups = [...prev.groups];
          const uniquePlayerIds = Array.from(new Set(gamePlayers.map((gp) => gp.id)));
          newGroups[0].playerIds = uniquePlayerIds;
          return { ...prev, groups: newGroups };
        });
      }
    }
  }, [step, gamePlayers]);

  // ============================================================================
  // Step 1: Course Selection
  // ============================================================================

  const handleCourseSelect = async (courseId: number, courseName: string) => {
    try {
      let gameId = state.gameId;

      if (gameId) {
        // Update existing game
        await updateGame.mutateAsync({
          gameId,
          data: { course_id: courseId },
        });
      } else {
        // Create new game
        const game = await createGame.mutateAsync({
          course_id: courseId,
          game_type: "stroke_play",
          scoring_mode: "gross",
        });
        gameId = game.id;
      }

      setState((prev) => ({
        ...prev,
        gameId,
        courseId,
        courseName,
      }));

      setStep(2);
    } catch (error) {
      console.error("Failed to save game:", error);
      alert("Failed to save game. Please try again.");
    }
  };

  // ============================================================================
  // Step 2: Player Setup
  // ============================================================================

  const handleAddRegisteredPlayer = async (player: Player) => {
    if (!state.gameId) return;

    try {
      const teeId = selectedTeeId ? parseInt(selectedTeeId) : undefined;
      await addGamePlayer.mutateAsync({
        gameId: state.gameId,
        data: {
          player_id: player.id,
          tee_id: teeId,
        },
      });

      setPlayerSearchQuery("");
      await refetchGamePlayers();
    } catch (error) {
      console.error("Failed to add player:", error);
      alert("Failed to add player. Please try again.");
    }
  };

  const handleAddGuestPlayer = async () => {
    if (!state.gameId || !guestName.trim()) return;

    try {
      const handicap = parseFloat(guestHandicap) || 0;
      const teeId = selectedTeeId ? parseInt(selectedTeeId) : undefined;

      await addGamePlayer.mutateAsync({
        gameId: state.gameId,
        data: {
          guest_name: guestName.trim(),
          guest_handicap: handicap,
          guest_gender: guestGender,
          tee_id: teeId,
        },
      });

      setGuestName("");
      setGuestHandicap("0");
      setGuestGender("male");
      setGuestModalOpen(false);
      await refetchGamePlayers();
    } catch (error) {
      console.error("Failed to add guest player:", error);
      alert("Failed to add guest player. Please try again.");
    }
  };

  const handleRemovePlayer = async (gamePlayerId: number) => {
    if (!state.gameId) return;

    try {
      await removeGamePlayer.mutateAsync({
        gameId: state.gameId,
        playerId: gamePlayerId,
      });
      await refetchGamePlayers();
    } catch (error) {
      console.error("Failed to remove player:", error);
      alert("Failed to remove player. Please try again.");
    }
  };

  // ============================================================================
  // Step 3: Tee Box Assignment
  // ============================================================================

  const handleTeeSelection = async (teeIdStr: string) => {
    const teeId = parseInt(teeIdStr);
    if (isNaN(teeId)) return;

    setSelectedTeeId(teeIdStr);

    // If there are existing players, update their tee assignments
    if (state.gameId && gamePlayers && gamePlayers.length > 0) {
      try {
        for (const gp of gamePlayers) {
          await assignTee.mutateAsync({
            gameId: state.gameId,
            playerId: gp.id,
            teeId,
          });
        }
        await refetchGamePlayers();
      } catch (error) {
        console.error("Failed to assign tee:", error);
        alert("Failed to assign tee. Please try again.");
      }
    }
  };

  // ============================================================================
  // Step 4: Group Assignment
  // ============================================================================

  const handleDragStart = (event: DragStartEvent) => {
    setActivePlayerId(event.active.id as number);
  };

  const handleAddGroup = () => {
    setState((prev) => ({
      ...prev,
      groups: [...prev.groups, { name: `Group ${prev.groups.length + 1}`, playerIds: [] }],
    }));
  };

  const handleRemoveGroup = (groupIndex: number) => {
    setState((prev) => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== groupIndex),
    }));
  };

  const handleAssignPlayerToGroup = (gamePlayerId: number, groupIndex: number) => {
    setState((prev) => {
      const newGroups = [...prev.groups];

      // Check if player is already in the group (prevent duplicates)
      if (newGroups[groupIndex].playerIds.includes(gamePlayerId)) {
        return prev;
      }

      // Remove player from all groups first to get accurate count
      newGroups.forEach((g) => {
        g.playerIds = g.playerIds.filter((id) => id !== gamePlayerId);
      });

      // Now check if adding this player would exceed the limit
      if (newGroups[groupIndex].playerIds.length + 1 > 4) {
        toast.error("Group limit: maximum 4 players per group");
        return prev;
      }

      // Add to target group
      newGroups[groupIndex].playerIds.push(gamePlayerId);
      return { ...prev, groups: newGroups };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayerId(null);

    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    // Find which group the active item is currently in
    const activeGroupIndex = state.groups.findIndex((g) => g.playerIds.includes(activeId));
    const isActiveUnassigned = activeGroupIndex === -1;

    // Determine the target location
    let targetGroupIndex = -1;
    let targetIsUnassigned = false;

    // Check if dropping onto a droppable zone (group-0, group-1, or unassigned)
    if (typeof overId === "string") {
      if (overId === "unassigned") {
        targetIsUnassigned = true;
      } else if (overId.startsWith("group-")) {
        targetGroupIndex = parseInt(overId.replace("group-", ""));
      }
    }

    // If same location, do nothing
    if (
      (isActiveUnassigned && targetIsUnassigned) ||
      (!isActiveUnassigned && !targetIsUnassigned && activeGroupIndex === targetGroupIndex)
    ) {
      return;
    }

    setState((prev) => {
      const newGroups = [...prev.groups];

      // Moving from unassigned to a group
      if (isActiveUnassigned && !targetIsUnassigned && targetGroupIndex !== -1) {
        const targetGroup = newGroups[targetGroupIndex];
        // Find first empty slot
        const firstEmptySlot = targetGroup.playerIds.findIndex((id) => !id);

        if (firstEmptySlot !== -1) {
          // Assign to first empty slot
          targetGroup.playerIds[firstEmptySlot] = activeId;
        } else if (targetGroup.playerIds.length < 4) {
          // No empty slots, but group isn't full - add to end
          targetGroup.playerIds.push(activeId);
        } else {
          // Group is full
          toast.error("Group limit: maximum 4 players per group");
          return prev;
        }
        return { ...prev, groups: newGroups };
      }

      // Moving from a group to unassigned
      if (!isActiveUnassigned && targetIsUnassigned) {
        newGroups[activeGroupIndex].playerIds = newGroups[activeGroupIndex].playerIds.filter(
          (id) => id !== activeId
        );
        return { ...prev, groups: newGroups };
      }

      // Moving between different groups
      if (!isActiveUnassigned && !targetIsUnassigned && activeGroupIndex !== targetGroupIndex && targetGroupIndex !== -1) {
        const targetGroup = newGroups[targetGroupIndex];

        // Remove from old group
        newGroups[activeGroupIndex].playerIds = newGroups[activeGroupIndex].playerIds.filter(
          (id) => id !== activeId
        );

        // Find first empty slot in target group
        const firstEmptySlot = targetGroup.playerIds.findIndex((id) => !id);

        if (firstEmptySlot !== -1) {
          targetGroup.playerIds[firstEmptySlot] = activeId;
        } else if (targetGroup.playerIds.length < 4) {
          targetGroup.playerIds.push(activeId);
        } else {
          toast.error("Group limit: maximum 4 players per group");
          return prev;
        }
        return { ...prev, groups: newGroups };
      }

      return prev;
    });
  };

  const handleRemovePlayerFromGroup = (gamePlayerId: number, groupIndex: number) => {
    setState((prev) => {
      const newGroups = [...prev.groups];
      newGroups[groupIndex].playerIds = newGroups[groupIndex].playerIds.filter((id) => id !== gamePlayerId);
      return { ...prev, groups: newGroups };
    });
  };

  const handleOpenAssignModal = (groupIndex: number, slotIndex: number) => {
    setAssignTarget({ groupIndex, slotIndex });
    setAssignModalOpen(true);
  };

  const handleAssignPlayerToSlot = (gamePlayerId: number) => {
    if (!assignTarget) return;

    setState((prev) => {
      const newGroups = [...prev.groups];
      const targetGroup = newGroups[assignTarget.groupIndex];

      // Remove player from all groups first
      newGroups.forEach((g) => {
        g.playerIds = g.playerIds.filter((id) => id !== gamePlayerId);
      });

      // Create new player array for target group
      const newPlayerIds = [...targetGroup.playerIds];

      // Assign new player to slot
      newPlayerIds[assignTarget.slotIndex] = gamePlayerId;

      targetGroup.playerIds = newPlayerIds;

      return { ...prev, groups: newGroups };
    });

    setAssignModalOpen(false);
    setAssignTarget(null);
  };

  const handleToggleGroupCollapse = (groupIndex: number) => {
    setGroupsCollapsed((prev) => ({
      ...prev,
      [groupIndex]: !prev[groupIndex],
    }));
  };

  // ============================================================================
  // Step 5: Game Configuration & Finalization
  // ============================================================================

  const handleToggleScoringMode = (mode: 'gross' | 'net') => {
    setSelectedScoringModes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mode)) {
        newSet.delete(mode);
      } else {
        newSet.add(mode);
      }

      // Ensure at least one mode is selected
      if (newSet.size === 0) {
        newSet.add(mode);
      }

      // Update state.scoringMode based on selection
      let scoringMode: GameScoringMode;
      if (newSet.has('gross') && newSet.has('net')) {
        scoringMode = 'both';
      } else if (newSet.has('gross')) {
        scoringMode = 'gross';
      } else {
        scoringMode = 'net';
      }

      setState((prevState) => ({ ...prevState, scoringMode }));
      return newSet;
    });
  };

  const handleFinishSetup = async () => {
    if (!state.gameId) return;

    try {
      // Create groups on backend
      for (const group of state.groups) {
        if (group.playerIds.length === 0) continue;

        const createdGroup = await createGameGroup.mutateAsync({
          gameId: state.gameId,
          data: {
            name: group.name,
            start_hole: 1,
          },
        });

        // Set group members
        await setGroupMembers.mutateAsync({
          gameId: state.gameId,
          groupId: createdGroup.id,
          gamePlayerIds: group.playerIds,
        });
      }

      // Update game status to ready
      await updateGameStatus.mutateAsync({
        gameId: state.gameId,
        status: "ready",
      });

      // Navigate to game play or guest select
      const hasGuests = gamePlayers?.some((p) => p.guest_name);
      if (hasGuests) {
        navigate({ to: "/games/$gameId/guest-select", params: { gameId: state.gameId.toString() } });
      } else {
        navigate({ to: "/player/games/$gameId/play", params: { gameId: state.gameId.toString() } });
      }
    } catch (error) {
      console.error("Failed to finish setup:", error);
      alert("Failed to finish setup. Please try again.");
    }
  };

  // ============================================================================
  // Validation
  // ============================================================================

  // Step 2: Tee box selected
  const canProceedStep2 = Boolean(selectedTeeId);
  // Step 3: At least 1 player added
  const canProceedStep3 = (gamePlayers?.length || 0) >= 1;
  // Step 4: All groups valid and all players assigned
  const canProceedStep4 =
    state.groups.every((g) => g.playerIds.filter(Boolean).length > 0 && g.playerIds.filter(Boolean).length <= 4) &&
    (gamePlayers?.every((gp) => state.groups.some((g) => g.playerIds.includes(gp.id))) || false);

  // ============================================================================
  // Render Loading
  // ============================================================================

  if (coursesLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-turf" />
      </div>
    );
  }

  // ============================================================================
  // Render Steps
  // ============================================================================

  return (
    <PlayerPageLayout
      title="Game Setup"
      subtitle={`Step ${step} of 5`}
      onBackClick={() => navigate({ to: "/player" })}
    >
      <div className="max-w-4xl mx-auto px-2">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-soft-grey/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-turf transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-scorecard rounded-2xl shadow-lg p-6 mb-6" style={{ paddingTop: step === 4 ? '1rem' : '1.5rem', paddingBottom: step === 4 ? '0' : '1.5rem' }}>
          {/* Step 1: Course Selection */}
          {step === 1 && (
            <div>
              <h2 className="text-display-sm text-charcoal mb-2">Select Course</h2>
              <p className="text-body-md text-charcoal/70 mb-6">
                Choose the course where you'll be playing
              </p>

              {/* Search Filter */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-charcoal/40 z-10" />
                  <Input
                    type="text"
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    placeholder="Search by course or club name..."
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              {/* Course List */}
              {filteredCourses.length === 0 ? (
                <div className="px-5 py-8 text-center text-charcoal/60">
                  No courses found
                </div>
              ) : (
                <div className="divide-y divide-soft-grey">
                  {filteredCourses.map((course) => {
                    // Check if course has a real club (not "Default Club" placeholder)
                    const hasRealClub = course.club_name && course.club_name !== "Default Club";

                    return (
                      <button
                        key={course.id}
                        onClick={() => handleCourseSelect(course.id, course.name)}
                        disabled={createGame.isPending}
                        className="disabled:opacity-50 disabled:cursor-not-allowed w-full text-left px-4 py-3 hover:bg-turf/5 transition-colors"
                      >
                        <div className="text-[15px] font-medium text-charcoal">
                          {hasRealClub ? course.club_name : course.name}
                        </div>
                        <div className="text-[13px] text-charcoal/70 mt-0.5">
                          {hasRealClub ? (
                            <>{course.name} • Par {course.pars.total} • {course.pars.holes.length} holes</>
                          ) : (
                            <>Par {course.pars.total} • {course.pars.holes.length} holes</>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Tee Box Selection */}
          {step === 2 && (
            <div>
              <h2 className="text-display-sm text-charcoal mb-2">Select Tee Box</h2>
              <p className="text-body-md text-charcoal/70 mb-6">
                Choose the default tee box for all players
              </p>

              <div>
                <label className="block text-label-md text-charcoal mb-3">
                  Tee Box
                </label>
                <Select
                  value={selectedTeeId}
                  onValueChange={handleTeeSelection}
                  disabled={assignTee.isPending}
                >
                  <SelectTrigger className="w-full h-12 text-base">
                    <SelectValue placeholder="Choose a tee box..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courseTees?.map((tee: CourseTee) => (
                      <SelectItem key={tee.id} value={tee.id.toString()}>
                        {tee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Player Setup */}
          {step === 3 && (
            <div>
              <h2 className="text-display-sm text-charcoal mb-2">Add Players</h2>
              <p className="text-body-md text-charcoal/70 mb-6">
                Add registered players or guests to your game
              </p>

              {/* Search Registered Players */}
              <div className="mb-6">
                <label className="block text-label-md text-charcoal mb-2">
                  Search Registered Players
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-charcoal/40 z-10" />
                  <Input
                    type="text"
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="pl-10 h-12"
                  />
                </div>

                {playerSearchQuery && filteredPlayers.length > 0 && (
                  <ItemGroup className="mt-2 max-h-48 overflow-y-auto border border-soft-grey rounded-xl bg-scorecard">
                    {filteredPlayers.map((player, index) => (
                      <React.Fragment key={player.id}>
                        <Item
                          asChild
                          size="sm"
                          className="cursor-pointer hover:bg-turf/5 transition-colors"
                        >
                          <button
                            onClick={() => handleAddRegisteredPlayer(player)}
                            disabled={addGamePlayer.isPending}
                            className="disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
                          >
                            <ItemContent>
                              <ItemTitle>{player.name}</ItemTitle>
                              <ItemDescription>HCP: {player.handicap.toFixed(1)}</ItemDescription>
                            </ItemContent>
                          </button>
                        </Item>
                        {index < filteredPlayers.length - 1 && <ItemSeparator />}
                      </React.Fragment>
                    ))}
                  </ItemGroup>
                )}
              </div>

              {/* Add Guest Player Button */}
              <div className="mb-6">
                <Button
                  onClick={() => setGuestModalOpen(true)}
                  variant="outline"
                  className="w-full h-11 justify-start text-turf border-turf/40 hover:bg-turf/5"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create guest player
                </Button>
              </div>

              {/* Current Players List */}
              {gamePlayers && gamePlayers.length > 0 && (
                <div>
                  <h3 className="text-label-lg text-charcoal mb-3">
                    Players Added ({gamePlayers.length})
                  </h3>
                  <div className="divide-y divide-soft-grey">
                    {gamePlayers.map((gp) => {
                      const displayName = getGamePlayerDisplayName(gp);
                      const isGuest = Boolean(gp.guest_name);

                      return (
                        <div key={gp.id} className="flex items-center py-3 hover:bg-sky/5 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-medium text-charcoal">{displayName}</div>
                            <div className="text-[13px] text-charcoal/70 mt-0.5">
                              {isGuest && "Guest • "}PHCP: {gp.play_handicap?.toFixed(1) || "0.0"}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRemovePlayer(gp.id)}
                            disabled={removeGamePlayer.isPending}
                            variant="ghost"
                            size="icon"
                            className="text-coral hover:text-flag h-8 w-8 ml-2"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Guest Player Modal */}
              <Sheet open={guestModalOpen} onOpenChange={setGuestModalOpen}>
                <SheetContent
                  side="bottom"
                  className="h-[100dvh] sm:h-auto sm:max-w-md sm:mx-auto sm:my-8 sm:rounded-2xl flex flex-col p-0"
                >
                  <div className="p-6 border-b border-soft-grey">
                    <SheetTitle className="text-xl font-semibold text-charcoal">Add Guest Player</SheetTitle>
                    <SheetDescription className="text-sm text-charcoal/70 mt-1">
                      Enter guest player details
                    </SheetDescription>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                      <div>
                        <label className="block text-sm text-charcoal/70 mb-2">
                          Name
                        </label>
                        <Input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Guest name"
                          className="h-12 border-soft-grey"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-charcoal/70 mb-2">
                          Handicap
                        </label>
                        <Input
                          type="number"
                          value={guestHandicap}
                          onChange={(e) => setGuestHandicap(e.target.value)}
                          placeholder="0"
                          step="0.1"
                          className="h-12 border-soft-grey"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-charcoal/70 mb-2">
                          Gender
                        </label>
                        <Select value={guestGender} onValueChange={(value: "male" | "female") => setGuestGender(value)}>
                          <SelectTrigger className="h-12 border-soft-grey">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-soft-grey bg-scorecard">
                    <Button
                      onClick={handleAddGuestPlayer}
                      disabled={!guestName.trim() || addGamePlayer.isPending}
                      className="w-full h-12"
                      variant="default"
                    >
                      {addGamePlayer.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        "Add Guest Player"
                      )}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Step 5: Game Configuration */}
          {step === 5 && (
            <div>
              <h2 className="text-display-sm text-charcoal mb-6">Game Settings</h2>

              {/* Game Type */}
              <label className="block text-label-md text-charcoal mb-3">Game Type</label>
              <div className="mb-6">
                <div className="px-4 py-3">
                  <div className="text-[15px] font-medium text-charcoal">Stroke Play</div>
                  <div className="text-[13px] text-charcoal/70 mt-0.5">
                    Standard stroke play format
                  </div>
                </div>
              </div>

              <div className="h-px bg-soft-grey mb-6" />

              {/* Scoring Mode */}
              <label className="block text-label-md text-charcoal mb-3">Scoring Mode</label>
              <div className="divide-y divide-soft-grey mb-6">
                <button
                  onClick={() => handleToggleScoringMode('gross')}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedScoringModes.has('gross')
                      ? "bg-turf/10"
                      : "hover:bg-turf/5"
                  }`}
                >
                  <div className="text-[15px] font-medium text-charcoal">Gross</div>
                  <div className="text-[13px] text-charcoal/70 mt-0.5">
                    Count raw scores only
                  </div>
                </button>
                <button
                  onClick={() => handleToggleScoringMode('net')}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedScoringModes.has('net')
                      ? "bg-turf/10"
                      : "hover:bg-turf/5"
                  }`}
                >
                  <div className="text-[15px] font-medium text-charcoal">Net</div>
                  <div className="text-[13px] text-charcoal/70 mt-0.5">
                    Apply handicaps to scores
                  </div>
                </button>
              </div>

              <div className="h-px bg-soft-grey mb-6" />

              {/* Summary */}
              <div>
                <h3 className="text-label-lg text-charcoal mb-4">Setup Summary</h3>
                <div className="space-y-3 text-body-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal/70">Course:</span>
                    <span className="text-charcoal font-medium">{state.courseName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal/70">Players:</span>
                    <span className="text-charcoal font-medium">{gamePlayers?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal/70">Groups:</span>
                    <span className="text-charcoal font-medium">{state.groups.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-charcoal/70">Scoring:</span>
                    <span className="text-charcoal font-medium capitalize">{state.scoringMode}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Unassigned Area (sticky, outside card) */}
        {step === 4 && gamePlayers && gamePlayers.filter((gp) => !state.groups.some((g) => g.playerIds.includes(gp.id))).length > 0 && (
          <div className="sticky top-0 z-10 bg-scorecard rounded-2xl shadow-lg p-6 mb-4">
            <Collapsible open={!unassignedCollapsed} onOpenChange={() => setUnassignedCollapsed(!unassignedCollapsed)}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-2 px-2 py-3 hover:bg-turf/5 transition-colors text-left -mx-2">
                  {unassignedCollapsed ? <ChevronRight className="h-4 w-4 text-turf" /> : <ChevronDown className="h-4 w-4 text-turf" />}
                  <span className="text-sm font-medium text-charcoal">Unassigned</span>
                  <Badge variant="secondary" className="bg-turf/10 text-turf border-0">
                    {gamePlayers.filter((gp) => !state.groups.some((g) => g.playerIds.includes(gp.id))).length}
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <DndContext
                  sensors={sensors}
                  collisionDetection={pointerWithin}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <DroppableGroup id="unassigned">
                    <div className="divide-y divide-soft-grey max-h-[400px] overflow-y-auto -mx-6 px-6">
                      {gamePlayers
                        .filter((gp) => !state.groups.some((g) => g.playerIds.includes(gp.id)))
                        .map((gp) => {
                          const displayName = getGamePlayerDisplayName(gp);
                          const isGuest = Boolean(gp.guest_name);
                          return (
                            <div key={gp.id} className="flex items-center py-3 hover:bg-turf/5 transition-colors min-h-[44px]">
                              <button type="button" className="cursor-grab active:cursor-grabbing text-charcoal/40 hover:text-turf mr-3">
                                <GripVertical className="h-4 w-4" />
                              </button>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-charcoal">{displayName}</div>
                                <div className="text-xs text-charcoal/70 mt-0.5">
                                  {isGuest && "Guest • "}PHCP: {gp.play_handicap?.toFixed(1) || "0.0"}
                                </div>
                              </div>
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-charcoal/60 hover:text-turf">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-50 bg-scorecard shadow-lg">
                                {state.groups.map((group, idx) => (
                                  <DropdownMenuItem
                                    key={idx}
                                    onClick={() => handleAssignPlayerToGroup(gp.id, idx)}
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Assign to {group.name}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem
                                  onClick={() => handleRemovePlayer(gp.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove from game
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          );
                        })}
                    </div>
                  </DroppableGroup>
                </DndContext>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Groups Section (outside card, below) - Only for Step 4 */}
        {step === 4 && (
          <div>
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Groups with Slots */}
              <div className="space-y-3 px-1">
                  {state.groups.map((group, groupIndex) => (
                    <Collapsible
                      key={groupIndex}
                      open={!groupsCollapsed[groupIndex]}
                      onOpenChange={() => handleToggleGroupCollapse(groupIndex)}
                    >
                      <div className="bg-scorecard rounded-lg border border-soft-grey overflow-hidden mx-0.5">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-soft-grey">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 hover:text-turf transition-colors">
                              {groupsCollapsed[groupIndex] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <span className="text-sm font-medium text-charcoal">{group.name}</span>
                              <Badge variant="secondary" className="bg-soft-grey/30 text-charcoal border-0">
                                {group.playerIds.filter(Boolean).length}/4
                              </Badge>
                            </button>
                          </CollapsibleTrigger>
                          {state.groups.length > 1 && (
                            <Button
                              onClick={() => handleRemoveGroup(groupIndex)}
                              variant="ghost"
                              size="icon"
                              className="text-coral hover:text-flag h-7 w-7"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <CollapsibleContent>
                          <DroppableGroup id={`group-${groupIndex}`}>
                            <div className="divide-y divide-soft-grey">
                              {[0, 1, 2, 3].map((slotIndex) => {
                                const playerId = group.playerIds[slotIndex];
                                const player = playerId ? gamePlayers?.find((gp) => gp.id === playerId) : null;

                                return (
                                  <button
                                    key={slotIndex}
                                    type="button"
                                    onClick={() => handleOpenAssignModal(groupIndex, slotIndex)}
                                    className="w-full flex items-center px-4 py-3 hover:bg-turf/5 transition-colors min-h-[44px] text-left"
                                  >
                                    <span className="text-sm font-medium text-charcoal/40 mr-3 w-4">
                                      {slotIndex + 1}.
                                    </span>
                                    {player ? (
                                      <>
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-charcoal">{getGamePlayerDisplayName(player)}</div>
                                          <div className="text-xs text-charcoal/70 mt-0.5">
                                            {Boolean(player.guest_name) && "Guest • "}PHCP: {player.play_handicap?.toFixed(1) || "0.0"}
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemovePlayerFromGroup(playerId, groupIndex);
                                          }}
                                          variant="ghost"
                                          size="icon"
                                          className="text-coral hover:text-flag h-7 w-7"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <span className="flex-1 text-sm text-charcoal/40">Tap to assign player</span>
                                    )}
                                  </button>
                                );
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
                  className="w-full border-2 border-dashed border-turf/40 text-turf hover:bg-turf/5 h-10 mx-0.5"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Group
                </Button>
              </div>

              <DragOverlay>
                {activePlayerId ? (
                  <div className="bg-scorecard rounded-lg border-2 border-turf shadow-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-charcoal/40" />
                      <span className="text-sm font-medium text-charcoal">
                        {getGamePlayerDisplayName(gamePlayers?.find((gp) => gp.id === activePlayerId)!)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* Tap-to-Assign Sheet Modal */}
        {step === 4 && (
          <Sheet open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>
                      Assign to {assignTarget ? state.groups[assignTarget.groupIndex].name : ""} - Slot {assignTarget ? assignTarget.slotIndex + 1 : ""}
                    </SheetTitle>
                    <SheetDescription>
                      Select a player to assign to this slot
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    {/* Unassigned Players Section */}
                    {gamePlayers && gamePlayers.filter((gp) => !state.groups.some((g) => g.playerIds.includes(gp.id))).length > 0 && (
                      <div>
                        <div className="border-l-4 border-coral pl-3 mb-2">
                          <h3 className="text-sm font-medium text-charcoal">Unassigned</h3>
                        </div>
                        <div className="divide-y divide-soft-grey border border-soft-grey rounded-lg overflow-hidden">
                          {gamePlayers
                            .filter((gp) => !state.groups.some((g) => g.playerIds.includes(gp.id)))
                            .map((gp) => {
                              const displayName = getGamePlayerDisplayName(gp);
                              const isGuest = Boolean(gp.guest_name);
                              return (
                                <button
                                  key={gp.id}
                                  onClick={() => handleAssignPlayerToSlot(gp.id)}
                                  className="w-full px-4 py-3 text-left hover:bg-sky/5 transition-colors"
                                >
                                  <div className="text-sm font-medium text-charcoal">{displayName}</div>
                                  <div className="text-xs text-charcoal/70 mt-0.5">
                                    {isGuest && "Guest • "}PHCP: {gp.play_handicap?.toFixed(1) || "0.0"}
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Other Groups Section */}
                    {state.groups.map((group, idx) => {
                      const playersInGroup = group.playerIds.filter(Boolean).map((id) => gamePlayers?.find((gp) => gp.id === id)).filter(Boolean);
                      if (playersInGroup.length === 0) return null;

                      return (
                        <div key={idx}>
                          <div className="border-l-4 border-soft-grey pl-3 mb-2">
                            <h3 className="text-sm font-medium text-charcoal">{group.name}</h3>
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
                                  <div className="text-sm font-medium text-charcoal">{displayName}</div>
                                  <div className="text-xs text-charcoal/70 mt-0.5">
                                    {isGuest && "Guest • "}PHCP: {player.play_handicap?.toFixed(1) || "0.0"}
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

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-3 mb-3 px-1">
          <Button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            variant="outline"
            size="lg"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3) ||
                (step === 4 && !canProceedStep4)
              }
              variant="secondary"
              size="lg"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleFinishSetup}
              disabled={createGameGroup.isPending || setGroupMembers.isPending}
              variant="default"
              size="lg"
              className="shadow-lg"
            >
              {createGameGroup.isPending || setGroupMembers.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Start Game
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </PlayerPageLayout>
  );
}
