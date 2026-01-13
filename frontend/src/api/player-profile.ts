import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

// Types
export type HandicapSource = "manual" | "calculated" | "import";
export type ProfileVisibility = "public" | "friends" | "private";

export interface HandicapHistoryEntry {
  id: number;
  player_id: number;
  handicap_index: number;
  effective_date: string;
  source: HandicapSource;
  notes?: string;
  created_at: string;
}

export interface PlayerProfileFull {
  // Player base
  id: number;
  name: string;
  handicap: number;
  user_id?: number;
  gender?: "male" | "female";

  // Profile extended
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  home_course_id?: number;
  home_course_name?: string;
  visibility: ProfileVisibility;

  // Stats
  competitions_played: number;
  total_rounds: number;
  best_score?: number;
  average_score?: number;

  // Handicap history
  handicap_history: HandicapHistoryEntry[];
}

export interface PlayerRoundHistory {
  participant_id: number;
  competition_id: number;
  competition_name: string;
  competition_date: string;
  course_id: number;
  course_name: string;
  gross_score: number;
  net_score?: number;
  relative_to_par: number;
  holes_played: number;
}

export interface UpdateProfileDto {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  home_course_id?: number | null;
  visibility?: ProfileVisibility;
  gender?: "male" | "female";
}

export interface RecordHandicapDto {
  handicap_index: number;
  effective_date?: string;
  notes?: string;
}

export interface HandicapWithHistory {
  current: number;
  history: HandicapHistoryEntry[];
}

// Helper for authenticated requests
async function fetchWithCredentials(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// API functions
async function getMyProfile(): Promise<PlayerProfileFull> {
  const response = await fetchWithCredentials(
    `${API_BASE_URL}/players/me/profile`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch profile");
  }

  return response.json();
}

async function updateMyProfile(
  data: UpdateProfileDto
): Promise<{ player_id: number }> {
  const response = await fetchWithCredentials(
    `${API_BASE_URL}/players/me/profile`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update profile");
  }

  return response.json();
}

async function getPlayerProfile(playerId: number): Promise<PlayerProfileFull> {
  const response = await fetchWithCredentials(
    `${API_BASE_URL}/players/${playerId}/full`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch player profile");
  }

  return response.json();
}

async function getMyHandicap(): Promise<HandicapWithHistory> {
  const response = await fetchWithCredentials(
    `${API_BASE_URL}/players/me/handicap`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch handicap");
  }

  return response.json();
}

async function recordHandicap(
  data: RecordHandicapDto
): Promise<HandicapHistoryEntry> {
  const response = await fetchWithCredentials(
    `${API_BASE_URL}/players/me/handicap`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to record handicap");
  }

  return response.json();
}

async function getMyRounds(
  limit?: number,
  offset?: number
): Promise<PlayerRoundHistory[]> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit.toString());
  if (offset) params.set("offset", offset.toString());

  const url = `${API_BASE_URL}/players/me/rounds${params.toString() ? `?${params}` : ""}`;
  const response = await fetchWithCredentials(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch rounds");
  }

  return response.json();
}

// React Query hooks

/**
 * Get current user's full profile
 */
export function useMyProfile() {
  return useQuery<PlayerProfileFull>({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
    retry: false,
  });
}

/**
 * Update current user's profile
 */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

/**
 * Get another player's public profile
 */
export function usePlayerProfile(playerId: number) {
  return useQuery<PlayerProfileFull>({
    queryKey: ["player-profile", playerId],
    queryFn: () => getPlayerProfile(playerId),
    enabled: playerId > 0,
  });
}

/**
 * Get current user's handicap with history
 */
export function useMyHandicap() {
  return useQuery<HandicapWithHistory>({
    queryKey: ["my-handicap"],
    queryFn: getMyHandicap,
    retry: false,
  });
}

/**
 * Record a new handicap entry
 */
export function useRecordHandicap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordHandicap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-handicap"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

/**
 * Get current user's round history
 */
export function useMyRounds(limit?: number, offset?: number) {
  return useQuery<PlayerRoundHistory[]>({
    queryKey: ["my-rounds", { limit, offset }],
    queryFn: () => getMyRounds(limit, offset),
    retry: false,
  });
}

/**
 * Get any player's round history by ID
 */
async function getPlayerRoundHistory(
  playerId: number,
  limit?: number,
  offset?: number
): Promise<PlayerRoundHistory[]> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit.toString());
  if (offset) params.set("offset", offset.toString());

  const url = `${API_BASE_URL}/players/${playerId}/rounds${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch player rounds");
  }

  return response.json();
}

export function usePlayerRoundHistory(playerId: number, limit?: number, offset?: number) {
  return useQuery<PlayerRoundHistory[]>({
    queryKey: ["player-rounds", playerId, { limit, offset }],
    queryFn: () => getPlayerRoundHistory(playerId, limit, offset),
    enabled: playerId > 0,
  });
}

// Tours and Series types
export type TourEnrollmentStatus = "pending" | "requested" | "active";

export interface PlayerTourInfo {
  tour_id: number;
  tour_name: string;
  enrollment_status: TourEnrollmentStatus;
  category_name?: string;
  position?: number;
  total_points?: number;
  competitions_played: number;
}

export interface PlayerSeriesInfo {
  series_id: number;
  series_name: string;
  competitions_played: number;
  last_played_date: string;
}

export interface PlayerToursAndSeries {
  tours: PlayerTourInfo[];
  series: PlayerSeriesInfo[];
}

// isFriend types and hook
export interface IsFriendResponse {
  isFriend: boolean;
  commonTours: Array<{ id: number; name: string }>;
}

async function checkIsFriend(targetPlayerId: number): Promise<IsFriendResponse> {
  const response = await fetchWithCredentials(
    `${API_BASE_URL}/players/is-friend/${targetPlayerId}`
  );

  if (!response.ok) {
    // If not authenticated or error, return false
    return { isFriend: false, commonTours: [] };
  }

  return response.json();
}

/**
 * Check if current user is "friends" with target player
 * Friends = both enrolled in at least one common tour
 */
export function useIsFriend(targetPlayerId: number) {
  return useQuery<IsFriendResponse>({
    queryKey: ["is-friend", targetPlayerId],
    queryFn: () => checkIsFriend(targetPlayerId),
    enabled: targetPlayerId > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Tours and Series API

async function getMyToursAndSeries(): Promise<PlayerToursAndSeries> {
  const response = await fetchWithCredentials(
    `${API_BASE_URL}/players/me/tours-and-series`
  );

  if (!response.ok) {
    // If not authenticated, return empty arrays
    if (response.status === 401) {
      return { tours: [], series: [] };
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch tours and series");
  }

  return response.json();
}

/**
 * Get current user's tours and series participation
 */
export function useMyToursAndSeries() {
  return useQuery<PlayerToursAndSeries>({
    queryKey: ["my-tours-and-series"],
    queryFn: getMyToursAndSeries,
    retry: false,
  });
}

/**
 * Get any player's tours and series participation by ID
 */
async function getPlayerToursAndSeries(playerId: number): Promise<PlayerToursAndSeries> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/tours-and-series`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch player tours and series");
  }

  return response.json();
}

export function usePlayerToursAndSeries(playerId: number) {
  return useQuery<PlayerToursAndSeries>({
    queryKey: ["player-tours-and-series", playerId],
    queryFn: () => getPlayerToursAndSeries(playerId),
    enabled: playerId > 0,
  });
}
