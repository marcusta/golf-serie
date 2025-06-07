import { Link } from "@tanstack/react-router";
import { usePublicSeries } from "../../api/series";
import { ChevronRight, Trophy } from "lucide-react";

export default function PlayerSeries() {
  const { data: series, isLoading, error } = usePublicSeries();

  if (isLoading) return <div>Loading series...</div>;
  if (error) return <div>Error loading series</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Series</h2>
          <p className="text-gray-600">Browse and follow golf series</p>
        </div>
        <div className="text-sm text-gray-500">
          {series?.length || 0} series available
        </div>
      </div>

      <div className="grid gap-4">
        {series?.map((serie) => {
          return (
            <Link
              key={serie.id}
              to={`/player/series/${serie.id}`}
              className="block bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="h-6 w-6 text-green-600" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        {serie.name}
                      </h3>
                    </div>

                    {serie.description && (
                      <p className="text-sm text-gray-600 mb-3 max-h-10 overflow-hidden">
                        {serie.description.length > 100
                          ? serie.description.substring(0, 100) + "..."
                          : serie.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Series #{serie.id}</span>
                      <span>
                        Created{" "}
                        {new Date(serie.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {(!series || series.length === 0) && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Trophy className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No series available
          </h3>
          <p className="text-gray-600">
            Check back later for upcoming golf series.
          </p>
        </div>
      )}
    </div>
  );
}
