import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  useTours,
  usePlayerEnrollments,
  useRequestEnrollment,
  type Tour,
  type TourEnrollment,
} from "../../api/tours";
import { useAuth } from "../../hooks/useAuth";
import {
  Trophy,
  Users,
  AlertTriangle,
  Search,
  Globe,
  Lock,
  UserPlus,
  Check,
  Clock,
  LogIn,
} from "lucide-react";
import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

// Loading skeleton components
function TourCardSkeleton() {
  return (
    <div className="bg-scorecard rounded-2xl border border-soft-grey overflow-hidden">
      <div className="h-24 bg-soft-grey animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-soft-grey rounded animate-pulse" />
        <div className="h-3 bg-soft-grey rounded w-3/4 animate-pulse" />
        <div className="h-8 bg-soft-grey rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function PlayerTours() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: tours, isLoading: toursLoading, error: toursError } = useTours();
  const { data: playerEnrollments } = usePlayerEnrollments();
  const { isAuthenticated } = useAuth();
  const requestEnrollmentMutation = useRequestEnrollment();

  // Get enrollment status for a tour
  const getEnrollmentStatus = (tourId: number): TourEnrollment | undefined => {
    return playerEnrollments?.find((e) => e.tour_id === tourId);
  };

  // Filter tours based on search
  const filteredTours = useMemo(() => {
    if (!tours) return [];
    return tours.filter(
      (tour) =>
        tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tour.description &&
          tour.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tours, searchQuery]);

  // Separate tours by enrollment status
  const { enrolledTours, publicTours } = useMemo(() => {
    const enrolled: Tour[] = [];
    const publicList: Tour[] = [];

    filteredTours.forEach((tour) => {
      const enrollment = playerEnrollments?.find((e) => e.tour_id === tour.id);
      if (enrollment?.status === "active") {
        enrolled.push(tour);
      } else if (tour.visibility === "public") {
        publicList.push(tour);
      }
    });

    return { enrolledTours: enrolled, publicTours: publicList };
  }, [filteredTours, playerEnrollments]);

  const handleRequestToJoin = async (tourId: number) => {
    try {
      await requestEnrollmentMutation.mutateAsync(tourId);
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to request enrollment:", error);
    }
  };

  if (toursLoading) {
    return (
      <PlayerPageLayout title="Golf Tours">
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
              className="h-10 rounded mx-auto mb-4 w-64 animate-pulse"
              style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
            />
            <div
              className="h-6 rounded mx-auto w-80 animate-pulse"
              style={{ backgroundColor: "rgba(248, 249, 250, 0.2)" }}
            />
          </div>
        </div>

        {/* Content Loading */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TourCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </PlayerPageLayout>
    );
  }

  if (toursError) {
    return (
      <PlayerPageLayout title="Golf Tours">
        <main className="container mx-auto px-4 py-12">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-flag mx-auto mb-6" />
            <h2 className="text-display-md font-bold text-charcoal mb-4 font-display">
              Error Loading Tours
            </h2>
            <p className="text-charcoal/70 mb-8 font-primary">
              Unable to load golf tours. Please try again later.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-turf text-scorecard px-6 py-3 font-medium hover:bg-fairway transition-colors font-primary"
            >
              Try Again
            </Button>
          </div>
        </main>
      </PlayerPageLayout>
    );
  }

  return (
    <PlayerPageLayout title="Golf Tours">
      {/* Hero Section */}
      <div
        className="text-scorecard py-12 relative"
        style={{
          background: `linear-gradient(135deg, var(--fairway-green), var(--turf-green))`,
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-display-lg font-bold mb-4 font-display">Golf Tours</h1>
          <p className="text-body-xl text-scorecard/90 font-primary">
            Discover individual golf tours and track your progress
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="max-w-md mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-turf" />
            <Input
              type="text"
              placeholder="Search tours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-soft-grey rounded focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf font-primary"
            />
          </div>
        </div>

        {/* My Tours Section */}
        {enrolledTours.length > 0 && (
          <div className="mb-12">
            <h2 className="text-display-sm font-bold font-display text-charcoal mb-6">
              My Tours
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledTours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  enrollment={getEnrollmentStatus(tour.id)}
                  isAuthenticated={isAuthenticated}
                  onRequestJoin={handleRequestToJoin}
                  isRequesting={requestEnrollmentMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Public Tours Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-display-sm font-bold font-display text-charcoal">
              Available Tours
            </h2>
            <div className="text-sm text-turf font-primary">
              {publicTours.length} tours available
            </div>
          </div>

          {publicTours.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicTours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  enrollment={getEnrollmentStatus(tour.id)}
                  isAuthenticated={isAuthenticated}
                  onRequestJoin={handleRequestToJoin}
                  isRequesting={requestEnrollmentMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </PlayerPageLayout>
  );
}

// Tour Card Component
function TourCard({
  tour,
  enrollment,
  isAuthenticated,
  onRequestJoin,
  isRequesting,
}: {
  tour: Tour;
  enrollment?: TourEnrollment;
  isAuthenticated: boolean;
  onRequestJoin: (tourId: number) => void;
  isRequesting: boolean;
}) {
  const isEnrolled = enrollment?.status === "active";
  const isPending = enrollment?.status === "pending";
  const isRequested = enrollment?.status === "requested";
  const canRequest = tour.enrollment_mode === "request" && !enrollment;

  return (
    <div className="bg-scorecard rounded-2xl border border-soft-grey overflow-hidden hover:border-turf transition-colors">
      <div className="relative">
        {tour.banner_image_url ? (
          <div className="h-32 relative overflow-hidden">
            <img
              src={tour.banner_image_url}
              alt={`${tour.name} banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {tour.visibility === "public" ? (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--turf-green)",
                  }}
                >
                  <Globe className="w-3 h-3" />
                  PUBLIC
                </span>
              ) : (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--charcoal-text)",
                  }}
                >
                  <Lock className="w-3 h-3" />
                  PRIVATE
                </span>
              )}
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-scorecard">
              <h4 className="text-lg font-bold font-display drop-shadow-md truncate">{tour.name}</h4>
            </div>
          </div>
        ) : (
          <div
            className="h-32 relative"
            style={{
              background: isEnrolled
                ? "linear-gradient(135deg, var(--turf-green), var(--fairway-green))"
                : "linear-gradient(135deg, var(--sky-blue), #0ea5e9)",
            }}
          >
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {tour.visibility === "public" ? (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--turf-green)",
                  }}
                >
                  <Globe className="w-3 h-3" />
                  PUBLIC
                </span>
              ) : (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 font-primary"
                  style={{
                    backgroundColor: "rgba(248, 249, 250, 0.9)",
                    color: "var(--charcoal-text)",
                  }}
                >
                  <Lock className="w-3 h-3" />
                  PRIVATE
                </span>
              )}
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-scorecard">
              <h4 className="text-lg font-bold font-display truncate">{tour.name}</h4>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-sm text-charcoal/70 mb-4 font-primary line-clamp-2">
          {tour.description || "Individual golf tour."}
        </p>

        {/* Enrollment Status - Compact Badges */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {isEnrolled && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-turf text-scorecard">
              <Check className="w-3 h-3" />
              ENROLLED
            </span>
          )}

          {isPending && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-coral text-scorecard">
              <Clock className="w-3 h-3" />
              PENDING
            </span>
          )}

          {isRequested && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-sky text-scorecard">
              <Clock className="w-3 h-3" />
              REQUESTED
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {isEnrolled && (
            <Link
              to={`/player/tours/${tour.id}`}
              className="w-full bg-turf text-scorecard py-2 px-3 rounded-full text-sm font-medium hover:bg-fairway transition-colors text-center block font-primary"
            >
              View Tour
            </Link>
          )}

          {canRequest && isAuthenticated && (
            <Button
              onClick={() => onRequestJoin(tour.id)}
              disabled={isRequesting}
              className="w-full bg-coral text-scorecard py-2 px-3 rounded text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {isRequesting ? "Requesting..." : "Request to Join"}
            </Button>
          )}

          {canRequest && !isAuthenticated && (
            <Link
              to="/login"
              className="w-full bg-turf text-scorecard py-2 px-3 rounded-full text-sm font-medium hover:bg-fairway transition-colors flex items-center justify-center gap-2 font-primary"
            >
              <LogIn className="w-4 h-4" />
              Sign in to Join
            </Link>
          )}

          {/* View Tour Info for public tours (even if enrollment closed) */}
          {tour.visibility === "public" && !isEnrolled && !canRequest && (
            <Link
              to={`/player/tours/${tour.id}`}
              className="w-full bg-turf/10 text-turf border border-turf py-2 px-3 rounded-full text-sm font-medium hover:bg-turf/20 transition-colors text-center block font-primary"
            >
              View Tour Info
            </Link>
          )}

          {!enrollment && tour.enrollment_mode === "closed" && (
            <div className="text-center text-sm text-charcoal/60 font-primary py-2 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Enrollment by invitation only</span>
            </div>
          )}
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
          No tours found
        </h3>
        <p className="text-charcoal/70 font-primary">
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
        No public tours available
      </h3>
      <p className="text-charcoal/70 font-primary">
        Check back later for upcoming golf tours.
      </p>
    </div>
  );
}
