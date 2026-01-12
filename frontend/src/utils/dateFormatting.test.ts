import { describe, it, expect } from "vitest";
import {
  parseDate,
  formatDate,
  formatDateLong,
  formatDateShort,
  formatTime,
} from "./dateFormatting";

describe("dateFormatting", () => {
  describe("parseDate", () => {
    it("should parse valid ISO date string", () => {
      const result = parseDate("2025-06-13");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(5); // 0-indexed
      expect(result?.getDate()).toBe(13);
    });

    it("should return null for invalid date string", () => {
      expect(parseDate("20250613")).toBeNull(); // Missing hyphens
      expect(parseDate("invalid-date")).toBeNull();
      expect(parseDate("2025-13-01")).toBeNull(); // Invalid month
    });

    it("should return null for null or undefined", () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parseDate("")).toBeNull();
    });
  });

  describe("formatDate", () => {
    it("should format valid date with default options", () => {
      const result = formatDate("2025-06-13");
      expect(result).toMatch(/6\/13\/2025/);
    });

    it("should format valid date with custom options", () => {
      const result = formatDate("2025-06-13", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      expect(result).toContain("June");
      expect(result).toContain("2025");
      expect(result).toContain("13");
    });

    it('should return "Date TBD" for invalid date', () => {
      expect(formatDate("20250613")).toBe("Date TBD");
      expect(formatDate("invalid")).toBe("Date TBD");
      expect(formatDate(null)).toBe("Date TBD");
      expect(formatDate(undefined)).toBe("Date TBD");
    });
  });

  describe("formatDateLong", () => {
    it("should format date in long format", () => {
      const result = formatDateLong("2025-06-13");
      expect(result).toContain("Friday");
      expect(result).toContain("June");
      expect(result).toContain("13");
      expect(result).toContain("2025");
    });

    it('should return "Date TBD" for invalid date', () => {
      expect(formatDateLong("invalid")).toBe("Date TBD");
    });
  });

  describe("formatDateShort", () => {
    it("should format date in short format", () => {
      const result = formatDateShort("2025-06-13");
      expect(result).toContain("Jun");
      expect(result).toContain("13");
      expect(result).toContain("2025");
    });

    it('should return "Date TBD" for invalid date', () => {
      expect(formatDateShort("invalid")).toBe("Date TBD");
    });
  });

  describe("formatTime", () => {
    it("should format time from date string", () => {
      const result = formatTime("2025-06-13T14:30:00");
      expect(result).toMatch(/2:30 PM|14:30/);
    });

    it('should return "Time TBD" for invalid date', () => {
      expect(formatTime("invalid")).toBe("Time TBD");
      expect(formatTime(null)).toBe("Time TBD");
    });

    it("should format time with custom options", () => {
      const result = formatTime("2025-06-13T14:30:00", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      expect(result).toMatch(/2:30 PM/);
    });
  });
});
