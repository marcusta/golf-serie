import { useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useTour,
  useTourCompetitions,
  useTourDocuments,
  usePlayerEnrollments,
  useRequestEnrollment,
} from "@/api/tours";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
  Clock,
  UserPlus,
  LogIn,
  Lock,
  Globe,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";

// Loading skeleton components
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="h-[200px] bg-gray-300" />
      <div className="bg-rough p-6">
        <div className="container mx-auto grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 bg-gray-300 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 space-y-8">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
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
  showBackButton = true,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  showBackButton?: boolean;
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
          {showBackButton && (
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-soft-grey text-charcoal hover:bg-rough/20"
            >
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TourDetail() {
  const { tourId } = useParams({ from: "/player/tours/$tourId" });

  const id = parseInt(tourId);
  const {
    data: tour,
    isLoading: tourLoading,
    error: tourError,
    refetch: refetchTour,
  } = useTour(id);

  const { data: competitions, isLoading: competitionsLoading } =
    useTourCompetitions(id);

  const { data: documents, isLoading: documentsLoading } =
    useTourDocuments(id);

  const { data: playerEnrollments } = usePlayerEnrollments();
  const { isAuthenticated } = useAuth();
  const requestEnrollmentMutation = useRequestEnrollment();

  // Find enrollment status for this tour
  const enrollment = playerEnrollments?.find((e) => e.tour_id === id);
  const isEnrolled = enrollment?.status === "active";
  const isPending = enrollment?.status === "pending";
  const isRequested = enrollment?.status === "requested";
  const canRequest = tour?.enrollment_mode === "request" && !enrollment;

  // Calculate key metrics for info bar
  const totalCompetitions = competitions?.length || 0;

  // Find upcoming competitions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingCompetitions = competitions?.filter((comp) => {
    const compDate = new Date(comp.date);
    compDate.setHours(0, 0, 0, 0);
    return compDate >= today;
  }) || [];

  // Find the landing document
  const landingDocument = tour?.landing_document_id
    ? documents?.find((doc) => doc.id === tour.landing_document_id)
    : null;

  // Handle enrollment request
  const handleRequestToJoin = async () => {
    try {
      await requestEnrollmentMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to request enrollment:", error);
    }
  };

  // Clean navigation with proper browser history back
  const handleBackNavigation = useCallback(() => {
    window.history.back();
  }, []);

  // Enhanced error handling
  if (tourLoading && !tour) return <LoadingSkeleton />;

  if (tourError) {
    return (
      <ErrorState
        title="Tour Not Found"
        message="The tour you're looking for doesn't exist or may have been removed."
        onRetry={() => refetchTour()}
      />
    );
  }

  if (!tour) {
    return (
      <ErrorState
        title="Tour Unavailable"
        message="This tour is currently unavailable. Please try again later."
        onRetry={() => refetchTour()}
      />
    );
  }

  // Main content
  const renderMainContent = () => {
    return (
      <div className="space-y-8">
        {/* Enrollment Status Banner */}
        {isEnrolled && (
          <div className="bg-turf/10 border border-turf/20 rounded-xl p-4">
            <div className="flex items-center gap-3 text-turf">
              <Check className="w-5 h-5" />
              <span className="font-medium font-primary">
                You're enrolled in this tour
              </span>
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-coral/10 border border-coral/20 rounded-xl p-4">
            <div className="flex items-center gap-3 text-coral">
              <Clock className="w-5 h-5" />
              <span className="font-medium font-primary">
                Pending - awaiting registration completion
              </span>
            </div>
          </div>
        )}

        {isRequested && (
          <div className="bg-sky/10 border border-sky/20 rounded-xl p-4">
            <div className="flex items-center gap-3 text-sky">
              <Clock className="w-5 h-5" />
              <span className="font-medium font-primary">
                Your request to join is pending approval
              </span>
            </div>
          </div>
        )}

        {/* Join Tour CTA for non-enrolled users */}
        {canRequest && (
          <div className="bg-gradient-to-r from-coral to-orange-500 rounded-xl p-6 text-scorecard">
            <h3 className="text-lg font-display font-semibold mb-2">
              Join This Tour
            </h3>
            <p className="text-scorecard/90 mb-4 font-primary">
              Request to join this tour and participate in upcoming competitions.
            </p>
            {isAuthenticated ? (
              <Button
                onClick={handleRequestToJoin}
                disabled={requestEnrollmentMutation.isPending}
                className="bg-scorecard text-coral hover:bg-scorecard/90"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {requestEnrollmentMutation.isPending ? "Requesting..." : "Request to Join"}
              </Button>
            ) : (
              <Link to="/login">
                <Button className="bg-scorecard text-coral hover:bg-scorecard/90">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in to Join
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Primary Content Area - Landing Document */}
        {landingDocument ? (
          <section>
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {landingDocument.content}
              </ReactMarkdown>
            </div>
          </section>
        ) : (
          tour.description && (
            <section>
              <h2 className="text-display-sm font-display font-semibold text-charcoal mb-6">
                About This Tour
              </h2>
              <div className="prose prose-gray max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {tour.description}
                </ReactMarkdown>
              </div>
            </section>
          )
        )}

        {/* Quick Access Cards */}
        <section>
          <h3 className="text-display-sm font-display font-semibold text-charcoal mb-6">
            Quick Access
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* All Competitions Card */}
            <Link
              to="/player/tours/$tourId/competitions"
              params={{ tourId }}
              className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group block"
            >
              <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                <Calendar className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
              </div>
              <h4 className="text-label-lg font-display font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                Competitions
              </h4>
              <p className="text-body-sm text-charcoal/70">
                {competitionsLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `Browse ${totalCompetitions} competitions`
                )}
              </p>
            </Link>

            {/* Documents Card */}
            {documents && documents.length > 0 && (
              <Link
                to="/player/tours/$tourId/documents"
                params={{ tourId }}
                className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group block"
              >
                <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                  <FileText className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
                </div>
                <h4 className="text-label-lg font-display font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                  Documents
                </h4>
                <p className="text-body-sm text-charcoal/70">
                  {documentsLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `View ${documents.length} document${
                      documents.length !== 1 ? "s" : ""
                    }`
                  )}
                </p>
              </Link>
            )}
          </div>
        </section>

        {/* Upcoming Competitions Section */}
        {upcomingCompetitions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-display-sm font-display font-semibold text-charcoal">
                Upcoming Competitions
              </h3>
              <Link
                to="/player/tours/$tourId/competitions"
                params={{ tourId }}
                className="text-turf hover:text-fairway text-body-sm font-medium transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingCompetitions.slice(0, 3).map((competition) => (
                <Link
                  key={competition.id}
                  to="/player/competitions/$competitionId"
                  params={{ competitionId: competition.id.toString() }}
                  className="block p-4 rounded-xl border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200 group bg-scorecard"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rough rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-turf/20 transition-colors">
                      <Calendar className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-label-lg font-semibold text-charcoal group-hover:text-fairway transition-colors truncate">
                        {competition.name}
                      </h4>
                      <div className="flex items-center gap-2 text-body-sm text-charcoal/70 mt-1">
                        <span>
                          {new Date(competition.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {competition.course_name && (
                          <>
                            <span className="text-charcoal/30">•</span>
                            <span className="truncate">{competition.course_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-charcoal/30 flex-shrink-0 group-hover:text-turf transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <PlayerPageLayout onBackClick={handleBackNavigation}>

      {/* Hero Section */}
      <section className="relative">
        {/* Hero Banner */}
        {tour.banner_image_url ? (
          <div className="relative h-[200px] md:h-[280px] overflow-hidden">
            <img
              src={tour.banner_image_url}
              alt={`${tour.name} banner`}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-fairway/70" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-2">
                {tour.visibility === "public" ? (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-scorecard/90 text-turf flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    PUBLIC
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-scorecard/90 text-charcoal flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    PRIVATE
                  </span>
                )}
              </div>
              <h1 className="text-display-md md:text-display-lg font-display font-bold text-scorecard drop-shadow-lg">
                {tour.name}
              </h1>
              {tour.description && !landingDocument && (
                <p className="text-body-lg text-scorecard/90 mt-2 drop-shadow-md line-clamp-2">
                  {tour.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-fairway to-turf p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              {tour.visibility === "public" ? (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-scorecard/90 text-turf flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  PUBLIC
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-scorecard/90 text-charcoal flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  PRIVATE
                </span>
              )}
            </div>
            <h1 className="text-display-md md:text-display-lg font-display font-bold text-scorecard">
              {tour.name}
            </h1>
            {tour.description && !landingDocument && (
              <p className="text-body-lg text-scorecard/90 mt-2">
                {tour.description}
              </p>
            )}
          </div>
        )}

        {/* Info Bar */}
        <div className="bg-rough p-4 md:p-6 border-b border-soft-grey">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-display-sm font-display font-bold text-fairway">
                  {competitionsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    totalCompetitions
                  )}
                </div>
                <div className="text-label-sm font-medium text-charcoal uppercase tracking-wide">
                  {totalCompetitions === 1 ? "Competition" : "Competitions"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-display-sm font-display font-bold text-fairway">
                  {competitionsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    upcomingCompetitions.length
                  )}
                </div>
                <div className="text-label-sm font-medium text-charcoal uppercase tracking-wide">
                  Upcoming
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <main className="container mx-auto px-4 py-6">{renderMainContent()}</main>
    </PlayerPageLayout>
  );
}
