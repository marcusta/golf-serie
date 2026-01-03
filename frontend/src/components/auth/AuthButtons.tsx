import { Link } from "@tanstack/react-router";
import { LogIn, UserPlus, LogOut, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function AuthButtons() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden md:flex text-scorecard/90 text-sm font-['Inter'] items-center gap-1">
          <User className="h-4 w-4" />
          {user?.email}
        </span>
        
        {isAdmin && (
          <Link
            to="/admin/series"
            className="px-3 py-1.5 text-sm text-scorecard/90 hover:text-scorecard transition-colors font-['Inter']"
          >
            Admin
          </Link>
        )}
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-scorecard/90 hover:text-scorecard transition-colors font-['Inter']"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        to="/login"
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-scorecard/90 hover:text-scorecard transition-colors font-['Inter']"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden md:inline">Login</span>
      </Link>
      <Link
        to="/register"
        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-coral text-scorecard rounded-lg hover:bg-[#E8890A] transition-colors font-['Inter'] font-medium"
      >
        <UserPlus className="h-4 w-4" />
        <span className="hidden md:inline">Sign Up</span>
      </Link>
    </div>
  );
}
