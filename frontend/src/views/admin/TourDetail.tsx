import { useNavigate, useParams } from "@tanstack/react-router";
import { useTour, useTourCompetitions } from "../../api/tours";
import { Loader2, ArrowLeft, Plus, Calendar } from "lucide-react";

export default function TourDetail() {
  const { id } = useParams({ from: "/admin/tours/$id" });
  const navigate = useNavigate();
  const tourId = parseInt(id);

  const { data: tour, isLoading: tourLoading } = useTour(tourId);
  const { data: competitions, isLoading: competitionsLoading } = useTourCompetitions(tourId);

  if (tourLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-fairway" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Tour not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate({ to: "/admin/tours" })}
          className="flex items-center gap-2 text-fairway hover:text-turf mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tours
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-charcoal mb-2">{tour.name}</h1>
            {tour.description && (
              <p className="text-charcoal/70">{tour.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Competitions Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-charcoal">Competitions</h2>
          <button
            onClick={() => {
              navigate({ to: `/admin/competitions`, search: { tour: tourId.toString() } });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Competition
          </button>
        </div>

        {competitionsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-fairway" />
          </div>
        ) : competitions && competitions.length > 0 ? (
          <div className="space-y-3">
            {competitions.map((competition: any) => (
              <div
                key={competition.id}
                className="border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30 transition-colors cursor-pointer"
                onClick={() => navigate({ to: `/admin/competitions/${competition.id}/tee-times` })}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-charcoal">{competition.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-charcoal/60 mt-1">
                      <Calendar className="w-4 h-4" />
                      {competition.date}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-charcoal/60">
            <p>No competitions yet.</p>
            <p className="text-sm mt-2">Click "Add Competition" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
