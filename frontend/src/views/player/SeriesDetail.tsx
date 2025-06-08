import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useSingleSeries,
  useSeriesStandings,
  useSeriesCompetitions,
  useSeriesDocuments,
  type SeriesDocument,
} from "@/api/series";
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Users,
  ChevronRight,
  FileText,
  ArrowLeft as ArrowLeftIcon,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import TapScoreLogo from "@/components/ui/TapScoreLogo";
import { BottomSheet, useBottomSheet } from "@/components/ui/bottom-sheet";
import RecentActivity from "@/components/series/recent-activity";

// Loading skeleton components
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="h-[200px] bg-gray-300" />
      <div className="bg-rough p-6">
        <div className="container mx-auto grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 bg-gray-300 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 space-y-8">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeriesDetail() {
  const { serieId } = useParams({ from: "/player/series/$serieId" });
  const [selectedDocument, setSelectedDocument] =
    useState<SeriesDocument | null>(null);

  // Bottom sheet state management
  const bottomSheet = useBottomSheet();

  const seriesId = parseInt(serieId);
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useSingleSeries(seriesId);

  const {
    data: standings,
    isLoading: standingsLoading,
    error: standingsError,
  } = useSeriesStandings(seriesId);

  const {
    data: competitions,
    isLoading: competitionsLoading,
    error: competitionsError,
  } = useSeriesCompetitions(seriesId);

  const {
    data: documents,
    isLoading: documentsLoading,
    error: documentsError,
  } = useSeriesDocuments(seriesId);

  // Calculate key metrics for info bar
  const totalCompetitions = competitions?.length || 0;
  const activeTeams = standings?.team_standings?.length || 0;
  const latestCompetition = competitions?.[0];

  // Find the landing document
  const landingDocument = series?.landing_document_id
    ? documents?.find((doc) => doc.id === series.landing_document_id)
    : null;

  // Clean navigation with proper browser history back
  const handleBackNavigation = useCallback((e: React.MouseEvent) => {
    // Prevent any potential event bubbling
    e.preventDefault();
    e.stopPropagation();

    // Ensure we only go back once by using a flag
    if (!e.currentTarget.hasAttribute("data-navigating")) {
      e.currentTarget.setAttribute("data-navigating", "true");

      // Use browser's native history back for reliable single-step navigation
      window.history.back();

      // Clear the flag after a brief delay
      setTimeout(() => {
        e.currentTarget.removeAttribute("data-navigating");
      }, 500);
    }
  }, []);

  // Enhanced document handlers with error handling
  const handleDocumentSelect = useCallback(
    (document: SeriesDocument) => {
      setSelectedDocument(document);
      // Close bottom sheet if open
      if (bottomSheet.isOpen) {
        bottomSheet.closeSheet();
      }
    },
    [bottomSheet]
  );

  const handleBackToDocuments = useCallback(() => {
    setSelectedDocument(null);
  }, []);

  // Enhanced bottom sheet content renderers with proper loading and error states
  const renderDocumentsSheet = useCallback(() => {
    if (documentsLoading) {
      return (
        <div className="py-8 text-center">
          <Loader2 className="h-8 w-8 text-turf animate-spin mx-auto mb-4" />
          <p className="text-charcoal/70">Loading documents...</p>
        </div>
      );
    }

    if (documentsError) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-flag/50 mx-auto mb-4" />
          <h3 className="text-label-lg font-semibold text-charcoal mb-2">
            Error Loading Documents
          </h3>
          <p className="text-body-sm text-charcoal/70 mb-4">
            Unable to load documents. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-turf border-turf hover:bg-turf/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    if (!documents || documents.length === 0) {
      return (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-charcoal/30 mx-auto mb-4" />
          <h3 className="text-label-lg font-semibold text-charcoal mb-2">
            No Documents Available
          </h3>
          <p className="text-body-sm text-charcoal/70">
            Documents will be added to this series soon.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {documents.map((document) => (
          <button
            key={document.id}
            onClick={() => handleDocumentSelect(document)}
            className="w-full text-left p-4 rounded-lg border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-turf flex-shrink-0 mt-0.5 group-hover:text-fairway transition-colors" />
              <div className="flex-1 min-w-0">
                <h4 className="text-label-lg font-semibold text-charcoal mb-1 group-hover:text-fairway transition-colors">
                  {document.title}
                </h4>
                <p className="text-body-sm text-charcoal/70 line-clamp-2">
                  {document.content.substring(0, 120)}...
                </p>
                <div className="text-body-xs text-charcoal/50 mt-2">
                  Updated {new Date(document.updated_at).toLocaleDateString()}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-charcoal/30 flex-shrink-0 group-hover:text-turf transition-colors" />
            </div>
          </button>
        ))}
      </div>
    );
  }, [documents, documentsLoading, documentsError, handleDocumentSelect]);

  const renderStandingsSheet = useCallback(() => {
    if (standingsLoading) {
      return (
        <div className="py-8 text-center">
          <Loader2 className="h-8 w-8 text-turf animate-spin mx-auto mb-4" />
          <p className="text-charcoal/70">Loading standings...</p>
        </div>
      );
    }

    if (standingsError) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-flag/50 mx-auto mb-4" />
          <h3 className="text-label-lg font-semibold text-charcoal mb-2">
            Error Loading Standings
          </h3>
          <p className="text-body-sm text-charcoal/70 mb-4">
            Unable to load team standings. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-turf border-turf hover:bg-turf/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    if (!standings?.team_standings?.length) {
      return (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-charcoal/30 mx-auto mb-4" />
          <h3 className="text-label-lg font-semibold text-charcoal mb-2">
            No Standings Available
          </h3>
          <p className="text-body-sm text-charcoal/70">
            Team standings will appear here once competitions begin.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-label-lg font-semibold text-charcoal">
            Team Standings
          </h4>
          <span className="text-body-sm text-charcoal/70">
            {standings.team_standings.length} teams
          </span>
        </div>

        <div className="space-y-2">
          {standings.team_standings.map((standing) => (
            <div
              key={standing.team_id}
              className="flex items-center gap-4 p-4 rounded-lg bg-scorecard border border-soft-grey hover:border-turf/50 transition-colors group"
            >
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
                <h5 className="text-label-md font-semibold text-charcoal truncate group-hover:text-fairway transition-colors">
                  {standing.team_name}
                </h5>
                <p className="text-body-sm text-charcoal/70">
                  {standing.competitions_played} competitions played
                </p>
              </div>
              <div className="text-right">
                <div className="text-label-lg font-semibold text-charcoal group-hover:text-turf transition-colors">
                  {standing.total_points}
                </div>
                <div className="text-body-sm text-charcoal/70">points</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [standings, standingsLoading, standingsError]);

  const renderCompetitionsSheet = useCallback(() => {
    if (competitionsLoading) {
      return (
        <div className="py-8 text-center">
          <Loader2 className="h-8 w-8 text-turf animate-spin mx-auto mb-4" />
          <p className="text-charcoal/70">Loading competitions...</p>
        </div>
      );
    }

    if (competitionsError) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-flag/50 mx-auto mb-4" />
          <h3 className="text-label-lg font-semibold text-charcoal mb-2">
            Error Loading Competitions
          </h3>
          <p className="text-body-sm text-charcoal/70 mb-4">
            Unable to load competitions. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-turf border-turf hover:bg-turf/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    if (!competitions?.length) {
      return (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-charcoal/30 mx-auto mb-4" />
          <h3 className="text-label-lg font-semibold text-charcoal mb-2">
            No Competitions Yet
          </h3>
          <p className="text-body-sm text-charcoal/70">
            Competitions will be added to this series soon.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {competitions.map((competition) => {
          const competitionDate = new Date(competition.date);
          const isPast = competitionDate < new Date();

          return (
            <Link
              key={competition.id}
              to={`/player/competitions/${competition.id}`}
              className="block p-4 rounded-lg border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200 group"
              onClick={() => bottomSheet.closeSheet()}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-label-lg font-semibold text-charcoal group-hover:text-fairway transition-colors">
                      {competition.name}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded-full text-label-sm font-medium ${
                        isPast
                          ? "text-charcoal bg-charcoal/10"
                          : "text-turf bg-turf/10"
                      }`}
                    >
                      {isPast ? "Completed" : "Upcoming"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-body-sm text-charcoal/70">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {competitionDate.toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {competition.participant_count} participants
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-charcoal/30 group-hover:text-turf transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    );
  }, [competitions, competitionsLoading, competitionsError, bottomSheet]);

  const handleQuickNavigation = useCallback(
    (section: "documents" | "standings" | "competitions") => {
      switch (section) {
        case "documents":
          bottomSheet.openSheet("documents", "Documents");
          break;
        case "standings":
          bottomSheet.openSheet("standings", "Team Standings");
          break;
        case "competitions":
          bottomSheet.openSheet("competitions", "All Competitions");
          break;
      }
    },
    [bottomSheet]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setSelectedDocument(null);
    };
  }, []);

  // Enhanced error handling - after all hooks are called
  if (seriesLoading && !series) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
        onRetry={() => refetchSeries()}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
        onRetry={() => refetchSeries()}
      />
    );
  }

  // Enhanced main content with loading states
  const renderMainContent = () => {
    // Handle document view
    if (selectedDocument) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToDocuments}
              className="flex items-center gap-2 border-soft-grey text-charcoal hover:bg-rough/20 hover:border-turf"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Overview
            </Button>
            <h2 className="text-display-sm font-display font-semibold text-charcoal">
              {selectedDocument.title}
            </h2>
          </div>
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {selectedDocument.content}
            </ReactMarkdown>
          </div>
        </div>
      );
    }

    // Default overview content
    return (
      <div className="space-y-8">
        {/* Primary Content Area */}
        {landingDocument ? (
          <section>
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {landingDocument.content}
              </ReactMarkdown>
            </div>
          </section>
        ) : (
          series.description && (
            <section>
              <h2 className="text-display-sm font-display font-semibold text-charcoal mb-6">
                About This Series
              </h2>
              <div className="prose prose-gray max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {series.description}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Latest Results Card */}
            {competitions && competitions.length > 0 && (
              <div
                onClick={() => handleQuickNavigation("competitions")}
                className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleQuickNavigation("competitions");
                  }
                }}
                aria-label="View latest competition results"
              >
                <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                  <Calendar className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
                </div>
                <h4 className="text-label-lg font-display font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                  Latest Results
                </h4>
                <p className="text-body-sm text-charcoal/70">
                  View recent competition results
                </p>
              </div>
            )}

            {/* Team Standings Card */}
            <div
              onClick={() => handleQuickNavigation("standings")}
              className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleQuickNavigation("standings");
                }
              }}
              aria-label="View team standings"
            >
              <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                <Trophy className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
              </div>
              <h4 className="text-label-lg font-display font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                Team Standings
              </h4>
              <p className="text-body-sm text-charcoal/70">
                {standingsLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `${activeTeams} teams competing`
                )}
              </p>
            </div>

            {/* All Competitions Card */}
            <div
              onClick={() => handleQuickNavigation("competitions")}
              className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleQuickNavigation("competitions");
                }
              }}
              aria-label="View all competitions"
            >
              <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                <Users className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
              </div>
              <h4 className="text-label-lg font-display font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                All Competitions
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
            </div>

            {/* Documents Card */}
            {documents && documents.length > 0 && (
              <div
                onClick={() => handleQuickNavigation("documents")}
                className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleQuickNavigation("documents");
                  }
                }}
                aria-label="View series documents"
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
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity Section */}
        <RecentActivity competitions={competitions} maxItems={3} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-scorecard">
      {/* TapScore Header Navigation */}
      <header className="sticky top-0 z-50 bg-fairway border-b-2 border-turf shadow-lg shadow-fairway/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackNavigation}
                className="flex items-center gap-2 text-scorecard hover:text-rough transition-colors p-2 -ml-2 rounded-lg hover:bg-turf/20 active:bg-turf/30"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-label-md font-medium">Back</span>
              </button>
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        {/* Hero Banner */}
        {series.banner_image_url ? (
          <div className="relative h-[200px] md:h-[280px] overflow-hidden">
            <img
              src={series.banner_image_url}
              alt={`${series.name} banner`}
              className="w-full h-full object-cover"
              loading="eager"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-fairway/70" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h1 className="text-display-md md:text-display-lg font-display font-bold text-scorecard drop-shadow-lg">
                {series.name}
              </h1>
              {series.description && (
                <p className="text-body-lg text-scorecard/90 mt-2 drop-shadow-md line-clamp-2">
                  {series.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-fairway to-turf p-6 md:p-8">
            <h1 className="text-display-md md:text-display-lg font-display font-bold text-scorecard">
              {series.name}
            </h1>
            {series.description && (
              <p className="text-body-lg text-scorecard/90 mt-2">
                {series.description}
              </p>
            )}
          </div>
        )}

        {/* Info Bar */}
        <div className="bg-rough p-4 md:p-6 border-b border-soft-grey">
          <div className="container mx-auto">
            <div className="grid grid-cols-3 gap-4 text-center">
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
                  {standingsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    activeTeams
                  )}
                </div>
                <div className="text-label-sm font-medium text-charcoal uppercase tracking-wide">
                  Active Teams
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-display-sm font-display font-bold text-fairway">
                  {competitionsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : latestCompetition ? (
                    "Recent"
                  ) : (
                    "None"
                  )}
                </div>
                <div className="text-label-sm font-medium text-charcoal uppercase tracking-wide">
                  Latest Result
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <main className="container mx-auto px-4 py-6">{renderMainContent()}</main>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={bottomSheet.isOpen}
        onClose={bottomSheet.closeSheet}
        title={bottomSheet.title}
      >
        {bottomSheet.isOpen &&
          bottomSheet.content === "documents" &&
          renderDocumentsSheet()}
        {bottomSheet.isOpen &&
          bottomSheet.content === "standings" &&
          renderStandingsSheet()}
        {bottomSheet.isOpen &&
          bottomSheet.content === "competitions" &&
          renderCompetitionsSheet()}
      </BottomSheet>
    </div>
  );
}
