import { Link } from "@tanstack/react-router";
import { usePublicSeries } from "../../api/series";
import { ChevronRight, Trophy } from "lucide-react";

export default function PlayerSeries() {
  const { data: series, isLoading, error } = usePublicSeries();

  if (isLoading)
    return <div className="text-charcoal font-primary">Loading series...</div>;
  if (error)
    return <div className="text-flag font-primary">Error loading series</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-fairway font-display">
            Series
          </h2>
          <p className="text-turf font-primary">
            Browse and follow golf series
          </p>
        </div>
        <div className="text-sm text-turf font-primary">
          {series?.length || 0} series available
        </div>
      </div>

      <div className="grid gap-4">
        {series?.map((serie) => {
          return (
            <Link
              key={serie.id}
              to={`/player/series/${serie.id}`}
              className="block bg-scorecard rounded-xl border border-soft-grey hover:border-turf hover:shadow-md hover:bg-rough hover:bg-opacity-10 transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="h-6 w-6 text-turf" />
                      <h3 className="text-xl font-semibold text-fairway font-display">
                        {serie.name}
                      </h3>
                    </div>

                    {serie.description && (
                      <p className="text-sm text-charcoal mb-3 max-h-10 overflow-hidden font-primary">
                        {serie.description.length > 100
                          ? serie.description.substring(0, 100) + "..."
                          : serie.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-turf font-primary">
                      <span>Series #{serie.id}</span>
                      <span>
                        Created{" "}
                        {new Date(serie.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 text-turf" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {(!series || series.length === 0) && (
        <div className="text-center py-12">
          <div className="text-turf mb-4">
            <Trophy className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-fairway mb-2 font-display">
            No series available
          </h3>
          <p className="text-turf font-primary">
            Check back later for upcoming golf series.
          </p>
        </div>
      )}
    </div>
  );
}
