import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useTour,
  useTourCompetitions,
  useTourDocuments,
  usePlayerEnrollments,
  useRequestEnrollment,
  type TourCompetition,
} from "@/api/tours";
import { useMyRegistration, useActiveRounds } from "@/api/tour-registration";
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
  Trophy,
  Play,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import { GroupStatusCard, ActiveRoundBanner } from "@/components/tour";
import { AddPlayersToGroup } from "@/components/tour/AddPlayersToGroup";

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

  // Get active rounds for this tour (15F.1 + 15F.4)
  const { data: activeRounds } = useActiveRounds();
  const tourActiveRounds = useMemo(() => {
    return activeRounds?.filter((round) => round.tour_id === id) || [];
  }, [activeRounds, id]);

  // Find enrollment status for this tour
  const enrollment = playerEnrollments?.find((e) => e.tour_id === id);
  const isEnrolled = enrollment?.status === "active";
  const isPending = enrollment?.status === "pending";
  const isRequested = enrollment?.status === "requested";
  const canRequest = tour?.enrollment_mode === "request" && !enrollment;

  // Calculate key metrics for info bar
  const totalCompetitions = competitions?.length || 0;

  // State for join competition flow
  const [showJoinFlow, setShowJoinFlow] = useState(false);

  // Helper function to check if a competition is currently open
  const isCompetitionOpen = useCallback((comp: TourCompetition): boolean => {
    if (comp.start_mode !== "open" || !comp.open_start || !comp.open_end) {
      return false;
    }
    const now = new Date();
    const openStart = new Date(comp.open_start);
    const openEnd = new Date(comp.open_end);
    return now >= openStart && now <= openEnd;
  }, []);

  // Find upcoming competitions, sorted by closest date first
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingCompetitions = (competitions?.filter((comp) => {
    const compDate = new Date(comp.date);
    compDate.setHours(0, 0, 0, 0);
    return compDate >= today;
  }) || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Find currently open round (for "Play Now" feature)
  const currentOpenRound = useMemo(() => {
    return competitions?.find(isCompetitionOpen) || null;
  }, [competitions, isCompetitionOpen]);

  // Check if player has an active/finished round for the current open competition
  // If yes, we'll show only the ActiveRoundBanner (consolidated card) instead of LIVE NOW + GroupStatusCard
  const activeRoundForCurrentOpen = useMemo(() => {
    if (!currentOpenRound) return null;
    return tourActiveRounds.find((round) => round.competition_id === currentOpenRound.id) || null;
  }, [currentOpenRound, tourActiveRounds]);

  // Filter out active rounds that match the current open round (to avoid duplication)
  // These will be shown as the consolidated card in the "Play Now" section
  const otherActiveRounds = useMemo(() => {
    if (!currentOpenRound) return tourActiveRounds;
    return tourActiveRounds.filter((round) => round.competition_id !== currentOpenRound.id);
  }, [tourActiveRounds, currentOpenRound]);

  // Get registration status for the current open round
  const {
    data: registrationData,
    refetch: refetchRegistration,
  } = useMyRegistration(currentOpenRound?.id || 0);

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
          <div className="border-l-4 border-turf pl-4 py-3 bg-turf/5">
            <div className="flex items-center gap-2 text-turf">
              <Check className="w-4 h-4" />
              <span className="font-medium font-primary">
                You're enrolled in this tour
              </span>
            </div>
          </div>
        )}

        {isPending && (
          <div className="border-l-4 border-coral pl-4 py-3 bg-coral/5">
            <div className="flex items-center gap-2 text-coral">
              <Clock className="w-4 h-4" />
              <span className="font-medium font-primary">
                Pending - awaiting registration completion
              </span>
            </div>
          </div>
        )}

        {isRequested && (
          <div className="border-l-4 border-sky pl-4 py-3 bg-sky/5">
            <div className="flex items-center gap-2 text-sky">
              <Clock className="w-4 h-4" />
              <span className="font-medium font-primary">
                Your request to join is pending approval
              </span>
            </div>
          </div>
        )}

        {/* Active Round Banner - show for rounds NOT in the current open competition (15F.2) */}
        {/* Rounds for the current open competition are shown in the "Play Now" section below */}
        {otherActiveRounds.length > 0 && (
          <section className="space-y-4">
            {otherActiveRounds.map((round) => (
              <ActiveRoundBanner key={round.competition_id} activeRound={round} />
            ))}
          </section>
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

        {/* Play Now Section - Show when there's a currently open round */}
        {currentOpenRound && (
          <section className="space-y-4">
            {/* If player is playing or finished this round, show consolidated ActiveRoundBanner */}
            {activeRoundForCurrentOpen ? (
              <ActiveRoundBanner activeRound={activeRoundForCurrentOpen} />
            ) : (
              <>
                {/* Round header with LIVE badge - only show if NOT playing/finished */}
                <div className="bg-gradient-to-r from-turf to-fairway rounded-xl p-4 text-scorecard">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-scorecard/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Play className="h-6 w-6 text-scorecard" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-scorecard/20 text-scorecard animate-pulse">
                          LIVE NOW
                        </span>
                      </div>
                      <h3 className="text-lg font-display font-semibold">
                        {currentOpenRound.name}
                      </h3>
                      <p className="text-scorecard/80 text-sm font-primary mt-1">
                        {currentOpenRound.course_name && `${currentOpenRound.course_name} • `}
                        Open until{" "}
                        {new Date(currentOpenRound.open_end!).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Link
                      to="/player/competitions/$competitionId"
                      params={{ competitionId: currentOpenRound.id.toString() }}
                      className="text-scorecard/80 hover:text-scorecard transition-colors"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Link>
                  </div>
                </div>

                {/* Registration status / Join button - only show if NOT playing/finished */}
                {isEnrolled && registrationData?.registered && registrationData.registration ? (
                  <GroupStatusCard
                    competitionId={currentOpenRound.id}
                    registration={registrationData.registration}
                    group={registrationData.group}
                    teeTimeId={registrationData.registration.tee_time_id}
                    participantId={registrationData.registration.participant_id}
                    onUpdate={() => refetchRegistration()}
                  />
                ) : isEnrolled ? (
                  <Button
                    onClick={() => setShowJoinFlow(true)}
                    className="w-full bg-coral hover:bg-coral/90 text-scorecard py-6 text-lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Join This Round
                  </Button>
                ) : (
                  <div className="bg-rough/50 border border-soft-grey rounded-xl p-4 text-center">
                    <p className="text-body-md text-charcoal/70">
                      {isAuthenticated
                        ? "You must be enrolled in this tour to join rounds"
                        : "Sign in and enroll in this tour to join rounds"}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
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

        {/* Quick Access */}
        <section>
          <h3 className="text-display-sm font-display font-semibold text-charcoal mb-4">
            Quick Access
          </h3>
          <div className="divide-y divide-soft-grey">
            {/* Competitions */}
            <Link
              to="/player/tours/$tourId/competitions"
              params={{ tourId }}
              className="flex items-center gap-4 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <Calendar className="h-5 w-5 text-turf flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-charcoal">Competitions</div>
                <div className="text-sm text-charcoal/70">
                  {competitionsLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `Browse ${totalCompetitions} competitions`
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0" />
            </Link>

            {/* Documents */}
            {documents && documents.length > 0 && (
              <Link
                to="/player/tours/$tourId/documents"
                params={{ tourId }}
                className="flex items-center gap-4 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <FileText className="h-5 w-5 text-turf flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-charcoal">Documents</div>
                  <div className="text-sm text-charcoal/70">
                    {documentsLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      `View ${documents.length} document${documents.length !== 1 ? "s" : ""}`
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0" />
              </Link>
            )}

            {/* Standings */}
            <Link
              to="/player/tours/$tourId/standings"
              params={{ tourId }}
              className="flex items-center gap-4 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <Trophy className="h-5 w-5 text-turf flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-charcoal">Standings</div>
                <div className="text-sm text-charcoal/70">View player rankings</div>
              </div>
              <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0" />
            </Link>
          </div>
        </section>

        {/* Upcoming Competitions Section */}
        {upcomingCompetitions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
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
            <div className="divide-y divide-soft-grey">
              {upcomingCompetitions.slice(0, 3).map((competition, index) => (
                <Link
                  key={competition.id}
                  to="/player/competitions/$competitionId"
                  params={{ competitionId: competition.id.toString() }}
                  className={`block py-4 hover:bg-gray-50/50 transition-colors ${
                    index === 0 ? "border-l-4 border-l-turf pl-4 bg-turf/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-charcoal truncate">
                        {competition.name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-charcoal/70 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-turf" />
                          <span>
                            {new Date(competition.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {competition.course_name && (
                          <span className="truncate">{competition.course_name}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0" />
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
    <PlayerPageLayout onBackClick={handleBackNavigation} tourId={id} tourName={tour.name}>

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

      {/* Join Competition Flow */}
      {currentOpenRound && (
        <AddPlayersToGroup
          isOpen={showJoinFlow}
          onClose={() => setShowJoinFlow(false)}
          competitionId={currentOpenRound.id}
          mode="initial_registration"
          onSuccess={() => refetchRegistration()}
        />
      )}
    </PlayerPageLayout>
  );
}
