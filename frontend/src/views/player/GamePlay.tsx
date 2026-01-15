// src/views/player/GamePlay.tsx

import { useParams } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";
import { ScoreEntry } from "../../components/score-entry";
import { GameLeaderboard } from "../../components/games/GameLeaderboard";
import { HoleNavigation } from "../../components/navigation/HoleNavigation";
import { BottomTabNavigation } from "../../components/navigation/BottomTabNavigation";
import {
  ParticipantScorecard,
  type CourseData,
  type ParticipantData,
} from "../../components/scorecard/ParticipantScorecard";
import {
  useGame,
  useGameGroups,
  useGamePlayers,
  useGameGroupScores,
  useGameLeaderboard,
  useUpdateGameScore,
  useGameSync,
  useLockGameScore,
} from "../../api/games";
import { useCourse } from "../../api/courses";
import { getGamePlayerDisplayName } from "../../utils/gameFormatting";
import {
  rememberCurrentHole,
  getSessionStorageKey,
} from "../../utils/holeNavigation";
import { isRoundComplete } from "../../utils/scoreCalculations";
import { useAuth } from "../../hooks/useAuth";
import { Calendar, MapPin, Users } from "lucide-react";
import { FullScorecardModal } from "../../components/score-entry/FullScorecardModal";
import { GameSettingsModal } from "../../components/games/GameSettingsModal";

type TabType = "score" | "leaderboard" | "participants";

