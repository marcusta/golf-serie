import { ParticipantService } from "../services/participant-service";
import type {
  CreateParticipantDto,
  UpdateParticipantDto,
  AdminDQParticipantDto,
  AdminUpdateScoreDto,
} from "../types";

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

    async lock(req: Request, id: number): Promise<Response> {
      try {
        const participant = await participantService.lock(id);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
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

    async unlock(req: Request, id: number): Promise<Response> {
      try {
        const participant = await participantService.unlock(id);
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
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

    async updateManualScore(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as {
          out?: number;
          in?: number;
          total: number;
        };

        if (data.total === undefined) {
          return new Response(
            JSON.stringify({ error: "Total score is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const participant = await participantService.updateManualScore(
          id,
          data
        );
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
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

    // Admin action: Set DQ status
    async adminSetDQ(
      req: Request,
      id: number,
      adminUserId: number
    ): Promise<Response> {
      try {
        const data = (await req.json()) as AdminDQParticipantDto;

        if (typeof data.is_dq !== "boolean") {
          return new Response(
            JSON.stringify({ error: "is_dq must be a boolean" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const participant = await participantService.adminSetDQ(
          id,
          data.is_dq,
          data.admin_notes,
          adminUserId
        );
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
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

    // Admin action: Update full score array
    async adminUpdateScore(
      req: Request,
      id: number,
      adminUserId: number
    ): Promise<Response> {
      try {
        const data = (await req.json()) as AdminUpdateScoreDto;

        if (!Array.isArray(data.score)) {
          return new Response(
            JSON.stringify({ error: "score must be an array" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const participant = await participantService.adminUpdateScore(
          id,
          data.score,
          data.admin_notes,
          adminUserId
        );
        return new Response(JSON.stringify(participant), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
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
