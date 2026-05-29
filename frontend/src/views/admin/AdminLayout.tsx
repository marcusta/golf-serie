import { Link, Outlet, useRouterState, Navigate } from "@tanstack/react-router";
import { Users, Map, Trophy, Settings, Award, LogOut, UserCog, Library } from "lucide-react";
import TapScoreLogo from "../../components/ui/TapScoreLogo";
import { useAuth } from "../../hooks/useAuth";

// Navigation links visible to all admins
const adminNavLinks = [
  { to: "/admin/series", label: "Series", icon: Award },
  { to: "/admin/tours", label: "Tours", icon: Trophy },
  { to: "/admin/competitions", label: "Competitions", icon: Trophy },
];

// Additional navigation links only visible to super admins
const superAdminNavLinks = [
  { to: "/admin/teams", label: "Teams", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: Map },
  { to: "/admin/point-templates", label: "Template Library", icon: Library },
  { to: "/admin/users", label: "Users", icon: UserCog },
];

export default function AdminLayout() {
  const { location } = useRouterState();
  const { user, isLoading, isAuthenticated, isSuperAdmin, logout } = useAuth();

  // Combine nav links based on user role
  const visibleNavLinks = isSuperAdmin
    ? [...adminNavLinks, ...superAdminNavLinks]
    : adminNavLinks;

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center">
        <div className="text-charcoal">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      {/* TapScore Header */}
      <div className="bg-fairway text-scorecard shadow-[0_2px_8px_rgba(27,67,50,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-16">
            <div className="flex items-center space-x-4 min-w-0">
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
              <div className="flex items-center space-x-2">
                <Settings className="h-6 w-6 text-coral" />
                <span className="text-scorecard font-['Inter'] font-medium">
                  Admin
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && (
                <span className="hidden md:inline text-scorecard/80 text-sm font-['Inter'] truncate max-w-[200px]">
                  {user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 text-scorecard/80 hover:text-scorecard transition-colors font-['Inter'] text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <Link
                to="/player/competitions"
                className="whitespace-nowrap px-3 sm:px-4 py-2 bg-coral text-scorecard rounded-xl hover:bg-[#E8890A] hover:-translate-y-0.5 transition-all duration-200 font-['Inter'] font-semibold border-2 border-coral hover:border-[#E8890A] shadow-sm text-sm sm:text-base"
              >
                <span className="sm:hidden">Player View</span>
                <span className="hidden sm:inline">Switch to Player View</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="bg-scorecard rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(27,67,50,0.08)] border-2 border-soft-grey">
            {/* Admin Navigation */}
            <div className="border-b-2 border-soft-grey">
              <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {visibleNavLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 font-['Inter']
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

