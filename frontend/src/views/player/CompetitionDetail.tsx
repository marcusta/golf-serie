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

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case 2:
        return "text-gray-600 bg-gray-50 border-gray-200";
      case 3:
        return "text-amber-600 bg-amber-50 border-amber-200";
      default:
        return "text-gray-900 bg-white border-gray-200";
    }
  };

  const getToParColor = (toPar: number) => {
    if (toPar < 0) return "text-green-600";
    if (toPar > 0) return "text-red-600";
    return "text-gray-600";
  };

  const formatToPar = (toPar: number) => {
    if (toPar === 0) return "E";
    return toPar > 0 ? `+${toPar}` : `${toPar}`;
  };

  const totalParticipants =
    teeTimes?.reduce(
      (total, teeTime) => total + teeTime.participants.length,
      0
    ) || 0;

  // Calculate team results
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

  // Sort teams by relativeToPar and assign points
  const sortedTeamResults = Object.values(teamResults || {})
    .sort((a, b) => a.relativeToPar - b.relativeToPar)
    .map((team, index, array) => {
      const position = index + 1;
      let points = array.length - position + 1; // Base points (last place gets 1 point)

      // Add extra points for top 3 positions
      if (position === 1) points += 2; // First place gets 2 extra points
      if (position === 2) points += 1; // Second place gets 1 extra point

      return {
        ...team,
        position,
        points,
      };
    });

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
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                Tee Times
              </h2>
              <div className="text-xs md:text-sm text-gray-500">
                {teeTimes?.length || 0} tee times
              </div>
            </div>

            {teeTimesLoading ? (
              <div className="p-4">Loading tee times...</div>
            ) : !teeTimes || teeTimes.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-gray-500 text-sm">
                No tee times scheduled for this competition yet.
              </div>
            ) : (
              <div className="grid gap-3 md:gap-4">
                {teeTimes.map((teeTime) => (
                  <Link
                    key={teeTime.id}
                    to={`/player/competitions/${competitionId}/tee-times/${teeTime.id}`}
                    className="block bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-4 md:p-6">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                          <span className="text-base md:text-lg font-semibold text-gray-900">
                            {teeTime.teetime}
                          </span>
                        </div>
                        <div className="text-xs md:text-sm text-gray-500">
                          {teeTime.participants.length} players
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                        {teeTime.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-gray-900 text-sm md:text-base block truncate">
                                {participant.team_name}{" "}
                                {participant.position_name}
                              </span>
                              <div className="text-xs text-gray-500 truncate">
                                {participant.player_names}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {teeTime.participants.length === 0 && (
                        <div className="text-center py-3 md:py-4 text-gray-500 text-sm">
                          No participants assigned to this tee time yet.
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                Leaderboard
              </h2>
              <div className="text-xs md:text-sm text-gray-500">
                Live scoring
              </div>
            </div>

            {leaderboardLoading ? (
              <div className="p-4">Loading leaderboard...</div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-gray-500">
                No scores reported yet.
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {[...leaderboard]
                    .sort((a, b) => {
                      // First sort by whether they have started (holes played > 0)
                      const aStarted = a.holesPlayed > 0;
                      const bStarted = b.holesPlayed > 0;
                      if (aStarted !== bStarted) {
                        return aStarted ? -1 : 1;
                      }
                      // Then sort by relativeToPar
                      return a.relativeToPar - b.relativeToPar;
                    })
                    .map((entry, index) => (
                      <button
                        key={entry.participant.id}
                        onClick={() =>
                          handleParticipantClick(entry.participant.id)
                        }
                        className={`w-full text-left px-4 md:px-6 py-3 md:py-4 ${getPositionColor(
                          index + 1
                        )} border-l-4 hover:bg-opacity-80 transition-colors cursor-pointer`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                            <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-white border-2 flex-shrink-0">
                              <span className="text-xs md:text-sm font-bold">
                                {index + 1}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm md:text-lg font-medium text-gray-900 truncate">
                                {entry.participant.team_name}{" "}
                                {entry.participant.position_name}
                              </h4>
                              <p className="text-xs md:text-sm text-gray-600">
                                Thru {entry.holesPlayed} holes
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-3 md:gap-6">
                              <div>
                                <div className="text-xs text-gray-600">
                                  Score
                                </div>
                                <div className="text-lg md:text-xl font-bold text-gray-900">
                                  {entry.totalShots}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">
                                  To Par
                                </div>
                                <div
                                  className={`text-lg md:text-xl font-bold ${getToParColor(
                                    entry.relativeToPar
                                  )}`}
                                >
                                  {formatToPar(entry.relativeToPar)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "teamresult" && (
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                Team Results
              </h2>
              <div className="text-xs md:text-sm text-gray-500">
                Final standings
              </div>
            </div>

            {leaderboardLoading ? (
              <div className="p-4">Loading team results...</div>
            ) : !sortedTeamResults || sortedTeamResults.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-gray-500">
                No team results available yet.
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {sortedTeamResults.map((team) => (
                    <div
                      key={team.teamName}
                      className={`px-4 md:px-6 py-3 md:py-4 ${getPositionColor(
                        team.position
                      )} border-l-4`}
                    >
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-white border-2 flex-shrink-0">
                            <span className="text-xs md:text-sm font-bold">
                              {team.position}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm md:text-lg font-medium text-gray-900 truncate">
                              {team.teamName}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-600">
                              {team.participants.length} players
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-2 md:gap-6">
                            <div>
                              <div className="text-xs text-gray-600">Total</div>
                              <div className="text-sm md:text-xl font-bold text-gray-900">
                                {team.totalShots}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">
                                To Par
                              </div>
                              <div
                                className={`text-sm md:text-xl font-bold ${getToParColor(
                                  team.relativeToPar
                                )}`}
                              >
                                {formatToPar(team.relativeToPar)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">
                                Points
                              </div>
                              <div className="text-sm md:text-xl font-bold text-green-600">
                                {team.points}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:gap-4 mt-2 md:mt-4">
                        <div>
                          <h5 className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                            Player Scores
                          </h5>
                          <div className="space-y-1 md:space-y-2">
                            {team.participants.map((participant) => (
                              <div
                                key={participant.name}
                                className="flex items-center justify-between text-xs md:text-sm"
                              >
                                <span className="text-gray-600 truncate flex-1 mr-2">
                                  {participant.name} ({participant.position})
                                </span>
                                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                                  <span
                                    className={getToParColor(
                                      participant.relativeToPar
                                    )}
                                  >
                                    {formatToPar(participant.relativeToPar)}
                                  </span>
                                  <span className="text-gray-900 font-medium">
                                    {participant.totalShots}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
