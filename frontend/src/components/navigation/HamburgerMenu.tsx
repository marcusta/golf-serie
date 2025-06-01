import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Menu, X, Trophy, TrendingUp } from "lucide-react";

interface HamburgerMenuProps {
  className?: string;
}

export function HamburgerMenu({ className }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      to: "/player/competitions",
      label: "Competitions",
      icon: Trophy,
      description: "Browse all competitions",
    },
  ];

  const closeMenu = () => setIsOpen(false);

  return (
    <div className={cn("relative", className)}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-lg transition-all duration-200 touch-manipulation",
          "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
          isOpen && "bg-gray-100"
        )}
        aria-label="Menu"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-gray-700" />
        ) : (
          <Menu className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
            onClick={closeMenu}
          />

          {/* Menu Content */}
          <div
            className={cn(
              "absolute top-12 right-0 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50",
              "md:w-96"
            )}
          >
            <div className="p-2">
              <div className="px-3 py-2 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">
                  Navigation
                </h3>
              </div>

              <nav className="mt-2 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={closeMenu}
                      className={cn(
                        "flex items-start gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                        "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset",
                        "group"
                      )}
                    >
                      <Icon className="w-5 h-5 text-gray-600 group-hover:text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-green-900">
                          {item.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
