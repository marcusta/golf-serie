import { getBasePath } from "../api/config";

/**
 * Generates absolute URL for competition startlist
 */
export function getCompetitionStartlistUrl(competitionId: number): string {
  const basePath = getBasePath();
  const origin = window.location.origin;
  return `${origin}${basePath}/player/competitions/${competitionId}#startlist`;
}

/**
 * Generates absolute URL for specific tee time
 */
export function getTeeTimeUrl(competitionId: number, teeTimeId: number): string {
  const basePath = getBasePath();
  const origin = window.location.origin;
  return `${origin}${basePath}/player/competitions/${competitionId}/tee-times/${teeTimeId}`;
}
