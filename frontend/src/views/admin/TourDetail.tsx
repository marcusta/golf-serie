import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  useTour,
  useTourEnrollments,
  useTourCategories,
  useTourDocuments,
} from "../../api/tours";
import { useTourPointTemplates } from "../../api/point-templates";
import {
  TourCompetitionsTab,
  TourEnrollmentsTab,
  TourCategoriesTab,
  TourAdminsTab,
  TourDocumentsTab,
  TourPointsTab,
  TourSettingsTab,
} from "./tour";
import {
  Loader2,
  ArrowLeft,
  Users,
  Shield,
  Trophy,
  Globe,
  Lock,
  FileText,
  Image,
  Star,
  Calculator,
  Layers,
} from "lucide-react";

type TabType = "competitions" | "enrollments" | "categories" | "admins" | "documents" | "points" | "settings";

export default function TourDetail() {
  const { id } = useParams({ from: "/admin/tours/$id" });
  const navigate = useNavigate();
  const tourId = parseInt(id);

  const [activeTab, setActiveTab] = useState<TabType>("competitions");

  const { data: tour, isLoading: tourLoading } = useTour(tourId);
  const { data: enrollments } = useTourEnrollments(tourId);
  const { data: categories } = useTourCategories(tourId);
  const { data: documents } = useTourDocuments(tourId);
  const { data: tourPointTemplates } = useTourPointTemplates(tourId);

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

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "competitions", label: "Competitions", icon: <Trophy className="w-4 h-4" /> },
    { id: "enrollments", label: "Enrollments", icon: <Users className="w-4 h-4" />, count: enrollments?.length },
    { id: "categories", label: "Categories", icon: <Layers className="w-4 h-4" />, count: categories?.length },
    { id: "admins", label: "Admins", icon: <Shield className="w-4 h-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="w-4 h-4" />, count: documents?.length },
    { id: "points", label: "Points", icon: <Star className="w-4 h-4" />, count: tourPointTemplates?.length },
    { id: "settings", label: "Settings", icon: <Image className="w-4 h-4" /> },
  ];

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
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-charcoal">{tour.name}</h1>
              <div className="flex gap-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    tour.visibility === "public"
                      ? "bg-fairway/20 text-fairway"
                      : "bg-charcoal/10 text-charcoal/70"
                  }`}
                >
                  {tour.visibility === "public" ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {tour.visibility}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    tour.scoring_mode === "net"
                      ? "bg-amber-100 text-amber-700"
                      : tour.scoring_mode === "both"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-charcoal/10 text-charcoal/70"
                  }`}
                  title={`Scoring: ${tour.scoring_mode}`}
                >
                  <Calculator className="h-3 w-3" />
                  {tour.scoring_mode}
                </span>
              </div>
            </div>
            {tour.description && <p className="text-charcoal/70">{tour.description}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-rough mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-turf text-turf"
                  : "border-transparent text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-charcoal/10 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "competitions" && <TourCompetitionsTab tourId={tourId} />}
      {activeTab === "enrollments" && <TourEnrollmentsTab tourId={tourId} />}
      {activeTab === "categories" && <TourCategoriesTab tourId={tourId} />}
      {activeTab === "admins" && <TourAdminsTab tourId={tourId} tour={tour} />}
      {activeTab === "documents" && <TourDocumentsTab tourId={tourId} tour={tour} />}
      {activeTab === "points" && <TourPointsTab tourId={tourId} />}
      {activeTab === "settings" && <TourSettingsTab tourId={tourId} tour={tour} />}
    </div>
  );
}
