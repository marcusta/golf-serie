// src/views/player/CompetitionRound.tsx

import { useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useLockParticipant,
  useUpdateParticipant,
} from "../../api/participants";
import { useSeriesTeams } from "../../api/series";
import { useCompetitionLeaderboardWithDetails } from "../../api/competitions";
import type { PlayerNetScoringData } from "../../components/score-entry/FullScorecardModal";
import { isRoundComplete } from "../../utils/scoreCalculations";
import { HoleNavigation } from "../../components/navigation/HoleNavigation";
import { BottomTabNavigation } from "../../components/navigation/BottomTabNavigation";
import { CompetitionInfoBar } from "../../components/competition";
import { useCompetitionData } from "../../hooks/useCompetitionData";
import { useCompetitionSync } from "../../hooks/useCompetitionSync";
import {
  formatTeeTimeGroup,
  formatParticipantForScorecard,
} from "../../utils/participantFormatting";
import {
  rememberCurrentHole,
  getSessionStorageKey,
} from "../../utils/holeNavigation";
import { ScoreEntry } from "../../components/score-entry";
import {
  LeaderboardComponent,
  TeamResultComponent,
  ParticipantsListComponent,
} from "../../components/competition";
import { calculateTotalParticipants } from "../../utils/scoreCalculations";
import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";
import {
  ParticipantScorecard,
  type CourseData,
  type ParticipantData,
} from "../../components/scorecard/ParticipantScorecard";
import { EditPlayerNameModal } from "../../components/competition/EditPlayerNameModal";
import { FullScorecardModal } from "../../components/score-entry/FullScorecardModal";
import { formatCourseFromTeeTime } from "@/utils/courseFormatting";
import type { TeeTime } from "../../api/tee-times";

type TabType = "score" | "leaderboard" | "teams" | "participants";

// Local interface for participant with score property for typing
interface ParticipantWithScore {
  score?: number[];
  [key: string]: unknown;
}

