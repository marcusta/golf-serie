import { useState, useEffect, useMemo } from "react";
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
  User,
  LogOut,
  LogIn,
  UserPlus,
  Settings,
  Flag,
  Calendar,
  Play,
} from "lucide-react";
import { useCompetition } from "@/api/competitions";
import { useSingleSeries } from "@/api/series";
import { useTour } from "@/api/tours";
import { useActiveRounds } from "@/api/tour-registration";
import { useAuth } from "@/hooks/useAuth";
import TapScoreLogo from "../ui/TapScoreLogo";

interface HamburgerMenuProps {
  className?: string;
  seriesId?: number;
  seriesName?: string;
  tourId?: number;
  tourName?: string;
}

interface MenuLink {
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function HamburgerMenu({
  className,
  seriesId: propSeriesId,
  seriesName: propSeriesName,
  tourId: propTourId,
  tourName: propTourName,
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedSeriesId, setResolvedSeriesId] = useState<number | undefined>(propSeriesId);
  const [resolvedSeriesName, setResolvedSeriesName] = useState<string | undefined>(propSeriesName);
  const [resolvedTourId, setResolvedTourId] = useState<number | undefined>(propTourId);
  const [resolvedTourName, setResolvedTourName] = useState<string | undefined>(propTourName);
  const [isLoading, setIsLoading] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();

  // Use router params to get context only if not passed via props
  const params = useParams({
    strict: false,
  }) as { competitionId?: string; serieId?: string; tourId?: string; teeTimeId?: string };

  const competitionIdNum = params.competitionId
    ? parseInt(params.competitionId)
    : undefined;
  const serieIdNum = params.serieId ? parseInt(params.serieId) : undefined;
  const tourIdNum = params.tourId ? parseInt(params.tourId) : undefined;
  const teeTimeIdNum = params.teeTimeId ? parseInt(params.teeTimeId) : undefined;

  // Only fetch series if we don't have props and need to resolve from route
  const needsSeriesFetch = !propSeriesId && (competitionIdNum || serieIdNum);
  // Only fetch tour if we don't have props and need to resolve from route
  const needsTourFetch = !propTourId && tourIdNum;

  const { data: competitionData, isLoading: competitionLoading } =
    useCompetition(needsSeriesFetch ? competitionIdNum || 0 : 0);
  const { data: seriesData, isLoading: seriesLoading } = useSingleSeries(
    needsSeriesFetch ? (serieIdNum || competitionData?.series_id || 0) : 0
  );
  const { data: tourData, isLoading: tourLoading } = useTour(
    needsTourFetch ? tourIdNum || 0 : 0
  );

  // Get active rounds to show "Current Round" link if applicable
  const { data: activeRounds } = useActiveRounds();

  // Find active round by teeTimeId (for when we're on a tee time page)
  const activeRoundByTeeTime = useMemo(() => {
    if (!teeTimeIdNum || !activeRounds) return null;
    return activeRounds.find((round) => round.tee_time_id === teeTimeIdNum) || null;
  }, [activeRounds, teeTimeIdNum]);

  // Find active round for the current tour
  const currentTourActiveRound = useMemo(() => {
    if (!resolvedTourId || !activeRounds) return null;
    return activeRounds.find((round) => round.tour_id === resolvedTourId) || null;
  }, [activeRounds, resolvedTourId]);

  useEffect(() => {
    // If props are provided, use them directly
    if (propSeriesId !== undefined) {
      setResolvedSeriesId(propSeriesId);
      setResolvedSeriesName(propSeriesName);
      setIsLoading(false);
      return;
    }

    setIsLoading(competitionLoading || seriesLoading || tourLoading);

    if (seriesData) {
      setResolvedSeriesId(seriesData.id);
      setResolvedSeriesName(seriesData.name);
    } else if (competitionData?.series_id) {
      setResolvedSeriesId(competitionData.series_id);
      setResolvedSeriesName(competitionData.series_name);
    } else {
      setResolvedSeriesId(undefined);
      setResolvedSeriesName(undefined);
    }
  }, [competitionData, seriesData, competitionLoading, seriesLoading, tourLoading, propSeriesId, propSeriesName]);

  // Tour context resolution
  useEffect(() => {
    // If props are provided, use them directly
    if (propTourId !== undefined) {
      setResolvedTourId(propTourId);
      setResolvedTourName(propTourName);
      return;
    }

    // If we have tour data from URL params, use it
    if (tourData) {
      setResolvedTourId(tourData.id);
      setResolvedTourName(tourData.name);
      return;
    }

    // If we're on a tee time page, get tour context from active rounds
    if (activeRoundByTeeTime) {
      setResolvedTourId(activeRoundByTeeTime.tour_id);
      setResolvedTourName(activeRoundByTeeTime.tour_name);
      return;
    }

    setResolvedTourId(undefined);
    setResolvedTourName(undefined);
  }, [tourData, tourLoading, propTourId, propTourName, activeRoundByTeeTime]);

  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    await logout();
    closeMenu();
  };

