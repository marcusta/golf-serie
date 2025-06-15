import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  Trophy,
  Award,
  List,
  Home,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { useCompetition } from "@/api/competitions";
import { useSingleSeries } from "@/api/series";

interface HamburgerMenuProps {
  className?: string;
}

interface MenuLink {
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function HamburgerMenu({ className }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [seriesId, setSeriesId] = useState<number | undefined>();
  const [seriesName, setSeriesName] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Use router params to get context
  const params = useParams({
    strict: false,
  }) as { competitionId?: string; serieId?: string };

  const competitionIdNum = params.competitionId
    ? parseInt(params.competitionId)
    : undefined;
  const serieIdNum = params.serieId ? parseInt(params.serieId) : undefined;

  const { data: competitionData, isLoading: competitionLoading } =
    useCompetition(competitionIdNum || 0);
  const { data: seriesData, isLoading: seriesLoading } = useSingleSeries(
    serieIdNum || competitionData?.series_id || 0
  );

  useEffect(() => {
    setIsLoading(competitionLoading || seriesLoading);

    if (seriesData) {
      setSeriesId(seriesData.id);
      setSeriesName(seriesData.name);
    } else if (competitionData?.series_id) {
      setSeriesId(competitionData.series_id);
      setSeriesName(competitionData.series_name);
    } else {
      setSeriesId(undefined);
      setSeriesName(undefined);
    }
  }, [competitionData, seriesData, competitionLoading, seriesLoading]);

  const closeMenu = () => setIsOpen(false);

  const contextualLinks =
    seriesId && seriesName
      ? [
          {
            to: "/player/series/$serieId",
            params: { serieId: seriesId.toString() },
            label: "View Overview",
            icon: LayoutDashboard,
          },
          {
            to: "/player/series/$serieId/standings",
            params: { serieId: seriesId.toString() },
            label: "View Standings",
            icon: Trophy,
          },
        ]
      : [];

  const generalLinks = [
    {
      to: "/player/competitions",
      label: "All Competitions",
      icon: List,
    },
    {
      to: "/player/series",
      label: "All Series",
      icon: Award,
    },
    {
      to: "/player",
      label: "Home",
      icon: Home,
    },
  ];

  const MenuSection = ({
    title,
    links,
  }: {
    title: string;
    links: MenuLink[];
  }) => (
    <div className="py-2">
      <div className="px-3 pb-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h4>
      </div>
      <div className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              params={item.params || {}}
              onClick={closeMenu}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-['Inter']",
                "hover:bg-green-50 focus:outline-2 focus:outline-offset-2 focus:outline-green-600",
                "group"
              )}
            >
              <Icon className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors duration-200" />
              <span className="text-sm font-medium text-gray-900 group-hover:text-green-700 transition-colors duration-200">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-xl transition-all duration-200 touch-manipulation font-['Inter']",
          "hover:bg-green-50 focus:outline-2 focus:outline-offset-2 focus:outline-green-600",
          isOpen && "bg-green-50"
        )}
        aria-label="Menu"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-gray-900" />
        ) : (
          <Menu className="w-5 h-5 text-gray-900" />
        )}
      </button>

      {/* Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/25 z-40" onClick={closeMenu} />

          {/* Menu Content */}
          <div
            className={cn(
              "absolute top-12 right-0 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50",
              "md:w-96"
            )}
          >
            <div className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : (
                <nav className="divide-y divide-gray-200">
                  {contextualLinks.length > 0 && (
                    <MenuSection
                      title={`Series: ${seriesName}`}
                      links={contextualLinks}
                    />
                  )}
                  <MenuSection title="Navigation" links={generalLinks} />
                </nav>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
