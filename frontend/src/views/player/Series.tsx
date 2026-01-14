import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  usePublicSeries,
  useSeriesStandings,
  useSeriesCompetitions,
  type Series,
} from "../../api/series";
import {
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";

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

  // Find featured series - prioritize ACTIVE > UPCOMING > COMPLETED
  const featuredSeries = useMemo(() => {
    if (enhancedSeries.length === 0) return null;

    // Return the first public series (backend already sorted by priority)
    return enhancedSeries.find((s) => s.is_public) || null;
  }, [enhancedSeries]);

  if (isLoading) {
    return (
      <PlayerPageLayout title="Golf Series">

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
              className="h-6 rounded mx-auto w-96 animate-pulse"
              style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
            />
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
      </PlayerPageLayout>
    );
  }

  if (error) {
    return (
      <PlayerPageLayout title="Golf Series">

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
      </PlayerPageLayout>
    );
  }

  return (
    <PlayerPageLayout title="Golf Series">

      {/* Hero Section */}
      <div
        className="text-scorecard py-12 relative"
        style={{
          background: `linear-gradient(135deg, var(--fairway-green), var(--turf-green))`,
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl font-bold mb-4 font-display">Golf Series</h1>
          <p className="text-xl opacity-90 font-primary">
            Discover competitive golf series and track your team's progress
          </p>
        </div>
      </div>

      {/* Featured Series */}
      <main className="container mx-auto px-4 py-8">
        {featuredSeries && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
              Featured Series
            </h3>

            <FeaturedSeriesCard series={featuredSeries} />
          </div>
        )}

        {/* Search and All Series */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wide">
              All Series
            </h3>
            <div className="text-sm text-charcoal/70 font-primary">
              {filteredSeries.length} series available
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-soft-grey rounded focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf font-primary"
            />
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
        <div className="mt-16">
          <div
            className="text-scorecard rounded-2xl p-8"
            style={{
              background:
                "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
            }}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 font-display">
                Want to create your own series?
              </h3>
              <p className="text-lg text-scorecard mb-6 font-primary">
                TapScore makes it easy to organize and manage golf series for your
                club or group
              </p>
              <button className="bg-coral text-scorecard px-8 py-3 rounded font-semibold hover:bg-coral/90 transition-colors mx-auto font-primary">
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </main>
    </PlayerPageLayout>
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
    <div className="bg-soft-grey/30 rounded-2xl shadow-lg overflow-hidden">
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
              <span className="bg-coral text-scorecard text-xs font-bold px-3 py-1 rounded-full font-primary uppercase tracking-wide">
                Featured
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
                className="text-xs font-bold px-3 py-1 rounded-full font-primary uppercase tracking-wide"
                style={{
                  backgroundColor: "var(--scorecard-white)",
                  color: "var(--sunset-coral)",
                }}
              >
                Featured
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

      <div className="bg-white rounded p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Standings Preview */}
          <div>
            <h4 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
              Current Standings
            </h4>
            {topThree.length > 0 ? (
              <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey border border-soft-grey/50">
                {topThree.map((standing, index) => (
                  <div
                    key={standing.team_id}
                    className={`flex items-center justify-between p-3 ${
                      index === 0
                        ? "border-l-4 border-yellow-500 bg-yellow-50/50"
                        : index === 1
                        ? "border-l-4 border-gray-400 bg-gray-50/50"
                        : "border-l-4 border-orange-500 bg-orange-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-bold ${
                          index === 0
                            ? "text-yellow-500"
                            : index === 1
                            ? "text-gray-400"
                            : "text-orange-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-charcoal font-primary">
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
              <div className="text-center py-4 text-charcoal/70 font-primary">
                No standings available yet
              </div>
            )}
          </div>

          {/* Series Info */}
          <div>
            <h4 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
              Series Information
            </h4>
            <div className="bg-white rounded border border-soft-grey/50 overflow-hidden divide-y divide-soft-grey">
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-charcoal/70 font-primary">
                  Total Competitions
                </span>
                <span className="text-sm font-bold text-charcoal font-primary">
                  {standings?.total_competitions || 0}
                </span>
              </div>
              {nextCompetition && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-charcoal/70 font-primary">
                    Next Event
                  </span>
                  <span className="text-sm font-bold text-charcoal font-primary">
                    {new Date(nextCompetition.date).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-charcoal/70 font-primary">
                  Teams
                </span>
                <span className="text-sm font-bold text-charcoal font-primary">{teamCount}</span>
              </div>
            </div>

            <div className="mt-4">
              <Link
                to={`/player/series/${series.id}`}
                className="w-full bg-turf text-scorecard py-2 rounded font-medium hover:bg-turf/90 transition-colors text-center block font-primary"
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
    <div className="bg-soft-grey/30 rounded-2xl shadow-lg overflow-hidden hover:bg-soft-grey/40 transition-colors">
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
                  className="text-xs font-bold px-2 py-1 rounded-full font-primary uppercase tracking-wide"
                  style={{
                    backgroundColor: "var(--scorecard-white)",
                    color: "var(--charcoal-text)",
                  }}
                >
                  Completed
                </span>
              </div>
            )}
            {hasCompetitions && !champion && (
              <div className="absolute top-3 left-3">
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full font-primary uppercase tracking-wide"
                  style={{
                    backgroundColor: "var(--scorecard-white)",
                    color: "var(--turf-green)",
                  }}
                >
                  Active
                </span>
              </div>
            )}
            {!hasCompetitions && (
              <div className="absolute top-3 left-3">
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full font-primary uppercase tracking-wide"
                  style={{
                    backgroundColor: "var(--scorecard-white)",
                    color: "var(--sky-blue)",
                  }}
                >
                  Upcoming
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

      <div className="bg-white rounded p-4">
        <p className="text-sm text-charcoal/70 mb-4 font-primary line-clamp-2">
          {series.description || "Golf competition series for teams."}
        </p>

        {hasCompetitions && champion && (
          <div className="border-l-4 border-yellow-500 bg-yellow-50/50 rounded p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal/70 font-primary uppercase tracking-wide">
                Champion
              </span>
              <span className="text-sm font-bold text-charcoal font-primary">
                {champion.team_name}
              </span>
            </div>
          </div>
        )}

        <div>
          <Link
            to={`/player/series/${series.id}`}
            className="w-full bg-turf text-scorecard py-2 px-3 rounded text-sm font-medium hover:bg-turf/90 transition-colors text-center flex items-center justify-center gap-1 font-primary"
          >
            <span>
              {hasCompetitions && champion
                ? "View Results"
                : hasCompetitions
                ? "View Details"
                : "Learn More"}
            </span>
            <ChevronRight className="w-4 h-4" />
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
        <h3 className="text-lg font-medium text-charcoal mb-2 font-display">
          No series found
        </h3>
        <p className="text-charcoal/70 font-primary">
          Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-charcoal mb-2 font-display">
        No series available
      </h3>
      <p className="text-charcoal/70 font-primary">
        Check back later for upcoming golf series.
      </p>
    </div>
  );
}
