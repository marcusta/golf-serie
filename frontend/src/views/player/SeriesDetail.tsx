import { useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useSingleSeries,
  useSeriesStandings,
  useSeriesCompetitions,
  useSeriesDocuments,
} from "@/api/series";
import {
  Calendar,
  Trophy,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import {
  RecentActivity,
  TodayCompetitionBanner,
  UpcomingCompetitions,
} from "@/components/series";

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

  const seriesId = parseInt(serieId);
  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useSingleSeries(seriesId);

  const { data: standings, isLoading: standingsLoading } =
    useSeriesStandings(seriesId);

  const { data: competitions, isLoading: competitionsLoading } =
    useSeriesCompetitions(seriesId);

  const { data: documents, isLoading: documentsLoading } =
    useSeriesDocuments(seriesId);

  // Calculate key metrics for info bar
  const totalCompetitions = competitions?.length || 0;
  const activeTeams = standings?.team_standings?.length || 0;

  // Find the most recent past competition (for the info bar)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latestCompetition = competitions?.find((comp) => {
    const compDate = new Date(comp.date);
    compDate.setHours(0, 0, 0, 0);
    return compDate < today;
  });

  // Find the landing document
  const landingDocument = series?.landing_document_id
    ? documents?.find((doc) => doc.id === series.landing_document_id)
    : null;

  // Clean navigation with proper browser history back
  const handleBackNavigation = useCallback(() => {
    window.history.back();
  }, []);

  // Enhanced error handling
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

  // Main content
  const renderMainContent = () => {
    // Find today's competitions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCompetition = competitions?.find((comp) => {
      const compDate = new Date(comp.date);
      compDate.setHours(0, 0, 0, 0);
      return compDate.getTime() === today.getTime();
    });

    return (
      <div className="space-y-8">
        {/* Today's Competition Banner */}
        {todayCompetition && (
          <TodayCompetitionBanner competition={todayCompetition} />
        )}

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
            {/* Team Standings Card */}
            <Link
              to="/player/series/$serieId/standings"
              params={{ serieId }}
              className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group block"
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
            </Link>

            {/* All Competitions Card */}
            <Link
              to="/player/series/$serieId/competitions"
              params={{ serieId }}
              className="bg-scorecard border border-soft-grey rounded-xl p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-turf group block"
            >
              <div className="w-12 h-12 bg-rough rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-turf/20 transition-colors">
                <Calendar className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
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
            </Link>

            {/* Documents Card */}
            {documents && documents.length > 0 && (
              <Link
                to="/player/series/$serieId/documents"
                params={{ serieId }}
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
        <UpcomingCompetitions competitions={competitions || []} maxItems={3} />

        {/* Recent Activity Section */}
        <RecentActivity competitions={competitions} maxItems={3} />
      </div>
    );
  };

  return (
    <PlayerPageLayout onBackClick={handleBackNavigation} seriesId={seriesId} seriesName={series.name}>

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
    </PlayerPageLayout>
  );
}
