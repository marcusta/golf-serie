import { ParticipantService } from "../services/participant-service";
import type { CreateParticipantDto, UpdateParticipantDto } from "../types";

export function createParticipantsApi(participantService: ParticipantService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateParticipantDto;
        const participant = await participantService.create(data);
        return new Response(JSON.stringify(participant), {
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

    async findAll(): Promise<Response> {
      try {
        const participants = await participantService.findAll();
        return new Response(JSON.stringify(participants), {
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
        const participant = await participantService.findById(id);
        if (!participant) {
          return new Response(
            JSON.stringify({ error: "Participant not found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return new Response(JSON.stringify(participant), {
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
        const data = (await req.json()) as UpdateParticipantDto;
        const participant = await participantService.update(id, data);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
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

    async delete(id: number): Promise<Response> {
      try {
        console.log("delete! /api/participants/:id", id);
        await participantService.delete(id);
        console.log("delete complete! /api/participants/:id", id);
        return new Response(null, { status: 204 });
      } catch (error) {
        console.log("delete error! /api/participants/:id", id, error);
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

    async findAllForCompetition(competitionId: number): Promise<Response> {
      try {
        const participants = await participantService.findAllForCompetition(
          competitionId
        );
        return new Response(JSON.stringify(participants), {
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

    async updateScore(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as { hole: number; shots: number };

        // Allow -1 (gave up) and 0 (unreported/cleared score) as valid values
        if (data.shots === undefined || data.shots === null) {
          return new Response(JSON.stringify({ error: "Shots are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!data.hole) {
          return new Response(JSON.stringify({ error: "Hole is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const participant = await participantService.updateScore(
          id,
          data.hole,
          data.shots
        );
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          // Return 404 for participant not found, 400 for validation errors
          const status = error.message === "Participant not found" ? 404 : 400;
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
