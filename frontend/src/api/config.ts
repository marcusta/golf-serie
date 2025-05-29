// API configuration that works in both development and production
// In development: uses proxy to localhost:3000
// In production: uses relative paths that work with reverse proxy

function getApiBaseUrl(): string {
  // In development, Vite's proxy handles /api requests
  if (import.meta.env.DEV) {
    return "/api";
  }

  // In production, construct API URL relative to the current path
  // This will work whether deployed at root or under /golf-serie
  const currentPath = window.location.pathname;

  // If we're under /golf-serie, use /golf-serie/api
  // Otherwise, use /api (for root deployments)
  if (currentPath.startsWith("/golf-serie")) {
    return "/golf-serie/api";
  }

  return "/api";
}

export const API_BASE_URL = getApiBaseUrl();
