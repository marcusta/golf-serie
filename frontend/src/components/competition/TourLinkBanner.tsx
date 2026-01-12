import { Link } from "@tanstack/react-router";
import { Flag, ChevronRight } from "lucide-react";

interface TourLinkBannerProps {
  tourId: number;
  tourName: string;
}

export function TourLinkBanner({
  tourId,
  tourName,
}: TourLinkBannerProps) {
  return (
    <Link
      to="/player/tours/$tourId"
      params={{ tourId: tourId.toString() }}
      className="block border-l-4 border-turf pl-4 py-3 hover:bg-turf/5 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag className="h-5 w-5 text-turf" />
          <div>
            <p className="text-xs text-turf font-semibold uppercase">
              Part of a Tour
            </p>
            <h4 className="font-semibold text-charcoal group-hover:text-fairway transition-colors">
              {tourName}
            </h4>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-turf/50 group-hover:text-fairway transition-colors" />
      </div>
    </Link>
  );
}
