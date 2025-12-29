import { z } from "zod";
import { CompetitionCategoryTeeService } from "../services/competition-category-tee.service";

const setCategoryTeesSchema = z.object({
  mappings: z.array(
    z.object({
      categoryId: z.number().positive(),
      teeId: z.number().positive(),
    })
  ),
});

export function createCompetitionCategoryTeesApi(
  categoryTeeService: CompetitionCategoryTeeService
) {
  return {
    async getByCompetition(competitionId: number): Promise<Response> {
      try {
        const categoryTees = categoryTeeService.getByCompetition(competitionId);
        return new Response(JSON.stringify({ categoryTees }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
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

    async setForCompetition(
      req: Request,
      competitionId: number
    ): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = setCategoryTeesSchema.parse(rawData);
        const categoryTees = categoryTeeService.setForCompetition(
          competitionId,
          data.mappings
        );
        return new Response(JSON.stringify({ categoryTees }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return new Response(
            JSON.stringify({ error: "Invalid request format" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        if (error instanceof Error) {
          const status =
            error.message === "Competition not found" ||
            error.message.includes("does not belong")
              ? 400
              : 500;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
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
