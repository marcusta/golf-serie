import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  useStandAloneCompetitions,
  useCompetitionLeaderboard,
  type Competition,
} from "../../api/competitions";
import { useCourses, type Course } from "../../api/courses";
import {
  Calendar,
  Users,
  MapPin,
  Trophy,
  Award,
  Search,
  Eye,
} from "lucide-react";
import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";
import { parseDate, formatDateLong, formatTime } from "../../utils/dateFormatting";

type FilterStatus = "all" | "upcoming" | "live" | "completed";

interface CompetitionStatus {
  status: FilterStatus;
  label: string;
  daysText?: string;
  color: string;
  bgColor: string;
  gradientClass: string;
}

// Loading skeleton components
function CompetitionCardSkeleton() {
  return (
    <div className="py-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-soft-grey rounded-xl flex-shrink-0"></div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="h-6 bg-soft-grey rounded w-48"></div>
            <div className="h-6 bg-soft-grey rounded w-20"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="h-4 bg-soft-grey rounded w-32"></div>
            <div className="h-4 bg-soft-grey rounded w-28"></div>
            <div className="h-4 bg-soft-grey rounded w-24"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 bg-soft-grey rounded w-40"></div>
            <div className="h-10 bg-soft-grey rounded w-32"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveCompetitionSkeleton() {
  return (
    <div className="bg-scorecard rounded-xl overflow-hidden animate-pulse">
      <div className="h-48 bg-soft-grey relative"></div>
      <div className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-6 bg-soft-grey rounded w-32"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex justify-between p-3 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(206, 212, 218, 0.3)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-soft-grey rounded-full"></div>
                    <div className="h-4 bg-soft-grey rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-soft-grey rounded w-8"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-6 bg-soft-grey rounded w-40"></div>
            <div className="space-y-3">
              <div className="h-2 bg-soft-grey rounded w-full"></div>
              <div className="space-y-1">
                <div className="h-4 bg-soft-grey rounded w-20"></div>
                <div className="h-4 bg-soft-grey rounded w-24"></div>
              </div>
              <div className="h-10 bg-soft-grey rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayerCompetitions() {
  const { data: competitions, isLoading, error } = useStandAloneCompetitions();
  const { data: courses } = useCourses();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  const getCompetitionStatus = (date: string): CompetitionStatus => {
    const competitionDate = parseDate(date);

    // If date is invalid, treat as upcoming with no specific day count
    if (!competitionDate) {
      return {
        status: "upcoming",
        label: "Upcoming",
        daysText: "UPCOMING",
        color: "text-scorecard",
        bgColor: "bg-coral",
        gradientClass: "bg-gradient-to-br from-coral to-orange-600",
      };
    }

    const today = new Date();
    const diffTime = competitionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: "completed",
        label: "Completed",
        color: "text-scorecard",
        bgColor: "bg-charcoal",
        gradientClass: "bg-gradient-to-br from-charcoal to-gray-600",
      };
    } else if (diffDays === 0) {
      return {
        status: "live",
        label: "Live",
        color: "text-scorecard",
        bgColor: "bg-flag",
        gradientClass: "bg-gradient-to-br from-flag to-red-600",
      };
    } else if (diffDays <= 7) {
      const days = diffDays === 1 ? "1 day" : `${diffDays} days`;
      return {
        status: "upcoming",
        label: `In ${days}`,
        daysText: `IN ${diffDays} DAY${diffDays > 1 ? "S" : ""}`,
        color: "text-scorecard",
        bgColor: "bg-coral",
        gradientClass: "bg-gradient-to-br from-coral to-orange-600",
      };
    } else {
      return {
        status: "upcoming",
        label: "Upcoming",
        daysText: "UPCOMING",
        color: "text-scorecard",
        bgColor: "bg-coral",
        gradientClass: "bg-gradient-to-br from-coral to-orange-600",
      };
    }
  };

  // Filter and categorize competitions
  const { filteredCompetitions, competitionStats, liveCompetitions } =
    useMemo(() => {
      if (!competitions) {
        return {
          filteredCompetitions: [],
          competitionStats: { all: 0, upcoming: 0, live: 0, completed: 0 },
          liveCompetitions: [],
        };
      }

      const live: typeof competitions = [];
      const upcoming: typeof competitions = [];
      const completed: typeof competitions = [];

      competitions.forEach((competition) => {
        const status = getCompetitionStatus(competition.date).status;
        if (status === "live") live.push(competition);
        else if (status === "upcoming") upcoming.push(competition);
        else if (status === "completed") completed.push(competition);
      });

      const stats = {
        all: competitions.length,
        upcoming: upcoming.length,
        live: live.length,
        completed: completed.length,
      };

      // Filter by status and search
      let filtered = competitions;
      if (statusFilter !== "all") {
        filtered = filtered.filter(
          (comp) => getCompetitionStatus(comp.date).status === statusFilter
        );
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (comp) =>
            comp.name.toLowerCase().includes(query) ||
            getCourse(comp.course_id)?.name.toLowerCase().includes(query)
        );
      }

      return {
        filteredCompetitions: filtered,
        competitionStats: stats,
        liveCompetitions: live,
      };
    }, [competitions, statusFilter, searchQuery, getCourse]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-scorecard border-b shadow-sm">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <div className="h-8 bg-soft-grey rounded w-48 animate-pulse"></div>
                <div className="h-4 bg-soft-grey rounded w-64 animate-pulse"></div>
              </div>
              <div className="h-4 bg-soft-grey rounded w-32 animate-pulse"></div>
            </div>

            {/* Filter Tabs Skeleton */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-soft-grey rounded-full w-24 animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Competition Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-soft-grey rounded w-32 animate-pulse"></div>
          <LiveCompetitionSkeleton />
        </div>

        {/* Regular Competitions Skeleton */}
        <div className="space-y-6">
          <div className="h-6 bg-soft-grey rounded w-40 animate-pulse"></div>
          <div className="divide-y divide-soft-grey">
            {[1, 2, 3].map((i) => (
              <CompetitionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-flag mb-4">
          <Trophy className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-fairway mb-2 font-display">
          Error loading competitions
        </h3>
        <p className="text-turf font-primary">
          Please try refreshing the page or check your connection.
        </p>
      </div>
    );
  }

  return (
    <PlayerPageLayout title="All Competitions">
      {/* Page Title & Filters */}
      <div className="bg-scorecard border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-charcoal font-display">
                  Competitions
                </h2>
                <p className="mt-1 text-charcoal opacity-70 font-primary">
                  Browse and join golf competitions
                </p>
              </div>
              <div className="text-sm text-turf font-primary">
                {competitionStats.all} competitions available
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-turf" />
                <input
                  type="text"
                  placeholder="Search competitions or courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-soft-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf font-primary"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors font-primary ${
                  statusFilter === "all"
                    ? "bg-turf text-scorecard"
                    : "border border-soft-grey text-charcoal hover:bg-rough hover:bg-opacity-20"
                }`}
              >
                All{" "}
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === "all"
                      ? "bg-scorecard bg-opacity-20 text-scorecard"
                      : "bg-soft-grey text-charcoal"
                  }`}
                >
                  {competitionStats.all}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter("upcoming")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors font-primary ${
                  statusFilter === "upcoming"
                    ? "bg-turf text-scorecard"
                    : "border border-soft-grey text-charcoal hover:bg-rough hover:bg-opacity-20"
                }`}
              >
                Upcoming{" "}
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === "upcoming"
                      ? "bg-scorecard bg-opacity-20 text-scorecard"
                      : "bg-soft-grey text-charcoal"
                  }`}
                >
                  {competitionStats.upcoming}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter("live")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors font-primary ${
                  statusFilter === "live"
                    ? "bg-turf text-scorecard"
                    : "border border-soft-grey text-charcoal hover:bg-rough hover:bg-opacity-20"
                }`}
              >
                Live{" "}
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === "live"
                      ? "bg-scorecard bg-opacity-20 text-scorecard"
                      : "bg-soft-grey text-charcoal"
                  }`}
                >
                  {competitionStats.live}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors font-primary ${
                  statusFilter === "completed"
                    ? "bg-turf text-scorecard"
                    : "border border-soft-grey text-charcoal hover:bg-rough hover:bg-opacity-20"
                }`}
              >
                Completed{" "}
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    statusFilter === "completed"
                      ? "bg-scorecard bg-opacity-20 text-scorecard"
                      : "bg-soft-grey text-charcoal"
                  }`}
                >
                  {competitionStats.completed}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Featured Live Competition */}
        {liveCompetitions.length > 0 &&
          statusFilter !== "completed" &&
          statusFilter !== "upcoming" && (
            <div className="mb-8">
              <LiveCompetitionSection
                liveCompetitions={liveCompetitions}
                courses={courses}
              />
            </div>
          )}

        {/* Regular Competitions Grid */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-charcoal font-display">
            {statusFilter === "all"
              ? "All Competitions"
              : statusFilter === "live"
              ? "Live Competitions"
              : statusFilter === "upcoming"
              ? "Upcoming Competitions"
              : "Completed Competitions"}
          </h3>

          {filteredCompetitions.length === 0 ? (
            <EmptyState statusFilter={statusFilter} searchQuery={searchQuery} />
          ) : (
            <div className="divide-y divide-soft-grey">
              {filteredCompetitions.map((competition) => (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  course={getCourse(competition.course_id)}
                  status={getCompetitionStatus(competition.date)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </PlayerPageLayout>
  );
}

// Component for featured live competitions
function LiveCompetitionSection({
  liveCompetitions,
  courses,
}: {
  liveCompetitions: Competition[];
  courses: Course[] | undefined;
}) {
  // Use the first live competition as featured
  const featuredCompetition = liveCompetitions[0];
  const course = courses?.find((c) => c.id === featuredCompetition.course_id);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-charcoal font-display flex items-center gap-2">
        <div className="w-2 h-2 bg-flag rounded-full animate-pulse"></div>
        Live Now
      </h3>
      <LiveCompetitionCard competition={featuredCompetition} course={course} />
    </div>
  );
}

// Live competition featured card
function LiveCompetitionCard({
  competition,
  course,
}: {
  competition: Competition;
  course: Course | undefined;
}) {
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useCompetitionLeaderboard(competition.id);

  return (
    <div className="bg-scorecard rounded-xl overflow-hidden hover:bg-gray-50/30 transition-colors">
      <div className="relative">
        {/* Golf Course Background */}
        <div className="h-48 bg-gradient-to-br from-turf to-fairway relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(28, 28, 30, 0.2)" }}
          ></div>
          <div className="absolute top-4 left-4">
            <span className="bg-gradient-to-br from-flag to-red-600 text-scorecard text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 font-primary">
              <div className="w-2 h-2 bg-scorecard rounded-full animate-pulse"></div>
              LIVE
            </span>
          </div>
          <div className="absolute bottom-4 left-4 text-scorecard">
            <h3 className="text-2xl font-bold font-display">
              {competition.name}
            </h3>
            <p className="opacity-90 font-primary">
              {course?.name} • Par {course?.pars?.total || 72}
            </p>
          </div>
          <div className="absolute bottom-4 right-4 text-scorecard text-right">
            <div className="text-3xl font-bold font-display">
              {competition.participant_count}
            </div>
            <div className="text-sm opacity-90 font-primary">Players</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Leaderboard Preview */}
          <div className="md:col-span-2">
            <h4 className="font-semibold text-charcoal mb-3 font-display">
              Live Leaderboard
            </h4>
            {leaderboardLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between p-3 rounded-lg animate-pulse"
                    style={{ backgroundColor: "rgba(206, 212, 218, 0.3)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-soft-grey rounded-full"></div>
                      <div className="h-4 bg-soft-grey rounded w-24"></div>
                    </div>
                    <div className="h-4 bg-soft-grey rounded w-8"></div>
                  </div>
                ))}
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0
                        ? "bg-yellow-50 border border-yellow-200"
                        : index === 1
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-orange-50 border border-orange-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-scorecard text-xs font-bold ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : "bg-orange-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-medium text-charcoal font-primary">
                        {entry.participant.team_name}{" "}
                        {entry.participant.position_name}
                      </span>
                    </div>
                    <span
                      className={`font-bold ${
                        entry.relativeToPar < 0
                          ? "text-turf"
                          : entry.relativeToPar === 0
                          ? "text-charcoal"
                          : "text-flag"
                      } font-display`}
                    >
                      {entry.relativeToPar === 0
                        ? "E"
                        : entry.relativeToPar > 0
                        ? `+${entry.relativeToPar}`
                        : entry.relativeToPar}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-turf font-primary">
                No scores reported yet
              </div>
            )}
          </div>

          {/* Progress & Actions */}
          <div>
            <h4 className="font-semibold text-charcoal mb-3 font-display">
              Tournament Progress
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-turf mb-1 font-primary">
                  <span>Completion</span>
                  <span>65%</span>
                </div>
                <div className="w-full bg-soft-grey rounded-full h-2">
                  <div
                    className="bg-turf h-2 rounded-full"
                    style={{ width: "65%" }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-turf font-primary">
                <div className="flex justify-between">
                  <span>Started:</span>
                  <span>
                    {formatTime(competition.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Finish:</span>
                  <span>15:30</span>
                </div>
              </div>
              <Link
                to={`/player/competitions/${competition.id}`}
                className="w-full bg-turf text-scorecard py-2 rounded-lg font-medium hover:bg-fairway transition-colors text-center block font-primary"
              >
                <Eye className="inline w-4 h-4 mr-2" />
                Watch Live
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Regular competition card
function CompetitionCard({
  competition,
  course,
  status,
}: {
  competition: Competition;
  course: Course | undefined;
  status: CompetitionStatus;
}) {
  const { data: leaderboard } = useCompetitionLeaderboard(competition.id);

  const getIconForStatus = (status: FilterStatus) => {
    switch (status) {
      case "live":
        return "🔴";
      case "upcoming":
        return "📅";
      case "completed":
        return "🏆";
      default:
        return "⛳";
    }
  };

  const getCompetitionLink = () => {
    if (status.status === "live") {
      return `/player/competitions/${competition.id}?view=teams#leaderboard`;
    } else if (status.status === "completed") {
      return `/player/competitions/${competition.id}?view=teams#teamresult`;
    } else {
      return `/player/competitions/${competition.id}?view=teams#`;
    }
  };

  const getActionButton = () => {
    if (status.status === "live") {
      return {
        text: "Watch Live",
        icon: Eye,
        className: "bg-flag hover:bg-red-600",
      };
    } else if (status.status === "completed") {
      return {
        text: "View Results",
        icon: Trophy,
        className: "bg-turf hover:bg-fairway",
      };
    } else {
      return {
        text: "Join Competition",
        icon: Users,
        className: "bg-coral hover:bg-orange-600",
      };
    }
  };

  const actionButton = getActionButton();

  return (
    <div className="py-6 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start gap-4">
        <div
          className={`w-16 h-16 ${status.gradientClass} rounded-xl flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-2xl">{getIconForStatus(status.status)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="text-xl font-bold text-charcoal font-display">
              {competition.name}
            </h3>
            <span
              className={`${status.color} ${status.bgColor} text-xs font-semibold px-3 py-1 rounded-full font-primary`}
            >
              {status.daysText || status.label}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-charcoal opacity-70 font-primary">
              <Calendar className="w-4 h-4" />
              {formatDateLong(competition.date)}
            </div>
            <div className="flex items-center gap-2 text-sm text-charcoal opacity-70 font-primary">
              <MapPin className="w-4 h-4" />
              {course?.name || "Course TBD"}
            </div>
            <div className="flex items-center gap-2 text-sm text-charcoal opacity-70 font-primary">
              <Users className="w-4 h-4" />
              {competition.participant_count} participants
            </div>
          </div>

          {/* Leaderboard preview for completed/live competitions */}
          {(status.status === "completed" || status.status === "live") &&
            leaderboard &&
            leaderboard.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-charcoal mb-3 font-display">
                  {status.status === "completed"
                    ? "Final Results"
                    : "Live Leaderboard"}
                </h4>
                <div className="space-y-2">
                  {leaderboard.slice(0, 3).map((entry, index) => (
                    <div
                      key={entry.participant.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`${
                            index === 0
                              ? "text-yellow-500"
                              : index === 1
                              ? "text-gray-400"
                              : "text-orange-500"
                          }`}
                        >
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                        </span>
                        <span className="text-sm font-medium font-primary">
                          {entry.participant.team_name}{" "}
                          {entry.participant.position_name}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          status.status === "completed"
                            ? "text-turf"
                            : entry.relativeToPar < 0
                            ? "text-turf"
                            : entry.relativeToPar === 0
                            ? "text-charcoal"
                            : "text-flag"
                        } font-display`}
                      >
                        {status.status === "completed"
                          ? `${entry.totalShots} pts`
                          : entry.relativeToPar === 0
                          ? "E"
                          : entry.relativeToPar > 0
                          ? `+${entry.relativeToPar}`
                          : entry.relativeToPar}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-charcoal font-primary">
              <span className="font-medium">Course:</span> Par{" "}
              {course?.pars?.total || 72} • 18 holes
            </div>
            <Link
              to={getCompetitionLink()}
              className={`${actionButton.className} text-scorecard px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 font-primary`}
            >
              <actionButton.icon className="w-4 h-4" />
              {actionButton.text}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({
  statusFilter,
  searchQuery,
}: {
  statusFilter: FilterStatus;
  searchQuery: string;
}) {
  if (searchQuery.trim()) {
    return (
      <div className="text-center py-12">
        <div className="text-turf mb-4">
          <Search className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-fairway mb-2 font-display">
          No competitions found
        </h3>
        <p className="text-turf font-primary">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  const emptyMessages = {
    all: {
      icon: Calendar,
      title: "No competitions available",
      message: "Check back later for upcoming golf competitions.",
    },
    upcoming: {
      icon: Calendar,
      title: "No upcoming competitions",
      message: "All competitions have either started or finished.",
    },
    live: {
      icon: Trophy,
      title: "No live competitions",
      message: "No competitions are currently in progress.",
    },
    completed: {
      icon: Award,
      title: "No completed competitions",
      message: "No competitions have finished yet.",
    },
  };

  const config = emptyMessages[statusFilter];
  const IconComponent = config.icon;

  return (
    <div className="text-center py-12">
      <div className="text-turf mb-4">
        <IconComponent className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-fairway mb-2 font-display">
        {config.title}
      </h3>
      <p className="text-turf font-primary">{config.message}</p>
    </div>
  );
}
