import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useSingleSeries, useSeriesDocuments } from "@/api/series";
import { Badge } from "@/components/ui/badge";
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/series"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Series
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{series.name}</h1>
            <p className="text-gray-600">Series #{series.id}</p>
          </div>
        </div>
        <Badge variant={series.is_public ? "default" : "secondary"}>
          {series.is_public ? "Public" : "Private"}
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
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
