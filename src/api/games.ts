import { z } from "zod";
import { GameService } from "../services/game.service";
import { GameGroupService } from "../services/game-group.service";
import { GameScoreService } from "../services/game-score.service";
import type {
  CreateGameDto,
  UpdateGameDto,
  AddGamePlayerDto,
  CreateGameGroupDto,
} from "../types";

// ============================================================================
// Validation Schemas
// ============================================================================

const createGameSchema = z.object({
  course_id: z.number().positive(),
  name: z.string().optional(),
  game_type: z.string().optional(),
  scoring_mode: z.enum(["gross", "net", "both"]).optional(),
  scheduled_date: z.string().optional(),
  custom_settings: z.record(z.any()).optional(),
});

const updateGameSchema = z.object({
  course_id: z.number().positive().optional(),
  name: z.string().optional(),
  game_type: z.string().optional(),
  scoring_mode: z.enum(["gross", "net", "both"]).optional(),
  scheduled_date: z.string().optional(),
  custom_settings: z.record(z.any()).optional(),
});

const addGamePlayerSchema = z.object({
  player_id: z.number().positive().optional(),
  guest_name: z.string().min(1).optional(),
  guest_handicap: z.number().optional(),
  guest_gender: z.enum(["male", "female"]).optional(),
  tee_id: z.number().positive().optional(),
});

const createGameGroupSchema = z.object({
  name: z.string().min(1).optional(),
  start_hole: z.number().positive().optional(),
});

const updateGameStatusSchema = z.object({
  status: z.enum(["setup", "ready", "active", "completed"]),
});

const assignTeeSchema = z.object({
  tee_id: z.number().positive(),
});

const setGroupMembersSchema = z.object({
  game_player_ids: z.array(z.number().positive()),
});

// ============================================================================
// API Factory
// ============================================================================

export function createGamesApi(
  gameService: GameService,
  gameGroupService: GameGroupService,
  gameScoreService: GameScoreService
) {
  return {
    // ========================================================================
    // Game CRUD
    // ========================================================================

    async create(req: Request, userId: number): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = createGameSchema.parse(rawData) as CreateGameDto;
        const game = gameService.createGame(userId, data);
        return new Response(JSON.stringify(game), {
          status: 201,
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

    async update(
      req: Request,
      gameId: number,
      userId: number
    ): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = updateGameSchema.parse(rawData) as UpdateGameDto;
        const game = gameService.updateGame(gameId, data, userId);
        return new Response(JSON.stringify(game), {
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

    async findById(gameId: number): Promise<Response> {
      try {
        const game = gameService.findByIdWithDetails(gameId);
        if (!game) {
          return new Response(JSON.stringify({ error: "Game not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(game), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },

    async findMyGames(userId: number): Promise<Response> {
      try {
        const games = gameService.findMyGames(userId);
        return new Response(JSON.stringify(games), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },

    async updateStatus(
      req: Request,
      gameId: number,
      userId: number
    ): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = updateGameStatusSchema.parse(rawData);
        const game = gameService.updateGameStatus(gameId, data.status, userId);
        return new Response(JSON.stringify(game), {
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

    async deleteGame(gameId: number, userId: number): Promise<Response> {
      try {
        gameService.deleteGame(gameId, userId);
        return new Response(JSON.stringify({ success: true }), {
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

    // ========================================================================
    // Player Management
    // ========================================================================

    async addPlayer(
      req: Request,
      gameId: number,
      userId: number
    ): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = addGamePlayerSchema.parse(rawData) as AddGamePlayerDto;
        const player = gameService.addPlayer(gameId, data, userId);
        return new Response(JSON.stringify(player), {
          status: 201,
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

    async removePlayer(
      gameId: number,
      playerId: number,
      userId: number
    ): Promise<Response> {
      try {
        gameService.removePlayer(gameId, playerId, userId);
        return new Response(JSON.stringify({ success: true }), {
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

    async assignTee(
      req: Request,
      gameId: number,
      playerId: number,
      userId: number
    ): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = assignTeeSchema.parse(rawData);
        const player = gameService.assignTee(gameId, playerId, data.tee_id, userId);
        return new Response(JSON.stringify(player), {
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

    async getPlayers(gameId: number): Promise<Response> {
      try {
        const players = gameService.findGamePlayers(gameId);
        return new Response(JSON.stringify(players), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },

    // ========================================================================
    // Group Management
    // ========================================================================

    async createGroup(
      req: Request,
      gameId: number,
      userId: number
    ): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = createGameGroupSchema.parse(rawData) as CreateGameGroupDto;
        const group = gameGroupService.createGroup(gameId, data);
        return new Response(JSON.stringify(group), {
          status: 201,
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

    async setGroupMembers(
      req: Request,
      groupId: number,
      userId: number
    ): Promise<Response> {
      try {
        const rawData = await req.json();
        const data = setGroupMembersSchema.parse(rawData);
        const members = gameGroupService.setGroupMembers(groupId, data.game_player_ids);
        return new Response(JSON.stringify(members), {
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

    async deleteGroup(groupId: number, userId: number): Promise<Response> {
      try {
        gameGroupService.deleteGroup(groupId);
        return new Response(JSON.stringify({ success: true }), {
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

    async getGroups(gameId: number): Promise<Response> {
      try {
        const groups = gameGroupService.findGroupsForGame(gameId);
        return new Response(JSON.stringify(groups), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },

    async getGroupScores(groupId: number): Promise<Response> {
      try {
        const scores = gameScoreService.findScoresForGroupWithDetails(groupId);
        return new Response(JSON.stringify(scores), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },

    // ========================================================================
    // Leaderboard
    // ========================================================================

    async getLeaderboard(gameId: number): Promise<Response> {
      try {
        const leaderboard = gameScoreService.getLeaderboard(gameId);
        return new Response(JSON.stringify(leaderboard), {
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

    async leaveGame(gameId: number, userId: number): Promise<Response> {
      try {
        const result = gameService.leaveGame(gameId, userId);
        const message = result.deleted ? "Game deleted" : "Left game";
        return new Response(JSON.stringify({ deleted: result.deleted, message }), {
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
  };
}
