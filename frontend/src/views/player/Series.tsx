import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  usePublicSeries,
  useSeriesStandings,
  useSeriesCompetitions,
  type Series,
} from "../../api/series";
import {
  Trophy,
  Users,
  ArrowLeft,
  Crown,
  AlertTriangle,
  Star,
  Eye,
  ChevronRight,
  Mail,
} from "lucide-react";
import TapScoreLogo from "../../components/ui/TapScoreLogo";

// Types for enhanced series data
interface SeriesStats {
  totalSeries: number;
  activeSeries: number;
  totalTeams: number;
  totalPlayers: number;
}

// Simplified interface without mock data fields
interface EnhancedSeries extends Series {
  teamCount: number;
}

// Loading skeleton components
function SeriesCardSkeleton() {
  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden">
      <div className="h-32 bg-soft-grey animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-soft-grey rounded animate-pulse" />
        <div className="h-3 bg-soft-grey rounded w-3/4 animate-pulse" />
        <div className="space-y-2">
          <div className="h-2 bg-soft-grey rounded animate-pulse" />
          <div className="h-2 bg-soft-grey rounded w-1/2 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-soft-grey rounded animate-pulse" />
          <div className="h-8 bg-soft-grey rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function FeaturedSeriesSkeleton() {
  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden">
      <div className="h-48 bg-soft-grey animate-pulse" />
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="h-5 bg-soft-grey rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-soft-grey rounded animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-5 bg-soft-grey rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-soft-grey rounded animate-pulse"
                />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-soft-grey rounded animate-pulse" />
              <div className="h-8 bg-soft-grey rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayerSeries() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: series, isLoading, error } = usePublicSeries();

  // Calculate real series statistics
  const seriesStats: SeriesStats = useMemo(() => {
    if (!series) {
      return {
        totalSeries: 0,
        activeSeries: 0,
        totalTeams: 0,
        totalPlayers: 0,
      };
    }

    const activeSeries = series.filter((s) => s.is_public).length;
    return {
      totalSeries: series.length,
      activeSeries,
      totalTeams: 0, // Will be calculated from actual standings data
      totalPlayers: 0, // Will be calculated from actual standings data
    };
  }, [series]);

  // Use only real series data without mock enhancements
  const enhancedSeries: EnhancedSeries[] = useMemo(() => {
    if (!series) return [];

    return series.map((serie) => ({
      ...serie,
      teamCount: 0, // Will be filled from standings data
    }));
  }, [series]);

  // Filter series based on search
  const filteredSeries = enhancedSeries.filter(
    (serie) =>
      serie.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (serie.description &&
        serie.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Find featured series (first public series with standings)
  const featuredSeries = enhancedSeries.find((s) => s.is_public);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-scorecard">
        {/* Header */}
        <header className="bg-fairway text-scorecard shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 h-16">
              <button className="p-2 hover:bg-turf rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
            </div>
          </div>
        </header>

        {/* Hero Skeleton */}
        <div
          className="text-scorecard py-12"
          style={{
            background:
              "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
          }}
        >
          <div className="container mx-auto px-4 text-center">
            <div
              className="h-8 rounded mx-auto mb-4 w-64 animate-pulse"
              style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
            />
            <div
              className="h-6 rounded mx-auto mb-8 w-96 animate-pulse"
              style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
            />
            <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div
                    className="h-8 rounded mb-2 animate-pulse"
                    style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
                  />
                  <div
                    className="h-4 rounded animate-pulse"
                    style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Loading */}
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-6 bg-soft-grey rounded mb-6 w-48 animate-pulse" />
            <FeaturedSeriesSkeleton />
          </div>

          <div className="space-y-6">
            <div className="h-6 bg-soft-grey rounded w-32 animate-pulse" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SeriesCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-scorecard">
        <header className="bg-fairway text-scorecard shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 h-16">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-turf rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-flag mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-charcoal mb-4 font-display">
              Error Loading Series
            </h2>
            <p className="text-charcoal opacity-70 mb-8 font-primary">
              Unable to load golf series. Please try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-turf text-scorecard px-6 py-3 rounded-lg font-medium hover:bg-fairway transition-colors font-primary"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-scorecard">
      {/* Header */}
      <header className="bg-fairway text-scorecard shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <button className="p-2 hover:bg-turf rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <TapScoreLogo size="md" variant="color" layout="horizontal" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div
        className="text-scorecard py-12 relative"
        style={{
          background: `linear-gradient(135deg, var(--fairway-green), var(--turf-green))`,
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl font-bold mb-4 font-display">Golf Series</h1>
          <p className="text-xl opacity-90 mb-8 font-primary">
            Discover competitive golf series and track your team's progress
          </p>
          <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold font-display">
                {seriesStats.activeSeries}
              </div>
              <div className="text-sm opacity-90 font-primary">
                Active Series
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-display">
                {seriesStats.totalTeams}
              </div>
              <div className="text-sm opacity-90 font-primary">Total Teams</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-display">
                {seriesStats.totalPlayers}
              </div>
              <div className="text-sm opacity-90 font-primary">
                Total Players
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Series */}
      <main className="container mx-auto px-4 py-8">
        {featuredSeries && (
          <div className="mb-8">
            <h3 className="text-xl font-bold font-display mb-6 text-charcoal flex items-center gap-2">
              <Star className="w-5 h-5 text-coral" />
              Featured Series
            </h3>

            <FeaturedSeriesCard series={featuredSeries} />
          </div>
        )}

        {/* Search and All Series */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-display text-charcoal">
              All Series
            </h3>
            <div className="text-sm text-turf font-primary">
              {filteredSeries.length} series available
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-md">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-turf" />
              <input
                type="text"
                placeholder="Search series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-soft-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf font-primary"
              />
            </div>
          </div>

          {filteredSeries.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map((serie) => (
                <SeriesCard key={serie.id} series={serie} />
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div
            className="text-scorecard rounded-xl p-8 mx-4"
            style={{
              background:
                "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
            }}
          >
            <h3 className="text-2xl font-bold mb-4 font-display">
              Want to create your own series?
            </h3>
            <p className="text-lg text-scorecard mb-6 font-primary">
              TapScore makes it easy to organize and manage golf series for your
              club or group
            </p>
            <button className="bg-coral text-scorecard px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 mx-auto font-primary">
              <Mail className="w-5 h-5" />
              Contact Us
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Featured Series Card Component
function FeaturedSeriesCard({ series }: { series: EnhancedSeries }) {
  const { data: standings } = useSeriesStandings(series.id);
  const { data: competitions } = useSeriesCompetitions(series.id);

  const nextCompetition = competitions?.[0];
  const topThree = standings?.team_standings?.slice(0, 3) || [];
  const teamCount = standings?.team_standings?.length || 0;

  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative">
        {series.banner_image_url ? (
          <div className="h-48 relative overflow-hidden">
            <img
              src={series.banner_image_url}
              alt={series.name}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            ></div>
            <div className="absolute top-4 left-4">
              <span className="bg-scorecard text-coral text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 font-primary shadow-lg">
                <Trophy className="w-3 h-3" />
                FEATURED
              </span>
            </div>
            <div className="absolute bottom-4 left-4 text-scorecard">
              <h3 className="text-2xl font-bold font-display">{series.name}</h3>
              <p className="opacity-90 font-primary">
                {series.description || "Championship series"}
              </p>
            </div>
            <div className="absolute bottom-4 right-4 text-scorecard text-right">
              <div className="text-3xl font-bold font-display">{teamCount}</div>
              <div className="text-sm opacity-90 font-primary">Teams</div>
            </div>
          </div>
        ) : (
          <div
            className="h-48 relative"
            style={{
              background:
                "linear-gradient(135deg, var(--sunset-coral), #ea580c)",
            }}
          >
            <div className="absolute top-4 left-4">
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 font-primary shadow-lg"
                style={{
                  backgroundColor: "rgba(248, 249, 250, 0.9)",
                  color: "var(--sunset-coral)",
                }}
              >
                <Trophy className="w-3 h-3" />
                FEATURED
              </span>
            </div>
            <div className="absolute bottom-4 left-4 text-scorecard">
              <h3 className="text-2xl font-bold font-display">{series.name}</h3>
              <p className="opacity-90 font-primary">
                {series.description || "Championship series"}
              </p>
            </div>
            <div className="absolute bottom-4 right-4 text-scorecard text-right">
              <div className="text-3xl font-bold font-display">{teamCount}</div>
              <div className="text-sm opacity-90 font-primary">Teams</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-scorecard p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Standings Preview */}
          <div>
            <h4 className="font-semibold text-charcoal mb-3 font-display">
              Current Standings
            </h4>
            {topThree.length > 0 ? (
              <div className="space-y-2">
                {topThree.map((standing, index) => (
                  <div
                    key={standing.team_id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      index === 0
                        ? "bg-yellow-50 border border-yellow-200"
                        : index === 1
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-orange-50 border border-orange-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          index === 0
                            ? "text-yellow-500"
                            : index === 1
                            ? "text-gray-400"
                            : "text-orange-500"
                        }
                      >
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                      </span>
                      <span className="text-sm font-medium font-primary">
                        {standing.team_name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-turf font-display">
                      {standing.total_points} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-charcoal opacity-70 font-primary">
                No standings available yet
              </div>
            )}
          </div>

          {/* Series Info */}
          <div>
            <h4 className="font-semibold text-charcoal mb-3 font-display">
              Series Information
            </h4>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal opacity-70 font-primary">
                  Total Competitions:
                </span>
                <span className="font-medium font-primary">
                  {standings?.total_competitions || 0}
                </span>
              </div>
              {nextCompetition && (
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal opacity-70 font-primary">
                    Next Event:
                  </span>
                  <span className="font-medium font-primary">
                    {new Date(nextCompetition.date).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-charcoal opacity-70 font-primary">
                  Teams:
                </span>
                <span className="font-medium font-primary">{teamCount}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                to={`/player/series/${series.id}`}
                className="w-full bg-turf text-scorecard py-2 rounded-lg font-medium hover:bg-fairway transition-colors text-center block font-primary"
              >
                View Series Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Series Card Component
function SeriesCard({ series }: { series: EnhancedSeries }) {
  const { data: standings } = useSeriesStandings(series.id);
  const { data: competitions } = useSeriesCompetitions(series.id);

  const teamCount = standings?.team_standings?.length || 0;
  const champion = standings?.team_standings?.[0];
  const hasCompetitions = competitions && competitions.length > 0;

  return (
    <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-turf transition-all duration-300">
      <div className="relative">
        {series.banner_image_url ? (
          <div className="h-32 relative overflow-hidden">
            <img
              src={series.banner_image_url}
              alt={series.name}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            ></div>
            <div className="absolute bottom-3 left-3 text-scorecard">
              <h4 className="text-lg font-bold font-display">{series.name}</h4>
            </div>
            <div className="absolute bottom-3 right-3 text-scorecard text-right">
              <div className="text-2xl font-bold font-display">{teamCount}</div>
              <div className="text-xs opacity-90 font-primary">Teams</div>
            </div>
          </div>
        ) : (
          <div
            className="h-32 relative"
            style={{
              background:
                hasCompetitions && champion
                  ? "linear-gradient(135deg, var(--charcoal-text), #374151)"
                  : hasCompetitions
                  ? "linear-gradient(135deg, var(--turf-green), var(--fairway-green))"
                  : "linear-gradient(135deg, var(--sky-blue), #0ea5e9)",
            }}
          >
            {hasCompetitions && champion && (
              <div className="absolute top-3 left-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--charcoal-text)",
                  }}
                >
                  COMPLETED
                </span>
              </div>
            )}
            {hasCompetitions && !champion && (
              <div className="absolute top-3 left-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--turf-green)",
                  }}
                >
                  ACTIVE
                </span>
              </div>
            )}
            {!hasCompetitions && (
              <div className="absolute top-3 left-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--sky-blue)",
                  }}
                >
                  UPCOMING
                </span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 text-scorecard">
              <h4 className="text-lg font-bold font-display">{series.name}</h4>
            </div>
            <div className="absolute bottom-3 right-3 text-scorecard text-right">
              <div className="text-2xl font-bold font-display">{teamCount}</div>
              <div className="text-xs opacity-90 font-primary">Teams</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-sm text-charcoal opacity-70 mb-4 font-primary line-clamp-2">
          {series.description || "Golf competition series for teams."}
        </p>

        {hasCompetitions && champion && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-charcoal opacity-70 font-primary">
                CHAMPION
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-charcoal font-primary">
                {champion.team_name}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Link
            to={`/player/series/${series.id}`}
            className="w-full bg-turf text-scorecard py-2 px-3 rounded-lg text-sm font-medium hover:bg-fairway transition-colors text-center block font-primary"
          >
            {hasCompetitions && champion ? (
              <>
                <Trophy className="inline w-4 h-4 mr-1" />
                View Results
              </>
            ) : hasCompetitions ? (
              <>
                <ChevronRight className="inline w-4 h-4 mr-1" />
                View Details
              </>
            ) : (
              <>
                <Eye className="inline w-4 h-4 mr-1" />
                Learn More
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ searchQuery }: { searchQuery: string }) {
  if (searchQuery.trim()) {
    return (
      <div className="text-center py-12">
        <div className="text-turf mb-4">
          <Users className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-charcoal mb-2 font-display">
          No series found
        </h3>
        <p className="text-charcoal opacity-70 font-primary">
          Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="text-turf mb-4">
        <Trophy className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-charcoal mb-2 font-display">
        No series available
      </h3>
      <p className="text-charcoal opacity-70 font-primary">
        Check back later for upcoming golf series.
      </p>
    </div>
  );
}
