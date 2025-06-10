// src/views/player/CompetitionRound.tsx

import { useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  useLockParticipant,
  useUpdateParticipant,
} from "../../api/participants";
import { useSeriesTeams } from "../../api/series";
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
  getInitialHole,
  rememberCurrentHole,
} from "../../utils/holeNavigation";
import { ScoreEntry } from "../../components/score-entry";
import {
  LeaderboardComponent,
  TeamResultComponent,
  ParticipantsListComponent,
} from "../../components/competition";
import { calculateTotalParticipants } from "../../utils/scoreCalculations";
import {
  processTeamResults,
  convertLeaderboardToTeamInput,
} from "../../utils/pointCalculation";
import { CommonHeader } from "../../components/navigation/CommonHeader";
import { HamburgerMenu } from "../../components/navigation/HamburgerMenu";
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

  // Smart hole navigation - initialize with default
  const [currentHole, setCurrentHole] = useState(1);

  // Custom hooks for data and sync management
  const {
    competition,
    course,
    teeTimes,
    leaderboard,
    teeTime,
    selectedParticipant,
    isLoading: competitionLoading,
    leaderboardLoading,
    refetchTeeTime,
    refetchLeaderboard,
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
    refetchTeeTimes,
    updateScoreMutation,
    teeTime,
  });

  const { data: seriesTeams } = useSeriesTeams(competition?.series_id || 0);

  // API mutation for updating participant
  const updateParticipantMutation = useUpdateParticipant();
  const lockParticipantMutation = useLockParticipant();

  // New state for round completion workflow
  const [isReadyToFinalize, setIsReadyToFinalize] = useState(false);
  const [isFullScorecardModalOpen, setIsFullScorecardModalOpen] =
    useState(false);

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

  // Check if round is complete when teeTime data changes
  useEffect(() => {
    console.log("useEffect to check setIsReadyToFinalize");
    if (teeTime?.participants && teeTime.participants.length > 0) {
      // Ensure each participant has a valid score array before checking completion
      const participantsWithScores = teeTime.participants.filter(
        (p: ParticipantWithScore) => Array.isArray(p.score)
      );

      console.log("Debug: Checking round completion");
      console.log("Participants count:", teeTime.participants.length);
      console.log(
        "Participants with valid scores:",
        participantsWithScores.length
      );

      if (participantsWithScores.length === teeTime.participants.length) {
        const roundComplete = isRoundComplete(teeTime.participants);
        console.log("Round complete result:", roundComplete);
        setIsReadyToFinalize(roundComplete);
      } else {
        console.log("Not all participants have valid score arrays");
        setIsReadyToFinalize(false);
      }
    } else {
      console.log("No participants found");
      setIsReadyToFinalize(false);
    }
  }, [teeTime]);

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
    console.log("Score entry completed!");
  };

  // Handle opening player name editing modal
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

  // Handle closing player name editing modal
  const handleCloseNameModal = () => {
    setEditingParticipant(null);
  };

  // Handle saving player name
  const handleSaveName = (participantId: string, newName: string) => {
    updateParticipantMutation.mutate(
      {
        id: parseInt(participantId),
        data: { player_names: newName },
      },
      {
        onSuccess: () => {
          // Close modal on success
          setEditingParticipant(null);
        },
        onError: (error) => {
          console.error("Failed to update participant name:", error);
          // Here you can add a user-facing error message, e.g., using a toast notification
        },
      }
    );
  };

  // Handle hole navigation with sync
  const handleHoleChange = useCallback(
    async (newHole: number) => {
      setCurrentHole(newHole);
      await handleHoleNavigationSync(newHole);
    },
    [handleHoleNavigationSync]
  );

  // Calculate team results using new encapsulated ranking logic
  const sortedTeamResults = leaderboard
    ? processTeamResults(
        convertLeaderboardToTeamInput(
          leaderboard.map((entry) => ({
            ...entry,
            participantId: entry.participant.id,
          }))
        ),
        seriesTeams?.length
      )
    : [];

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
              />
            </div>
          </div>
        );

      case "leaderboard":
        return (
          <LeaderboardComponent
            leaderboard={leaderboard}
            leaderboardLoading={leaderboardLoading}
            onParticipantClick={handleParticipantClick}
            isRoundView={true}
          />
        );

      case "teams":
        return (
          <TeamResultComponent
            teamResults={sortedTeamResults}
            leaderboardLoading={leaderboardLoading}
            isRoundView={true}
          />
        );

      case "participants":
        return (
          <ParticipantsListComponent
            teeTimes={teeTimes}
            teeTimesLoading={false}
            competitionId={competitionId || ""}
            currentTeeTimeId={teeTimeId}
            currentTeeTime={teeTime}
            showCurrentGroup={true}
            totalParticipants={totalParticipants}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <CommonHeader title={competition.name}>
        <HamburgerMenu />
      </CommonHeader>

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
      />
    </div>
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
  );
}
