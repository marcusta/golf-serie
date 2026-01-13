import { Link } from "@tanstack/react-router";
import { Flag, Check, Clock, ChevronRight } from "lucide-react";
import type { PlayerTourInfo } from "@/api/player-profile";

interface ProfileToursProps {
  tours: PlayerTourInfo[] | undefined;
  isLoading?: boolean;
  /** Title for the section - defaults to "My Tours" but can be "Tours" for public profiles */
  title?: string;
}

export function ProfileTours({ tours, isLoading, title = "My Tours" }: ProfileToursProps) {
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

      {tours && tours.length > 0 ? (
        <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
          {tours.map((tour) => (
            <Link
              key={tour.tour_id}
              to="/player/tours/$tourId"
              params={{ tourId: tour.tour_id.toString() }}
              className="block"
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-turf/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-charcoal mb-1">
                    {tour.tour_name}
                  </div>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-charcoal/60">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        tour.enrollment_status === "active"
                          ? "bg-turf/10 text-turf"
                          : tour.enrollment_status === "requested"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {tour.enrollment_status === "active" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {tour.enrollment_status === "active"
                        ? "Active"
                        : tour.enrollment_status === "requested"
                          ? "Requested"
                          : "Pending"}
                    </span>
                    {tour.category_name && (
                      <>
                        <span className="text-charcoal/40">•</span>
                        <span>{tour.category_name}</span>
                      </>
                    )}
                    <span className="text-charcoal/40">•</span>
                    <span>{tour.competitions_played} competitions played</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {tour.enrollment_status === "active" &&
                    tour.position !== undefined && (
                      <div className="text-right">
                        <div className="text-turf font-bold">
                          # {tour.position}
                        </div>
                        {tour.total_points !== undefined && (
                          <div className="text-sm text-charcoal/60">
                            {tour.total_points} pts
                          </div>
                        )}
                      </div>
                    )}
                  <ChevronRight className="h-5 w-5 text-charcoal/40" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded text-center py-8 px-4 text-charcoal/60">
          <Flag className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Not enrolled in any tours yet</p>
          <Link to="/player/tours" className="text-turf text-sm hover:underline">
            Browse available tours
          </Link>
        </div>
      )}
    </div>
  );
}
