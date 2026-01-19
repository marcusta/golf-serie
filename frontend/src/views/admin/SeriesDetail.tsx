import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesDocuments } from "@/api/series";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  FileText,
  Settings,
  Trophy,
  Shield,
  Users,
} from "lucide-react";
import {
  SeriesCompetitionsTab,
  SeriesSettingsTab,
  SeriesTeamsTab,
  SeriesDocumentsTab,
  SeriesAdminsTab,
} from "./series-tabs";

type TabType = "competitions" | "settings" | "teams" | "documents" | "admins";

export default function AdminSeriesDetail() {
  const { serieId } = useParams({ from: "/admin/series/$serieId" });
  const seriesId = parseInt(serieId);

  const { data: series, isLoading: seriesLoading } = useSingleSeries(seriesId);
  const { data: documents } = useSeriesDocuments(seriesId);

  const [activeTab, setActiveTab] = useState<TabType>("competitions");

  if (seriesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-[280px]" />
        <Skeleton className="h-[360px] w-full" />
      </div>
    );
  }

  if (!series) {
    return <div>Series not found</div>;
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "competitions", label: "Competitions", icon: <Trophy className="h-4 w-4" /> },
    { id: "teams", label: "Teams", icon: <Users className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-4 w-4" />, badge: documents?.length },
    { id: "admins", label: "Admins", icon: <Shield className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/series"
            className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Series
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-charcoal">{series.name}</h1>
            <p className="text-sm text-charcoal/60">Series #{series.id}</p>
          </div>
        </div>
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            series.is_public ? "text-turf" : "text-charcoal/60"
          }`}
        >
          {series.is_public ? "Public" : "Private"}
        </span>
      </div>

      {/* Tab Navigation */}
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
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="text-xs text-charcoal/60 bg-soft-grey/40 px-1.5 py-0.5 rounded">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "competitions" && (
        <SeriesCompetitionsTab seriesId={seriesId} />
      )}

      {activeTab === "settings" && (
        <SeriesSettingsTab series={series} />
      )}

      {activeTab === "teams" && (
        <SeriesTeamsTab seriesId={seriesId} />
      )}

      {activeTab === "documents" && (
        <SeriesDocumentsTab seriesId={seriesId} series={series} />
      )}

      {activeTab === "admins" && (
        <SeriesAdminsTab seriesId={seriesId} series={series} />
      )}
    </div>
  );
}
