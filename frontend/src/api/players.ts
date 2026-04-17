import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Player {
  id: number;
  name: string;
  handicap: number;
  user_id?: number;
}

/**
 * Fetch all players (for game setup player search)
 */
export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/players`);
      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }
      return response.json();
    },
  });
}

/**
 * Search players by name (debounced, for typeahead)
 */
export function usePlayerSearch(query: string) {
  return useQuery<Player[]>({
    queryKey: ["players-search", query],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/players/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error("Failed to search players");
      }
      return response.json();
    },
    enabled: query.length >= 2, // Only search with at least 2 characters
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}