export default function CompetitionRound() {
  const { competitionId, teeTimeId } = useParams({ strict: false });

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

  // Player name editing modal state
  const [editingParticipant, setEditingParticipant] = useState<{
    id: string;
    currentName: string | null;
    positionName: string;
  } | null>(null);

  // Smart hole navigation - initialize with lazy initializer to preserve hole across refreshes
  const [currentHole, setCurrentHole] = useState(() => {
    // Check session storage first for remembered hole position
    if (teeTimeId) {
      const sessionKey = getSessionStorageKey(teeTimeId);
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

  // Custom hooks for data and sync management
  const {
    competition,
    course,
    teeTimes,
    leaderboard,
    teamLeaderboard,
    teeTime,
    selectedParticipant,
    isLoading: competitionLoading,
    leaderboardLoading,
    teamLeaderboardLoading,
    refetchTeeTime,
    refetchLeaderboard,
    refetchTeamLeaderboard,
    refetchTeeTimes,
    updateScoreMutation,
  } = useCompetitionData({
    competitionId,
    teeTimeId,
    selectedParticipantId,
  });

  const {
    syncStatus,
    handleScoreUpdate,
    handleTabChangeSync,
    handleHoleNavigationSync,
  } = useCompetitionSync({
    competitionId,
    teeTimeId,
    activeTab,
    refetchTeeTime,
    refetchLeaderboard,
    refetchTeamLeaderboard,
    refetchTeeTimes,
    updateScoreMutation,
    teeTime,
  });

  // Keep series teams for potential future use
  useSeriesTeams(competition?.series_id || 0);

  // Fetch leaderboard with details for net scoring (tour competitions)
  const { data: leaderboardWithDetails } = useCompetitionLeaderboardWithDetails(
    competitionId ? parseInt(competitionId) : 0
  );

  // Build net scoring data map for tour competitions
  const netScoringData = useMemo(() => {
    if (!leaderboardWithDetails?.tee?.strokeIndex || !leaderboardWithDetails?.scoringMode) {
      return undefined;
    }

    const { scoringMode } = leaderboardWithDetails;
    if (scoringMode !== "net" && scoringMode !== "both") {
      return undefined;
    }

    const strokeIndex = leaderboardWithDetails.tee.strokeIndex;
    const dataMap = new Map<string, PlayerNetScoringData>();

    leaderboardWithDetails.entries.forEach((entry) => {
      const participantId = entry.participant.id.toString();
      dataMap.set(participantId, {
        participantId,
        strokeIndex,
        handicapStrokesPerHole: entry.handicapStrokesPerHole,
        courseHandicap: entry.courseHandicap,
        handicapIndex: entry.participant.handicap_index,
      });
    });

    return dataMap;
  }, [leaderboardWithDetails]);

  // API mutation for updating participant
  const updateParticipantMutation = useUpdateParticipant();
  const lockParticipantMutation = useLockParticipant();

  // New state for round completion workflow
  const [isReadyToFinalize, setIsReadyToFinalize] = useState(false);
  const [isFullScorecardModalOpen, setIsFullScorecardModalOpen] =
    useState(false);

  // Remember current hole in session storage
  useEffect(() => {
    if (teeTimeId && currentHole) {
      rememberCurrentHole(teeTimeId, currentHole);
    }
  }, [teeTimeId, currentHole]);

  // Check if round is complete when teeTime data changes
  useEffect(() => {
    if (teeTime?.participants && teeTime.participants.length > 0) {
      // Ensure each participant has a valid score array before checking completion
      const participantsWithScores = teeTime.participants.filter(
        (p: ParticipantWithScore) => Array.isArray(p.score)
      );

      if (participantsWithScores.length === teeTime.participants.length) {
        const roundComplete = isRoundComplete(teeTime.participants);
        setIsReadyToFinalize(roundComplete);
      } else {
        setIsReadyToFinalize(false);
      }
    } else {
      setIsReadyToFinalize(false);
    }
  }, [teeTime]);

  // Initialize to tee time's configured start_hole if no progress exists
  useEffect(() => {
    if (!teeTime) return;

    const sessionKey = teeTimeId ? getSessionStorageKey(teeTimeId) : null;
    const rememberedHole = sessionKey
      ? sessionStorage.getItem(sessionKey)
      : null;

    // Type guards for participant score arrays
    const participants = Array.isArray(teeTime.participants)
      ? (teeTime.participants as Array<{ score?: number[] }>)
      : [];

    const hasNoScores =
      participants.length === 0 ||
      participants.every((p) => {
        const s = Array.isArray(p.score) ? p.score : [];
        return s.length === 0 || s.every((v) => !v || v === 0);
      });

    const startHole: number | undefined =
      typeof (teeTime as unknown as { start_hole?: number }).start_hole ===
      "number"
        ? (teeTime as unknown as { start_hole?: number }).start_hole
        : undefined;

    const validStart = startHole === 1 || startHole === 10;

    // If no scores have been entered yet, prefer start_hole over any remembered hole
    if (hasNoScores && validStart) {
      setCurrentHole(startHole!);
      if (sessionKey) sessionStorage.setItem(sessionKey, String(startHole));
      return;
    }

    // Otherwise, if nothing remembered, fall back to start_hole
    if (!rememberedHole && validStart) {
      setCurrentHole(startHole!);
      if (sessionKey) sessionStorage.setItem(sessionKey, String(startHole));
    }
  }, [teeTime, teeTimeId]);

  // Format data using utility functions
  const teeTimeGroup = formatTeeTimeGroup(teeTime);
  const courseData = formatCourseFromTeeTime(teeTime, course);
  const scorecardParticipantData: ParticipantData | null =
    formatParticipantForScorecard(selectedParticipant || null);

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

  // Handle tab changes and URL updates
  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    await handleTabChangeSync(tab);
  };

  // Handle opening participant scorecard
  const handleParticipantClick = (participantId: number) => {
    setSelectedParticipantId(participantId);
  };

  // Handle closing participant scorecard
  const handleCloseScorecardModal = () => {
    setSelectedParticipantId(null);
  };

  const handleComplete = () => {
    console.log("Round completed!");
  };

  const handlePlayerNameClick = (
    participantId: string,
    currentName: string | null,
    positionName: string
  ) => {
    setEditingParticipant({
      id: participantId,
      currentName,
      positionName,
    });
  };

  const handleCloseNameModal = () => {
    setEditingParticipant(null);
  };

  const handleSaveName = (participantId: string, newName: string) => {
    updateParticipantMutation.mutate(
      {
        id: parseInt(participantId),
        data: { player_names: newName },
      },
      {
        onSuccess: () => {
          refetchTeeTime();
          setEditingParticipant(null);
        },
      }
    );
  };

  // Handle hole navigation with sync
  const handleHoleChange = useCallback(
    async (newHole: number) => {
      setCurrentHole(newHole);
      await handleHoleNavigationSync();
    },
    [handleHoleNavigationSync]
  );

  // Use team leaderboard data directly
  const sortedTeamResults = teamLeaderboard || [];

  const totalParticipants = calculateTotalParticipants(teeTimes);

  const currentHoleData = courseData?.holes.find(
    (h: { number: number; par: number }) => h.number === currentHole
  );

  const handleFinalize = () => {
    setIsFullScorecardModalOpen(true);
  };

  const handleLockRound = () => {
    if (!teeTime?.participants) return;

    // Lock all participants in the tee time
    teeTime.participants.forEach((participant: { id: number }) => {
      lockParticipantMutation.mutate(participant.id);
    });

    // Close the modal
    setIsFullScorecardModalOpen(false);
  };

  // Check if any participant in the tee time is locked
  const isAnyParticipantLocked =
    teeTime?.participants?.some(
      (participant: { is_locked: boolean }) => participant.is_locked
    ) || false;

  if (competitionLoading)
    return <div className="p-4">Loading competition...</div>;
  if (!competition) return <div className="p-4">Competition not found</div>;

  // Render main content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "score":
        if (!teeTimeGroup || !courseData) {
          return (
            <InvalidTeeTimes
              teeTimes={teeTimes || []}
              competitionId={competitionId || ""}
            />
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
                onPlayerNameClick={handlePlayerNameClick}
                isReadyToFinalize={isReadyToFinalize}
                onFinalize={handleFinalize}
                isLocked={isAnyParticipantLocked}
                competition={{
                  id: competition.id,
                  series_id: competition.series_id,
                  series_name: competition.series_name,
                  tour_id: competition.tour_id,
                }}
                isTourCompetition={!!competition.tour_id}
                netScoringData={netScoringData}
              />
            </div>
          </div>
        );

      case "leaderboard":
        // Use leaderboard with details for tour competitions (has net scores)
        // Fall back to basic leaderboard for series competitions
        const leaderboardData = competition?.tour_id
          ? leaderboardWithDetails?.entries
          : leaderboard;
        return (
          <LeaderboardComponent
            leaderboard={leaderboardData}
            leaderboardLoading={leaderboardLoading}
            onParticipantClick={handleParticipantClick}
            isRoundView={true}
            isTourCompetition={!!competition?.tour_id}
            scoringMode={leaderboardWithDetails?.scoringMode}
            teeInfo={leaderboardWithDetails?.tee}
          />
        );

      case "teams":
        return (
          <TeamResultComponent
            teamResults={sortedTeamResults}
            leaderboardLoading={teamLeaderboardLoading}
            individualResults={leaderboard}
            isRoundView={true}
            onParticipantClick={handleParticipantClick}
          />
        );

      case "participants":
        return (
          <ParticipantsListComponent
            teeTimes={teeTimes}
            teeTimesLoading={false}
            competitionId={competitionId || ""}
            venueType={competition?.venue_type}
            currentTeeTimeId={teeTimeId}
            currentTeeTime={teeTime}
            showCurrentGroup={true}
            totalParticipants={totalParticipants}
            isTourCompetition={!!competition?.tour_id}
            isOpenStart={competition?.start_mode === "open"}
          />
        );

      default:
        return null;
    }
  };

  return (
    <PlayerPageLayout
      title={competition.name}
      seriesId={competition.series_id}
      seriesName={competition.series_name}
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

      {/* Bottom Tab Navigation - Always visible and sticky */}
      <BottomTabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="flex-shrink-0"
        hiddenTabs={competition?.tour_id ? ["teams"] : []}
        participantsLabel={competition?.tour_id ? "Groups" : undefined}
      />

      {/* Competition Info Footer - Always visible and sticky */}
      <CompetitionInfoBar
        competition={competition}
        courseName={course?.name}
        totalParticipants={totalParticipants}
        variant="footer"
      />

      {/* Participant Scorecard Modal */}
      <ParticipantScorecard
        visible={selectedParticipantId !== null}
        participant={scorecardParticipantData}
        course={scorecardCourseData}
        onClose={handleCloseScorecardModal}
      />

      {/* Player Name Editing Modal */}
      <EditPlayerNameModal
        isOpen={editingParticipant !== null}
        onClose={handleCloseNameModal}
        onSave={handleSaveName}
        participant={editingParticipant}
      />

      {/* Full Scorecard Modal */}
      <FullScorecardModal
        visible={isFullScorecardModalOpen}
        teeTimeGroup={teeTimeGroup || { id: "", players: [] }}
        course={courseData || { id: "", name: "", holes: [] }}
        currentHole={currentHole}
        onClose={() => setIsFullScorecardModalOpen(false)}
        onContinueEntry={() => setIsFullScorecardModalOpen(false)}
        onLockRound={handleLockRound}
        netScoringData={netScoringData}
      />
    </PlayerPageLayout>
  );
}

function InvalidTeeTimes({
  teeTimes,
  competitionId,
}: {
  teeTimes: TeeTime[];
  competitionId: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="max-w-md">
        <h2 className="text-xl font-bold text-charcoal mb-4">
          No Valid Tee Time
        </h2>
        <p className="text-turf mb-6">
          You don't have access to score entry for this competition. You can
          view the leaderboard or participant list instead.
        </p>
        <div className="space-y-3">
          <button
            onClick={() =>
              navigate({ to: `/player/competitions/${competitionId}` })
            }
            className="w-full bg-coral text-scorecard px-4 py-2 rounded-lg font-medium hover:bg-coral/90 transition-colors"
          >
            View Competition Details
          </button>
          {teeTimes && teeTimes.length > 0 && (
            <div className="text-sm text-turf">
              <p className="mb-2">Available tee times:</p>
              <div className="space-y-1">
                {teeTimes.slice(0, 3).map((teeTime) => (
                  <div key={teeTime.id} className="text-xs">
                    {teeTime.teetime}
                    {" - "}
                    {teeTime.participants.length} players
                  </div>
                ))}
                {teeTimes.length > 3 && (
                  <div className="text-xs">
                    ... and {teeTimes.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
