import { Link } from "@tanstack/react-router";
import { Trophy, Calendar, ChevronRight } from "lucide-react";
import type { PlayerSeriesInfo } from "@/api/player-profile";

interface ProfileSeriesProps {
  series: PlayerSeriesInfo[] | undefined;
  isLoading?: boolean;
  /** Title for the section - defaults to "My Series" but can be "Series" for public profiles */
  title?: string;
}

export function ProfileSeries({ series, isLoading, title = "My Series" }: ProfileSeriesProps) {
  if (isLoading) {
    return (
      <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6 mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-3" />
        <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
        {title}
      </h2>

      {series && series.length > 0 ? (
        <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
          {series.map((s) => (
            <Link
              key={s.series_id}
              to="/player/series/$seriesId"
              params={{ seriesId: s.series_id.toString() }}
              className="block"
            >
              <div className="flex items-center justify-between px-4 py-3 hover:bg-turf/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-charcoal truncate">
                    {s.series_name}
                  </div>
                  <div className="text-sm text-charcoal/60 flex items-center gap-2">
                    <span>{s.competitions_played} competitions</span>
                    <span className="text-charcoal/40">•</span>
                    <Calendar className="h-3 w-3 text-turf" />
                    <span>
                      Last played{" "}
                      {new Date(s.last_played_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-charcoal/40" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded text-center py-8 px-4 text-charcoal/60">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No series participation yet</p>
          <p className="text-sm">
            Series will appear here once you play competitions
          </p>
        </div>
      )}
    </div>
  );
}
