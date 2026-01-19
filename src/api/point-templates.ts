import { Hono } from "hono";
import { requireRole } from "../middleware/auth";
import { PointTemplateService } from "../services/point-template.service";

export function createPointTemplatesApi(
  pointTemplateService: PointTemplateService
) {
  const app = new Hono();

  // GET /api/point-templates - Public: List library templates (tour_id = NULL)
  app.get("/", async (c) => {
    try {
      const templates = pointTemplateService.findLibraryTemplates();
      return c.json(templates);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/point-templates/:id - Public: Get template by ID
  app.get("/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const template = pointTemplateService.findById(id);

      if (!template) {
        return c.json({ error: "Point template not found" }, 404);
      }

      return c.json(template);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/point-templates - Admin: Create template
  app.post("/", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ error: "Template name is required" }, 400);
      }

      if (!body.points_structure) {
        return c.json({ error: "Points structure is required" }, 400);
      }

      const template = pointTemplateService.create(
        {
          name: body.name,
          points_structure: body.points_structure,
        },
        user!.id
      );

      return c.json(template, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // PUT /api/point-templates/:id - Admin: Update template
  app.put("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();

      const updated = pointTemplateService.update(id, {
        name: body.name,
        points_structure: body.points_structure,
      });

      return c.json(updated);
    } catch (error: any) {
      if (error.message === "Point template not found") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
  });

  // DELETE /api/point-templates/:id - Admin: Delete template
  app.delete("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      pointTemplateService.delete(id);
      return c.json({ success: true });
    } catch (error: any) {
      if (error.message === "Point template not found") {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
  });

  return app;
}
