import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export type UserRole = "SUPER_ADMIN" | "ORGANIZER" | "ADMIN" | "PLAYER";

export interface UserPlayerProfile {
  id: number;
  name: string;
  handicap: number | null;
  gender?: "male" | "female";
  display_name?: string;
  home_club_id?: number | null;
  home_club_name?: string;
}

export interface AdminUpdatePlayerProfileDto {
  handicap?: number | null;
  gender?: "male" | "female";
  home_club_id?: number | null;
}

export interface User {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/users`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: number;
      role: UserRole;
    }) => {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAdminGetUserPlayerProfile(userId: number | null) {
  return useQuery<UserPlayerProfile | null>({
    queryKey: ["admin", "user-player-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${userId}/player-profile`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch user player profile");
      }
      const data = await response.json();
      return data.player || null;
    },
    enabled: !!userId,
  });
}

export function useAdminUpdatePlayerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: number;
      data: AdminUpdatePlayerProfileDto;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${userId}/player-profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update player profile");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "user-player-profile", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
  });
}
