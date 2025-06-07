import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useSingleSeries,
  useSeriesStandings,
  useSeriesCompetitions,
} from "@/api/series";
import { ArrowLeft, Calendar, Trophy, Users, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function SeriesDetail() {
  const { serieId } = useParams({ from: "/player/series/$serieId" });
  const [activeTab, setActiveTab] = useState<"standings" | "competitions">(
    "standings"
  );

  const seriesId = parseInt(serieId);
  const { data: series, isLoading: seriesLoading } = useSingleSeries(seriesId);
  const { data: standings, isLoading: standingsLoading } =
    useSeriesStandings(seriesId);
  const { data: competitions, isLoading: competitionsLoading } =
    useSeriesCompetitions(seriesId);

  if (seriesLoading) return <div>Loading series...</div>;
  if (!series) return <div>Series not found</div>;

  const tabs = [
    { id: "standings", label: "Team Standings", icon: Trophy },
    { id: "competitions", label: "Competitions", icon: Calendar },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          to="/player/series"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Series
        </Link>
      </div>

      {/* Hero banner */}
      {series.banner_image_url && (
        <div
          className="relative h-48 rounded-lg overflow-hidden"
          style={{
            backgroundImage: `url(${series.banner_image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* inline RGBA overlay */}
          <div
            className="absolute inset-0 z-10"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          />

          <div className="absolute bottom-0 left-0 w-full p-6 z-20">
            <h1 className="text-3xl font-bold text-white">{series.name}</h1>
          </div>
        </div>
      )}

      {/* Series name (if no banner) */}
      {!series.banner_image_url && (
        <h1 className="text-3xl font-bold text-gray-900">{series.name}</h1>
      )}

      {/* Description */}
      {series.description && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            About this Series
          </h2>
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {series.description}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      isActive
                        ? "border-green-500 text-green-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <IconComponent className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "standings" && (
            <div>
              {standingsLoading ? (
                <div>Loading standings...</div>
              ) : standings?.team_standings.length ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Team Standings
                    </h3>
                    <span className="text-sm text-gray-500">
                      {standings.total_competitions} competitions
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-sm font-medium text-gray-500">
                            Position
                          </th>
                          <th className="text-left py-2 text-sm font-medium text-gray-500">
                            Team
                          </th>
                          <th className="text-right py-2 text-sm font-medium text-gray-500">
                            Points
                          </th>
                          <th className="text-right py-2 text-sm font-medium text-gray-500">
                            Competitions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.team_standings.map((standing) => (
                          <tr
                            key={standing.team_id}
                            className="border-b border-gray-100"
                          >
                            <td className="py-3 text-sm font-medium text-gray-900">
                              #{standing.position}
                            </td>
                            <td className="py-3 text-sm text-gray-900">
                              {standing.team_name}
                            </td>
                            <td className="py-3 text-sm text-gray-900 text-right">
                              {standing.total_points}
                            </td>
                            <td className="py-3 text-sm text-gray-500 text-right">
                              {standing.competitions_played}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No team standings yet
                  </h3>
                  <p className="text-gray-600">
                    Standings will appear after competitions are completed.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "competitions" && (
            <div>
              {competitionsLoading ? (
                <div>Loading competitions...</div>
              ) : competitions?.length ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Competitions
                  </h3>

                  <div className="grid gap-4">
                    {competitions.map((competition) => {
                      const competitionDate = new Date(competition.date);
                      const today = new Date();
                      const isPast = competitionDate < today;

                      return (
                        <Link
                          key={competition.id}
                          to={`/player/competitions/${competition.id}`}
                          className="block bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200"
                        >
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-medium text-gray-900">
                                    {competition.name}
                                  </h4>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      isPast
                                        ? "text-gray-600 bg-gray-100"
                                        : "text-green-600 bg-green-100"
                                    }`}
                                  >
                                    {isPast ? "Completed" : "Upcoming"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-6 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {competitionDate.toLocaleDateString(
                                      "en-US",
                                      {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      }
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {competition.participant_count} participants
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center">
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No competitions yet
                  </h3>
                  <p className="text-gray-600">
                    Competitions will be added to this series soon.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
