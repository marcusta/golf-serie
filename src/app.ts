import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuthApi } from "./api/auth";
import { createCompetitionCategoryTeesApi } from "./api/competition-category-tees";
import { createCompetitionsApi } from "./api/competitions";
import { createCoursesApi } from "./api/courses";
import { createDocumentsApi } from "./api/documents";
import { createParticipantsApi } from "./api/participants";
import { createPlayersApi } from "./api/players";
import { createPointTemplatesApi } from "./api/point-templates";
import { createSeriesApi } from "./api/series";
import { createTeamsApi } from "./api/teams";
import { createTeeTimesApi } from "./api/tee-times";
import { createToursApi } from "./api/tours";
import { createAuthMiddleware, requireAuth, requireRole } from "./middleware/auth";
import { createAuthService } from "./services/auth.service";
import { CompetitionCategoryTeeService } from "./services/competition-category-tee.service";
import { CompetitionService } from "./services/competition-service";
import { CourseService } from "./services/course-service";
import { CourseTeeService } from "./services/course-tee.service";
import { DocumentService } from "./services/document-service";
import { ParticipantService } from "./services/participant-service";
import { createPlayerService } from "./services/player.service";
import { createPlayerProfileService } from "./services/player-profile.service";
import { createPointTemplateService } from "./services/point-template.service";
import { SeriesService } from "./services/series-service";
import { TeamService } from "./services/team-service";
import { TeeTimeService } from "./services/tee-time-service";
import { createSeriesAdminService } from "./services/series-admin.service";
import { createCompetitionAdminService } from "./services/competition-admin.service";
import { createTourAdminService } from "./services/tour-admin.service";
import { createTourCategoryService } from "./services/tour-category.service";
import { TourDocumentService } from "./services/tour-document.service";
import { createTourEnrollmentService } from "./services/tour-enrollment.service";
import { createTourCompetitionRegistrationService } from "./services/tour-competition-registration.service";
import { createTourService } from "./services/tour.service";
import { createTourCompetitionRegistrationApi } from "./api/tour-competition-registration";
import { createCompetitionResultsService } from "./services/competition-results.service";

