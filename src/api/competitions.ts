import { z } from "zod";
import { CompetitionService } from "../services/competition-service";
import type { CreateCompetitionDto, UpdateCompetitionDto } from "../types";

const createCompetitionSchema = z.object({
  name: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  course_id: z.number().positive(),
  series_id: z.number().positive().optional(),
  tour_id: z.number().positive().optional(),
  point_template_id: z.number().positive().optional(),
  manual_entry_format: z.enum(["out_in_total", "total_only"]).optional(),
  points_multiplier: z.number().positive().optional(),
  venue_type: z.enum(["outdoor", "indoor"]).optional(),
  start_mode: z.enum(["scheduled", "open"]).optional(),
  open_start: z.string().optional(),
  open_end: z.string().optional(),
});

const updateCompetitionSchema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  course_id: z.number().positive().optional(),
  series_id: z.number().positive().nullable().optional(),
  tour_id: z.number().positive().nullable().optional(),
  point_template_id: z.number().positive().nullable().optional(),
  manual_entry_format: z.enum(["out_in_total", "total_only"]).optional(),
  points_multiplier: z.number().positive().optional(),
  venue_type: z.enum(["outdoor", "indoor"]).optional(),
  start_mode: z.enum(["scheduled", "open"]).optional(),
  open_start: z.string().nullable().optional(),
  open_end: z.string().nullable().optional(),
});

export function createCompetitionsApi(competitionService: CompetitionService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = createCompetitionSchema.parse(rawData) as CreateCompetitionDto;
        const competition = await competitionService.create(data);
        return new Response(JSON.stringify(competition), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Translate Zod errors to user-friendly messages
          const firstIssue = error.errors[0];
          let message = "Validation error";
          if (firstIssue.path[0] === "name" && firstIssue.code === "too_small") {
            message = "Competition name is required";
          } else if (firstIssue.path[0] === "date" && firstIssue.code === "invalid_string") {
            message = "Date must be in YYYY-MM-DD format (e.g., 2024-03-21)";
          }
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAll(): Promise<Response> {
      try {
        const competitions = await competitionService.findAll();
        return new Response(JSON.stringify(competitions), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const competition = await competitionService.findById(id);
        if (!competition) {
          return new Response(
            JSON.stringify({ error: "Competition not found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response(JSON.stringify(competition), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = updateCompetitionSchema.parse(rawData) as UpdateCompetitionDto;
        const competition = await competitionService.update(id, data);
        return new Response(JSON.stringify(competition), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Translate Zod errors to user-friendly messages
          const firstIssue = error.errors[0];
          let message = "Validation error";
          if (firstIssue.path[0] === "date" && firstIssue.code === "invalid_string") {
            message = "Date must be in YYYY-MM-DD format (e.g., 2024-03-21)";
          }
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async delete(id: number): Promise<Response> {
      try {
        await competitionService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getLeaderboard(competitionId: number): Promise<Response> {
      try {
        const leaderboard = await competitionService.getLeaderboard(
          competitionId
        );
        return new Response(JSON.stringify(leaderboard), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Competition not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status: status,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getLeaderboardWithDetails(competitionId: number): Promise<Response> {
      try {
        const response = await competitionService.getLeaderboardWithDetails(
          competitionId
        );
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Competition not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status: status,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getTeamLeaderboard(competitionId: number): Promise<Response> {
      try {
        const teamLeaderboard = await competitionService.getTeamLeaderboard(
          competitionId
        );
        return new Response(JSON.stringify(teamLeaderboard), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message === "Competition not found" ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status: status,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}
