import { Database } from "bun:sqlite";
import { createCompetitionsApi } from "../src/api/competitions";
import { createCoursesApi } from "../src/api/courses";
import { createTeamsApi } from "../src/api/teams";
import { CompetitionService } from "../src/services/competition-service";
import { CourseService } from "../src/services/course-service";
import { TeamService } from "../src/services/team-service";

let server: ReturnType<typeof Bun.serve> | null = null;
const TEST_PORT = 3001; // Use a different port for tests

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

export async function startTestServer(db: Database): Promise<void> {
  if (server) return; // Server already running

  // Initialize services with test database
  const courseService = new CourseService(db);
  const teamService = new TeamService(db);
  const competitionService = new CompetitionService(db);

  // Initialize APIs
  const coursesApi = createCoursesApi(courseService);
  const teamsApi = createTeamsApi(teamService);
  const competitionsApi = createCompetitionsApi(competitionService);

  // Start server
  server = Bun.serve({
    port: TEST_PORT,
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
      },

      // Handle preflight requests
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },

    // Fallback for unmatched routes
    fetch(req) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );
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

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 100));
}

export async function stopTestServer(): Promise<void> {
  if (server) {
    server.stop();
    server = null;
  }
}

// Export the test port for use in test helpers
export { TEST_PORT };
