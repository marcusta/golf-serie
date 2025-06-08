import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Users, Map, Trophy, Settings, Award } from "lucide-react";
import TapScoreLogo from "../../components/ui/TapScoreLogo";

const adminNavLinks = [
  { to: "/admin/series", label: "Series", icon: Award },
  { to: "/admin/teams", label: "Teams", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: Map },
  { to: "/admin/competitions", label: "Competitions", icon: Trophy },
];

export default function AdminLayout() {
  const { location } = useRouterState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {/* TapScore Header */}
      <div className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
              <div className="flex items-center space-x-2">
                <Settings className="h-6 w-6 text-coral" />
                <span className="text-scorecard font-['Inter'] font-medium">
                  Admin
                </span>
              </div>
            </div>
            <Link
              to="/player/competitions"
              className="px-4 py-2 bg-coral text-scorecard rounded-xl hover:bg-[#E8890A] hover:-translate-y-0.5 transition-all duration-200 font-['Inter'] font-semibold border-2 border-coral hover:border-[#E8890A] shadow-sm"
            >
              Switch to Player View
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="bg-scorecard rounded-xl p-6 shadow-[0_2px_8px_rgba(27,67,50,0.08)] border-2 border-soft-grey">
            {/* Admin Navigation */}
            <div className="border-b-2 border-soft-grey">
              <nav className="flex space-x-8">
                {adminNavLinks.map((link) => {
                  const isActive = location.pathname === link.to;
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

            {/* Admin Content */}
            <div className="mt-6 min-h-[60vh]">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
