/**
 * Swedish tee name to English color mapping
 */
export const SWEDISH_TEE_COLORS: Record<string, string> = {
  vit: "White",
  röd: "Red",
  blå: "Blue",
  gul: "Yellow",
  orange: "Orange",
  svart: "Black",
  grön: "Green",
  grå: "Gray",
  rosa: "Pink",
};

/**
 * Maps a tee name (Swedish or English) to a standard color
 * Returns the color if found, or the original name if no match
 */
export function getTeeColor(teeName: string): string | undefined {
  const normalized = teeName.toLowerCase().trim();

  // Check Swedish names first
  if (SWEDISH_TEE_COLORS[normalized]) {
    return SWEDISH_TEE_COLORS[normalized];
  }

  // Check if it's already an English color name
  const englishColors = Object.values(SWEDISH_TEE_COLORS).map(c => c.toLowerCase());
  if (englishColors.includes(normalized)) {
    // Capitalize first letter
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  // No match - return undefined so the tee name can be used as-is
  return undefined;
}
