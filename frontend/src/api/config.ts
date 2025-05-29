// API configuration that works in both development and production
// In development: uses proxy to localhost:3000
// In production: uses relative paths that work with reverse proxy

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
