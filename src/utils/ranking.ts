/**
 * Ranking Utilities
 *
 * Generic functions for assigning positions/rankings with proper tie handling.
 * Use these instead of duplicating ranking logic across services.
 *
 * @see docs/backend/SQL_REFACTORING_STRATEGY.md for context
 */

/**
 * Assign positions to a sorted array, handling ties correctly.
 * Items with equal values get the same position.
 *
 * IMPORTANT: The array must be pre-sorted by ranking criteria before calling.
 *
 * @param items - Pre-sorted array (must be sorted by ranking criteria)
 * @param getValue - Function to extract the comparison value(s) for tie detection
 * @param setPosition - Function to set the position on the item
 * @returns The same array with positions assigned
 *
 * @example
 * // Single value comparison
 * const standings = [{ points: 100 }, { points: 100 }, { points: 80 }];
 * assignPositionsWithTies(
 *   standings,
 *   (s) => s.points,
 *   (s, pos) => s.position = pos
 * );
 * // Result: positions are 1, 1, 3 (not 1, 2, 3)
 *
 * @example
 * // Multi-value comparison (e.g., points then competitions played)
 * assignPositionsWithTies(
 *   standings,
 *   (s) => `${s.points}|${s.competitionsPlayed}`,
 *   (s, pos) => s.position = pos
 * );
 */
export function assignPositionsWithTies<T>(
  items: T[],
  getValue: (item: T) => number | string,
  setPosition: (item: T, position: number) => void
): T[] {
  if (items.length === 0) return items;

  let currentPosition = 1;
  let previousValue = getValue(items[0]);
  setPosition(items[0], currentPosition);

  for (let i = 1; i < items.length; i++) {
    const currentValue = getValue(items[i]);
    if (currentValue !== previousValue) {
      currentPosition = i + 1;
    }
    setPosition(items[i], currentPosition);
    previousValue = currentValue;
  }

  return items;
}

/**
 * Sort and assign positions in one operation.
 *
 * @param items - Array to sort and rank
 * @param compareFn - Standard array sort comparison function
 * @param getValue - Function to extract comparison value for tie detection
 * @param setPosition - Function to set the position on the item
 * @returns New sorted array with positions assigned (original array unchanged)
 */
export function sortAndRank<T>(
  items: T[],
  compareFn: (a: T, b: T) => number,
  getValue: (item: T) => number | string,
  setPosition: (item: T, position: number) => void
): T[] {
  const sorted = [...items].sort(compareFn);
  return assignPositionsWithTies(sorted, getValue, setPosition);
}

/**
 * Assign positions using map (returns new array with positions).
 * Useful when you want to add position to objects without mutating.
 *
 * @param items - Pre-sorted array
 * @param getValue - Function to extract comparison value for tie detection
 * @returns New array with position property added to each item
 */
export function assignPositionsMap<T>(
  items: T[],
  getValue: (item: T) => number | string
): (T & { position: number })[] {
  if (items.length === 0) return [];

  let currentPosition = 1;
  let previousValue = getValue(items[0]);

  return items.map((item, index) => {
    const currentValue = getValue(item);
    if (index > 0 && currentValue !== previousValue) {
      currentPosition = index + 1;
    }
    previousValue = currentValue;
    return { ...item, position: currentPosition };
  });
}
