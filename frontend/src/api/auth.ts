import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface User {
  id: number;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "PLAYER";
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

async function fetchWithCredentials(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include", // Important for cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await fetchWithCredentials(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  const data = await response.json();
  return data.user;
}

export async function register(
  credentials: RegisterCredentials
): Promise<User> {
  const response = await fetchWithCredentials(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  const data = await response.json();
  return data.user;
}

export async function logout(): Promise<void> {
  const response = await fetchWithCredentials(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}

export async function getMe(): Promise<User | null> {
  const response = await fetchWithCredentials(`${API_BASE_URL}/auth/me`);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user || null;
}

// React Query hooks
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ["currentUser"],
    queryFn: getMe,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: register,
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["currentUser"], null);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}
