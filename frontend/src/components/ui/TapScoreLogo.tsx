import * as React from "react";
import { cn } from "@/lib/utils";
import tapscoreHorizontalUrl from "/tapscore_horizontal.png?url";
import tapscoreLogoUrl from "/tapscore_logo.png?url";

interface TapScoreLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark" | "color";
  layout?: "horizontal" | "vertical";
  className?: string;
}

const TapScoreLogo: React.FC<TapScoreLogoProps> = ({
  size = "md",
  variant = "color",
  layout = "horizontal",
  className,
}) => {
  const sizeClasses = {
    sm: layout === "horizontal" ? "h-6" : "h-8 w-8",
    md: layout === "horizontal" ? "h-8" : "h-10 w-10",
    lg: layout === "horizontal" ? "h-10" : "h-12 w-12",
    xl: layout === "horizontal" ? "h-12" : "h-16 w-16",
  };

  // Choose the appropriate logo file based on layout
  const logoSrc =
    layout === "horizontal" ? tapscoreHorizontalUrl : tapscoreLogoUrl;

  // Apply filter effects based on variant for dark/light themes
  const getImageStyle = () => {
    switch (variant) {
      case "light":
        // Invert colors for dark backgrounds and make it white
        return {
          filter: "brightness(0) invert(1)",
        };
      case "dark":
        // Keep original colors but ensure it's dark
        return {
          filter: "brightness(0.8)",
        };
      case "color":
      default:
        // Use original colors
        return {};
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={logoSrc}
        alt="TapScore Logo"
        className={cn(
          "object-contain transition-all duration-200",
          sizeClasses[size]
        )}
        style={getImageStyle()}
        onError={(e) => {
          console.error("Failed to load TapScore logo:", logoSrc);
          // Fallback to public URL if import fails
          if (layout === "horizontal") {
            e.currentTarget.src = "/tapscore_horizontal.png";
          } else {
            e.currentTarget.src = "/tapscore_logo.png";
          }
        }}
      />
    </div>
  );
};

export default TapScoreLogo;
