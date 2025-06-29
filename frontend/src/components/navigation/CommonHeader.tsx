import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Trophy } from "lucide-react";
import TapScoreLogo from "../ui/TapScoreLogo";
import { HamburgerMenu } from "./HamburgerMenu";

interface CommonHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  seriesId?: number;
  seriesName?: string;
  showHamburgerMenu?: boolean;
  customActions?: React.ReactNode;
}

export function CommonHeader({
  title,
  showBackButton = true,
  onBackClick,
  children,
  className = "",
  seriesId,
  seriesName,
  showHamburgerMenu = true,
  customActions,
}: CommonHeaderProps) {
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      // Default behavior: go back in browser history
      window.history.back();
    }
  };

  return (
    <header className={`bg-fairway text-scorecard shadow-lg ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className="p-2 hover:bg-turf rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <TapScoreLogo size="md" variant="color" layout="horizontal" />

          {title && (
            <>
              <div className="w-px h-6 bg-scorecard/30" />
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <h1 className="text-body-lg font-semibold text-scorecard font-display truncate">
                  {title}
                </h1>
                {/* Render series link if seriesId exists */}
                {seriesId && (
                  <Link
                    to="/player/series/$serieId"
                    params={{ serieId: seriesId.toString() }}
                    title={`View Series: ${seriesName || ""}`}
                    className="p-1.5 hover:bg-turf rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trophy className="h-4 w-4 text-coral" />
                  </Link>
                )}
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {customActions}
            {children}
            {showHamburgerMenu && <HamburgerMenu />}
          </div>
        </div>
      </div>
    </header>
  );
}
