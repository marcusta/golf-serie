// API configuration that works in development, production, and E2E testing

export function getBasePath(): string {
  // In development, no base path needed
  if (import.meta.env.DEV) {
    return "";
  }

  // In production, detect if we're under /golf-serie
  const currentPath = window.location.pathname;
  if (currentPath.startsWith("/golf-serie")) {
    return "/golf-serie";
  }

  return "";
}

function getApiBaseUrl(): string {
  // E2E Test Override: Check localStorage for a specific port set by Playwright
  const e2eApiPort = window.localStorage.getItem("E2E_API_PORT");
  if (e2eApiPort) {
    return `http://localhost:${e2eApiPort}/api`;
  }

  // In development, Vite's proxy handles /api requests
  if (import.meta.env.DEV) {
    return "/api";
  }

  // In production, construct API URL relative to the current path
  // This will work whether deployed at root or under /golf-serie
  const basePath = getBasePath();
  return `${basePath}/api`;
}

export const API_BASE_URL = getApiBaseUrl();
