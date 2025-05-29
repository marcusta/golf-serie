import { createCompetitionsApi } from "./api/competitions";
import { createCoursesApi } from "./api/courses";
import { createParticipantsApi } from "./api/participants";
import { createTeamsApi } from "./api/teams";
import { createTeeTimesApi } from "./api/tee-times";
import { createDatabase, initializeDatabase } from "./database/db";
import { CompetitionService } from "./services/competition-service";
import { CourseService } from "./services/course-service";
import { ParticipantService } from "./services/participant-service";
import { TeamService } from "./services/team-service";
import { TeeTimeService } from "./services/tee-time-service";

// Initialize database
const db = createDatabase();
initializeDatabase(db);

// Initialize services
const courseService = new CourseService(db);
const teamService = new TeamService(db);
const competitionService = new CompetitionService(db);
const teeTimeService = new TeeTimeService(db);
const participantService = new ParticipantService(db);

// Initialize APIs
const coursesApi = createCoursesApi(courseService);
const teamsApi = createTeamsApi(teamService);
const competitionsApi = createCompetitionsApi(competitionService);
const teeTimesApi = createTeeTimesApi(teeTimeService);
const participantsApi = createParticipantsApi(participantService);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Add CORS headers to response
const addCorsHeaders = (response: Response): Response => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
};

// Function to strip /golf-serie prefix from paths
const stripPrefix = (pathname: string): string => {
  if (pathname.startsWith("/golf-serie")) {
    return pathname.substring("/golf-serie".length);
  }
  return pathname;
};

// Start server
const port = process.env.PORT || 3010;
console.log(`Server starting on port ${port}...`);

Bun.serve({
  port,
  routes: {
    // Course routes
    "/api/courses": {
      POST: async (req) => addCorsHeaders(await coursesApi.create(req)),
      GET: async () => addCorsHeaders(await coursesApi.findAll()),
    },
    "/api/courses/:id": {
      GET: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await coursesApi.findById(req, id));
      },
      PUT: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await coursesApi.update(req, id));
      },
      DELETE: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await coursesApi.delete(id));
      },
    },
    "/api/courses/:id/holes": {
      PUT: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await coursesApi.updateHoles(req, id));
      },
    },

    // Team routes
    "/api/teams": {
      POST: async (req) => addCorsHeaders(await teamsApi.create(req)),
      GET: async () => addCorsHeaders(await teamsApi.findAll()),
    },
    "/api/teams/:id": {
      GET: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await teamsApi.findById(req, id));
      },
      PUT: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await teamsApi.update(req, id));
      },
    },

    // Competition routes
    "/api/competitions": {
      POST: async (req) => addCorsHeaders(await competitionsApi.create(req)),
      GET: async () => addCorsHeaders(await competitionsApi.findAll()),
    },
    "/api/competitions/:id": {
      GET: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await competitionsApi.findById(req, id));
      },
      PUT: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await competitionsApi.update(req, id));
      },
      DELETE: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await competitionsApi.delete(id));
      },
    },
    "/api/competitions/:competitionId/participants": {
      GET: async (req) => {
        const competitionId = parseInt(req.params.competitionId);
        return addCorsHeaders(
          await participantsApi.findAllForCompetition(competitionId)
        );
      },
    },
    "/api/competitions/:competitionId/leaderboard": {
      GET: async (req) => {
        const competitionId = parseInt(req.params.competitionId);
        return addCorsHeaders(
          await competitionsApi.getLeaderboard(competitionId)
        );
      },
    },

    // TeeTime routes
    "/api/competitions/:competitionId/tee-times": {
      POST: async (req) => {
        const competitionId = parseInt(req.params.competitionId);
        return addCorsHeaders(
          await teeTimesApi.createForCompetition(req, competitionId)
        );
      },
      GET: async (req) => {
        const competitionId = parseInt(req.params.competitionId);
        return addCorsHeaders(
          await teeTimesApi.findAllForCompetition(competitionId)
        );
      },
    },
    "/api/tee-times/:id": {
      GET: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(
          await teeTimesApi.findByIdWithParticipants(req, id)
        );
      },
      DELETE: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await teeTimesApi.delete(id));
      },
    },
    "/api/tee-times/:id/participants/order": {
      PUT: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(
          await teeTimesApi.updateParticipantsOrder(req, id)
        );
      },
    },

    // Participant routes
    "/api/participants": {
      POST: async (req) => addCorsHeaders(await participantsApi.create(req)),
      GET: async () => addCorsHeaders(await participantsApi.findAll()),
    },
    "/api/participants/:id": {
      GET: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await participantsApi.findById(req, id));
      },
      PUT: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await participantsApi.update(req, id));
      },
      DELETE: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await participantsApi.delete(id));
      },
    },
    "/api/participants/:id/score": {
      PUT: async (req) => {
        const id = parseInt(req.params.id);
        return addCorsHeaders(await participantsApi.updateScore(req, id));
      },
    },
  },

  // Fallback for unmatched routes
  fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const strippedPath = stripPrefix(pathname);

    // Handle API routes that don't match - return 404
    if (strippedPath.startsWith("/api/")) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Serve static files from frontend_dist directory
    try {
      let filePath = strippedPath === "/" ? "/index.html" : strippedPath;

      // Remove leading slash and construct full path
      const fullPath = `frontend_dist${filePath}`;
      console.log("serving filePath", fullPath);

      // Try to serve the requested file
      const file = Bun.file(fullPath);

      // Check if file exists
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

        console.log("serving file", file, mimeType);
        return new Response(file, {
          headers: { "Content-Type": mimeType },
        });
      }
    } catch (error) {
      // File doesn't exist, fall through to serve index.html
      console.log("file not found", error);
    }

    // For SPA routes that don't match a file, serve index.html
    try {
      console.log("serving index.html");
      const indexFile = Bun.file("frontend_dist/index.html");
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      // If index.html doesn't exist, return 404
      return new Response("Not Found", { status: 404 });
    }
  },

  // Error handling
  error(error) {
    console.error("Server error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  },
});
