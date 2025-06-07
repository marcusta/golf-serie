import { useState, useEffect } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import {
  useCompetition,
  useCompetitionLeaderboard,
} from "../../api/competitions";
import { useCourse } from "../../api/courses";
import { useTeeTimesForCompetition, useParticipant } from "../../api/tee-times";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Trophy,
  ArrowLeft,
  Medal,
  Edit3,
} from "lucide-react";
import { HamburgerMenu } from "../../components/navigation";
import { ParticipantScorecard } from "../../components/scorecard";
import type { ParticipantData, CourseData } from "../../components/scorecard";
import {
  ParticipantsListComponent,
  LeaderboardComponent,
  TeamResultComponent,
} from "../../components/competition";
import {
  calculateTeamResults,
  calculateTotalParticipants,
} from "../../utils/scoreCalculations";

type TabType = "startlist" | "leaderboard" | "teamresult";

export default function CompetitionDetail() {
  const { competitionId } = useParams({ strict: false });
  const searchParams = useSearch({ strict: false });

  // Check if we came from score entry
  const fromTeeTime = searchParams?.fromTeeTime;

  // Check for hash-based navigation to set initial tab
  const getInitialTab = (): TabType => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "leaderboard") return "leaderboard";
    if (hash === "teamresult") return "teamresult";
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
  const {
    data: teeTimes,
    isLoading: teeTimesLoading,
    refetch: refetchTeeTimes,
  } = useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);
  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboard(competitionId ? parseInt(competitionId) : 0);

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

  // ... existing useEffect for hash changes ...
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "leaderboard") setActiveTab("leaderboard");
      else if (hash === "teamresult") setActiveTab("teamresult");
      else setActiveTab("startlist");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
    return <div className="p-4">Loading competition...</div>;
  if (!competition) return <div className="p-4">Competition not found</div>;

  const totalParticipants = calculateTotalParticipants(teeTimes);

  // Calculate team results
  const sortedTeamResults = leaderboard
    ? calculateTeamResults(
        leaderboard.map((entry) => ({
          ...entry,
          participantId: entry.participant.id,
        }))
      )
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6">
        {/* Header - Much cleaner on mobile */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            to="/player/competitions"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 truncate">
              {competition.name}
            </h1>
          </div>

          {/* Back to Score Entry button - only show if coming from tee time */}
          {fromTeeTime && (
            <Link
              to={`/player/competitions/${competitionId}/tee-times/${fromTeeTime}`}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Back to</span>
              <span>Score</span>
            </Link>
          )}

          <HamburgerMenu />
        </div>

        {/* Competition Info Header */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 md:h-4 md:w-4" />
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
              <MapPin className="h-3 w-3 md:h-4 md:w-4" />
              <span className="truncate">{course?.name || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span>{totalParticipants} participants</span>
            </div>
          </div>
        </div>

        {/* Tabs - More compact on mobile */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 md:space-x-8">
            <button
              onClick={() => {
                setActiveTab("startlist");
                window.location.hash = "";
              }}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors
                ${
                  activeTab === "startlist"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              Start List
            </button>
            <button
              onClick={() => {
                setActiveTab("leaderboard");
                window.location.hash = "leaderboard";
                // Immediately fetch fresh data when switching to leaderboard
                console.log("Syncing data for leaderboard view...");
                refetchLeaderboard();
              }}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors
                ${
                  activeTab === "leaderboard"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <Trophy className="h-3 w-3 md:h-4 md:w-4" />
              Leaderboard
            </button>
            <button
              onClick={() => {
                setActiveTab("teamresult");
                window.location.hash = "teamresult";
                // Immediately fetch fresh data when switching to team results
                console.log("Syncing data for team results view...");
                refetchLeaderboard();
                refetchTeeTimes();
              }}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors
                ${
                  activeTab === "teamresult"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <Medal className="h-3 w-3 md:h-4 md:w-4" />
              Team Result
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "startlist" && (
          <ParticipantsListComponent
            teeTimes={teeTimes}
            teeTimesLoading={teeTimesLoading}
            competitionId={competitionId}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardComponent
            leaderboard={leaderboard}
            leaderboardLoading={leaderboardLoading}
            onParticipantClick={handleParticipantClick}
          />
        )}

        {activeTab === "teamresult" && (
          <TeamResultComponent
            teamResults={sortedTeamResults}
            leaderboardLoading={leaderboardLoading}
          />
        )}
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
