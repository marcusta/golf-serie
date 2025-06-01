import { cn } from "@/lib/utils";
import { Edit3, Trophy, Medal, Users } from "lucide-react";

interface BottomTabNavigationProps {
  activeTab: "score" | "leaderboard" | "teams" | "participants";
  onTabChange: (
    tab: "score" | "leaderboard" | "teams" | "participants"
  ) => void;
  className?: string;
}

export function BottomTabNavigation({
  activeTab,
  onTabChange,
  className,
}: BottomTabNavigationProps) {
  const tabs = [
    {
      id: "score" as const,
      label: "Score Entry",
      shortLabel: "Score",
      icon: Edit3,
      disabled: false,
    },
    {
      id: "leaderboard" as const,
      label: "Leaderboard",
      shortLabel: "Leaderboard",
      icon: Trophy,
      disabled: false,
    },
    {
      id: "teams" as const,
      label: "Team Results",
      shortLabel: "Teams",
      icon: Medal,
      disabled: false,
    },
    {
      id: "participants" as const,
      label: "Participants",
      shortLabel: "Start List",
      icon: Users,
      disabled: false,
    },
  ];

  return (
    <div
      className={cn("bg-white border-t border-gray-200 shadow-lg", className)}
    >
      <div className="grid grid-cols-4 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-2 transition-all duration-200",
                "min-h-[60px] md:min-h-[64px]",
                isActive
                  ? "text-green-600 bg-green-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                tab.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon
                className={cn(
                  "mb-1 transition-all duration-200",
                  isActive ? "w-6 h-6" : "w-5 h-5",
                  "md:w-6 md:h-6"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  "md:text-sm",
                  isActive && "font-semibold"
                )}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
