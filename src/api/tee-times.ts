import { TeeTimeService } from "../services/tee-time-service";
import type { CreateTeeTimeDto, UpdateTeeTimeDto } from "../types";

export function createTeeTimesApi(teeTimeService: TeeTimeService) {
  return {
    async createForCompetition(
      req: Request,
      competitionId: number
    ): Promise<Response> {
      try {
        const data = (await req.json()) as CreateTeeTimeDto;
        // Override competition_id with the one from the URL
        const teeTime = await teeTimeService.create({
          ...data,
          competition_id: competitionId,
        });
        return new Response(JSON.stringify(teeTime), {
          status: 201,
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

    async findAllForCompetition(competitionId: number): Promise<Response> {
      try {
        const teeTimes =
          await teeTimeService.findAllForCompetitionWithParticipants(
            competitionId
          );
        return new Response(JSON.stringify(teeTimes), {
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
        const teeTime = await teeTimeService.findById(id);
        if (!teeTime) {
          return new Response(JSON.stringify({ error: "Tee time not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(teeTime), {
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

    async findByIdWithParticipants(
      req: Request,
      id: number
    ): Promise<Response> {
      try {
        const teeTime = await teeTimeService.findByIdWithParticipants(id);
        if (!teeTime) {
          return new Response(JSON.stringify({ error: "Tee time not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(teeTime), {
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
        const data = (await req.json()) as UpdateTeeTimeDto;
        const teeTime = await teeTimeService.update(id, data);
        return new Response(JSON.stringify(teeTime), {
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

    async delete(id: number): Promise<Response> {
      try {
        await teeTimeService.delete(id);
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
  };
}
