import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { List, Trophy } from "lucide-react";

const playerNavLinks = [
  { to: "/player/competitions", label: "Competitions", icon: List },
  { to: "/player/series", label: "Series", icon: Trophy },
];

export default function PlayerLayout() {
  const { location } = useRouterState();

  // Hide navigation for detailed views (they have their own navigation)
  const isDetailView =
    (location.pathname.includes("/competitions/") &&
      (location.pathname.includes("/tee-times/") ||
        location.pathname.match(/\/competitions\/\d+$/))) ||
    location.pathname.match(/\/series\/\d+$/);

  if (isDetailView) {
    return <Outlet />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* Removed duplicate title, tagline, and Admin Panel button */}
      </div>

      {/* Player Navigation */}
      <div className="border-b border-gray-200">
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
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    isActive
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
      <div className="min-h-[60vh]">
        <Outlet />
      </div>
    </div>
  );
}
