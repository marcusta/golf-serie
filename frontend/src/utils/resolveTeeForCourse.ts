export type TeeColorMatch = {
  id: number;
  color?: string | null;
};

/**
 * Pick a tee for a course from a preferred tee id (home course) or matching color.
 */
export function resolveTeeForCourse({
  tees,
  preferredTeeId,
  preferredColor,
}: {
  tees: TeeColorMatch[];
  preferredTeeId?: number | null;
  preferredColor?: string | null;
}): number | null {
  if (preferredTeeId != null) {
    const exactMatch = tees.find((tee) => tee.id === preferredTeeId);
    if (exactMatch) {
      return exactMatch.id;
    }
  }

  if (preferredColor) {
    const normalizedColor = preferredColor.toLowerCase();
    const colorMatch = tees.find(
      (tee) => tee.color?.toLowerCase() === normalizedColor
    );
    if (colorMatch) {
      return colorMatch.id;
    }
  }

  return null;
}
