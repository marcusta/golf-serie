import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export type TourEnrollmentStatus = "pending" | "requested" | "active";
export type TourEnrollmentMode = "closed" | "request";
export type TourVisibility = "private" | "public";

export interface Tour {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  enrollment_mode: TourEnrollmentMode;
  visibility: TourVisibility;
  banner_image_url: string | null;
  landing_document_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TourDocument {
  id: number;
  tour_id: number;
  title: string;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface TourEnrollment {
  id: number;
  tour_id: number;
  player_id?: number;
  email: string;
  status: TourEnrollmentStatus;
  player_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TourAdmin {
  id: number;
  tour_id: number;
  user_id: number;
  email: string;
  role: string;
  created_at: string;
}

export interface CreateTourData {
  name: string;
  description?: string;
  enrollment_mode?: TourEnrollmentMode;
  visibility?: TourVisibility;
  banner_image_url?: string;
}

export interface UpdateTourData {
  name?: string;
  description?: string;
  enrollment_mode?: TourEnrollmentMode;
  visibility?: TourVisibility;
  banner_image_url?: string | null;
  landing_document_id?: number | null;
}

export interface CreateTourDocumentData {
  title: string;
  content: string;
  type?: string;
}

export interface UpdateTourDocumentData {
  title?: string;
  content?: string;
  type?: string;
}

export function useTours() {
  return useQuery<Tour[]>({
    queryKey: ["tours"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tours`);
      if (!response.ok) {
        throw new Error("Failed to fetch tours");
      }
      return response.json();
    },
  });
}

export function useTour(id: number) {
  return useQuery<Tour>({
    queryKey: ["tour", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tours/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tour");
      }
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTourData) => {
      const response = await fetch(`${API_BASE_URL}/tours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create tour");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useUpdateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateTourData;
    }) => {
      const response = await fetch(`${API_BASE_URL}/tours/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update tour");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
      queryClient.invalidateQueries({ queryKey: ["tour", variables.id] });
    },
  });
}

export function useDeleteTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/tours/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete tour");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

interface TourCompetition {
  id: number;
  name: string;
  date: string;
  course_id?: number;
  course_name?: string;
}

export function useTourCompetitions(id: number) {
  return useQuery<TourCompetition[]>({
    queryKey: ["tour-competitions", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tours/${id}/competitions`);
      if (!response.ok) {
        throw new Error("Failed to fetch tour competitions");
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Enrollment Hooks
export function useTourEnrollments(tourId: number, status?: TourEnrollmentStatus) {
  return useQuery<TourEnrollment[]>({
    queryKey: ["tour-enrollments", tourId, status],
    queryFn: async () => {
      const url = status
        ? `${API_BASE_URL}/tours/${tourId}/enrollments?status=${status}`
        : `${API_BASE_URL}/tours/${tourId}/enrollments`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch enrollments");
      }
      return response.json();
    },
    enabled: !!tourId,
  });
}

export function useAddEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tourId, email }: { tourId: number; email: string }) => {
      const response = await fetch(`${API_BASE_URL}/tours/${tourId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add enrollment");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour-enrollments", variables.tourId] });
    },
  });
}

export function useApproveEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tourId, enrollmentId }: { tourId: number; enrollmentId: number }) => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/enrollments/${enrollmentId}/approve`,
        {
          method: "PUT",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve enrollment");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour-enrollments", variables.tourId] });
    },
  });
}

export function useRemoveEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tourId, enrollmentId }: { tourId: number; enrollmentId: number }) => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/enrollments/${enrollmentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove enrollment");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour-enrollments", variables.tourId] });
    },
  });
}

// Player hook to request joining a tour
export function useRequestEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tourId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/enrollments/request`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to request enrollment");
      }
      return response.json();
    },
    onSuccess: (_, tourId) => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
      queryClient.invalidateQueries({ queryKey: ["tour", tourId] });
      queryClient.invalidateQueries({ queryKey: ["player-enrollments"] });
    },
  });
}

// Hook to get the current player's enrollments
export function usePlayerEnrollments() {
  return useQuery<TourEnrollment[]>({
    queryKey: ["player-enrollments"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/player/enrollments`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          return []; // Not authenticated - no enrollments
        }
        throw new Error("Failed to fetch player enrollments");
      }
      return response.json();
    },
  });
}

export function useRegistrationLink(tourId: number, email: string) {
  return useQuery<{ registration_path: string }>({
    queryKey: ["registration-link", tourId, email],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/registration-link?email=${encodeURIComponent(email)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to get registration link");
      }
      return response.json();
    },
    enabled: !!tourId && !!email,
  });
}

// Admin Hooks
export function useTourAdmins(tourId: number) {
  return useQuery<TourAdmin[]>({
    queryKey: ["tour-admins", tourId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tours/${tourId}/admins`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tour admins");
      }
      return response.json();
    },
    enabled: !!tourId,
  });
}

export function useAddTourAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tourId, userId }: { tourId: number; userId: number }) => {
      const response = await fetch(`${API_BASE_URL}/tours/${tourId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add tour admin");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour-admins", variables.tourId] });
    },
  });
}

export function useRemoveTourAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tourId, userId }: { tourId: number; userId: number }) => {
      const response = await fetch(`${API_BASE_URL}/tours/${tourId}/admins/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove tour admin");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour-admins", variables.tourId] });
    },
  });
}

// Users hook for admin selection
export function useUsers() {
  return useQuery<{ id: number; email: string; role: string }[]>({
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

// Tour Document Hooks
export function useTourDocuments(tourId: number) {
  return useQuery<TourDocument[]>({
    queryKey: ["tour-documents", tourId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tours/${tourId}/documents`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tour documents");
      }
      return response.json();
    },
    enabled: !!tourId,
  });
}

export function useTourDocument(tourId: number, documentId: number) {
  return useQuery<TourDocument>({
    queryKey: ["tour-document", tourId, documentId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/documents/${documentId}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch tour document");
      }
      return response.json();
    },
    enabled: !!tourId && !!documentId,
  });
}

export function useCreateTourDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tourId,
      data,
    }: {
      tourId: number;
      data: CreateTourDocumentData;
    }) => {
      const response = await fetch(`${API_BASE_URL}/tours/${tourId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create document");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour-documents", variables.tourId] });
    },
  });
}

export function useUpdateTourDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tourId,
      documentId,
      data,
    }: {
      tourId: number;
      documentId: number;
      data: UpdateTourDocumentData;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/documents/${documentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update document");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour-documents", variables.tourId] });
      queryClient.invalidateQueries({
        queryKey: ["tour-document", variables.tourId, variables.documentId],
      });
    },
  });
}

export function useDeleteTourDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tourId,
      documentId,
    }: {
      tourId: number;
      documentId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/documents/${documentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete document");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tour-documents", variables.tourId] });
      queryClient.invalidateQueries({ queryKey: ["tour", variables.tourId] });
    },
  });
}
