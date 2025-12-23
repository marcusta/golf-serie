import { Hono } from "hono";
import { requireRole } from "../middleware/auth";
import { TourService } from "../services/tour.service";

export function createToursApi(tourService: TourService) {
  const app = new Hono();

  // GET /api/tours - Public: List all tours
  app.get("/", async (c) => {
    try {
      const tours = tourService.findAll();
      return c.json(tours);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/tours/:id - Public: Get tour by ID
  app.get("/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const tour = tourService.findById(id);

      if (!tour) {
        return c.json({ error: "Tour not found" }, 404);
      }

      return c.json(tour);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/tours/:id/competitions - Public: Get tour's competitions
  app.get("/:id/competitions", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const competitions = tourService.getCompetitions(id);
      return c.json(competitions);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/tours/:id/standings - Public: Get tour standings
  app.get("/:id/standings", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const standings = tourService.getStandings(id);
      return c.json(standings);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/tours - Admin: Create tour
  app.post("/", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ error: "Tour name is required" }, 400);
      }

      const tour = tourService.create(
        {
          name: body.name,
          description: body.description,
        },
        user!.id
      );

      return c.json(tour, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // PUT /api/tours/:id - Admin: Update tour (owner only)
  app.put("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();

      const tour = tourService.findById(id);
      if (!tour) {
        return c.json({ error: "Tour not found" }, 404);
      }

      // Check if user is owner or super admin
      if (tour.owner_id !== user!.id && user!.role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden" }, 403);
      }

      const updated = tourService.update(id, {
        name: body.name,
        description: body.description,
      });

      return c.json(updated);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // DELETE /api/tours/:id - Admin: Delete tour (owner only)
  app.delete("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));

      const tour = tourService.findById(id);
      if (!tour) {
        return c.json({ error: "Tour not found" }, 404);
      }

      // Check if user is owner or super admin
      if (tour.owner_id !== user!.id && user!.role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden" }, 403);
      }

      tourService.delete(id);
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  return app;
}
