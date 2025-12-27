import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import {
  useCompetition,
  useCompetitionLeaderboardWithDetails,
  useCompetitionTeamLeaderboard,
} from "../../api/competitions";
import { useCourse } from "../../api/courses";
import { useTeeTimesForCompetition, useParticipant } from "../../api/tee-times";
import { usePlayerEnrollments } from "../../api/tours";
import { useMyRegistration, useCompetitionGroups } from "../../api/tour-registration";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Trophy,
  Medal,
  Edit3,
  Play,
  UserCheck,
} from "lucide-react";
import { ParticipantScorecard } from "../../components/scorecard";
import type { ParticipantData, CourseData, NetScoringData } from "../../components/scorecard";
import {
  ParticipantsListComponent,
  LeaderboardComponent,
  TeamResultComponent,
  WhosPlayingComponent,
} from "../../components/competition";
import { calculateTotalParticipants } from "../../utils/scoreCalculations";

import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";
import { useSeriesTeams } from "../../api/series";
import { SeriesLinkBanner } from "../../components/competition/SeriesLinkBanner";
import { JoinCompetitionFlow, GroupStatusCard } from "../../components/tour";

type TabType = "startlist" | "leaderboard" | "teamresult" | "whosplaying";

export default function CompetitionDetail() {
  const { competitionId } = useParams({ strict: false });
  const searchParams = useSearch({ strict: false });

  // Check if we came from score entry
  const fromTeeTime = searchParams?.fromTeeTime;

  // Check for hash-based navigation to set initial tab
  // Note: competition.start_mode is checked after data loads in useEffect
  const getInitialTab = (): TabType => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "leaderboard") return "leaderboard";
    if (hash === "teamresult") return "teamresult";
    // If no hash, we'll figure out default based on start_mode after competition loads
    return "startlist";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  // Scorecard modal state
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    number | null
  >(null);

  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );
  const { data: course } = useCourse(competition?.course_id || 0);
  // Keep series teams for potential future use
  useSeriesTeams(competition?.series_id || 0);
  const {
    data: teeTimes,
    isLoading: teeTimesLoading,
    refetch: refetchTeeTimes,
  } = useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);
  const {
    data: leaderboardResponse,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboardWithDetails(competitionId ? parseInt(competitionId) : 0);

  // Extract leaderboard entries and metadata
  const leaderboard = leaderboardResponse?.entries;
  const scoringMode = leaderboardResponse?.scoringMode;
  const teeInfo = leaderboardResponse?.tee;

  const {
    data: teamLeaderboard,
    isLoading: teamLeaderboardLoading,
    refetch: refetchTeamLeaderboard,
  } = useCompetitionTeamLeaderboard(
    competitionId ? parseInt(competitionId) : 0
  );

  // Registration state for tour competitions with open-start mode
  const [showJoinFlow, setShowJoinFlow] = useState(false);

  // Check enrollment status for tour competitions
  const { data: playerEnrollments } = usePlayerEnrollments();
  const tourId = competition?.tour_id;
  const enrollment = playerEnrollments?.find((e) => e.tour_id === tourId);
  const isEnrolled = enrollment?.status === "active";

  // Get registration status for open-start tour competitions
  const isOpenStartTourCompetition =
    competition?.tour_id && competition?.start_mode === "open";
  const { data: registrationData, refetch: refetchRegistration } = useMyRegistration(
    isOpenStartTourCompetition ? parseInt(competitionId || "0") : 0
  );

  // Get groups for open-start competitions (Who's Playing tab)
  const { data: competitionGroups, isLoading: groupsLoading } = useCompetitionGroups(
    isOpenStartTourCompetition ? parseInt(competitionId || "0") : 0
  );

  // Check if competition is currently open
  const isCompetitionOpen = useCallback(() => {
    if (!competition?.open_start || !competition?.open_end) return false;
    const now = new Date();
    const openStart = new Date(competition.open_start);
    const openEnd = new Date(competition.open_end);
    return now >= openStart && now <= openEnd;
  }, [competition?.open_start, competition?.open_end]);

  // Fetch selected participant data for scorecard
  const { data: selectedParticipant } = useParticipant(
    selectedParticipantId || 0
  );

  // Handle opening participant scorecard
  const handleParticipantClick = (participantId: number) => {
    setSelectedParticipantId(participantId);
  };

  // Handle closing participant scorecard
  const handleCloseScorecardModal = () => {
    setSelectedParticipantId(null);
  };

  // Clean navigation with proper browser history back
  const handleBackNavigation = useCallback(() => {
    // Use browser's native history back for reliable single-step navigation
    window.history.back();
  }, []);

  // Create course data format for scorecard component
  const scorecardCourseData: CourseData | null =
    teeTimes && teeTimes.length > 0 && course
      ? {
          id: course.id.toString(),
          name: course.name,
          holes: teeTimes[0].pars.map((par: number, index: number) => ({
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

  // Get net scoring data for selected participant from leaderboard
  const netScoringData: NetScoringData | undefined = (() => {
    if (!selectedParticipantId || !leaderboard || !teeInfo?.strokeIndex) return undefined;

    const entry = leaderboard.find(e => e.participant.id === selectedParticipantId);
    if (!entry || entry.courseHandicap === undefined || !entry.handicapStrokesPerHole) return undefined;

    return {
      strokeIndex: teeInfo.strokeIndex,
      handicapStrokesPerHole: entry.handicapStrokesPerHole,
      courseHandicap: entry.courseHandicap,
      handicapIndex: entry.participant.handicap_index,
    };
  })();

  // ... existing useEffect for hash changes ...
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "leaderboard") setActiveTab("leaderboard");
      else if (hash === "teamresult") setActiveTab("teamresult");
      else if (hash === "whosplaying") setActiveTab("whosplaying");
      else if (competition?.start_mode !== "open") setActiveTab("startlist");
      else setActiveTab("leaderboard"); // Default to leaderboard for open mode
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [competition?.start_mode]);

  // Set default tab to leaderboard for open mode competitions when competition data loads
  useEffect(() => {
    if (competition?.start_mode === "open" && activeTab === "startlist") {
      setActiveTab("leaderboard");
    }
  }, [competition?.start_mode, activeTab]);

  // Fetch fresh data when first entering leaderboard or team results views
  useEffect(() => {
    if (activeTab === "leaderboard" || activeTab === "teamresult") {
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
        if (activeTab === "teamresult") {
          refetchTeeTimes(); // Team results also need tee times data
        }
        sessionStorage.setItem(lastFetchKey, Date.now().toString());
      }
    }
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  // Periodic sync for leaderboard and team results data
  useEffect(() => {
    if (!competitionId) return;

    // Only run periodic sync when viewing leaderboard or team results
    if (activeTab !== "leaderboard" && activeTab !== "teamresult") return;

    const syncInterval = setInterval(() => {
      console.log(`Periodic sync for ${activeTab} view...`);
      refetchLeaderboard();
      if (activeTab === "teamresult") {
        refetchTeeTimes(); // Team results data comes from teeTimes
      }
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  if (competitionLoading)
    return (
      <div className="p-4 text-charcoal font-primary">
        Loading competition...
      </div>
    );
  if (!competition)
    return (
      <div className="p-4 text-charcoal font-primary">
        Competition not found
      </div>
    );

  const totalParticipants = calculateTotalParticipants(teeTimes);

  // Use team leaderboard data directly
  const sortedTeamResults = teamLeaderboard || [];

  return (
    <PlayerPageLayout
      title={competition.name}
      subtitle={course?.name}
      onBackClick={handleBackNavigation}
      seriesId={competition.series_id}
      seriesName={competition.series_name}
      customActions={
        <div className="flex items-center gap-4">
          {/* Back to Score Entry button */}
          {fromTeeTime && (
            <Link
              to={`/player/competitions/${competitionId}/tee-times/${fromTeeTime}`}
              className="flex items-center gap-2 px-3 py-2 bg-coral text-scorecard rounded-xl hover:bg-[#E8890A] hover:-translate-y-0.5 transition-all duration-200 text-sm font-medium font-primary border border-coral"
            >
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Back to</span>
              <span>Score</span>
            </Link>
          )}
        </div>
      }
    >

      <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6">
        {/* Competition Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-fairway font-display">
            {competition.name}
          </h1>
        </div>

        {/* Competition Info */}
        <div className="flex items-center justify-center gap-4 md:gap-6 text-xs md:text-sm text-charcoal/70 font-primary">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-turf" />
            <span className="hidden sm:inline">
              {new Date(competition.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="sm:hidden">
              {new Date(competition.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 text-turf" />
            <span className="truncate">{course?.name || "Loading..."}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 md:h-4 md:w-4 text-turf" />
            <span>{totalParticipants} participants</span>
          </div>
        </div>

        {/* Conditionally render the SeriesLinkBanner */}
        {competition?.series_id && competition.series_name && (
          <SeriesLinkBanner
            seriesId={competition.series_id}
            seriesName={competition.series_name}
          />
        )}

        {/* Registration Section for Open-Start Tour Competitions */}
        {isOpenStartTourCompetition && isCompetitionOpen() && (
          <div className="space-y-4">
            {/* Open status banner */}
            <div className="bg-coral/10 border border-coral/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-coral/20 rounded-full flex items-center justify-center">
                  <Play className="h-5 w-5 text-coral" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-coral text-scorecard animate-pulse">
                      OPEN NOW
                    </span>
                  </div>
                  <p className="text-body-sm text-charcoal/70">
                    Open until{" "}
                    {new Date(competition.open_end!).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Registration status / Join button */}
            {isEnrolled && registrationData?.registered && registrationData.registration ? (
              <GroupStatusCard
                competitionId={parseInt(competitionId || "0")}
                registration={registrationData.registration}
                group={registrationData.group}
                teeTimeId={registrationData.registration.tee_time_id}
                participantId={registrationData.registration.participant_id}
                onUpdate={() => refetchRegistration()}
              />
            ) : isEnrolled ? (
              <button
                onClick={() => setShowJoinFlow(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-turf hover:bg-fairway text-scorecard rounded-xl font-semibold text-lg transition-colors"
              >
                <Play className="h-5 w-5" />
                Join This Round
              </button>
            ) : (
              <div className="bg-rough/50 border border-soft-grey rounded-xl p-4 text-center">
                <p className="text-body-md text-charcoal/70">
                  You must be enrolled in this tour to join rounds
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tabs with TapScore Styling */}
        <div className="border-b border-soft-grey">
          <nav className="flex space-x-4 md:space-x-8">
            {competition?.start_mode !== "open" && (
              <button
                onClick={() => {
                  setActiveTab("startlist");
                  window.location.hash = "";
                }}
                className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary
                  ${
                    activeTab === "startlist"
                      ? "border-coral text-coral"
                      : "border-transparent text-charcoal hover:text-turf hover:border-rough"
                  }
                `}
              >
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                Start List
              </button>
            )}
            <button
              onClick={() => {
                setActiveTab("leaderboard");
                window.location.hash = "leaderboard";
                // Immediately fetch fresh data when switching to leaderboard
                console.log("Syncing data for leaderboard view...");
                refetchLeaderboard();
              }}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary
                ${
                  activeTab === "leaderboard"
                    ? "border-coral text-coral"
                    : "border-transparent text-charcoal hover:text-turf hover:border-rough"
                }
              `}
            >
              <Trophy className="h-3 w-3 md:h-4 md:w-4" />
              Leaderboard
            </button>
            {/* Show Who's Playing tab for open-start tour competitions */}
            {isOpenStartTourCompetition && (
              <button
                onClick={() => {
                  setActiveTab("whosplaying");
                  window.location.hash = "whosplaying";
                }}
                className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary
                  ${
                    activeTab === "whosplaying"
                      ? "border-coral text-coral"
                      : "border-transparent text-charcoal hover:text-turf hover:border-rough"
                  }
                `}
              >
                <UserCheck className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Who's Playing</span>
                <span className="sm:hidden">Groups</span>
              </button>
            )}
            {/* Only show Team Result tab for Series competitions (not Tour competitions) */}
            {!competition?.tour_id && (
              <button
                onClick={() => {
                  setActiveTab("teamresult");
                  window.location.hash = "teamresult";
                  // Immediately fetch fresh data when switching to team results
                  console.log("Syncing data for team results view...");
                  refetchLeaderboard();
                  refetchTeamLeaderboard();
                  refetchTeeTimes();
                }}
                className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary
                  ${
                    activeTab === "teamresult"
                      ? "border-coral text-coral"
                      : "border-transparent text-charcoal hover:text-turf hover:border-rough"
                  }
                `}
              >
                <Medal className="h-3 w-3 md:h-4 md:w-4" />
                Team Result
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "startlist" && (
          <ParticipantsListComponent
            teeTimes={teeTimes}
            teeTimesLoading={teeTimesLoading}
            competitionId={competitionId}
            venueType={competition?.venue_type}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardComponent
            leaderboard={leaderboard}
            leaderboardLoading={leaderboardLoading}
            onParticipantClick={handleParticipantClick}
            isTourCompetition={!!competition?.tour_id}
            scoringMode={scoringMode}
            teeInfo={teeInfo}
          />
        )}

        {activeTab === "teamresult" && (
          <TeamResultComponent
            teamResults={sortedTeamResults}
            leaderboardLoading={teamLeaderboardLoading}
            individualResults={leaderboard}
            onParticipantClick={handleParticipantClick}
          />
        )}

        {activeTab === "whosplaying" && (
          <WhosPlayingComponent
            groups={competitionGroups}
            isLoading={groupsLoading}
          />
        )}
      </div>

      {/* Participant Scorecard Modal */}
      <ParticipantScorecard
        visible={selectedParticipantId !== null}
        participant={scorecardParticipantData}
        course={scorecardCourseData}
        onClose={handleCloseScorecardModal}
        isTourCompetition={!!competition?.tour_id}
        netScoringData={netScoringData}
      />

      {/* Join Competition Flow Modal */}
      {isOpenStartTourCompetition && (
        <JoinCompetitionFlow
          isOpen={showJoinFlow}
          onClose={() => setShowJoinFlow(false)}
          competitionId={parseInt(competitionId || "0")}
          competitionName={competition?.name || ""}
          courseName={course?.name}
          openUntil={competition?.open_end}
          onSuccess={() => refetchRegistration()}
        />
      )}
    </PlayerPageLayout>
  );
}
