import { Database } from "bun:sqlite";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createCompetitionsApi } from "./api/competitions";
import { createCoursesApi } from "./api/courses";
import { createDocumentsApi } from "./api/documents";
import { createParticipantsApi } from "./api/participants";
import { createSeriesApi } from "./api/series";
import { createTeamsApi } from "./api/teams";
import { createTeeTimesApi } from "./api/tee-times";
import { CompetitionService } from "./services/competition-service";
import { CourseService } from "./services/course-service";
import { DocumentService } from "./services/document-service";
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
  const documentService = new DocumentService(db);

  // Initialize APIs
  const coursesApi = createCoursesApi(courseService);
  const teamsApi = createTeamsApi(teamService);
  const competitionsApi = createCompetitionsApi(competitionService);
  const teeTimesApi = createTeeTimesApi(teeTimeService);
  const participantsApi = createParticipantsApi(participantService);
  const seriesApi = createSeriesApi(seriesService);
  const documentsApi = createDocumentsApi(documentService);

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

  app.get("/api/competitions/:competitionId/team-leaderboard", async (c) => {
    const competitionId = parseInt(c.req.param("competitionId"));
    return await competitionsApi.getTeamLeaderboard(competitionId);
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

  app.post("/api/series/:id/teams/:teamId", async (c) => {
    const seriesId = parseInt(c.req.param("id"));
    const teamId = parseInt(c.req.param("teamId"));
    return await seriesApi.addTeam(seriesId, teamId);
  });

  app.delete("/api/series/:id/teams/:teamId", async (c) => {
    const seriesId = parseInt(c.req.param("id"));
    const teamId = parseInt(c.req.param("teamId"));
    return await seriesApi.removeTeam(seriesId, teamId);
  });

  app.get("/api/series/:id/available-teams", async (c) => {
    const id = parseInt(c.req.param("id"));
    return await seriesApi.getAvailableTeams(id);
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
