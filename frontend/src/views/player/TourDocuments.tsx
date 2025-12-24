import { Link, useParams } from "@tanstack/react-router";
import { useTour, useTourDocuments } from "@/api/tours";
import {
  FileText,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-fairway h-16" />
      <div className="container mx-auto px-4 py-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
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
            Back to Tour
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TourDocuments() {
  const { tourId } = useParams({ from: "/player/tours/$tourId/documents" });
  const [searchQuery, setSearchQuery] = useState("");

  const id = parseInt(tourId);
  const {
    data: tour,
    isLoading: tourLoading,
    error: tourError,
  } = useTour(id);

  const {
    data: documents,
    isLoading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useTourDocuments(id);

  // Filter documents based on search query
  const filteredDocuments = documents?.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (tourLoading || documentsLoading) return <LoadingSkeleton />;

  if (tourError) {
    return (
      <ErrorState
        title="Tour Not Found"
        message="The tour you're looking for doesn't exist or may have been removed."
      />
    );
  }

  if (documentsError) {
    return (
      <ErrorState
        title="Error Loading Documents"
        message="Unable to load documents. Please try again."
        onRetry={() => refetchDocuments()}
      />
    );
  }

  if (!tour) {
    return (
      <ErrorState
        title="Tour Unavailable"
        message="This tour is currently unavailable. Please try again later."
      />
    );
  }

  return (
    <PlayerPageLayout title="Documents">

      {/* Sub-header with Page Title and Search */}
      <div className="bg-scorecard border-b border-soft-grey shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-xl font-semibold font-display text-charcoal">
                Documents
              </h2>
              <p className="text-sm text-charcoal/70 font-primary mt-1">
                Browse tour rules, guides and resources
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-charcoal/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-charcoal/50" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-soft-grey rounded-xl bg-scorecard text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf transition-colors"
            />
          </div>
        </div>

        {/* Documents List */}
        {!documents || documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Documents Available
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              Documents will be added to this tour soon.
            </p>
            <Button
              onClick={() => window.history.back()}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              Back to Tour Overview
            </Button>
          </div>
        ) : filteredDocuments?.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-charcoal/30 mx-auto mb-6" />
            <h2 className="text-display-sm font-display font-semibold text-charcoal mb-4">
              No Documents Found
            </h2>
            <p className="text-body-lg text-charcoal/70 mb-8">
              No documents match your search query "{searchQuery}".
            </p>
            <Button
              onClick={() => setSearchQuery("")}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-display-sm font-display font-semibold text-charcoal">
                Documents
              </h2>
              <span className="text-body-sm text-charcoal/70">
                {filteredDocuments?.length || 0} document
                {(filteredDocuments?.length || 0) !== 1 ? "s" : ""}
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
            </div>

            <div className="grid gap-4">
              {filteredDocuments?.map((document) => (
                <Link
                  key={document.id}
                  to="/player/tours/$tourId/documents/$documentId"
                  params={{ tourId, documentId: document.id.toString() }}
                  className="block p-6 rounded-xl border border-soft-grey hover:border-turf hover:shadow-lg transition-all duration-200 group bg-scorecard"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-rough rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-turf/20 transition-colors">
                      <FileText className="h-6 w-6 text-turf group-hover:text-fairway transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-label-lg font-semibold text-charcoal mb-2 group-hover:text-fairway transition-colors">
                        {document.title}
                      </h3>
                      <p className="text-body-sm text-charcoal/70 line-clamp-2 mb-3">
                        {document.content.substring(0, 150)}
                        {document.content.length > 150 && "..."}
                      </p>
                      <div className="text-body-xs text-charcoal/50">
                        Updated{" "}
                        {new Date(document.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-charcoal/30 flex-shrink-0 group-hover:text-turf transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </PlayerPageLayout>
  );
}
