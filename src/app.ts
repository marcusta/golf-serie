import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createCompetitionsApi } from "./api/competitions";
import { createCoursesApi } from "./api/courses";
import { createParticipantsApi } from "./api/participants";
import { createSeriesApi } from "./api/series";
import { createTeamsApi } from "./api/teams";
import { createTeeTimesApi } from "./api/tee-times";
import { CompetitionService } from "./services/competition-service";
import { CourseService } from "./services/course-service";
import { ParticipantService } from "./services/participant-service";
import { SeriesService } from "./services/series-service";
import { TeamService } from "./services/team-service";
import { TeeTimeService } from "./services/tee-time-service";

export function createApp(db: Database): Hono {
  // Initialize services
  const courseService = new CourseService(db);
  const teamService = new TeamService(db);
  const competitionService = new CompetitionService(db);
  const teeTimeService = new TeeTimeService(db);
  const participantService = new ParticipantService(db);
  const seriesService = new SeriesService(db);

  // Initialize APIs
  const coursesApi = createCoursesApi(courseService);
  const teamsApi = createTeamsApi(teamService);
  const competitionsApi = createCompetitionsApi(competitionService);
  const teeTimesApi = createTeeTimesApi(teeTimeService);
  const participantsApi = createParticipantsApi(participantService);
  const seriesApi = createSeriesApi(seriesService);

  // Create Hono app
  const app = new Hono();

  // Add CORS middleware
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Add request logging
  app.use("*", async (c, next) => {
    console.log(`${c.req.method} ${c.req.url}`);
    await next();
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
  app.post("/api/competitions", async (c) => {
    return await competitionsApi.create(c.req.raw);
  });

  app.get("/api/competitions", async (c) => {
    return await competitionsApi.findAll();
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

  // TeeTime routes
  app.post("/api/competitions/:competitionId/tee-times", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await teeTimesApi.createForCompetition(c.req.raw, competitionId);
  });

  app.get("/api/competitions/:competitionId/tee-times", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await teeTimesApi.findAllForCompetition(competitionId);
  });

  app.get("/api/tee-times/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await teeTimesApi.findByIdWithParticipants(c.req.raw, id);
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

  // Series routes
  app.post("/api/series", async (c) => {
    return await seriesApi.create(c.req.raw);
  });

  app.get("/api/series", async (c) => {
    return await seriesApi.findAll();
  });

  app.get("/api/series/public", async (c) => {
    return await seriesApi.findPublic();
  });

  app.get("/api/series/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.findById(c.req.raw, id);
  });

  app.put("/api/series/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.update(c.req.raw, id);
  });

  app.delete("/api/series/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
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

  // Static file serving - fallback for frontend
  app.get("*", async (c) => {
    const pathname = new URL(c.req.url).pathname;
    console.log("Serving static file for:", pathname);

    try {
      let filePath = pathname === "/" ? "/index.html" : pathname;
      const fullPath = `frontend_dist${filePath}`;

      const file = Bun.file(fullPath);
      if (file.size > 0 || filePath === "/index.html") {
        const mimeType = filePath.endsWith(".js")
          ? "application/javascript"
          : filePath.endsWith(".css")
          ? "text/css"
          : filePath.endsWith(".html")
          ? "text/html"
          : filePath.endsWith(".png")
          ? "image/png"
          : filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")
          ? "image/jpeg"
          : filePath.endsWith(".svg")
          ? "image/svg+xml"
          : "text/plain";

        return new Response(file, {
          headers: { "Content-Type": mimeType },
        });
      }
    } catch (error) {
      console.log("File not found:", error);
    }

    // For SPA routes, serve index.html
    try {
      const indexFile = Bun.file("frontend_dist/index.html");
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      return c.text("Not Found", 404);
    }
  });

  return app;
}
