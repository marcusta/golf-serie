import { cn } from "@/lib/utils";
import { Edit3, Trophy, Medal, Users } from "lucide-react";

type TabId = "score" | "leaderboard" | "teams" | "participants";

interface BottomTabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  className?: string;
  /** Hide specific tabs (e.g., for tour competitions, hide "teams") */
  hiddenTabs?: TabId[];
  /** Custom label for participants tab */
  participantsLabel?: string;
}

export function BottomTabNavigation({
  activeTab,
  onTabChange,
  className,
  hiddenTabs = [],
  participantsLabel,
}: BottomTabNavigationProps) {
  const allTabs = [
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
      label: participantsLabel || "Participants",
      shortLabel: participantsLabel || "Groups",
      icon: Users,
      disabled: false,
    },
  ];

  // Filter out hidden tabs
  const tabs = allTabs.filter((tab) => !hiddenTabs.includes(tab.id));

  // Calculate grid columns based on visible tabs
  const gridCols = tabs.length === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div
      className={cn(
        "bg-scorecard border-t-2 border-soft-grey shadow-[0_-2px_8px_rgba(27,67,50,0.08)]",
        className
      )}
    >
      <div className={cn("grid max-w-lg mx-auto", gridCols)}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 touch-manipulation",
                "min-h-[60px] md:min-h-[64px] font-['Inter']",
                isActive
                  ? "text-coral bg-gradient-to-b from-coral/10 to-coral/5 border-t-2 border-coral"
                  : "text-charcoal hover:text-turf hover:bg-rough/30",
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
