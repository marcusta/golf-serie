import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Club {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useClubs() {
  return useQuery<Club[]>({
    queryKey: ["clubs"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/clubs`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}
