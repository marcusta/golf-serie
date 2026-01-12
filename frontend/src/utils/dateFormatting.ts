/**
 * Date formatting utilities with defensive handling for invalid dates
 */

/**
 * Safely parse a date string and return a Date object or null if invalid
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Format a date string to a localized date string
 * Returns "Date TBD" if the date is invalid or missing
 */
export function formatDate(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDate(dateString);
  if (!date) return "Date TBD";

  return date.toLocaleDateString("en-US", options);
}

/**
 * Format a date string to a full localized date string (long format)
 * Returns "Date TBD" if the date is invalid or missing
 */
export function formatDateLong(dateString: string | null | undefined): string {
  return formatDate(dateString, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date string to a short localized date string
 * Returns "Date TBD" if the date is invalid or missing
 */
export function formatDateShort(dateString: string | null | undefined): string {
  return formatDate(dateString, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a time from a date string
 * Returns "Time TBD" if the date is invalid or missing
 */
export function formatTime(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDate(dateString);
  if (!date) return "Time TBD";

  return date.toLocaleTimeString("en-US", options || {
    hour: "2-digit",
    minute: "2-digit",
  });
}
