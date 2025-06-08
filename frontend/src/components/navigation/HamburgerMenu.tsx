import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Menu, X, Trophy, Settings } from "lucide-react";

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
    {
      to: "/admin/series",
      label: "Admin Panel",
      icon: Settings,
      description: "Manage competitions and settings",
    },
  ];

  const closeMenu = () => setIsOpen(false);

  return (
    <div className={cn("relative", className)}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-xl transition-all duration-200 touch-manipulation font-['Inter']",
          "hover:bg-rough focus:outline-2 focus:outline-offset-2 focus:outline-turf",
          isOpen && "bg-rough"
        )}
        aria-label="Menu"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-charcoal" />
        ) : (
          <Menu className="w-5 h-5 text-charcoal" />
        )}
      </button>

      {/* Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-fairway/25 z-40 md:hidden"
            onClick={closeMenu}
          />

          {/* Menu Content */}
          <div
            className={cn(
              "absolute top-12 right-0 w-80 bg-scorecard rounded-xl shadow-[0_4px_16px_rgba(27,67,50,0.15)] border-2 border-soft-grey z-50",
              "md:w-96"
            )}
          >
            <div className="p-2">
              <div className="px-3 py-2 border-b-2 border-soft-grey">
                <h3 className="text-sm font-semibold text-charcoal font-['DM_Sans']">
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
                        "flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-['Inter']",
                        "hover:bg-rough focus:outline-2 focus:outline-offset-2 focus:outline-turf",
                        "group"
                      )}
                    >
                      <Icon className="w-5 h-5 text-soft-grey group-hover:text-turf mt-0.5 flex-shrink-0 transition-colors duration-200" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-charcoal group-hover:text-fairway transition-colors duration-200">
                          {item.label}
                        </div>
                        <div className="text-xs text-soft-grey mt-0.5">
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
