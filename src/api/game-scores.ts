import { z } from "zod";
import { GameScoreService } from "../services/game-score.service";

// ============================================================================
// Validation Schemas
// ============================================================================

const updateScoreSchema = z.object({
  shots: z.number(),
});

// ============================================================================
// API Factory
// ============================================================================

export function createGameScoresApi(gameScoreService: GameScoreService) {
  return {
    /**
     * Update a single hole score
     * PUT /api/game-scores/:memberId/hole/:hole
     */
    async updateScore(
      req: Request,
      memberId: number,
      hole: number
    ): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = updateScoreSchema.parse(rawData);
        const score = gameScoreService.updateScore(memberId, hole, data.shots);
        return new Response(JSON.stringify(score), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return new Response(
            JSON.stringify({ error: "Validation error", details: error.errors }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },

    /**
     * Lock a scorecard (finalize)
     * POST /api/game-scores/:memberId/lock
     */
    async lockScore(memberId: number): Promise<Response> {
      try {
        const score = gameScoreService.lockScore(memberId);
        return new Response(JSON.stringify(score), {
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
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },

    /**
     * Unlock a scorecard (reopen for editing)
     * POST /api/game-scores/:memberId/unlock
     */
    async unlockScore(memberId: number, userId: number): Promise<Response> {
      try {
        const score = gameScoreService.unlockScore(memberId);
        return new Response(JSON.stringify(score), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  };
}