export default function GamePlay() {
  const { gameId } = useParams({ strict: false });
  const gameIdNum = gameId ? parseInt(gameId) : 0;

  const { user } = useAuth();

  // Tab management
  const getInitialTab = (): TabType => {
    // Always start with score entry for games
    return "score";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  // Scorecard modal state
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    number | null
  >(null);

  // Full scorecard modal state
  const [isFullScorecardModalOpen, setIsFullScorecardModalOpen] =
    useState(false);

  // Settings modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Smart hole navigation - initialize with lazy initializer
  const [currentHole, setCurrentHole] = useState(() => {
    // Check session storage first for remembered hole position
    if (gameId) {
      const sessionKey = getSessionStorageKey(gameId);
      const rememberedHole = sessionStorage.getItem(sessionKey);
      if (rememberedHole) {
        const hole = parseInt(rememberedHole, 10);
        if (hole >= 1 && hole <= 18) {
          return hole;
        }
      }
    }
    // Default to hole 1 if no remembered position
    return 1;
  });

  // Fetch game data
  const { data: game, isLoading: gameLoading } = useGame(gameIdNum);

  // Fetch course data for pars
  const { data: course, isLoading: courseLoading } = useCourse(
    game?.course_id || 0
  );

  // Fetch groups and players
  const { data: groups, isLoading: groupsLoading } = useGameGroups(gameIdNum);
  const { data: players, isLoading: playersLoading } =
    useGamePlayers(gameIdNum);

  // Fetch leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useGameLeaderboard(gameIdNum);

  // Set up polling for active games
  useGameSync(gameIdNum, game?.status);

  // Update score mutation
  const updateScoreMutation = useUpdateGameScore();
  const lockScoreMutation = useLockGameScore();

  // Determine current user's group based on selection or authentication
  const selectedGamePlayerId = localStorage.getItem("selected_game_player_id");

  const currentUserPlayer = useMemo(() => {
    if (!user || !players) return null;
    return players.find((p) => p.player_id === user.id);
  }, [user, players]);

  // Find current group ID based on selected player
  const currentGroupId = useMemo(() => {
    if (!groups || !players) return groups?.[0]?.id || 0;

    const targetPlayerId = selectedGamePlayerId
      ? parseInt(selectedGamePlayerId)
      : currentUserPlayer?.id;

    if (!targetPlayerId) return groups[0]?.id || 0;

    // TODO: Need game_group_members data to properly find group
    // For now, return first group as fallback
    return groups[0]?.id || 0;
  }, [groups, players, selectedGamePlayerId, currentUserPlayer]);

  // Fetch scores for current group
  const {
    data: groupScores,
    refetch: refetchGroupScores,
    isLoading: groupScoresLoading,
  } = useGameGroupScores(gameIdNum, currentGroupId);

  // Round completion state
  const [isReadyToFinalize, setIsReadyToFinalize] = useState(false);

  // Remember current hole in session storage
  useEffect(() => {
    if (gameId && currentHole) {
      rememberCurrentHole(gameId, currentHole);
    }
  }, [gameId, currentHole]);

  // Check if round is complete when group scores change
  useEffect(() => {
    if (groupScores && groupScores.length > 0) {
      // Map GameScore to participant-like structure for isRoundComplete
      const participantsWithScores = groupScores
        .filter((s) => Array.isArray(s.score))
        .map((s) => ({ score: s.score }));

      if (participantsWithScores.length === groupScores.length) {
        const roundComplete = isRoundComplete(participantsWithScores as any);
        setIsReadyToFinalize(roundComplete);
      } else {
        setIsReadyToFinalize(false);
      }
    } else {
      setIsReadyToFinalize(false);
    }
  }, [groupScores]);

  // Initialize to group's configured start_hole if no progress exists
  useEffect(() => {
    if (!groups || !currentGroupId) return;

    const currentGroup = groups.find((g) => g.id === currentGroupId);
    if (!currentGroup) return;

    const sessionKey = gameId ? getSessionStorageKey(gameId) : null;
    const rememberedHole = sessionKey
      ? sessionStorage.getItem(sessionKey)
      : null;

    const hasNoScores =
      !groupScores ||
      groupScores.length === 0 ||
      groupScores.every((s) => {
        const score = Array.isArray(s.score) ? s.score : [];
        return score.length === 0 || score.every((v) => !v || v === 0);
      });

    const startHole = currentGroup.start_hole;
    const validStart = startHole === 1 || startHole === 10;

    // If no scores have been entered yet, prefer start_hole over any remembered hole
    if (hasNoScores && validStart) {
      setCurrentHole(startHole);
      if (sessionKey) sessionStorage.setItem(sessionKey, String(startHole));
      return;
    }

    // Otherwise, if nothing remembered, fall back to start_hole
    if (!rememberedHole && validStart) {
      setCurrentHole(startHole);
      if (sessionKey) sessionStorage.setItem(sessionKey, String(startHole));
    }
  }, [groups, currentGroupId, gameId, groupScores]);

  // Transform data for ScoreEntry component
  const teeTimeGroup = useMemo(() => {
    if (!groupScores || !groups) {
      return { id: "1", players: [] };
    }

    // Find the current group
    const currentGroup = groups.find((g) => g.id === currentGroupId);
    if (!currentGroup) {
      return { id: "1", players: [] };
    }

    // Map each score record to a player entry using enriched data
    return {
      id: currentGroup.id.toString(),
      players: groupScores.map((scoreRecord) => ({
        participantId: scoreRecord.game_group_member_id.toString(),
        participantName: scoreRecord.member_name,
        participantType: undefined,
        isMultiPlayer: false,
        scores: scoreRecord.score,
        playerNames: scoreRecord.member_name,
        playerId: scoreRecord.player_id,
        is_locked: scoreRecord.is_locked || false,
      })),
    };
  }, [groupScores, groups, currentGroupId]);

  // Build netScoringData map from groupScores (for net scoring display)
  const netScoringData = useMemo(() => {
    if (!groupScores) return undefined;

    // Check if any player has handicap data
    const hasHandicapData = groupScores.some(
      (score) =>
        score.course_handicap !== null &&
        score.stroke_index !== null &&
        score.handicap_strokes_per_hole !== null
    );

    if (!hasHandicapData) return undefined;

    const map = new Map();
    groupScores.forEach((scoreRecord) => {
      if (
        scoreRecord.course_handicap !== null &&
        scoreRecord.stroke_index !== null &&
        scoreRecord.handicap_strokes_per_hole !== null
      ) {
        map.set(scoreRecord.game_group_member_id.toString(), {
          participantId: scoreRecord.game_group_member_id.toString(),
          strokeIndex: scoreRecord.stroke_index,
          handicapStrokesPerHole: scoreRecord.handicap_strokes_per_hole,
          courseHandicap: scoreRecord.course_handicap,
          handicapIndex: scoreRecord.handicap_index,
        });
      }
    });

    return map.size > 0 ? map : undefined;
  }, [groupScores]);

  // Format course data
  const courseData = useMemo(() => {
    if (!course || !course.pars) {
      return { id: "1", name: "Golf Course", holes: [] };
    }

    return {
      id: course.id.toString(),
      name: course.name,
      holes: course.pars.holes.map((par, index) => ({
        number: index + 1,
        par,
      })),
    };
  }, [course]);

  // Create sync status (simplified - games don't have complex sync like competitions)
  const syncStatus = useMemo(
    () => ({
      pendingCount: 0,
      lastSyncTime: Date.now(),
      isOnline: true,
      hasConnectivityIssues: false,
    }),
    []
  );

  // Handle score updates
  const handleScoreUpdate = (
    participantId: string,
    hole: number,
    score: number
  ) => {
    const memberId = parseInt(participantId);
    updateScoreMutation.mutate(
      {
        memberId,
        hole,
        shots: score,
      },
      {
        onSuccess: () => {
          refetchGroupScores();
        },
      }
    );
  };

  const handleComplete = () => {
    console.log("Round completed!");
  };

  // Handle tab changes
  const handleTabChange = (tab: "score" | "leaderboard" | "teams" | "participants") => {
    // Cast to our local TabType (which is a subset)
    if (tab === "score" || tab === "leaderboard" || tab === "participants") {
      setActiveTab(tab);
    }
    // Could add sync logic here if needed
  };

  // Handle hole navigation
  const handleHoleChange = useCallback(
    (newHole: number) => {
      setCurrentHole(newHole);
      // Could add sync logic here if needed
    },
    []
  );

  // Handle opening participant scorecard
  const handleParticipantClick = (playerId: number) => {
    setSelectedParticipantId(playerId);
  };

  // Handle closing participant scorecard
  const handleCloseScorecardModal = () => {
    setSelectedParticipantId(null);
  };

  // Find selected player data for scorecard modal
  const scorecardParticipantData: ParticipantData | null = useMemo(() => {
    if (!selectedParticipantId || !groupScores) return null;

    const scoreRecord = groupScores.find(
      (s) => s.game_group_member_id === selectedParticipantId
    );

    if (!scoreRecord) return null;

    return {
      id: scoreRecord.id,
      team_name: scoreRecord.member_name,
      position_name: "",
      player_name: scoreRecord.member_name,
      score: scoreRecord.score,
      tee_time_id: 0,
      // Include handicap data for net scoring
      stroke_index: scoreRecord.stroke_index,
      handicap_strokes_per_hole: scoreRecord.handicap_strokes_per_hole,
      course_handicap: scoreRecord.course_handicap,
      handicap_index: scoreRecord.handicap_index,
    };
  }, [selectedParticipantId, groupScores]);

  const scorecardCourseData: CourseData | null =
    courseData.holes.length > 0 ? courseData : null;

  const currentHoleData = courseData?.holes.find(
    (h: { number: number; par: number }) => h.number === currentHole
  );

  // Handle finalize button click
  const handleFinalize = () => {
    setIsFullScorecardModalOpen(true);
  };

  // Handle lock round from modal
  const handleLockRound = () => {
    if (!groupScores) return;

    // Lock all participants in the group
    groupScores.forEach((scoreRecord) => {
      lockScoreMutation.mutate(scoreRecord.game_group_member_id);
    });

    // Close the modal
    setIsFullScorecardModalOpen(false);
  };

  // Check if any participant in the group is locked
  const isAnyPlayerLocked =
    groupScores?.some((scoreRecord) => scoreRecord.is_locked) || false;

  // Calculate total players
  const totalPlayers = players?.length || 0;

  // Check if current user is game owner
  const isOwner = game?.owner_id === user?.id;

  if (gameLoading || courseLoading || groupsLoading || playersLoading) {
    return <div className="p-4">Loading game...</div>;
  }

  if (!game) {
    return <div className="p-4">Game not found</div>;
  }

  // Guest selection flow
  if (!selectedGamePlayerId && !currentUserPlayer) {
    return (
      <PlayerPageLayout title="Select Player" subtitle={game.name || "Custom Game"}>
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="max-w-md bg-soft-grey/30 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-charcoal mb-4 font-display">
              Select Your Player
            </h2>
            <p className="text-body-md text-charcoal/70 mb-6 font-primary">
              Choose which player you are to enter scores for your group.
            </p>
            <div className="space-y-3">
              {players?.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    localStorage.setItem(
                      "selected_game_player_id",
                      player.id.toString()
                    );
                    window.location.reload();
                  }}
                  className="w-full bg-white rounded p-4 hover:bg-turf/5 transition-colors border border-soft-grey"
                >
                  <div className="font-medium text-charcoal font-display">
                    {getGamePlayerDisplayName(player)}
                  </div>
                  {player.is_owner && (
                    <div className="text-sm text-turf font-primary mt-1">
                      Game Owner
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PlayerPageLayout>
    );
  }

  // Render main content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "score":
        if (!teeTimeGroup || !courseData || groupScoresLoading) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="max-w-md">
                <h2 className="text-xl font-bold text-charcoal mb-4">
                  Loading Scores...
                </h2>
                <p className="text-turf">Please wait while we load your group's scores.</p>
              </div>
            </div>
          );
        }
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <ScoreEntry
                teeTimeGroup={teeTimeGroup}
                course={courseData}
                onScoreUpdate={handleScoreUpdate}
                onComplete={handleComplete}
                currentHole={currentHole}
                onHoleChange={handleHoleChange}
                syncStatus={syncStatus}
                isReadyToFinalize={isReadyToFinalize}
                onFinalize={handleFinalize}
                isLocked={isAnyPlayerLocked}
                netScoringData={netScoringData}
              />
            </div>
          </div>
        );

      case "leaderboard":
        return (
          <GameLeaderboard
            entries={leaderboard || []}
            isLoading={leaderboardLoading}
            scoringMode={game.scoring_mode}
            onPlayerClick={handleParticipantClick}
          />
        );

      case "participants":
        return (
          <div className="p-4">
            <div className="space-y-4">
              {groups?.map((group) => (
                <div
                  key={group.id}
                  className="bg-soft-grey/30 rounded-2xl shadow-lg overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="bg-turf/10 px-4 py-3 border-b border-soft-grey">
                    <h3 className="text-body-lg font-semibold text-fairway font-display">
                      {group.name || `Group ${group.group_order + 1}`}
                    </h3>
                    <p className="text-label-sm text-charcoal/70 font-primary">
                      Starting at hole {group.start_hole}
                    </p>
                  </div>

                  {/* Group Members */}
                  <div className="bg-white rounded divide-y divide-soft-grey">
                    {players
                      ?.filter(() => {
                        // TODO: Filter by group membership when we have game_group_members data
                        return true;
                      })
                      .map((player) => (
                        <div
                          key={player.id}
                          className="px-4 py-3 hover:bg-turf/5 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-body-md font-medium text-charcoal font-display">
                                {getGamePlayerDisplayName(player)}
                              </p>
                              {player.tee_id && (
                                <p className="text-label-sm text-charcoal/60 font-primary">
                                  Tee assigned
                                </p>
                              )}
                            </div>
                            {player.is_owner && (
                              <span className="text-xs px-2 py-1 bg-turf text-white rounded font-primary font-medium border-0">
                                Owner
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PlayerPageLayout
      title={game.name || "Custom Game"}
      subtitle={course?.name}
      className="h-screen flex flex-col"
    >
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">{renderContent()}</div>

      {/* Hole Navigation - only show during score entry */}
      {activeTab === "score" && currentHoleData && (
        <HoleNavigation
          currentHole={currentHole}
          holePar={currentHoleData.par}
          onPrevious={() => handleHoleChange(Math.max(1, currentHole - 1))}
          onNext={() => handleHoleChange(Math.min(18, currentHole + 1))}
          canGoPrevious={currentHole > 1}
          canGoNext={currentHole < 18}
          className="flex-shrink-0"
        />
      )}

      {/* Bottom Tab Navigation - Always visible */}
      <BottomTabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="flex-shrink-0"
        hiddenTabs={["teams"]}
        participantsLabel="Groups"
        onSettingsClick={() => setSettingsModalOpen(true)}
      />

      {/* Game Info Footer */}
      <GameInfoBar
        game={game}
        course={course}
        totalPlayers={totalPlayers}
      />

      {/* Participant Scorecard Modal */}
      <ParticipantScorecard
        visible={selectedParticipantId !== null}
        participant={scorecardParticipantData}
        course={scorecardCourseData}
        onClose={handleCloseScorecardModal}
      />

      {/* Full Scorecard Modal */}
      <FullScorecardModal
        visible={isFullScorecardModalOpen}
        teeTimeGroup={teeTimeGroup || { id: "", players: [] }}
        course={courseData || { id: "", name: "", holes: [] }}
        currentHole={currentHole}
        onClose={() => setIsFullScorecardModalOpen(false)}
        onLockRound={handleLockRound}
        netScoringData={netScoringData}
      />

      {/* Game Settings Modal */}
      <GameSettingsModal
        gameId={game.id}
        game={game}
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        isOwner={isOwner}
      />
    </PlayerPageLayout>
  );
}

// Game Info Bar component (similar to CompetitionInfoBar)
function GameInfoBar({
  game,
  course,
  totalPlayers,
}: {
  game: { created_at: string; game_type: string };
  course?: { name: string };
  totalPlayers: number;
}) {
  return (
    <div className="bg-rough/30 border-t border-soft-grey px-4 py-2 flex-shrink-0">
      <div className="flex items-center justify-center gap-4 md:gap-8 text-label-sm text-charcoal font-primary">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-turf" />
          <span className="hidden sm:inline">
            {new Date(game.created_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="sm:hidden">
            {new Date(game.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-turf" />
          <span className="truncate">{course?.name || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-turf" />
          <span>{totalPlayers} players</span>
        </div>
      </div>
    </div>
  );
}
