import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { List, Trophy } from "lucide-react";
import TapScoreLogo from "../../components/ui/TapScoreLogo";
import { AuthButtons } from "../../components/auth/AuthButtons";

const playerNavLinks = [
  { to: "/player/competitions", label: "Competitions", icon: List },
  { to: "/player/series", label: "Series", icon: Trophy },
];

export default function PlayerLayout() {
  const { location } = useRouterState();

  // Hide navigation for detailed views and landing page (they have their own navigation)
  const isDetailView =
    location.pathname.endsWith("/player") ||
    location.pathname.endsWith("/player/") || // Landing page
    location.pathname.endsWith("/player/competitions") || // Full-screen competitions page
    location.pathname.endsWith("/player/series") || // Full-screen series page
    location.pathname.endsWith("/player/tours") || // Full-screen tours page
    location.pathname.endsWith("/player/rounds") || // All rounds page
    location.pathname.endsWith("/player/profile") || // User's own profile
    location.pathname.endsWith("/player/games") || // My games list
    location.pathname.match(/\/player\/players\/\d+/) || // Public player profiles
    location.pathname.match(/\/player\/games\/new/) || // Game setup wizard
    location.pathname.match(/\/player\/games\/\d+\/play/) || // Game play view
    (location.pathname.includes("/competitions/") &&
      (location.pathname.includes("/tee-times/") ||
        location.pathname.match(/\/competitions\/\d+$/))) ||
    location.pathname.match(/\/series\/\d+/) || // This includes all series detail routes
    location.pathname.match(/\/tours\/\d+/); // Tour detail routes

  if (isDetailView) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {/* TapScore Header */}
      <div className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <TapScoreLogo size="md" variant="color" layout="horizontal" />
            <AuthButtons />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="bg-scorecard rounded-xl p-6 shadow-[0_2px_8px_rgba(27,67,50,0.08)] border-2 border-soft-grey">
            {/* Player Navigation */}
            <div className="border-b-2 border-soft-grey">
              <nav className="flex space-x-8">
                {playerNavLinks.map((link) => {
                  const isActive =
                    location.pathname === link.to ||
                    (link.to === "/player/series" &&
                      location.pathname.startsWith("/player/series")) ||
                    (link.to === "/player/competitions" &&
                      location.pathname.startsWith("/player/competitions"));
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-all duration-200 font-['Inter']
                        ${
                          isActive
                            ? "border-turf text-turf bg-gradient-to-b from-turf/10 to-turf/5"
                            : "border-transparent text-charcoal hover:text-turf hover:border-rough hover:bg-rough/30"
                        }
                      `}
                    >
                      <IconComponent className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Player Content */}
            <div className="mt-6 min-h-[60vh]">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