export function createApp(db: Database): Hono {
  // Initialize services
  const courseService = new CourseService(db);
  const courseTeeService = new CourseTeeService(db);
  const teamService = new TeamService(db);
  const competitionService = new CompetitionService(db);
  const competitionCategoryTeeService = new CompetitionCategoryTeeService(db);
  const teeTimeService = new TeeTimeService(db);
  const participantService = new ParticipantService(db);
  const seriesService = new SeriesService(db, competitionService);
  const seriesAdminService = createSeriesAdminService(db);
  const competitionAdminService = createCompetitionAdminService(db);
  const documentService = new DocumentService(db);
  const playerService = createPlayerService(db);
  const playerProfileService = createPlayerProfileService(db);
  const pointTemplateService = createPointTemplateService(db);
  const tourService = createTourService(db);
  const tourEnrollmentService = createTourEnrollmentService(db);
  const tourAdminService = createTourAdminService(db);
  const tourDocumentService = new TourDocumentService(db);
  const tourCategoryService = createTourCategoryService(db);
  const tourCompetitionRegistrationService = createTourCompetitionRegistrationService(db);
  const competitionResultsService = createCompetitionResultsService(db);

  // Auth service with auto-enrollment dependencies
  const authService = createAuthService(db, {
    tourEnrollmentService,
    playerService,
  });

  // Initialize APIs
  const coursesApi = createCoursesApi(courseService, courseTeeService);
  const teamsApi = createTeamsApi(teamService);
  const competitionsApi = createCompetitionsApi(competitionService);
  const competitionCategoryTeesApi = createCompetitionCategoryTeesApi(
    competitionCategoryTeeService
  );
  const teeTimesApi = createTeeTimesApi(teeTimeService);
  const participantsApi = createParticipantsApi(participantService);
  const seriesApi = createSeriesApi(seriesService);
  const documentsApi = createDocumentsApi(documentService);
  const authApi = createAuthApi(authService);
  const playersApi = createPlayersApi(playerService, playerProfileService);
  const pointTemplatesApi = createPointTemplatesApi(pointTemplateService);
  const toursApi = createToursApi(tourService, tourEnrollmentService, tourAdminService, tourDocumentService, tourCategoryService, pointTemplateService);
  const tourCompetitionRegistrationApi = createTourCompetitionRegistrationApi(
    tourCompetitionRegistrationService,
    tourEnrollmentService,
    playerService
  );

  // Create Hono app
  const app = new Hono();

  // Add CORS middleware
  app.use(
    "*",
    cors({
      origin: (origin) => origin || "http://localhost:5173", // Allow dev and prod origins
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true, // Required for cookies
    })
  );

  // Add request logging
  app.use("*", async (c, next) => {
    console.log(`${c.req.method} ${c.req.url}`);
    await next();
  });

  // Add auth middleware to attach user to context
  app.use("*", createAuthMiddleware(authService));

  // Mount auth API routes
  app.route("/api/auth", authApi);

  // Users endpoint (for admin selection in tour management)
  app.get("/api/users", (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    // Only allow admins to list users
    if (user.role !== "SUPER_ADMIN" && user.role !== "ORGANIZER" && user.role !== "ADMIN") {
      return c.json({ error: "Forbidden" }, 403);
    }
    const users = authService.getAllUsers();
    return c.json(users);
  });

  // Update user role (SUPER_ADMIN only)
  app.put("/api/users/:id/role", requireRole("SUPER_ADMIN"), async (c) => {
    const requestingUser = c.get("user");
    const userId = parseInt(c.req.param("id"));

    // Prevent changing own role
    if (userId === requestingUser!.id) {
      return c.json({ error: "Cannot change your own role" }, 400);
    }

    try {
      const body = await c.req.json();
      const { role } = body;

      if (!role) {
        return c.json({ error: "Role is required" }, 400);
      }

      const updatedUser = authService.updateUserRole(userId, role);
      return c.json(updatedUser);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });

  // Mount players API routes
  app.route("/api/players", playersApi);

  // Mount point templates API routes
  app.route("/api/point-templates", pointTemplatesApi);

  // Mount tours API routes
  app.route("/api/tours", toursApi);

  // Mount tour competition registration API routes (for /api/competitions/:id/register etc.)
  app.route("/api/competitions", tourCompetitionRegistrationApi);

  // Player enrollments endpoint - get current player's tour enrollments
  app.get("/api/player/enrollments", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get the player ID associated with this user
    const player = playerService.findByUserId(user.id);
    if (!player) {
      return c.json([]);
    }

    const enrollments = tourEnrollmentService.getEnrollmentsForPlayer(player.id);
    return c.json(enrollments);
  });

  // Player active rounds endpoint - get all active rounds across tours (15C.3)
  app.get("/api/player/active-rounds", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get the player ID associated with this user
    const player = playerService.findByUserId(user.id);
    if (!player) {
      return c.json([]);
    }

    try {
      const activeRounds = await tourCompetitionRegistrationService.getActiveRounds(player.id);
      return c.json(activeRounds);
    } catch (error: any) {
      console.error("Active rounds error:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

  // Course routes
  app.post("/api/courses", async (c) => {
    return await coursesApi.create(c.req.raw);
  });

  app.get("/api/courses", async (c) => {
    return await coursesApi.findAll();
  });

  app.get("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.findById(c.req.raw, id);
  });

  app.put("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.update(c.req.raw, id);
  });

  app.delete("/api/courses/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.delete(id);
  });

  app.put("/api/courses/:id/holes", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await coursesApi.updateHoles(c.req.raw, id);
  });

  // Course Tee routes
  app.get("/api/courses/:courseId/tees", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    return await coursesApi.getTees(courseId);
  });

  app.get("/api/courses/:courseId/tees/:teeId", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.getTee(courseId, teeId);
  });

  app.post("/api/courses/:courseId/tees", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    return await coursesApi.createTee(c.req.raw, courseId);
  });

  app.put("/api/courses/:courseId/tees/:teeId", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.updateTee(c.req.raw, courseId, teeId);
  });

  app.delete("/api/courses/:courseId/tees/:teeId", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.deleteTee(courseId, teeId);
  });

  // Course Tee Rating routes
  app.get("/api/courses/:courseId/tees/:teeId/ratings", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.getTeeRatings(courseId, teeId);
  });

  app.get("/api/courses/:courseId/tees/:teeId/ratings/:gender", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    const gender = c.req.param("gender");
    return await coursesApi.getTeeRatingByGender(courseId, teeId, gender);
  });

  app.post("/api/courses/:courseId/tees/:teeId/ratings", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    return await coursesApi.upsertTeeRating(c.req.raw, courseId, teeId);
  });

  app.put("/api/courses/:courseId/tees/:teeId/ratings/:ratingId", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    const ratingId = parseInt(c.req.param("ratingId"));
    return await coursesApi.updateTeeRating(c.req.raw, courseId, teeId, ratingId);
  });

  app.delete("/api/courses/:courseId/tees/:teeId/ratings/:gender", async (c) => {
    const courseId = parseInt(c.req.param("courseId"));
    const teeId = parseInt(c.req.param("teeId"));
    const gender = c.req.param("gender");
    return await coursesApi.deleteTeeRating(courseId, teeId, gender);
  });

  // Team routes
  app.post("/api/teams", async (c) => {
    return await teamsApi.create(c.req.raw);
  });

  app.get("/api/teams", async (c) => {
    return await teamsApi.findAll();
  });

  app.get("/api/teams/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teamsApi.findById(c.req.raw, id);
  });

  app.put("/api/teams/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teamsApi.update(c.req.raw, id);
  });

  // Competition routes
  app.post("/api/competitions", requireRole("ORGANIZER", "SUPER_ADMIN"), async (c) => {
    const user = c.get("user");
    try {
      const body = await c.req.json();
      // Add owner_id from authenticated user
      const dataWithOwner = { ...body, owner_id: user!.id };
      const competition = await competitionService.create(dataWithOwner);
      return c.json(competition, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });

  app.get("/api/competitions", async (c) => {
    return await competitionsApi.findAll();
  });

  // Stand-alone competitions endpoint (must be before :id route)
  app.get("/api/competitions/standalone", requireAuth(), async (c) => {
    const user = c.get("user");
    try {
      const competitions = await competitionService.findStandAlone(user!.id);
      return c.json(competitions);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 500);
    }
  });

  app.get("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.findById(c.req.raw, id);
  });

  app.put("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.update(c.req.raw, id);
  });

  app.delete("/api/competitions/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await competitionsApi.delete(id);
  });

  app.get("/api/competitions/:competitionId/participants", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await participantsApi.findAllForCompetition(competitionId);
  });

  app.get("/api/competitions/:competitionId/leaderboard", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionsApi.getLeaderboard(competitionId);
  });

  // Leaderboard with full details (tee info, net scores)
  app.get("/api/competitions/:competitionId/leaderboard/details", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionsApi.getLeaderboardWithDetails(competitionId);
  });

  app.get("/api/competitions/:competitionId/team-leaderboard", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionsApi.getTeamLeaderboard(competitionId);
  });

  // Finalize competition results (calculate and store)
  app.post("/api/competitions/:competitionId/finalize", requireAuth(), async (c) => {
    try {
      const competitionId = parseInt(c.req.param("competitionId"));

      // Verify competition exists
      const competition = competitionService.findById(competitionId);
      if (!competition) {
        return c.json({ error: "Competition not found" }, 404);
      }

      // Finalize results
      competitionResultsService.finalizeCompetitionResults(competitionId);

      return c.json({
        success: true,
        message: "Competition results finalized",
        competition_id: competitionId,
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // Get stored competition results
  app.get("/api/competitions/:competitionId/results", async (c) => {
    try {
      const competitionId = parseInt(c.req.param("competitionId"));
      const scoringType = (c.req.query("scoring_type") as "gross" | "net") || "gross";

      const results = competitionResultsService.getCompetitionResults(competitionId, scoringType);
      const isFinalized = competitionResultsService.isCompetitionFinalized(competitionId);

      return c.json({
        results,
        is_finalized: isFinalized,
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // Competition Category Tees routes
  app.get("/api/competitions/:competitionId/category-tees", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionCategoryTeesApi.getByCompetition(competitionId);
  });

  app.put("/api/competitions/:competitionId/category-tees", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionCategoryTeesApi.setForCompetition(
      c.req.raw,
      competitionId
    );
  });

  // TeeTime routes
  app.post("/api/competitions/:competitionId/tee-times", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await teeTimesApi.createForCompetition(c.req.raw, competitionId);
  });

  app.get("/api/competitions/:competitionId/tee-times", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await teeTimesApi.findAllForCompetition(competitionId);
  });

  // Competition Admin endpoints
  app.get("/api/competitions/:id/admins", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    // Check if user can manage competition (anyone who can manage can view admins)
    if (!competitionAdminService.canManageCompetition(id, user!.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      const admins = competitionAdminService.getCompetitionAdmins(id);
      return c.json(admins);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 500);
    }
  });

  app.post("/api/competitions/:id/admins", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    // Check if user can manage competition admins (more restrictive)
    if (!competitionAdminService.canManageCompetitionAdmins(id, user!.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      const body = await c.req.json();
      if (!body.userId) {
        return c.json({ error: "User ID is required" }, 400);
      }
      const admin = competitionAdminService.addCompetitionAdmin(id, body.userId);
      return c.json(admin, 201);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });

  app.delete(
    "/api/competitions/:id/admins/:userId",
    requireAuth(),
    async (c) => {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const userId = parseInt(c.req.param("userId"));

      // Check if user can manage competition admins (more restrictive)
      if (!competitionAdminService.canManageCompetitionAdmins(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      try {
        competitionAdminService.removeCompetitionAdmin(id, userId);
        return c.json({ success: true });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal server error";
        return c.json({ error: message }, 400);
      }
    }
  );

  app.get("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.findByIdWithParticipants(c.req.raw, id);
  });

  app.put("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.update(c.req.raw, id);
  });

  app.delete("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.delete(id);
  });

  app.put("/api/tee-times/:id/participants/order", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.updateParticipantsOrder(c.req.raw, id);
  });

  // Participant routes
  app.post("/api/participants", async (c) => {
    return await participantsApi.create(c.req.raw);
  });

  app.get("/api/participants", async (c) => {
    return await participantsApi.findAll();
  });

  app.get("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.findById(c.req.raw, id);
  });

  app.put("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.update(c.req.raw, id);
  });

  app.delete("/api/participants/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.delete(id);
  });

  app.put("/api/participants/:id/score", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.updateScore(c.req.raw, id);
  });

  app.put("/api/participants/:id/manual-score", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.updateManualScore(c.req.raw, id);
  });

  app.post("/api/participants/:id/lock", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.lock(c.req.raw, id);
  });

  app.post("/api/participants/:id/unlock", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await participantsApi.unlock(c.req.raw, id);
  });

  // Admin participant actions (require authentication)
  app.post("/api/participants/:id/admin/dq", requireAuth(), async (c) => {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return await participantsApi.adminSetDQ(c.req.raw, id, user.id);
  });

  app.post("/api/participants/:id/admin/score", requireAuth(), async (c) => {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return await participantsApi.adminUpdateScore(c.req.raw, id, user.id);
  });

  // Series routes
  app.post("/api/series", requireRole("ORGANIZER", "SUPER_ADMIN"), async (c) => {
    const user = c.get("user");
    try {
      const data = await c.req.json();
      const series = await seriesService.create(data, user!.id);
      return c.json(series, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });

  app.get("/api/series", async (c) => {
    const user = c.get("user");
    try {
      // SUPER_ADMIN sees all, others see owned/admin series
      if (user?.role === "SUPER_ADMIN") {
        const series = await seriesService.findAll();
        return c.json(series);
      } else if (user) {
        const series = await seriesService.findForUser(user.id);
        return c.json(series);
      } else {
        // Unauthenticated: return public series only
        const series = await seriesService.findPublic();
        return c.json(series);
      }
    } catch (error: unknown) {
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  app.get("/api/series/public", async (c) => {
    return await seriesApi.findPublic();
  });

  app.get("/api/series/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.findById(c.req.raw, id);
  });

  app.put("/api/series/:id", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    // Check if user can manage series
    if (!seriesAdminService.canManageSeries(id, user!.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return await seriesApi.update(c.req.raw, id);
  });

  app.delete("/api/series/:id", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    // Only owner or SUPER_ADMIN can delete
    if (!seriesAdminService.canManageSeriesAdmins(id, user!.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return await seriesApi.delete(id);
  });

  app.get("/api/series/:id/competitions", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getCompetitions(id);
  });

  app.get("/api/series/:id/teams", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getTeams(id);
  });

  app.get("/api/series/:id/standings", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getStandings(id);
  });

  // Team management - SUPER_ADMIN only
  app.post("/api/series/:id/teams/:teamId", requireAuth(), async (c) => {
    const user = c.get("user");
    if (user!.role !== "SUPER_ADMIN") {
      return c.json({ error: "Forbidden - only SUPER_ADMIN can manage teams" }, 403);
    }
    const seriesId = parseInt(c.req.param("id"));
    const teamId = parseInt(c.req.param("teamId"));
    return await seriesApi.addTeam(seriesId, teamId);
  });

  app.delete("/api/series/:id/teams/:teamId", requireAuth(), async (c) => {
    const user = c.get("user");
    if (user!.role !== "SUPER_ADMIN") {
      return c.json({ error: "Forbidden - only SUPER_ADMIN can manage teams" }, 403);
    }
    const seriesId = parseInt(c.req.param("id"));
    const teamId = parseInt(c.req.param("teamId"));
    return await seriesApi.removeTeam(seriesId, teamId);
  });

  app.get("/api/series/:id/available-teams", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getAvailableTeams(id);
  });

  // Series Admin endpoints
  app.get("/api/series/:id/admins", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    // Check if user can manage series (anyone who can manage can view admins)
    if (!seriesAdminService.canManageSeries(id, user!.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      const admins = seriesAdminService.getSeriesAdmins(id);
      return c.json(admins);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 500);
    }
  });

  app.post("/api/series/:id/admins", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    // Check if user can manage series admins (more restrictive)
    if (!seriesAdminService.canManageSeriesAdmins(id, user!.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      const body = await c.req.json();
      if (!body.userId) {
        return c.json({ error: "User ID is required" }, 400);
      }
      const admin = seriesAdminService.addSeriesAdmin(id, body.userId);
      return c.json(admin, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });

  app.delete("/api/series/:id/admins/:userId", requireAuth(), async (c) => {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    const userId = parseInt(c.req.param("userId"));

    // Check if user can manage series admins (more restrictive)
    if (!seriesAdminService.canManageSeriesAdmins(id, user!.id)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      seriesAdminService.removeSeriesAdmin(id, userId);
      return c.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return c.json({ error: message }, 400);
    }
  });

  // Document routes
  app.post("/api/documents", async (c) => {
    return await documentsApi.create(c.req.raw);
  });

  app.get("/api/documents", async (c) => {
    return await documentsApi.findAll();
  });

  app.get("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.findById(c.req.raw, id);
  });

  app.put("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.update(c.req.raw, id);
  });

  app.delete("/api/documents/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await documentsApi.delete(id);
  });

  app.post("/api/series/:seriesId/documents", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.createForSeries(c.req.raw, seriesId);
  });

  app.get("/api/series/:seriesId/documents", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.findBySeriesId(seriesId);
  });

  app.put("/api/series/:seriesId/documents/:documentId", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const documentId = parseInt(c.req.param("documentId"));
    return await documentsApi.updateForSeries(c.req.raw, seriesId, documentId);
  });

  app.delete("/api/series/:seriesId/documents/:documentId", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const documentId = parseInt(c.req.param("documentId"));
    return await documentsApi.deleteForSeries(seriesId, documentId);
  });

  app.get("/api/series/:seriesId/documents/types", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    return await documentsApi.getDocumentTypes(seriesId);
  });

  app.get("/api/series/:seriesId/documents/type/:type", async (c) => {
    const seriesId = parseInt(c.req.param("seriesId"));
    const type = c.req.param("type");
    return await documentsApi.findBySeriesIdAndType(seriesId, type);
  });

  // Static file serving - UPDATED WITH CACHING AND COMPRESSION
  app.get("*", async (c) => {
    const assetPath = new URL(c.req.url).pathname;

    // Don't try to serve API routes as static files
    if (assetPath.startsWith("/api/")) {
      return c.text("Not Found", 404);
    }

    const filePath = `frontend_dist${
      assetPath === "/" ? "/index.html" : assetPath
    }`;

    const file = Bun.file(filePath);
    if (await file.exists()) {
      const headers = new Headers();

      // Check if client accepts gzip
      const acceptEncoding = c.req.header("Accept-Encoding") || "";
      const supportsGzip = acceptEncoding.includes("gzip");

      // Heuristic for mime type
      if (filePath.endsWith(".js"))
        headers.set("Content-Type", "application/javascript");
      if (filePath.endsWith(".css")) headers.set("Content-Type", "text/css");
      if (filePath.endsWith(".html")) headers.set("Content-Type", "text/html");
      if (filePath.endsWith(".png")) headers.set("Content-Type", "image/png");
      if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg"))
        headers.set("Content-Type", "image/jpeg");
      if (filePath.endsWith(".svg"))
        headers.set("Content-Type", "image/svg+xml");

      // Smart Caching Logic - Updated regex to match Vite's hash patterns
      if (
        assetPath.match(
          /assets\/.*-[a-zA-Z0-9_-]+\.(js|css|png|jpg|jpeg|svg|woff|woff2)$/
        )
      ) {
        // Asset has a hash (Vite pattern: filename-HASH.ext), cache it for a long time
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (assetPath.endsWith("index.html")) {
        // index.html should always be re-validated
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      } else {
        // Other files can be cached for a short time
        headers.set("Cache-Control", "public, max-age=3600");
      }

      // Apply gzip compression ONLY for text-based static files
      if (
        supportsGzip &&
        (filePath.endsWith(".js") ||
          filePath.endsWith(".css") ||
          filePath.endsWith(".html") ||
          filePath.endsWith(".svg"))
      ) {
        try {
          const fileContent = await file.arrayBuffer();
          const compressed = Bun.gzipSync(new Uint8Array(fileContent));
          headers.set("Content-Encoding", "gzip");
          headers.set("Content-Length", compressed.length.toString());
          return new Response(compressed, { headers });
        } catch (error) {
          console.error("Compression failed for", assetPath, error);
          // Fall back to uncompressed
        }
      }

      return new Response(file, { headers });
    }

    // SPA Fallback: serve index.html for any other route (but not API routes)
    const indexFile = Bun.file("frontend_dist/index.html");
    if (await indexFile.exists()) {
      const headers = new Headers({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });

      // Compress index.html if client supports it
      const acceptEncoding = c.req.header("Accept-Encoding") || "";
      if (acceptEncoding.includes("gzip")) {
        try {
          const fileContent = await indexFile.arrayBuffer();
          const compressed = Bun.gzipSync(new Uint8Array(fileContent));
          headers.set("Content-Encoding", "gzip");
          headers.set("Content-Length", compressed.length.toString());
          return new Response(compressed, { headers });
        } catch (error) {
          console.error("Compression failed for index.html", error);
        }
      }

      return new Response(indexFile, { headers });
    }

    return c.text("Not Found", 404);
  });

  return app;
}
