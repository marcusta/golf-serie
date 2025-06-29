import React from "react";
import { CommonHeader } from "../navigation/CommonHeader";

interface PlayerPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  headerContent?: React.ReactNode;
  className?: string;
  seriesId?: number;
  seriesName?: string;
  showHamburgerMenu?: boolean;
  customActions?: React.ReactNode;
}

export function PlayerPageLayout({
  children,
  title,
  showBackButton = true,
  onBackClick,
  headerContent,
  className = "",
  seriesId,
  seriesName,
  showHamburgerMenu = true,
  customActions,
}: PlayerPageLayoutProps) {
  return (
    <div className={`min-h-screen bg-scorecard ${className}`}>
      <CommonHeader
        title={title}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
        seriesId={seriesId}
        seriesName={seriesName}
        showHamburgerMenu={showHamburgerMenu}
        customActions={customActions}
      >
        {headerContent}
      </CommonHeader>

      {children}
    </div>
  );
}
