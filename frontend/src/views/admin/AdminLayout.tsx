import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Users, Map, Trophy, Settings } from "lucide-react";

const adminNavLinks = [
  { to: "/admin/teams", label: "Teams", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: Map },
  { to: "/admin/competitions", label: "Competitions", icon: Trophy },
];

export default function AdminLayout() {
  const { location } = useRouterState();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" />
            Admin Panel
          </h1>
          <p className="text-gray-600 mt-1">
            Manage teams, courses, and competitions
          </p>
        </div>
        <Link
          to="/player/standings"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Switch to Player View
        </Link>
      </div>

      {/* Admin Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {adminNavLinks.map((link) => {
            const isActive = location.pathname === link.to;
            const IconComponent = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    isActive
                      ? "border-blue-500 text-blue-600"
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

      {/* Admin Content */}
      <div className="min-h-[60vh]">
        <Outlet />
      </div>
    </div>
  );
}
