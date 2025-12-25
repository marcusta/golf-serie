import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import type { PlayerService } from "../services/player.service";
import type { TourCompetitionRegistrationService } from "../services/tour-competition-registration.service";
import type { TourEnrollmentService } from "../services/tour-enrollment.service";
import type { RegistrationMode } from "../types";

const registerSchema = z.object({
  mode: z.enum(["solo", "looking_for_group", "create_group"]),
});

const addToGroupSchema = z.object({
  playerIds: z.array(z.number().positive()).min(1),
});

const removeFromGroupSchema = z.object({
  playerId: z.number().positive(),
});

export function createTourCompetitionRegistrationApi(
  registrationService: TourCompetitionRegistrationService,
  enrollmentService: TourEnrollmentService,
  playerService: PlayerService
) {
  const app = new Hono();

  /**
   * Helper to get the player ID for the current user
   */
  function getPlayerIdForUser(userId: number): number | null {
    const player = playerService.findByUserId(userId);
    return player?.id ?? null;
  }

  /**
   * Helper to verify player is enrolled in the tour for this competition
   */
  function isPlayerEnrolledInTour(
    competitionId: number,
    playerId: number
  ): boolean {
    // We'll let the service handle this check - it verifies enrollment
    return true;
  }

  // ==========================================
  // REGISTRATION ENDPOINTS (15C.1)
  // ==========================================

  // POST /api/competitions/:id/register - Register for competition
  app.post("/:id/register", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));

      // Get player for user
      const playerId = getPlayerIdForUser(user!.id);
      if (!playerId) {
        return c.json(
          { error: "No player profile found. Please create one first." },
          400
        );
      }

      // Parse and validate body
      const body = await c.req.json();
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: "Mode must be solo, looking_for_group, or create_group" }, 400);
      }

      const mode: RegistrationMode = parsed.data.mode;

      // Service handles all validation (enrollment, competition mode, timing, etc.)
      const result = await registrationService.register(
        competitionId,
        playerId,
        mode
      );

      return c.json(result, 201);
    } catch (error: any) {
      // Map common errors to appropriate status codes
      if (error.message === "Competition not found") {
        return c.json({ error: error.message }, 404);
      }
      if (
        error.message.includes("not enrolled") ||
        error.message.includes("not part of a tour") ||
        error.message.includes("already registered") ||
        error.message.includes("not in open-start mode") ||
        error.message.includes("not opened yet") ||
        error.message.includes("has closed")
      ) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Registration error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // DELETE /api/competitions/:id/register - Withdraw from competition
  app.delete("/:id/register", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));

      const playerId = getPlayerIdForUser(user!.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }

      await registrationService.withdraw(competitionId, playerId);
      return c.json({ success: true });
    } catch (error: any) {
      if (error.message === "Registration not found") {
        return c.json({ error: error.message }, 404);
      }
      if (error.message.includes("Cannot withdraw")) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Withdraw error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // GET /api/competitions/:id/my-registration - Get my registration status
  app.get("/:id/my-registration", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));

      const playerId = getPlayerIdForUser(user!.id);
      if (!playerId) {
        return c.json({ registered: false, registration: null });
      }

      const registration = await registrationService.getRegistration(
        competitionId,
        playerId
      );

      if (!registration) {
        return c.json({ registered: false, registration: null });
      }

      // Get group info if registered
      let group = null;
      if (registration.tee_time_id) {
        group = await registrationService.getGroupByTeeTime(
          registration.tee_time_id,
          playerId
        );
      }

      return c.json({
        registered: true,
        registration,
        group,
      });
    } catch (error: any) {
      console.error("Get registration error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // GET /api/competitions/:id/available-players - List players for group formation
  app.get("/:id/available-players", requireAuth(), async (c) => {
    try {
      const competitionId = parseInt(c.req.param("id"));

      const players = await registrationService.getAvailablePlayers(
        competitionId
      );
      return c.json(players);
    } catch (error: any) {
      if (
        error.message.includes("not found") ||
        error.message.includes("not part of a tour")
      ) {
        return c.json({ error: error.message }, 404);
      }
      console.error("Available players error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // ==========================================
  // GROUP MANAGEMENT ENDPOINTS (15C.2)
  // ==========================================

  // POST /api/competitions/:id/group/add - Add player(s) to my group
  app.post("/:id/group/add", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));

      const playerId = getPlayerIdForUser(user!.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }

      const body = await c.req.json();
      const parsed = addToGroupSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          { error: "playerIds must be an array of player IDs" },
          400
        );
      }

      const group = await registrationService.addToGroup(
        competitionId,
        playerId,
        parsed.data.playerIds
      );

      return c.json(group);
    } catch (error: any) {
      if (
        error.message.includes("must be registered") ||
        error.message.includes("Cannot modify group") ||
        error.message.includes("exceed") ||
        error.message.includes("not enrolled") ||
        error.message.includes("already in this group") ||
        error.message.includes("already started playing")
      ) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Add to group error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // POST /api/competitions/:id/group/remove - Remove player from my group
  app.post("/:id/group/remove", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));

      const playerId = getPlayerIdForUser(user!.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }

      const body = await c.req.json();
      const parsed = removeFromGroupSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: "playerId is required" }, 400);
      }

      const group = await registrationService.removeFromGroup(
        competitionId,
        playerId,
        parsed.data.playerId
      );

      return c.json(group);
    } catch (error: any) {
      if (
        error.message.includes("must be registered") ||
        error.message.includes("not in your group") ||
        error.message.includes("Cannot remove") ||
        error.message.includes("Use leaveGroup")
      ) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Remove from group error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // POST /api/competitions/:id/group/leave - Leave current group
  app.post("/:id/group/leave", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));

      const playerId = getPlayerIdForUser(user!.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }

      const group = await registrationService.leaveGroup(
        competitionId,
        playerId
      );

      return c.json(group);
    } catch (error: any) {
      if (
        error.message === "Registration not found" ||
        error.message.includes("Cannot leave group")
      ) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Leave group error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // GET /api/competitions/:id/group - Get my current group members
  app.get("/:id/group", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));

      const playerId = getPlayerIdForUser(user!.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }

      const registration = await registrationService.getRegistration(
        competitionId,
        playerId
      );

      if (!registration || !registration.tee_time_id) {
        return c.json({ error: "Not registered or no group" }, 404);
      }

      const group = await registrationService.getGroupByTeeTime(
        registration.tee_time_id,
        playerId
      );

      return c.json(group);
    } catch (error: any) {
      console.error("Get group error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // ==========================================
  // PLAY MODE ENDPOINTS (15C.3)
  // ==========================================

  // POST /api/competitions/:id/start-playing - Mark as playing
  app.post("/:id/start-playing", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const competitionId = parseInt(c.req.param("id"));

      const playerId = getPlayerIdForUser(user!.id);
      if (!playerId) {
        return c.json({ error: "No player profile found" }, 400);
      }

      await registrationService.startPlaying(competitionId, playerId);
      return c.json({ success: true });
    } catch (error: any) {
      if (
        error.message === "Registration not found" ||
        error.message.includes("Invalid status")
      ) {
        return c.json({ error: error.message }, 400);
      }
      console.error("Start playing error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  return app;
}
