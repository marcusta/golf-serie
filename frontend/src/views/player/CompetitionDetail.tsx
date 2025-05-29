import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useCompetition,
  useCompetitionLeaderboard,
} from "../../api/competitions";
import { useCourse } from "../../api/courses";
import { useTeeTimesForCompetition } from "../../api/tee-times";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Trophy,
  ArrowLeft,
  Medal,
} from "lucide-react";

type TabType = "startlist" | "leaderboard" | "teamresult";

export default function CompetitionDetail() {
  const { competitionId } = useParams({ strict: false });
  const [activeTab, setActiveTab] = useState<TabType>("startlist");

  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );
  const { data: course } = useCourse(competition?.course_id || 0);
  const { data: teeTimes, isLoading: teeTimesLoading } =
    useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useCompetitionLeaderboard(competitionId ? parseInt(competitionId) : 0);

  if (competitionLoading) return <div>Loading competition...</div>;
  if (!competition) return <div>Competition not found</div>;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/player/competitions"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {competition.name}
          </h1>
          <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(competition.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {course?.name || "Loading course..."}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {totalParticipants} participants
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("startlist")}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === "startlist"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            <Clock className="h-4 w-4" />
            Start List
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === "leaderboard"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("teamresult")}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === "teamresult"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            <Medal className="h-4 w-4" />
            Team Result
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "startlist" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Tee Times</h2>
            <div className="text-sm text-gray-500">
              {teeTimes?.length || 0} tee times scheduled
            </div>
          </div>

          {teeTimesLoading ? (
            <div>Loading tee times...</div>
          ) : !teeTimes || teeTimes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tee times scheduled for this competition yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {teeTimes.map((teeTime) => (
                <Link
                  key={teeTime.id}
                  to={`/player/competitions/${competitionId}/tee-times/${teeTime.id}`}
                  className="block bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-green-600" />
                        <span className="text-lg font-semibold text-gray-900">
                          {teeTime.teetime}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {teeTime.participants.length} players
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {teeTime.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <span className="font-medium text-gray-900">
                              {participant.team_name}{" "}
                              {participant.position_name}
                            </span>
                            <div className="text-xs text-gray-500">
                              {participant.player_names}{" "}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {teeTime.participants.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Leaderboard</h2>
            <div className="text-sm text-gray-500">Live scoring</div>
          </div>

          {leaderboardLoading ? (
            <div>Loading leaderboard...</div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
                    <div
                      key={entry.participant.id}
                      className={`px-6 py-4 ${getPositionColor(
                        index + 1
                      )} border-l-4`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2">
                            <span className="text-sm font-bold">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">
                              {entry.participant.team_name}{" "}
                              {entry.participant.position_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Thru {entry.holesPlayed} holes
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-6">
                            <div>
                              <div className="text-sm text-gray-600">Score</div>
                              <div className="text-xl font-bold text-gray-900">
                                {entry.totalShots}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">
                                To Par
                              </div>
                              <div
                                className={`text-xl font-bold ${getToParColor(
                                  entry.relativeToPar
                                )}`}
                              >
                                {formatToPar(entry.relativeToPar)}
                              </div>
                            </div>
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

      {activeTab === "teamresult" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Team Results
            </h2>
            <div className="text-sm text-gray-500">Final standings</div>
          </div>

          {leaderboardLoading ? (
            <div>Loading team results...</div>
          ) : !sortedTeamResults || sortedTeamResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No team results available yet.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {sortedTeamResults.map((team) => (
                  <div
                    key={team.teamName}
                    className={`px-6 py-4 ${getPositionColor(
                      team.position
                    )} border-l-4`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2">
                          <span className="text-sm font-bold">
                            {team.position}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {team.teamName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {team.participants.length} players
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-sm text-gray-600">
                              Total Score
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                              {team.totalShots}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">To Par</div>
                            <div
                              className={`text-xl font-bold ${getToParColor(
                                team.relativeToPar
                              )}`}
                            >
                              {formatToPar(team.relativeToPar)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Points</div>
                            <div className="text-xl font-bold text-green-600">
                              {team.points}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Player Scores
                        </h5>
                        <div className="space-y-2">
                          {team.participants.map((participant) => (
                            <div
                              key={participant.name}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-600">
                                {participant.name} ({participant.position})
                              </span>
                              <div className="flex items-center gap-4">
                                <span
                                  className={getToParColor(
                                    participant.relativeToPar
                                  )}
                                >
                                  {formatToPar(participant.relativeToPar)}
                                </span>
                                <span className="text-gray-900">
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
  );
}
