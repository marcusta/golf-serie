import { Hono } from "hono";
import { requireAuth, requireRole } from "../middleware/auth";
import { PlayerService } from "../services/player.service";
import { PlayerProfileService } from "../services/player-profile.service";

export function createPlayersApi(
  playerService: PlayerService,
  playerProfileService?: PlayerProfileService
) {
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

  // GET /api/players/me/profile - Auth: Get current user's full profile with stats
  app.get("/me/profile", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }

      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }

      const profile = playerProfileService.getFullProfile(player.id);
      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      return c.json(profile);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // PUT /api/players/me/profile - Auth: Update own profile
  app.put("/me/profile", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }

      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }

      const body = await c.req.json();
      const profile = playerProfileService.updateProfile(player.id, {
        display_name: body.display_name,
        bio: body.bio,
        avatar_url: body.avatar_url,
        home_course_id: body.home_course_id,
        visibility: body.visibility,
      });

      return c.json(profile);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // GET /api/players/me/handicap - Auth: Get handicap with history
  app.get("/me/handicap", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }

      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }

      const handicapData = playerProfileService.getHandicapWithHistory(player.id);
      if (!handicapData) {
        return c.json({ error: "Handicap data not found" }, 404);
      }

      return c.json(handicapData);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/players/me/handicap - Auth: Record new handicap
  app.post("/me/handicap", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }

      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }

      const body = await c.req.json();

      if (body.handicap_index === undefined || body.handicap_index === null) {
        return c.json({ error: "handicap_index is required" }, 400);
      }

      const entry = playerProfileService.recordHandicap(player.id, {
        handicap_index: body.handicap_index,
        effective_date: body.effective_date,
        notes: body.notes,
      });

      return c.json(entry, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // GET /api/players/me/rounds - Auth: Get round history
  app.get("/me/rounds", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }

      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const player = playerService.findByUserId(user.id);
      if (!player) {
        return c.json({ error: "No player profile linked to this account" }, 404);
      }

      const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined;
      const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!) : undefined;

      const rounds = playerProfileService.getRoundHistory(player.id, limit, offset);
      return c.json(rounds);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/players/is-friend/:targetPlayerId - Auth: Check if current user is "friends" with target player
  // "Friends" = both enrolled in at least one common tour
  app.get("/is-friend/:targetPlayerId", requireAuth(), async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }

      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const viewerPlayer = playerService.findByUserId(user.id);
      if (!viewerPlayer) {
        return c.json({ isFriend: false, commonTours: [] });
      }

      const targetPlayerId = parseInt(c.req.param("targetPlayerId"));
      const isFriend = playerProfileService.isFriend(viewerPlayer.id, targetPlayerId);
      const commonTours = isFriend
        ? playerProfileService.getCommonTours(viewerPlayer.id, targetPlayerId)
        : [];

      return c.json({ isFriend, commonTours });
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

  // GET /api/players/:id/profile - Public: Get player profile with stats (legacy)
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

  // GET /api/players/:id/full - Public: Get full profile (respects visibility)
  app.get("/:id/full", async (c) => {
    try {
      if (!playerProfileService) {
        return c.json({ error: "Profile service not available" }, 500);
      }

      const id = parseInt(c.req.param("id"));

      // Get viewer ID if authenticated
      const user = c.get("user");
      const viewerId = user?.id;

      const profile = playerProfileService.getPublicProfile(id, viewerId);

      if (!profile) {
        return c.json({ error: "Player not found or profile is private" }, 404);
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
