import { Link } from "@tanstack/react-router";
import { useCompetitions } from "../../api/competitions";
import { usePublicSeries } from "../../api/series";
import { useCourses } from "../../api/courses";
import {
  Calendar,
  Trophy,
  ChevronRight,
  Smartphone,
  BarChart3,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useMemo } from "react";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function StatsBarSkeleton() {
  return (
    <div
      className="py-8 border-b border-soft-grey"
      style={{ backgroundColor: "var(--light-rough)" }}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div
      className="bg-fairway text-scorecard min-h-[60vh] flex items-center"
      style={{
        background:
          "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48 mx-auto bg-white/20" />
          <Skeleton className="h-16 w-full max-w-2xl mx-auto bg-white/20" />
          <Skeleton className="h-6 w-full max-w-3xl mx-auto bg-white/20" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Skeleton className="h-12 w-48 bg-white/20" />
            <Skeleton className="h-12 w-32 bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetitionsSkeleton() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-scorecard rounded-xl p-6 border border-soft-grey"
            >
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <AlertCircle className="h-16 w-16 text-flag mx-auto mb-4" />
        <h2 className="text-display-sm text-fairway mb-4">
          Something went wrong
        </h2>
        <p className="text-body-md text-charcoal mb-6">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-coral hover:bg-[#E8890A] text-scorecard px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlayerLanding() {
  const {
    data: competitions,
    isLoading: competitionsLoading,
    error: competitionsError,
    refetch: refetchCompetitions,
  } = useCompetitions();
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = usePublicSeries();
  const { data: courses, isLoading: coursesLoading } = useCourses();

  const { liveCompetitions, upcomingCompetitions, recentCompetitions, stats } =
    useMemo(() => {
      if (!competitions) {
        return {
          liveCompetitions: [],
          upcomingCompetitions: [],
          recentCompetitions: [],
          stats: {
            totalCompetitions: 0,
            activeSeries: 0,
            totalParticipants: 0,
            roundsScored: 0,
          },
        };
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const live = competitions.filter((comp) => {
        const compDate = new Date(comp.date);
        const compDay = new Date(
          compDate.getFullYear(),
          compDate.getMonth(),
          compDate.getDate()
        );
        return compDay.getTime() === today.getTime();
      });

      const upcoming = competitions
        .filter((comp) => {
          const compDate = new Date(comp.date);
          const compDay = new Date(
            compDate.getFullYear(),
            compDate.getMonth(),
            compDate.getDate()
          );
          return compDay.getTime() > today.getTime();
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 2);

      const recent = competitions
        .filter((comp) => {
          const compDate = new Date(comp.date);
          const compDay = new Date(
            compDate.getFullYear(),
            compDate.getMonth(),
            compDate.getDate()
          );
          return compDay.getTime() < today.getTime();
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);

      const totalParticipants = competitions.reduce(
        (sum, comp) => sum + comp.participant_count,
        0
      );
      const roundsScored = Math.floor(totalParticipants * 1.5);

      return {
        liveCompetitions: live,
        upcomingCompetitions: upcoming,
        recentCompetitions: recent,
        stats: {
          totalCompetitions: competitions.length,
          activeSeries: series?.length || 0,
          totalParticipants,
          roundsScored,
        },
      };
    }, [competitions, series]);

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  const getTimeUntilCompetition = (date: string) => {
    const compDate = new Date(date);
    const now = new Date();
    const diffTime = compDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  };

  const getCompetitionLink = (competition: {
    id: number;
    date: string;
    series_id?: number;
  }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const compDate = new Date(competition.date);
    const compDay = new Date(
      compDate.getFullYear(),
      compDate.getMonth(),
      compDate.getDate()
    );

    const isSeriesCompetition = !!competition.series_id;
    const isToday = compDay.getTime() === today.getTime();
    const isPast = compDay.getTime() < today.getTime();
    const isFuture = compDay.getTime() > today.getTime();

    // If series competition and already played → Team result
    if (isSeriesCompetition && isPast) {
      return `/player/competitions/${competition.id}?view=teams#teamresult`;
    }

    // If ongoing (today) → Leaderboard for both series and non-series
    if (isToday) {
      return `/player/competitions/${competition.id}?view=teams#leaderboard`;
    }

    // If upcoming → Start list for both series and non-series
    if (isFuture) {
      return `/player/competitions/${competition.id}?view=teams#`;
    }

    // If non-series competition and past → Leaderboard
    if (!isSeriesCompetition && isPast) {
      return `/player/competitions/${competition.id}?view=teams#leaderboard`;
    }

    // Default fallback
    return `/player/competitions/${competition.id}?view=teams#`;
  };

  if (competitionsError && seriesError) {
    return (
      <ErrorState
        message="Unable to load competitions and series data. Please check your connection and try again."
        onRetry={() => {
          refetchCompetitions();
          refetchSeries();
        }}
      />
    );
  }

  const isLoading = competitionsLoading || seriesLoading || coursesLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {/* Hero Section */}
      {isLoading ? (
        <HeroSkeleton />
      ) : (
        <section
          className="bg-fairway text-scorecard min-h-[60vh] flex items-center"
          style={{
            background:
              "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
          }}
        >
          <div className="container mx-auto px-4 py-8 sm:py-0">
            <div className="text-center max-w-4xl mx-auto">
              {/* Logo */}
              <div className="mb-8">
                <div className="flex items-center justify-center">
                  <img
                    src="/tapscore_horizontal_large_transparent.png"
                    alt="TapScore Logo"
                    className="w-72 md:w-96 lg:w-[500px] h-auto"
                  />
                </div>
              </div>

              {/* Hero Content */}
              <h2
                className="text-display-lg md:text-display-xl mb-6"
                style={{ color: "var(--scorecard-white)" }}
              >
                Golf Scoring
                <span style={{ color: "var(--sunset-coral)" }}>
                  {" "}
                  Made Simple
                </span>
              </h2>
              <p
                className="text-body-lg md:text-body-xl mb-8 max-w-2xl mx-auto"
                style={{ color: "var(--light-rough)" }}
              >
                Digital scoring for golf competitions, series, and casual
                rounds. Real-time leaderboards, mobile-first scoring, and
                comprehensive statistics.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-4 justify-center mb-8 sm:mb-0 px-4 sm:px-0">
                <Link
                  to="/player/series"
                  className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--sunset-coral)",
                    color: "var(--scorecard-white)",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                      "#E8890A")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                      "var(--sunset-coral)")
                  }
                >
                  View Series
                </Link>
                <Link
                  to="/player/competitions"
                  className="border-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 inline-flex items-center justify-center"
                  style={{
                    borderColor: "var(--scorecard-white)",
                    color: "var(--scorecard-white)",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor =
                      "var(--scorecard-white)";
                    (e.target as HTMLElement).style.color =
                      "var(--fairway-green)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor =
                      "transparent";
                    (e.target as HTMLElement).style.color =
                      "var(--scorecard-white)";
                  }}
                >
                  Browse Competitions
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stats Bar */}
      {isLoading ? (
        <StatsBarSkeleton />
      ) : (
        <section
          className="py-8 border-b border-soft-grey"
          style={{ backgroundColor: "var(--light-rough)" }}
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-2">
                <div className="text-display-md text-fairway">
                  {stats.activeSeries}
                </div>
                <div className="text-label-sm text-charcoal/70 uppercase tracking-wide">
                  Active Series
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-display-md text-fairway">
                  {stats.totalCompetitions}
                </div>
                <div className="text-label-sm text-charcoal/70 uppercase tracking-wide">
                  Total Competitions
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-display-md text-fairway">
                  {stats.totalParticipants}
                </div>
                <div className="text-label-sm text-charcoal/70 uppercase tracking-wide">
                  Active Players
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-display-md text-fairway">
                  {stats.roundsScored > 1000
                    ? `${(stats.roundsScored / 1000).toFixed(1)}k`
                    : stats.roundsScored}
                </div>
                <div className="text-label-sm text-charcoal/70 uppercase tracking-wide">
                  Rounds Scored
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Live Activity Section */}
      {isLoading ? (
        <CompetitionsSkeleton />
      ) : (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-display-md text-charcoal mb-4">
                Live Tournament Action
              </h3>
              <p className="text-body-lg text-charcoal/70">
                See what's happening right now in TapScore competitions
              </p>
            </div>

            {/* Competitions Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {/* Live Competitions */}
              {liveCompetitions.map((competition) => {
                const course = getCourse(competition.course_id);
                return (
                  <Link
                    key={competition.id}
                    to={getCompetitionLink(competition)}
                    className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-scorecard to-rough/10 rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-flag rounded-full animate-pulse"></div>
                      <span className="text-label-sm text-flag uppercase tracking-wide font-semibold">
                        Live Now
                      </span>
                    </div>
                    <h4 className="text-body-xl font-bold text-charcoal mb-2">
                      {competition.name}
                    </h4>
                    <p className="text-charcoal/70 mb-4">
                      {competition.participant_count} players •{" "}
                      {course?.name || "Golf Course"}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-body-sm text-charcoal/60">
                          Status:
                        </span>
                        <span className="font-semibold text-turf">
                          In Progress
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-turf h-2 rounded-full"
                          style={{ width: "65%" }}
                        ></div>
                      </div>
                      <div className="text-label-xs text-charcoal/50">
                        Competition ongoing
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Upcoming Competitions */}
              {upcomingCompetitions.map((competition) => {
                const course = getCourse(competition.course_id);
                const timeUntil = getTimeUntilCompetition(competition.date);
                return (
                  <Link
                    key={competition.id}
                    to={getCompetitionLink(competition)}
                    className="bg-gradient-to-br from-scorecard to-rough/10 rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-coral/10 rounded-full flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-coral" />
                      </div>
                      <span className="text-label-sm text-coral uppercase tracking-wide font-semibold">
                        {timeUntil}
                      </span>
                    </div>
                    <h4 className="text-body-lg font-bold text-charcoal mb-2">
                      {competition.name}
                    </h4>
                    <p className="text-charcoal/70 mb-4">
                      {competition.participant_count} registered •{" "}
                      {course?.name || "Golf Course"}
                    </p>
                    <div className="w-full bg-turf text-scorecard py-2 rounded-lg font-medium transition-colors text-center hover:bg-turf/90">
                      View Competition
                    </div>
                  </Link>
                );
              })}

              {/* Recent Results */}
              {recentCompetitions.map((competition) => {
                return (
                  <Link
                    key={competition.id}
                    to={getCompetitionLink(competition)}
                    className="bg-gradient-to-br from-scorecard to-rough/10 rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-turf/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-turf" />
                      </div>
                      <span className="text-label-sm text-turf uppercase tracking-wide font-semibold">
                        Completed
                      </span>
                    </div>
                    <h4 className="text-body-lg font-bold text-charcoal mb-2">
                      {competition.name}
                    </h4>
                    <p className="text-charcoal/70 mb-4">
                      {competition.participant_count} players •{" "}
                      {new Date(competition.date).toLocaleDateString()}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-body-sm">
                          🏆 Results Available
                        </span>
                        <ChevronRight className="h-4 w-4 text-charcoal/40" />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Show empty state only if no competitions at all */}
              {!liveCompetitions.length &&
                !upcomingCompetitions.length &&
                !recentCompetitions.length && (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-12">
                    <Calendar className="h-12 w-12 text-charcoal/40 mx-auto mb-4" />
                    <h4 className="text-body-lg font-medium text-charcoal mb-2">
                      No competitions available
                    </h4>
                    <p className="text-charcoal/70">
                      Check back later for upcoming golf competitions.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-display-md text-charcoal mb-4">
              Everything You Need
            </h3>
            <p className="text-body-lg text-charcoal/70">
              Powerful features for every type of golf competition
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-scorecard rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="w-12 h-12 bg-sky/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-6 w-6 text-sky" />
              </div>
              <h4 className="text-body-lg font-bold text-charcoal mb-2">
                Mobile Scoring
              </h4>
              <p className="text-charcoal/60 text-body-sm">
                Real-time score entry optimized for mobile devices
              </p>
            </div>

            <div className="bg-scorecard rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="w-12 h-12 bg-turf/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-6 w-6 text-turf" />
              </div>
              <h4 className="text-body-lg font-bold text-charcoal mb-2">
                Live Leaderboards
              </h4>
              <p className="text-charcoal/60 text-body-sm">
                Follow the action with instant leaderboard updates
              </p>
            </div>

            <div className="bg-scorecard rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-coral" />
              </div>
              <h4 className="text-body-lg font-bold text-charcoal mb-2">
                Series Management
              </h4>
              <p className="text-charcoal/60 text-body-sm">
                Organize multi-event series with point systems
              </p>
            </div>

            <div className="bg-scorecard rounded-xl p-6 border border-soft-grey hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-coral" />
              </div>
              <h4 className="text-body-lg font-bold text-charcoal mb-2">
                Statistics
              </h4>
              <p className="text-charcoal/60 text-body-sm">
                Comprehensive performance tracking and analytics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-16"
        style={{
          background:
            "linear-gradient(135deg, var(--fairway-green), var(--turf-green))",
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h3
            className="text-display-md mb-4"
            style={{ color: "var(--scorecard-white)" }}
          >
            Ready to Improve Your Golf Experience?
          </h3>
          <p
            className="text-body-xl mb-8 max-w-2xl mx-auto"
            style={{ color: "var(--light-rough)" }}
          >
            Join thousands of golfers using TapScore for better tournament
            management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/player/series"
              className="px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 inline-flex items-center justify-center"
              style={{
                backgroundColor: "var(--sunset-coral)",
                color: "var(--scorecard-white)",
              }}
            >
              Get Started Today
            </Link>
            <Link
              to="/player/competitions"
              className="border-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 inline-flex items-center justify-center"
              style={{
                borderColor: "var(--scorecard-white)",
                color: "var(--scorecard-white)",
                backgroundColor: "transparent",
              }}
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
