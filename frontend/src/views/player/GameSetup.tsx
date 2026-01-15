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
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Plus,
  Check,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ItemGroup,
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemSeparator,
} from "@/components/ui/item";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { getGamePlayerDisplayName } from "@/utils/player-display";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import { GroupManagement, type LocalGroup } from "@/components/games/GroupManagement";

// ============================================================================
// Types
// ============================================================================

interface GameSetupState {
  gameId: number | null;
  courseId: number | null;
  courseName: string | null;
  gameName: string;
  groups: LocalGroup[];
  gameType: string;
  scoringMode: GameScoringMode;
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
    gameName: "",
    groups: [{ id: null, name: "Group 1", playerIds: [] }],
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

  // Step 4 manual assignment flag (disable auto-assignment after user interaction)
  const [hasManuallyAssigned, setHasManuallyAssigned] = useState(false);

  // Step 5 scoring mode multiselect state
  const [selectedScoringModes, setSelectedScoringModes] = useState<
    Set<"gross" | "net">
  >(
    state.scoringMode === "both"
      ? new Set(["gross", "net"])
      : state.scoringMode === "gross"
      ? new Set(["gross"])
      : new Set(["net"])
  );

  // API hooks
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: allPlayers, isLoading: playersLoading } = usePlayers();
  const { data: courseTees } = useCourseTees(state.courseId || 0);
  const { data: gamePlayers, refetch: refetchGamePlayers } = useGamePlayers(
    state.gameId || 0
  );

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
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.club_name?.toLowerCase().includes(query)
    );
  }, [courses, courseSearchQuery]);

  // Filtered players for search (exclude already added players)
  const filteredPlayers = useMemo(() => {
    if (!allPlayers) return [];
    const query = playerSearchQuery.toLowerCase();
    const alreadyAddedPlayerIds =
      gamePlayers?.map((gp) => gp.player_id).filter(Boolean) || [];
    return allPlayers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) &&
        !alreadyAddedPlayerIds.includes(p.id)
    );
  }, [allPlayers, playerSearchQuery, gamePlayers]);

  // Refetch players when returning to step 3 (players)
  useEffect(() => {
    if (step === 3 && state.gameId) {
      refetchGamePlayers();
    }
  }, [step, state.gameId, refetchGamePlayers]);

  // Auto-assign players to Group 1 if ≤4 total players (only if user hasn't manually assigned)
  useEffect(() => {
    if (
      step === 4 &&
      !hasManuallyAssigned &&
      gamePlayers &&
      gamePlayers.length > 0 &&
      gamePlayers.length <= 4
    ) {
      // Check if any players are unassigned
      const unassignedPlayers = gamePlayers.filter(
        (gp) => !state.groups.some((g) => g.playerIds.includes(gp.id))
      );

      if (unassignedPlayers.length > 0) {
        // Auto-assign all unassigned players to Group 1 (no duplicates)
        setState((prev) => {
          const uniquePlayerIds = Array.from(
            new Set(gamePlayers.map((gp) => gp.id))
          );
          const newGroups = prev.groups.map((group, idx) => {
            if (idx === 0) {
              return { ...group, playerIds: uniquePlayerIds };
            }
            return group;
          });
          return { ...prev, groups: newGroups };
        });
      }
    }
  }, [step, gamePlayers, hasManuallyAssigned]);

  // Reset manual assignment flag when leaving step 4
  useEffect(() => {
    if (step !== 4) {
      setHasManuallyAssigned(false);
    }
  }, [step]);

  // ============================================================================
  // Step 1: Course Selection
  // ============================================================================

  const handleCourseSelect = async (courseId: number, courseName: string) => {
    // Validate game name
    if (!state.gameName.trim()) {
      toast.error("Please enter a game name");
      return;
    }

    try {
      let gameId = state.gameId;

      if (gameId) {
        // Update existing game
        await updateGame.mutateAsync({
          gameId,
          data: { course_id: courseId, name: state.gameName.trim() },
        });
      } else {
        // Create new game
        const game = await createGame.mutateAsync({
          course_id: courseId,
          name: state.gameName.trim(),
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

  const handleGroupsChange = (newGroups: LocalGroup[]) => {
    setHasManuallyAssigned(true);
    setState((prev) => ({ ...prev, groups: newGroups }));
  };

  const handleRemovePlayerFromGame = async (playerId: number) => {
    if (!state.gameId) return;
    try {
      await removeGamePlayer.mutateAsync({ gameId: state.gameId, playerId });
      refetchGamePlayers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove player"
      );
    }
  };

  // ============================================================================
  // Step 5: Game Configuration & Finalization
  // ============================================================================

  const handleToggleScoringMode = async (mode: "gross" | "net") => {
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
      if (newSet.has("gross") && newSet.has("net")) {
        scoringMode = "both";
      } else if (newSet.has("gross")) {
        scoringMode = "gross";
      } else {
        scoringMode = "net";
      }

      setState((prevState) => ({ ...prevState, scoringMode }));

      // Update backend with new scoring mode
      if (state.gameId) {
        updateGame
          .mutateAsync({
            gameId: state.gameId,
            data: { scoring_mode: scoringMode },
          })
          .catch((error) => {
            console.error("Failed to update scoring mode:", error);
            toast.error("Failed to update scoring mode");
          });
      }

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
        navigate({
          to: "/games/$gameId/guest-select",
          params: { gameId: state.gameId.toString() },
        });
      } else {
        navigate({
          to: "/player/games/$gameId/play",
          params: { gameId: state.gameId.toString() },
        });
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
    state.groups.every(
      (g) =>
        g.playerIds.filter(Boolean).length > 0 &&
        g.playerIds.filter(Boolean).length <= 4
    ) &&
    (gamePlayers?.every((gp) =>
      state.groups.some((g) => g.playerIds.includes(gp.id))
    ) ||
      false);

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

  // Step names for header
  const getStepName = (stepNumber: number): string => {
    switch (stepNumber) {
      case 1:
        return "Select Course";
      case 2:
        return "Select Tee Box";
      case 3:
        return "Add Players";
      case 4:
        return "Assign Groups";
      case 5:
        return "Game Settings";
      default:
        return "";
    }
  };

  return (
    <PlayerPageLayout
      title="Game Setup"
      subtitle={`Step ${step} of 5 · ${getStepName(step)}`}
      onBackClick={() => navigate({ to: "/player" })}
    >
      <div className="max-w-4xl mx-auto px-2">
        {/* Progress Bar */}
        <div>
          <div className="h-2 bg-soft-grey/30 rounded overflow-hidden">
            <div
              className="h-full bg-turf transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content - Steps 1, 2, 3, 5 */}
        {step !== 4 && (
          <div className="bg-soft-grey/30 rounded-b-2xl shadow-lg p-6 mb-6">
            {/* Steps 1, 2, 3, 5 content */}
          {/* Step 1: Course Selection */}
          {step === 1 && (
            <div>
              {/* Game Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                  Game Name
                </label>
                <Input
                  type="text"
                  value={state.gameName}
                  onChange={(e) => setState((prev) => ({ ...prev, gameName: e.target.value }))}
                  placeholder="My Saturday Round"
                  className="h-12 bg-white"
                />
              </div>

              {/* Search Filter */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                  Search Courses
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-charcoal/40 z-10" />
                  <Input
                    type="text"
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    placeholder="Search by course or club name..."
                    className="pl-10 h-12 bg-white"
                  />
                </div>
              </div>

              {/* Course List */}
              {filteredCourses.length === 0 ? (
                <div className="bg-white rounded px-5 py-8 text-center text-charcoal/60">
                  No courses found
                </div>
              ) : (
                <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
                  {filteredCourses.map((course) => {
                    // Check if course has a real club (not "Default Club" placeholder)
                    const hasRealClub =
                      course.club_name && course.club_name !== "Default Club";

                    return (
                      <button
                        key={course.id}
                        onClick={() =>
                          handleCourseSelect(course.id, course.name)
                        }
                        disabled={createGame.isPending}
                        className="disabled:opacity-50 disabled:cursor-not-allowed w-full text-left px-4 py-3 hover:bg-turf/10 transition-colors"
                      >
                        <div className="text-[15px] font-medium text-charcoal">
                          {hasRealClub ? course.club_name : course.name}
                        </div>
                        <div className="text-[13px] text-charcoal/70 mt-0.5">
                          {hasRealClub ? (
                            <>
                              {course.name} • Par {course.pars.total} •{" "}
                              {course.pars.holes.length} holes
                            </>
                          ) : (
                            <>
                              Par {course.pars.total} •{" "}
                              {course.pars.holes.length} holes
                            </>
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
              <div className="bg-white rounded p-4">
                <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                  Tee Box
                </label>
                <Select
                  value={selectedTeeId}
                  onValueChange={handleTeeSelection}
                  disabled={assignTee.isPending}
                >
                  <SelectTrigger className="w-full h-12 text-base border-soft-grey">
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
              {/* Search Registered Players */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                  Search Registered Players
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-charcoal/40 z-10" />
                  <Input
                    type="text"
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="pl-10 h-12 bg-white"
                  />
                </div>

                {playerSearchQuery && filteredPlayers.length > 0 && (
                  <ItemGroup className="mt-2 max-h-48 overflow-y-auto border border-soft-grey rounded bg-white">
                    {filteredPlayers.map((player, index) => (
                      <React.Fragment key={player.id}>
                        <Item
                          asChild
                          size="sm"
                          className="cursor-pointer hover:bg-turf/10 transition-colors"
                        >
                          <button
                            onClick={() => handleAddRegisteredPlayer(player)}
                            disabled={addGamePlayer.isPending}
                            className="disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
                          >
                            <ItemContent>
                              <ItemTitle>{player.name}</ItemTitle>
                              <ItemDescription>
                                HCP: {player.handicap.toFixed(1)}
                              </ItemDescription>
                            </ItemContent>
                          </button>
                        </Item>
                        {index < filteredPlayers.length - 1 && (
                          <ItemSeparator />
                        )}
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
                  className="w-full h-11 justify-start bg-white text-turf border-turf/40 hover:bg-turf/10 hover:border-turf/60 font-semibold rounded"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create guest player
                </Button>
              </div>

              {/* Current Players List */}
              {gamePlayers && gamePlayers.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Players Added ({gamePlayers.length})
                  </h3>
                  <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey px-3">
                    {gamePlayers.map((gp) => {
                      const displayName = getGamePlayerDisplayName(gp);
                      const isGuest = Boolean(gp.guest_name);

                      return (
                        <div
                          key={gp.id}
                          className="flex items-center py-3 hover:bg-turf/5 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-medium text-charcoal">
                              {displayName}
                            </div>
                            <div className="text-[13px] text-charcoal/70 mt-0.5">
                              {isGuest && "Guest • "}PHCP:{" "}
                              {gp.play_handicap?.toFixed(1) || "0.0"}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRemovePlayer(gp.id)}
                            disabled={removeGamePlayer.isPending}
                            variant="ghost"
                            size="icon"
                            className="text-coral hover:text-flag hover:bg-coral/10 h-8 w-8 ml-2"
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
                    <SheetTitle className="text-xl font-semibold text-charcoal">
                      Add Guest Player
                    </SheetTitle>
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
                        <Select
                          value={guestGender}
                          onValueChange={(value: "male" | "female") =>
                            setGuestGender(value)
                          }
                        >
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
              {/* No inner card - content directly in gray container */}
              <div>
                {/* Game Type Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Game Type
                  </h3>
                  <div className="bg-white rounded p-4">
                    <div className="text-[15px] font-medium text-charcoal">
                      Stroke Play
                    </div>
                    <div className="text-[13px] text-charcoal/70 mt-0.5">
                      Standard stroke play format
                    </div>
                  </div>
                </div>

                {/* Scoring Mode Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Scoring Mode
                  </h3>
                  <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
                    <button
                      onClick={() => handleToggleScoringMode("gross")}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        selectedScoringModes.has("gross")
                          ? "opacity-100"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedScoringModes.has("gross")
                          ? "border-turf bg-turf"
                          : "border-charcoal/30 bg-white"
                      }`}>
                        {selectedScoringModes.has("gross") && (
                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-[15px] font-medium text-charcoal">
                          Gross
                        </div>
                        <div className="text-[13px] text-charcoal/70 mt-0.5">
                          Count raw scores only
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleToggleScoringMode("net")}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        selectedScoringModes.has("net")
                          ? "opacity-100"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedScoringModes.has("net")
                          ? "border-turf bg-turf"
                          : "border-charcoal/30 bg-white"
                      }`}>
                        {selectedScoringModes.has("net") && (
                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-[15px] font-medium text-charcoal">
                          Net
                        </div>
                        <div className="text-[13px] text-charcoal/70 mt-0.5">
                          Apply handicaps to scores
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Summary Section */}
                <div>
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Setup Summary
                  </h3>
                  <div className="bg-white rounded p-4">
                    <div className="space-y-3 text-body-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-charcoal/70">Game Name:</span>
                        <span className="text-charcoal font-medium">
                          {state.gameName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-charcoal/70">Course:</span>
                        <span className="text-charcoal font-medium">
                          {state.courseName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-charcoal/70">Players:</span>
                        <span className="text-charcoal font-medium">
                          {gamePlayers?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-charcoal/70">Groups:</span>
                        <span className="text-charcoal font-medium">
                          {state.groups.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-charcoal/70">Scoring:</span>
                        <span className="text-charcoal font-medium capitalize">
                          {state.scoringMode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {/* Step 4: Group Assignment */}
        {step === 4 && gamePlayers && (
          <GroupManagement
            players={gamePlayers}
            groups={state.groups}
            onGroupsChange={handleGroupsChange}
            onRemovePlayer={handleRemovePlayerFromGame}
            variant="setup"
            showTapToAssign={true}
          />
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
