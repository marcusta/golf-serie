import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesDocuments } from "@/api/series";
import {
  AlertCircle,
  RefreshCw,
  Share,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="h-8 bg-gray-300 rounded w-3/4" />
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full" />
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
}: {
  title: string;
  message: string;
  onRetry?: () => void;
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
          <Button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-soft-grey text-charcoal hover:bg-rough/20 hover:border-turf rounded-lg transition-colors"
          >
            Back to Documents
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SeriesDocumentDetail() {
  const { serieId, documentId } = useParams({
    from: "/player/series/$serieId/documents/$documentId",
  });

  const seriesId = parseInt(serieId);
  const docId = parseInt(documentId);

  const {
    data: series,
    isLoading: seriesLoading,
    error: seriesError,
  } = useSingleSeries(seriesId);

  const {
    data: documents,
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useSeriesDocuments(seriesId);

  // Find the current document and siblings for navigation
  const currentDocument = documents?.find((doc) => doc.id === docId);
  const currentIndex = documents?.findIndex((doc) => doc.id === docId) ?? -1;
  const previousDocument = documents?.[currentIndex - 1];
  const nextDocument = documents?.[currentIndex + 1];

  const handleShare = async () => {
    if (navigator.share && currentDocument) {
      try {
        await navigator.share({
          title: currentDocument.title,
          url: window.location.href,
        });
      } catch {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (seriesLoading || documentsLoading) return <LoadingSkeleton />;

  if (seriesError) {
    return (
      <ErrorState
        title="Series Not Found"
        message="The series you're looking for doesn't exist or may have been removed."
      />
    );
  }

  if (documentsError) {
    return (
      <ErrorState
        title="Error Loading Document"
        message="Unable to load the document. Please try again."
        onRetry={() => refetchDocuments()}
      />
    );
  }

  if (!series) {
    return (
      <ErrorState
        title="Series Unavailable"
        message="This series is currently unavailable. Please try again later."
      />
    );
  }

  if (!currentDocument) {
    return (
      <ErrorState
        title="Document Not Found"
        message="The document you're looking for doesn't exist or may have been removed."
      />
    );
  }

  return (
    <PlayerPageLayout title={currentDocument.title} seriesId={seriesId} seriesName={series?.name}>

      {/* Sub-header with Document Title and Actions */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm sticky top-16 z-9">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold font-display text-charcoal truncate">
                {currentDocument.title}
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Document {currentIndex + 1} of {documents?.length || 0}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Previous Document */}
              {previousDocument && (
                <Link
                  to="/player/series/$serieId/documents/$documentId"
                  params={{
                    serieId,
                    documentId: previousDocument.id.toString(),
                  }}
                  className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                  title={`Previous: ${previousDocument.title}`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}

              {/* Next Document */}
              {nextDocument && (
                <Link
                  to="/player/series/$serieId/documents/$documentId"
                  params={{
                    serieId,
                    documentId: nextDocument.id.toString(),
                  }}
                  className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                  title={`Next: ${nextDocument.title}`}
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="p-2 hover:bg-rough rounded-lg transition-colors text-charcoal"
                title="Share document"
              >
                <Share className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <article className="prose prose-gray prose-lg max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {currentDocument.content}
          </ReactMarkdown>
        </article>

        {/* Document Navigation Footer */}
        {(previousDocument || nextDocument) && (
          <div className="mt-12 pt-8 border-t border-soft-grey">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previousDocument && (
                <Link
                  to="/player/series/$serieId/documents/$documentId"
                  params={{
                    serieId,
                    documentId: previousDocument.id.toString(),
                  }}
                  className="group p-4 rounded-xl border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200 bg-scorecard"
                >
                  <div className="flex items-center gap-3">
                    <ChevronLeft className="h-5 w-5 text-turf group-hover:text-fairway transition-colors" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-xs text-charcoal/50 uppercase tracking-wide font-medium mb-1">
                        Previous
                      </p>
                      <h3 className="text-label-md font-semibold text-charcoal group-hover:text-fairway transition-colors truncate">
                        {previousDocument.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              )}

              {nextDocument && (
                <Link
                  to="/player/series/$serieId/documents/$documentId"
                  params={{
                    serieId,
                    documentId: nextDocument.id.toString(),
                  }}
                  className="group p-4 rounded-xl border border-soft-grey hover:border-turf hover:shadow-md transition-all duration-200 bg-scorecard md:col-start-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-body-xs text-charcoal/50 uppercase tracking-wide font-medium mb-1">
                        Next
                      </p>
                      <h3 className="text-label-md font-semibold text-charcoal group-hover:text-fairway transition-colors truncate">
                        {nextDocument.title}
                      </h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-turf group-hover:text-fairway transition-colors" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </PlayerPageLayout>
  );
}
