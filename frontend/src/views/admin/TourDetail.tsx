import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
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
  ArrowLeft,
  Users,
  Shield,
  Trophy,
  FileText,
  Star,
  Calculator,
  Layers,
  Settings,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type TabType =
  | "competitions"
  | "enrollments"
  | "categories"
  | "admins"
  | "documents"
  | "points"
  | "settings";

export default function TourDetail() {
  const { id } = useParams({ from: "/admin/tours/$id" });
  const tourId = parseInt(id);

  const [activeTab, setActiveTab] = useState<TabType>("competitions");

  const { data: tour, isLoading: tourLoading } = useTour(tourId);
  const { data: enrollments } = useTourEnrollments(tourId);
  const { data: categories } = useTourCategories(tourId);
  const { data: documents } = useTourDocuments(tourId);
  const { data: tourPointTemplates } = useTourPointTemplates(tourId);

  if (tourLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-[280px]" />
        <Skeleton className="h-[360px] w-full" />
      </div>
    );
  }

  if (!tour) {
    return <div>Tour not found</div>;
  }

  const tabs: {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: "competitions",
      label: "Competitions",
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      id: "enrollments",
      label: "Enrollments",
      icon: <Users className="h-4 w-4" />,
      count: enrollments?.length,
    },
    {
      id: "categories",
      label: "Categories",
      icon: <Layers className="h-4 w-4" />,
      count: categories?.length,
    },
    { id: "admins", label: "Admins", icon: <Shield className="h-4 w-4" /> },
    {
      id: "documents",
      label: "Documents",
      icon: <FileText className="h-4 w-4" />,
      count: documents?.length,
    },
    {
      id: "points",
      label: "Points",
      icon: <Star className="h-4 w-4" />,
      count: tourPointTemplates?.length,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/tours"
            className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tours
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-charcoal">{tour.name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide">
          <span
            className={
              tour.visibility === "public" ? "text-turf" : "text-charcoal/60"
            }
          >
            Visibility: {tour.visibility}
          </span>
          <span
            className={
              tour.enrollment_mode === "request"
                ? "text-sky"
                : "text-charcoal/60"
            }
          >
            Enrollment:{" "}
            {tour.enrollment_mode === "request" ? "requests" : "closed"}
          </span>
          <span className="inline-flex items-center gap-1 text-charcoal/60">
            <Calculator className="h-3 w-3" />
            Scoring: {tour.scoring_mode}
          </span>
        </div>
      </div>

      <div className="border-b border-soft-grey">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-2 px-1 border-b-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-turf text-turf"
                  : "border-transparent text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-xs text-charcoal/60 bg-soft-grey/40 px-1.5 py-0.5 rounded">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "competitions" && <TourCompetitionsTab tourId={tourId} />}
      {activeTab === "enrollments" && <TourEnrollmentsTab tourId={tourId} />}
      {activeTab === "categories" && <TourCategoriesTab tourId={tourId} />}
      {activeTab === "admins" && <TourAdminsTab tourId={tourId} tour={tour} />}
      {activeTab === "documents" && (
        <TourDocumentsTab tourId={tourId} tour={tour} />
      )}
      {activeTab === "points" && <TourPointsTab tourId={tourId} />}
      {activeTab === "settings" && (
        <TourSettingsTab tourId={tourId} tour={tour} />
      )}
    </div>
  );
}
