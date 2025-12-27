import { Link } from "@tanstack/react-router";
import { Trophy, ChevronRight } from "lucide-react";

interface SeriesLinkBannerProps {
  seriesId: number;
  seriesName: string;
}

export function SeriesLinkBanner({
  seriesId,
  seriesName,
}: SeriesLinkBannerProps) {
  return (
    <Link
      to="/player/series/$serieId"
      params={{ serieId: seriesId.toString() }}
      className="block border-l-4 border-turf pl-4 py-3 hover:bg-turf/5 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-turf" />
          <div>
            <p className="text-xs text-turf font-semibold uppercase">
              Part of a Series
            </p>
            <h4 className="font-semibold text-charcoal group-hover:text-fairway transition-colors">
              {seriesName}
            </h4>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-turf/50 group-hover:text-fairway transition-colors" />
      </div>
    </Link>
  );
}