  const seriesContextualLinks =
    resolvedSeriesId && resolvedSeriesName
      ? [
          {
            to: "/player/series/$serieId",
            params: { serieId: resolvedSeriesId.toString() },
            label: "View Overview",
            icon: LayoutDashboard,
          },
          {
            to: "/player/series/$serieId/standings",
            params: { serieId: resolvedSeriesId.toString() },
            label: "View Standings",
            icon: Trophy,
          },
        ]
      : [];

  // Tour contextual links
  const tourContextualLinks = useMemo(() => {
    if (!resolvedTourId || !resolvedTourName) return [];

    const links: MenuLink[] = [
      {
        to: "/player/tours/$tourId",
        params: { tourId: resolvedTourId.toString() },
        label: "Tour Home",
        icon: LayoutDashboard,
      },
      {
        to: "/player/tours/$tourId/standings",
        params: { tourId: resolvedTourId.toString() },
        label: "Tour Standings",
        icon: Trophy,
      },
      {
        to: "/player/tours/$tourId/competitions",
        params: { tourId: resolvedTourId.toString() },
        label: "Tour Competitions",
        icon: Calendar,
      },
    ];

    // Add "Current Round" link if there's an active round
    if (currentTourActiveRound) {
      links.push({
        to: "/player/competitions/$competitionId/tee-times/$teeTimeId",
        params: {
          competitionId: currentTourActiveRound.competition_id.toString(),
          teeTimeId: currentTourActiveRound.tee_time_id.toString()
        },
        label: currentTourActiveRound.status === "playing" ? "Continue Round" : "View Round",
        icon: Play,
      });
    }

    return links;
  }, [resolvedTourId, resolvedTourName, currentTourActiveRound]);

  const generalLinks = [
    {
      to: "/player/tours",
      label: "Tours",
      icon: Flag,
    },
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
          <X className="w-5 h-5 text-scorecard" />
        ) : (
          <Menu className="w-5 h-5 text-scorecard" />
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
              "md:w-96",
              "flex flex-col max-h-[80vh]"
            )}
          >
            <div className="p-2 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : (
                <nav className="divide-y divide-gray-200">
                  {/* Contextual navigation sections first */}
                  {seriesContextualLinks.length > 0 && (
                    <MenuSection
                      title={`Series: ${resolvedSeriesName}`}
                      links={seriesContextualLinks}
                    />
                  )}
                  {tourContextualLinks.length > 0 && (
                    <MenuSection
                      title={`Tour: ${resolvedTourName}`}
                      links={tourContextualLinks}
                    />
                  )}
                  <MenuSection title="Navigation" links={generalLinks} />

                  {/* Account Section - at the bottom */}
                  {isAuthenticated ? (
                    <div className="py-2">
                      <div className="px-3 pb-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Account
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <User className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {user?.email}
                          </span>
                        </div>
                        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
                          <Link
                            to="/admin/series"
                            onClick={closeMenu}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-['Inter']",
                              "hover:bg-green-50 focus:outline-2 focus:outline-offset-2 focus:outline-green-600",
                              "group"
                            )}
                          >
                            <Settings className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors duration-200" />
                            <span className="text-sm font-medium text-gray-900 group-hover:text-green-700 transition-colors duration-200">
                              Admin Panel
                            </span>
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-['Inter'] w-full",
                            "hover:bg-red-50 focus:outline-2 focus:outline-offset-2 focus:outline-red-600",
                            "group"
                          )}
                        >
                          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors duration-200" />
                          <span className="text-sm font-medium text-gray-900 group-hover:text-red-700 transition-colors duration-200">
                            Logout
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="px-3 pb-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Account
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <Link
                          to="/login"
                          onClick={closeMenu}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-['Inter']",
                            "hover:bg-green-50 focus:outline-2 focus:outline-offset-2 focus:outline-green-600",
                            "group"
                          )}
                        >
                          <LogIn className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors duration-200" />
                          <span className="text-sm font-medium text-gray-900 group-hover:text-green-700 transition-colors duration-200">
                            Login
                          </span>
                        </Link>
                        <Link
                          to="/register"
                          onClick={closeMenu}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-['Inter']",
                            "hover:bg-green-50 focus:outline-2 focus:outline-offset-2 focus:outline-green-600",
                            "group"
                          )}
                        >
                          <UserPlus className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors duration-200" />
                          <span className="text-sm font-medium text-gray-900 group-hover:text-green-700 transition-colors duration-200">
                            Sign Up
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}
                </nav>
              )}
            </div>

            {/* Logo Footer */}
            <div className="border-t border-gray-200 p-3 flex justify-center">
              <TapScoreLogo size="sm" variant="color" layout="horizontal" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
