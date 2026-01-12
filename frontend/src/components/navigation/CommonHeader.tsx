import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Trophy, Flag } from "lucide-react";
import TapScoreLogo from "../ui/TapScoreLogo";
import { HamburgerMenu } from "./HamburgerMenu";

interface CommonHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  seriesId?: number;
  seriesName?: string;
  tourId?: number;
  tourName?: string;
  showHamburgerMenu?: boolean;
  customActions?: React.ReactNode;
}

export function CommonHeader({
  title,
  subtitle,
  showBackButton = true,
  onBackClick,
  children,
  className = "",
  seriesId,
  seriesName,
  tourId,
  tourName,
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
        <div className="flex items-center gap-3 h-14 md:h-16">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className="p-2 hover:bg-turf rounded-lg transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {/* Logo - always visible, responsive sizing */}
          {!title && (
            <div className="flex-1">
              <TapScoreLogo size="sm" variant="color" layout="horizontal" className="md:hidden" />
              <TapScoreLogo size="md" variant="color" layout="horizontal" className="hidden md:block" />
            </div>
          )}
          {title && (
            <div className="hidden md:block">
              <TapScoreLogo size="md" variant="color" layout="horizontal" />
            </div>
          )}

          {title && (
            <>
              {/* Divider - only shown on desktop when logo is visible */}
              <div className="hidden md:block w-px h-6 bg-scorecard/30" />
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm md:text-body-lg font-semibold text-scorecard font-display truncate leading-tight">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs md:text-sm text-scorecard/70 font-display truncate leading-tight">
                      {subtitle}
                    </p>
                  )}
                </div>
                {/* Render tour link if tourId exists */}
                {tourId && (
                  <Link
                    to="/player/tours/$tourId"
                    params={{ tourId: tourId.toString() }}
                    title={`View Tour: ${tourName || ""}`}
                    className="p-1.5 hover:bg-turf rounded-lg transition-colors flex-shrink-0"
                  >
                    <Flag className="h-4 w-4 text-turf" />
                  </Link>
                )}
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
            {showHamburgerMenu && <HamburgerMenu seriesId={seriesId} seriesName={seriesName} tourId={tourId} tourName={tourName} />}
          </div>
        </div>
      </div>
    </header>
  );
}
