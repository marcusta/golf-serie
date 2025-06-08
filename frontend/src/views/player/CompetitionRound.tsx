// src/views/player/CompetitionRound.tsx

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ScoreEntry } from "../../components/score-entry";
import {
  BottomTabNavigation,
  HoleNavigation,
  HamburgerMenu,
} from "../../components/navigation";
import { ParticipantScorecard } from "../../components/scorecard";
import type { ParticipantData, CourseData } from "../../components/scorecard";
import {
  ParticipantsListComponent,
  LeaderboardComponent,
  TeamResultComponent,
  CompetitionInfoBar,
} from "../../components/competition";
import {
  calculateTeamResults,
  calculateTotalParticipants,
} from "../../utils/scoreCalculations";
import {
  getInitialHole,
  rememberCurrentHole,
} from "../../utils/holeNavigation";
import { useCompetitionData } from "../../hooks/useCompetitionData";
import { useCompetitionSync } from "../../hooks/useCompetitionSync";
import {
  formatTeeTimeGroup,
  formatParticipantForScorecard,
} from "../../utils/participantFormatting";
import { formatCourseFromTeeTime } from "../../utils/courseFormatting";
import type { TeeTime } from "@/api/tee-times";
import TapScoreLogo from "../../components/ui/TapScoreLogo";

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

  // Handle hole navigation with sync
  const handleHoleChange = useCallback(
    async (newHole: number) => {
      setCurrentHole(newHole);
      await handleHoleNavigationSync(newHole);
    },
    [handleHoleNavigationSync]
  );

  // Calculate team results and participant counts
  const sortedTeamResults = leaderboard
    ? calculateTeamResults(
        leaderboard.map((entry) => ({
          ...entry,
          participantId: entry.participant.id,
        }))
      )
    : [];

  const totalParticipants = calculateTotalParticipants(teeTimes);

  const currentHoleData = courseData?.holes.find(
    (h: { number: number; par: number }) => h.number === currentHole
  );

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
      {/* Dark Green TapScore Header */}
      <div className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  navigate({
                    to: `/player/competitions/${competitionId}`,
                    replace: true,
                  })
                }
                className="p-2 hover:bg-turf hover:bg-opacity-30 rounded-xl transition-colors"
                title="Back to Competition"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 text-scorecard" />
              </button>
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <h1 className="text-lg md:text-xl font-bold text-scorecard truncate font-display">
                  {competition.name}
                </h1>
              </div>
              <HamburgerMenu />
            </div>
          </div>
        </div>
      </div>

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
