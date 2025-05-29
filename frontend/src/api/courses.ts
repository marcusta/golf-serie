import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Course {
  id: number;
  name: string;
  pars: {
    holes: number[];
    out: number;
    in: number;
    total: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateCourseData {
  name: string;
}

export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCourse(id: number) {
  return useQuery<Course>({
    queryKey: ["course", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCourseData) => {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateCourseHoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, holes }: { id: number; holes: number[] }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}/holes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(holes),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
