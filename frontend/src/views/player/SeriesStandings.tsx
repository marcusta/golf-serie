import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesStandings } from "@/api/series";
import {
  ArrowLeft,
  Trophy,
  AlertCircle,
  RefreshCw,
  Share,
  Download,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TapScoreLogo from "@/components/ui/TapScoreLogo";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Top 3 cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
  serieId,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  serieId: string;
}) {
  return (
    <div className="min-h-screen bg-scorecard flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-flag" />
        </div>
        <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
          {title}
        </h1>
        <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Link
            to="/player/series/$serieId"
            params={{ serieId }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-soft-grey text-charcoal hover:bg-rough/20 hover:border-turf rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Series
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SeriesStandings() {
  const { serieId } = useParams({ from: "/player/series/$serieId/standings" });

  const seriesId = parseInt(serieId);
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
  } = useSingleSeries(seriesId);

  const {
    data: standings,
    isLoading: standingsLoading,
    error: standingsError,
    refetch: refetchStandings,
  } = useSeriesStandings(seriesId);

  const handleShare = async () => {
    if (navigator.share && series) {
      try {
        await navigator.share({
          title: `${series.name} Standings`,
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleExport = () => {
    if (!standings?.team_standings) return;

    const csvContent = [
      ["Position", "Team", "Points", "Competitions Played"].join(","),
      ...standings.team_standings.map((standing) =>
        [
          standing.position,
          `"${standing.team_name}"`,
          standing.total_points,
          standing.competitions_played,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${series?.name || "series"}-standings.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (seriesLoading || standingsLoading) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
        serieId={serieId}
      />
    );
  }

  if (standingsError) {
    return (
      <ErrorState
        title="Error Loading Standings"
        message="Unable to load team standings. Please try again."
        onRetry={() => refetchStandings()}
        serieId={serieId}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
        serieId={serieId}
      />
    );
  }

  if (!standings?.team_standings?.length) {
    return (
      <div className="min-h-screen bg-scorecard">
        {/* Main Header with Navigation */}
        <header className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 h-16">
              <Link
                to="/player/series/$serieId"
                params={{ serieId }}
                className="p-2 hover:bg-turf rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <TapScoreLogo size="sm" variant="color" layout="horizontal" />
              <div className="w-px h-6 bg-scorecard/30" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold font-display truncate">
                  {series.name}
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-header with Page Title */}
        <div className="bg-scorecard border-b border-soft-grey shadow-sm">
          <div className="container mx-auto px-4">
            <div className="py-4">
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Team Standings
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Track team performance and rankings
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Trophy className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Standings Available
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              Team standings will appear here once competitions begin.
            </p>
            <Link
              to="/player/series/$serieId"
              params={{ serieId }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-turf hover:bg-fairway text-scorecard rounded-xl transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Series Overview
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const topThree = standings.team_standings.slice(0, 3);

  return (
    <div className="min-h-screen bg-scorecard">
      {/* Main Header with Navigation */}
      <header className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <Link
              to="/player/series/$serieId"
              params={{ serieId }}
              className="p-2 hover:bg-turf rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <TapScoreLogo size="sm" variant="color" layout="horizontal" />
            <div className="w-px h-6 bg-scorecard/30" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold font-display truncate">
                {series.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header with Page Title and Actions */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Team Standings
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Track team performance and rankings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                title="Share standings"
              >
                <Share className="h-5 w-5" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                title="Export to CSV"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Top 3 Summary Cards */}
        {topThree.length > 0 && (
          <section className="mb-8">
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-6">
              Top Performers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topThree.map((standing, index) => (
                <div
                  key={standing.team_id}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    index === 0
                      ? "bg-gradient-to-br from-coral/10 to-coral/5 border-coral shadow-lg shadow-coral/20"
                      : index === 1
                      ? "bg-gradient-to-br from-soft-grey/20 to-soft-grey/10 border-soft-grey"
                      : "bg-gradient-to-br from-turf/10 to-turf/5 border-turf"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        index === 0
                          ? "bg-coral text-scorecard"
                          : index === 1
                          ? "bg-soft-grey text-charcoal"
                          : "bg-turf text-scorecard"
                      }`}
                    >
                      {index === 0 ? (
                        <Medal className="h-6 w-6" />
                      ) : (
                        <span className="text-lg font-bold">
                          {standing.position}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-label-lg font-semibold text-charcoal truncate">
                        {standing.team_name}
                      </h3>
                      <p className="text-body-sm text-charcoal/70">
                        {standing.competitions_played} competition
                        {standing.competitions_played !== 1 ? "s" : ""} played
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-display-lg font-display font-bold text-charcoal">
                      {standing.total_points}
                    </div>
                    <div className="text-body-sm text-charcoal/70 font-medium">
                      points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full Standings Table */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-display-sm font-display font-semibold text-charcoal">
              Complete Standings
            </h2>
            <span className="text-body-sm text-charcoal/70">
              {standings.team_standings.length} team
              {standings.team_standings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {standings.team_standings.map((standing) => (
              <div
                key={standing.team_id}
                className="p-4 rounded-xl border border-soft-grey bg-scorecard"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${
                      standing.position === 1
                        ? "bg-coral text-scorecard shadow-lg shadow-coral/30"
                        : standing.position <= 3
                        ? "bg-turf/20 text-turf"
                        : "bg-charcoal/10 text-charcoal"
                    }`}
                  >
                    {standing.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-label-md font-semibold text-charcoal truncate">
                      {standing.team_name}
                    </h3>
                    <p className="text-body-sm text-charcoal/70">
                      {standing.competitions_played} competitions played
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-label-lg font-semibold text-charcoal">
                      {standing.total_points}
                    </div>
                    <div className="text-body-sm text-charcoal/70">points</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-scorecard border border-soft-grey rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-fairway to-turf text-scorecard">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wide">
                    Position
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wide">
                    Team
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-sm uppercase tracking-wide">
                    Points
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-sm uppercase tracking-wide">
                    Competitions
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.team_standings.map((standing, index) => (
                  <tr
                    key={standing.team_id}
                    className={`border-b border-soft-grey/50 transition-colors hover:bg-rough/20 ${
                      index % 2 === 0 ? "bg-scorecard" : "bg-rough/10"
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                            standing.position === 1
                              ? "bg-coral text-scorecard"
                              : standing.position <= 3
                              ? "bg-turf/20 text-turf"
                              : "bg-charcoal/10 text-charcoal"
                          }`}
                        >
                          {standing.position}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-charcoal">
                        {standing.team_name}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="font-semibold text-charcoal">
                        {standing.total_points}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="text-charcoal">
                        {standing.competitions_played}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
