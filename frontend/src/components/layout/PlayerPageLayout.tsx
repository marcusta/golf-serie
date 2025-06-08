import React from "react";
import { CommonHeader } from "../navigation/CommonHeader";

interface PlayerPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  headerContent?: React.ReactNode;
  className?: string;
}

export function PlayerPageLayout({
  children,
  title,
  showBackButton = true,
  onBackClick,
  headerContent,
  className = "",
}: PlayerPageLayoutProps) {
  return (
    <div className={`min-h-screen bg-scorecard ${className}`}>
      <CommonHeader
        title={title}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
      >
        {headerContent}
      </CommonHeader>

      {children}
    </div>
  );
}
