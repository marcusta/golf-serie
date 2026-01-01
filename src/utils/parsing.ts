/**
 * Safe JSON parsing utilities with descriptive error messages.
 * Use these instead of raw JSON.parse() to get better error handling.
 */

/**
 * Safely parse JSON with a descriptive error message.
 * @param json - The JSON string to parse
 * @param fieldName - Name of the field (for error messages)
 * @returns The parsed value
 * @throws Error with descriptive message if parsing fails
 */
export function safeParseJson<T>(json: string, fieldName: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    const message = e instanceof Error ? e.message : "parse error";
    throw new Error(`Invalid ${fieldName} format: ${message}`);
  }
}

/**
 * Parse a JSON string that should contain a score array.
 * @param json - The JSON string to parse
 * @returns Array of score numbers
 * @throws Error if not a valid array
 */
export function parseScoreArray(json: string): number[] {
  if (!json) {
    return [];
  }

  const parsed = safeParseJson<unknown>(json, "score");

  if (!Array.isArray(parsed)) {
    throw new Error("Score must be an array");
  }

  return parsed as number[];
}

/**
 * Parse a JSON string that should contain a pars array.
 * @param json - The JSON string to parse
 * @returns Array of par numbers
 * @throws Error if not a valid array
 */
export function parseParsArray(json: string): number[] {
  if (!json) {
    return [];
  }

  const parsed = safeParseJson<unknown>(json, "pars");

  if (!Array.isArray(parsed)) {
    throw new Error("Pars must be an array");
  }

  return parsed as number[];
}

/**
 * Parse a JSON string that should contain a stroke index array.
 * @param json - The JSON string to parse
 * @returns Array of stroke index numbers (1-18)
 * @throws Error if not a valid array
 */
export function parseStrokeIndex(json: string): number[] {
  if (!json) {
    return [];
  }

  const parsed = safeParseJson<unknown>(json, "stroke index");

  if (!Array.isArray(parsed)) {
    throw new Error("Stroke index must be an array");
  }

  return parsed as number[];
}

/**
 * Safely parse JSON that might already be parsed (handles both string and object input).
 * Useful when data might come from DB as string or from memory as object.
 * @param value - The value to parse (string or already-parsed object)
 * @param fieldName - Name of the field (for error messages)
 * @returns The parsed value
 */
export function safeParseJsonOrPassthrough<T>(
  value: string | T,
  fieldName: string
): T {
  if (typeof value === "string") {
    return safeParseJson<T>(value, fieldName);
  }
  return value;
}

/**
 * Safely parse JSON with a default value on failure.
 * Use this when you want to return a default value instead of throwing.
 * @param json - The JSON string to parse (can be null)
 * @param defaultValue - Value to return if parsing fails or json is null/empty
 * @returns The parsed value or the default value
 */
export function safeParseJsonWithDefault<T>(
  json: string | null | undefined,
  defaultValue: T
): T {
  if (!json) {
    return defaultValue;
  }
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}
