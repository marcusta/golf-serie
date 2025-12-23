import { Hono } from "hono";
import { requireAuth, requireRole } from "../middleware/auth";
import { PlayerService } from "../services/player.service";

export function createPlayersApi(playerService: PlayerService) {
  const app = new Hono();

  // GET /api/players - Public: List all players
  app.get("/", async (c) => {
    try {
      const players = playerService.findAll();
      return c.json(players);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/players/me - Auth: Get current user's player profile
  // MUST come before /:id route to avoid matching "me" as an ID
  app.get("/me", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const player = playerService.findByUserId(user.id);
      
      if (!player) {
        return c.json({ player: null });
      }
      
      return c.json(player);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/players/:id - Public: Get player by ID
  app.get("/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const player = playerService.findById(id);
      
      if (!player) {
        return c.json({ error: "Player not found" }, 404);
      }
      
      return c.json(player);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/players/:id/profile - Public: Get player profile with stats
  app.get("/:id/profile", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const profile = playerService.getPlayerProfile(id);
      
      if (!profile) {
        return c.json({ error: "Player not found" }, 404);
      }
      
      return c.json(profile);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/players - Auth: Create new player
  app.post("/", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ error: "Player name is required" }, 400);
      }

      const player = playerService.create(
        {
          name: body.name,
          handicap: body.handicap,
          user_id: body.user_id,
        },
        user?.id
      );

      return c.json(player, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // POST /api/players/register - Auth: Self-register (link user to new/existing player)
  app.post("/register", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const body = await c.req.json();

      // Check if user already has a player profile
      const existingPlayer = playerService.findByUserId(user.id);
      if (existingPlayer) {
        return c.json({ error: "User already has a player profile" }, 400);
      }

      let player;

      if (body.player_id) {
        // Link to existing player
        player = playerService.linkToUser(body.player_id, user.id);
      } else {
        // Create new player and link
        if (!body.name) {
          return c.json({ error: "Player name is required" }, 400);
        }

        player = playerService.create(
          {
            name: body.name,
            handicap: body.handicap || 0,
            user_id: user.id,
          },
          user.id
        );
      }

      return c.json(player, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // PUT /api/players/:id - Auth: Update player (owner or Admin)
  app.put("/:id", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();

      const player = playerService.findById(id);
      if (!player) {
        return c.json({ error: "Player not found" }, 404);
      }

      // Check authorization: must be the linked user or an admin
      const isOwner = player.user_id === user?.id;
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

      if (!isOwner && !isAdmin) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const updated = playerService.update(id, {
        name: body.name,
        handicap: body.handicap,
      });

      return c.json(updated);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // DELETE /api/players/:id - Admin only: Delete player
  app.delete("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      playerService.delete(id);
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  return app;
}
