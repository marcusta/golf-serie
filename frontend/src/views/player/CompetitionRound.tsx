import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
  useCompetition,
  useCompetitionLeaderboard,
} from "../../api/competitions";
import { useCourse } from "../../api/courses";
import {
  useTeeTimesForCompetition,
  useTeeTime,
  useUpdateScore,
  useParticipant,
  type TeeTimeParticipant,
} from "../../api/tee-times";
import { Calendar, MapPin, Users, ArrowLeft } from "lucide-react";
import { ScoreEntry } from "../../components/score-entry";
import {
  BottomTabNavigation,
  HoleNavigation,
  HamburgerMenu,
} from "../../components/navigation";
import { ParticipantScorecard } from "../../components/scorecard";
import type { ParticipantData, CourseData } from "../../components/scorecard";
import {
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "../../utils/playerUtils";
import { ScoreStorageManager } from "../../utils/scoreStorage";
import {
  getInitialHole,
  rememberCurrentHole,
} from "../../utils/holeNavigation";
import {
  ParticipantsListComponent,
  LeaderboardComponent,
  TeamResultComponent,
} from "../../components/competition";

type TabType = "score" | "leaderboard" | "teams" | "participants";

export default function CompetitionRound() {
  const { competitionId, teeTimeId } = useParams({ strict: false });
  const navigate = useNavigate();

  // Determine initial tab based on URL and params
  const getInitialTab = (): TabType => {
    if (teeTimeId) return "score"; // If we have a tee time, start with score entry
    const hash = window.location.hash.replace("#", "");
    if (hash === "teams") return "teams";
    if (hash === "participants") return "participants";
    return "leaderboard"; // Default to leaderboard if no tee time
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  // Scorecard modal state
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    number | null
  >(null);

  // Data fetching
  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );
  const { data: course } = useCourse(competition?.course_id || 0);
  const { data: teeTimes, refetch: refetchTeeTimes } =
    useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);
  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboard(competitionId ? parseInt(competitionId) : 0);

  // Fetch selected participant data for scorecard
  const { data: selectedParticipant } = useParticipant(
    selectedParticipantId || 0
  );

  // Tee time data for score entry
  const { data: teeTime, refetch: refetchTeeTime } = useTeeTime(
    teeTimeId ? parseInt(teeTimeId) : 0
  );
  const updateScoreMutation = useUpdateScore();

  // Smart hole navigation - initialize after tee time data is loaded
  const [currentHole, setCurrentHole] = useState(() =>
    getInitialHole(teeTimeId, teeTime?.participants)
  );

  // Score sync tracking using ScoreStorageManager
  const scoreManager = ScoreStorageManager.getInstance();
  const [pendingScoresCount, setPendingScoresCount] = useState(
    scoreManager.getPendingCount()
  );
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  // Update currentHole when teeTime data first loads
  useEffect(() => {
    if (teeTime?.participants && teeTimeId) {
      setCurrentHole(getInitialHole(teeTimeId, teeTime.participants));
    }
  }, [teeTime?.participants, teeTimeId]);

  // Remember current hole in session storage
  useEffect(() => {
    if (teeTimeId && currentHole) {
      rememberCurrentHole(teeTimeId, currentHole);
    }
  }, [teeTimeId, currentHole]);

  // Initial sync when entering score entry view
  useEffect(() => {
    if (activeTab === "score" && teeTimeId && teeTime) {
      const sessionKey = `golf-sync-${teeTimeId}`;
      const lastSyncedThisSession = sessionStorage.getItem(sessionKey);

      if (!lastSyncedThisSession) {
        console.log("Initial sync for score entry session...");
        refetchTeeTime();
        setLastSyncTime(Date.now());
        sessionStorage.setItem(sessionKey, Date.now().toString());
      }
    }
  }, [activeTab, teeTimeId, teeTime, refetchTeeTime]);

  // Sync when returning to the browser tab (after being away)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === "score" && teeTimeId) {
        const timeSinceLastSync = Date.now() - lastSyncTime;
        if (timeSinceLastSync > 60000) {
          // Only if it's been more than 1 minute
          console.log("Syncing after returning to tab...");
          refetchTeeTime();
          setLastSyncTime(Date.now());
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeTab, teeTimeId, lastSyncTime, refetchTeeTime]);

  // Periodic sync validation and retry logic
  useEffect(() => {
    if (!teeTimeId) return;

    const syncInterval = setInterval(async () => {
      try {
        let shouldRefetch = false;

        // Try to retry any pending scores
        const retryableScores = scoreManager.getRetryableScores();

        if (retryableScores.length > 0) {
          console.log(`Retrying ${retryableScores.length} pending scores...`);
          shouldRefetch = true;

          for (const score of retryableScores) {
            try {
              await updateScoreMutation.mutateAsync({
                participantId: score.participantId,
                hole: score.hole,
                shots: score.shots,
              });

              // Success - remove from pending
              scoreManager.removePendingScore(score.participantId, score.hole);
            } catch (error) {
              // Mark as attempted
              scoreManager.markAttempted(score.participantId, score.hole);
              console.error(
                `Retry failed for score ${score.participantId}-${score.hole}:`,
                error
              );
            }
          }
        }

        // Only refetch if we have pending scores, or if it's been more than 30 seconds since last sync
        // This allows us to get updates from other players without spamming
        const timeSinceLastSync = Date.now() - lastSyncTime;
        if (shouldRefetch || timeSinceLastSync > 30000) {
          console.log("Syncing with server for latest scores...");
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        }

        // Update pending count regardless
        setPendingScoresCount(scoreManager.getPendingCount());
      } catch (error) {
        console.error("Sync validation failed:", error);
      }
    }, 30000); // Check every 30 seconds instead of 10

    return () => clearInterval(syncInterval);
  }, [
    teeTimeId,
    updateScoreMutation,
    refetchTeeTime,
    scoreManager,
    lastSyncTime,
  ]);

  // Periodic sync for leaderboard and teams data
  useEffect(() => {
    if (!competitionId) return;

    // Only run periodic sync when viewing leaderboard or teams
    if (activeTab !== "leaderboard" && activeTab !== "teams") return;

    const syncInterval = setInterval(() => {
      console.log(`Periodic sync for ${activeTab} view...`);
      refetchLeaderboard();
      if (activeTab === "teams") {
        refetchTeeTimes(); // Teams data comes from teeTimes
      }
      setLastSyncTime(Date.now());
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  // Fetch fresh data when first entering leaderboard or teams views
  useEffect(() => {
    if (activeTab === "leaderboard" || activeTab === "teams") {
      // Check if we haven't fetched data for this view recently
      const lastFetchKey = `lastFetch-${activeTab}-${competitionId}`;
      const lastFetch = sessionStorage.getItem(lastFetchKey);
      const timeSinceLastFetch = lastFetch
        ? Date.now() - parseInt(lastFetch)
        : Infinity;

      if (timeSinceLastFetch > 10000) {
        // Only if it's been more than 10 seconds
        console.log(`Initial fetch for ${activeTab} view...`);
        refetchLeaderboard();
        if (activeTab === "teams") {
          refetchTeeTimes();
        }
        sessionStorage.setItem(lastFetchKey, Date.now().toString());
      }
    }
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  // Handle tab changes and URL updates
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    // Sync when switching to score tab to get latest data
    if (tab === "score" && teeTimeId) {
      const timeSinceLastSync = Date.now() - lastSyncTime;
      if (timeSinceLastSync > 15000) {
        // Only if it's been more than 15 seconds
        console.log("Syncing on tab change to score entry...");
        refetchTeeTime();
        setLastSyncTime(Date.now());
      }
    }

    // Sync when switching to leaderboard or teams to get latest data
    if (tab === "leaderboard" || tab === "teams") {
      console.log(`Syncing data for ${tab} view...`);
      refetchLeaderboard();
      refetchTeeTimes(); // Refresh teams data as well
      setLastSyncTime(Date.now());
    }
  };

  // Handle opening participant scorecard
  const handleParticipantClick = (participantId: number) => {
    setSelectedParticipantId(participantId);
  };

  // Handle closing participant scorecard
  const handleCloseScorecardModal = () => {
    setSelectedParticipantId(null);
  };

  // Create course data format for scorecard component
  const scorecardCourseData: CourseData | null =
    teeTime && course
      ? {
          id: course.id.toString(),
          name: course.name,
          holes: teeTime.pars.map((par: number, index: number) => ({
            number: index + 1,
            par,
          })),
        }
      : null;

  // Convert selected participant to scorecard format
  const scorecardParticipantData: ParticipantData | null = selectedParticipant
    ? {
        id: selectedParticipant.id,
        team_name: selectedParticipant.team_name,
        position_name: selectedParticipant.position_name,
        player_names: selectedParticipant.player_names,
        score: selectedParticipant.score,
        tee_time_id: selectedParticipant.tee_time_id,
      }
    : null;

  // Enhanced score entry functions with resilience
  const handleScoreUpdate = useCallback(
    (participantId: string, hole: number, score: number) => {
      const participantIdNum = parseInt(participantId);

      // Add to local storage immediately
      scoreManager.addPendingScore(participantIdNum, hole, score);
      setPendingScoresCount(scoreManager.getPendingCount());

      updateScoreMutation.mutate(
        {
          participantId: participantIdNum,
          hole,
          shots: score,
        },
        {
          onSuccess: () => {
            // Remove from pending scores on success
            scoreManager.removePendingScore(participantIdNum, hole);
            setPendingScoresCount(scoreManager.getPendingCount());
            setLastSyncTime(Date.now());

            console.log(
              "Score update successful, cache invalidated automatically"
            );
            // The React Query cache is now automatically invalidated in useUpdateScore
            // No need for manual refetching as the data will be fresh
          },
          onError: (error) => {
            console.error("Score update failed:", error);
            // Score is already in pending storage, will be retried
          },
        }
      );
    },
    [updateScoreMutation, scoreManager]
  );

  const handleComplete = () => {
    console.log("Score entry completed!");
  };

  // Handle hole navigation with occasional sync
  const handleHoleChange = useCallback(
    (newHole: number) => {
      setCurrentHole(newHole);

      // Sync every few holes to get updates from other players
      // This balances staying current with not overloading the server
      const shouldSync = newHole % 3 === 1; // Sync on holes 1, 4, 7, 10, 13, 16
      if (shouldSync && teeTimeId) {
        const timeSinceLastSync = Date.now() - lastSyncTime;
        if (timeSinceLastSync > 20000) {
          // Only if it's been more than 20 seconds
          console.log(`Syncing on hole navigation to hole ${newHole}...`);
          refetchTeeTime();
          setLastSyncTime(Date.now());
        }
      }
    },
    [lastSyncTime, refetchTeeTime, teeTimeId]
  );

  // Helper functions from CompetitionDetail

  // Prepare data for score entry
  const teeTimeGroup = teeTime
    ? {
        id: teeTime.id.toString(),
        players: teeTime.participants.map(
          (participant: TeeTimeParticipant) => ({
            participantId: participant.id.toString(),
            participantName: participant.team_name,
            participantType: formatParticipantTypeDisplay(
              participant.position_name
            ),
            isMultiPlayer: isMultiPlayerFormat(participant.position_name),
            scores: participant.score,
          })
        ),
      }
    : null;

  const courseData =
    teeTime && course
      ? {
          id: teeTime.id.toString(),
          name: `${teeTime.course_name} ${teeTime.teetime}`,
          holes: teeTime.pars.map((par: number, index: number) => ({
            number: index + 1,
            par,
          })),
        }
      : null;

  const currentHoleData = courseData?.holes.find(
    (h: { number: number; par: number }) => h.number === currentHole
  );

  // Calculate sync status for display
  const syncStatus = {
    pendingCount: pendingScoresCount,
    lastSyncTime,
    isOnline: navigator.onLine,
    hasConnectivityIssues:
      pendingScoresCount > 0 && Date.now() - lastSyncTime > 30000, // 30 seconds
  };

  // Calculate team results (same logic as CompetitionDetail)
  const teamResults = leaderboard?.reduce((acc, entry) => {
    const teamName = entry.participant.team_name;
    if (!acc[teamName]) {
      acc[teamName] = {
        teamName,
        participants: [],
        totalShots: 0,
        relativeToPar: 0,
      };
    }
    acc[teamName].participants.push({
      name: entry.participant.player_names || "",
      position: entry.participant.position_name,
      totalShots: entry.totalShots,
      relativeToPar: entry.relativeToPar,
    });
    acc[teamName].totalShots += entry.totalShots;
    acc[teamName].relativeToPar += entry.relativeToPar;
    return acc;
  }, {} as Record<string, { teamName: string; participants: Array<{ name: string; position: string; totalShots: number; relativeToPar: number }>; totalShots: number; relativeToPar: number }>);

  const sortedTeamResults = Object.values(teamResults || {})
    .sort((a, b) => a.relativeToPar - b.relativeToPar)
    .map((team, index, array) => {
      const position = index + 1;
      let points = array.length - position + 1;
      if (position === 1) points += 2;
      if (position === 2) points += 1;
      return { ...team, position, points };
    });

  const totalParticipants =
    teeTimes?.reduce(
      (total, teeTime) => total + teeTime.participants.length,
      0
    ) || 0;

  if (competitionLoading)
    return <div className="p-4">Loading competition...</div>;
  if (!competition) return <div className="p-4">Competition not found</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              navigate({
                to: `/player/competitions/${competitionId}`,
                replace: true,
              })
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Competition"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
              {competition.name}
            </h1>
          </div>
        </div>
        <HamburgerMenu />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "score" ? (
          teeTimeGroup && courseData ? (
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
                />
              </div>
            </div>
          ) : (
            // Show tee time selection when no tee time is selected
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    Select Tee Time for Score Entry
                  </h2>
                </div>

                {!teeTimes || teeTimes.length === 0 ? (
                  <div className="text-center py-6 md:py-8 text-gray-500">
                    No tee times available for this competition.
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="divide-y divide-gray-200">
                      {teeTimes.map((teeTime) => (
                        <button
                          key={teeTime.id}
                          onClick={() =>
                            navigate({
                              to: `/player/competitions/${competitionId}/tee-times/${teeTime.id}`,
                              replace: true,
                            })
                          }
                          className="w-full px-4 md:px-6 py-3 md:py-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm md:text-lg font-medium text-gray-900">
                                {teeTime.teetime}
                              </h4>
                              <p className="text-xs md:text-sm text-gray-600 mt-1">
                                {teeTime.participants
                                  .map((p) => p.team_name)
                                  .join(", ")}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500">
                              {teeTime.participants.length} player
                              {teeTime.participants.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        ) : activeTab === "leaderboard" ? (
          <LeaderboardComponent
            leaderboard={leaderboard}
            leaderboardLoading={leaderboardLoading}
            onParticipantClick={handleParticipantClick}
            isRoundView={true}
          />
        ) : activeTab === "teams" ? (
          <TeamResultComponent
            teamResults={sortedTeamResults}
            leaderboardLoading={leaderboardLoading}
            isRoundView={true}
          />
        ) : (
          <ParticipantsListComponent
            teeTimes={teeTimes}
            teeTimesLoading={false}
            competitionId={competitionId || ""}
            currentTeeTimeId={teeTimeId}
            currentTeeTime={teeTime}
            showCurrentGroup={true}
            totalParticipants={totalParticipants}
          />
        )}
      </div>

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

      {/* Bottom Tab Navigation - Always visible and sticky */}
      <BottomTabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="flex-shrink-0"
      />

      {/* Competition Info Footer - Always visible and sticky */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-center gap-4 md:gap-8 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span className="hidden sm:inline">
              {new Date(competition.date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="sm:hidden">
              {new Date(competition.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{course?.name || "Loading..."}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{totalParticipants} participants</span>
          </div>
        </div>
      </div>

      {/* Participant Scorecard Modal */}
      <ParticipantScorecard
        visible={selectedParticipantId !== null}
        participant={scorecardParticipantData}
        course={scorecardCourseData}
        onClose={handleCloseScorecardModal}
      />
    </div>
  );
}
