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
      <div className="bg-white rounded-xl border-l-4 border-turf mb-6 animate-pulse">
        <div className="px-4 pt-4 pb-2">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="divide-y divide-soft-grey">
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
    <div className="bg-white rounded-xl border-l-4 border-turf mb-6">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Trophy className="h-5 w-5 text-turf" />
        <h2 className="text-lg font-display font-bold text-charcoal">
          {title}
        </h2>
      </div>

      {series && series.length > 0 ? (
        <div className="divide-y divide-soft-grey">
          {series.map((s) => (
            <Link
              key={s.series_id}
              to="/player/series/$seriesId"
              params={{ seriesId: s.series_id.toString() }}
              className="block"
            >
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
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
        <div className="text-center py-8 px-4 text-charcoal/60">
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
