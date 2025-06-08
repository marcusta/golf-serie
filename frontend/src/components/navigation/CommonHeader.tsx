import React from "react";
import { ArrowLeft } from "lucide-react";
import TapScoreLogo from "../ui/TapScoreLogo";

interface CommonHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function CommonHeader({
  title,
  showBackButton = true,
  onBackClick,
  children,
  className = "",
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
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold font-display truncate">
                  {title}
                </h1>
              </div>
            </>
          )}

          {children && <div className="ml-auto">{children}</div>}
        </div>
      </div>
    </header>
  );
}
