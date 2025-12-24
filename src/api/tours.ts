import { Hono } from "hono";
import { requireAuth, requireRole } from "../middleware/auth";
import { TourAdminService } from "../services/tour-admin.service";
import { TourDocumentService } from "../services/tour-document.service";
import { TourEnrollmentService } from "../services/tour-enrollment.service";
import { TourService } from "../services/tour.service";

export function createToursApi(
  tourService: TourService,
  enrollmentService: TourEnrollmentService,
  adminService: TourAdminService,
  documentService: TourDocumentService
) {
  const app = new Hono();

  // GET /api/tours - List tours (filtered by visibility)
  app.get("/", async (c) => {
    try {
      const user = c.get("user");
      const tours = tourService.findAll();

      // Filter tours based on visibility
      const visibleTours = tours.filter((tour) =>
        enrollmentService.canViewTour(tour.id, user?.id ?? null)
      );

      return c.json(visibleTours);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/tours/:id - Get tour by ID (respects visibility)
  app.get("/:id", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const tour = tourService.findById(id);

      if (!tour) {
        return c.json({ error: "Tour not found" }, 404);
      }

      // Check visibility
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }

      return c.json(tour);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/tours/:id/competitions - Get tour's competitions (respects visibility)
  app.get("/:id/competitions", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));

      // Check visibility
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }

      const competitions = tourService.getCompetitions(id);
      return c.json(competitions);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/tours/:id/standings - Get tour standings (respects visibility)
  app.get("/:id/standings", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));

      // Check visibility
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }

      // Support both full and simplified standings via query param
      const format = c.req.query("format");
      if (format === "simple") {
        const standings = tourService.getStandings(id);
        return c.json(standings);
      }

      // Default: return full standings with competition breakdown
      const standings = tourService.getFullStandings(id);
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
          banner_image_url: body.banner_image_url,
          point_template_id: body.point_template_id,
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
        banner_image_url: body.banner_image_url,
        landing_document_id: body.landing_document_id,
        point_template_id: body.point_template_id,
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

  // ==========================================
  // ENROLLMENT ENDPOINTS
  // ==========================================

  // GET /api/tours/:id/enrollments - Admin: List enrollments
  app.get("/:id/enrollments", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const status = c.req.query("status") as
        | "pending"
        | "requested"
        | "active"
        | undefined;

      // Check if user can manage tour
      if (!enrollmentService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const enrollments = enrollmentService.getEnrollments(id, status);
      return c.json(enrollments);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/tours/:id/enrollments - Admin: Add pending enrollment
  app.post("/:id/enrollments", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();

      // Check if user can manage tour
      if (!enrollmentService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      if (!body.email) {
        return c.json({ error: "Email is required" }, 400);
      }

      const enrollment = enrollmentService.addPendingEnrollment(id, body.email);
      return c.json(enrollment, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // POST /api/tours/:id/enrollments/request - Player: Request to join
  app.post("/:id/enrollments/request", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();

      if (!body.playerId) {
        return c.json({ error: "Player ID is required" }, 400);
      }

      const enrollment = enrollmentService.requestEnrollment(id, body.playerId);
      return c.json(enrollment, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // PUT /api/tours/:id/enrollments/:enrollmentId/approve - Admin: Approve enrollment
  app.put("/:id/enrollments/:enrollmentId/approve", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const enrollmentId = parseInt(c.req.param("enrollmentId"));

      // Check if user can manage tour
      if (!enrollmentService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      // Verify enrollment belongs to this tour
      const enrollment = enrollmentService.findById(enrollmentId);
      if (!enrollment || enrollment.tour_id !== id) {
        return c.json({ error: "Enrollment not found" }, 404);
      }

      const approved = enrollmentService.approveEnrollment(enrollmentId);
      return c.json(approved);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // DELETE /api/tours/:id/enrollments/:enrollmentId - Admin: Remove/reject enrollment
  app.delete("/:id/enrollments/:enrollmentId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const enrollmentId = parseInt(c.req.param("enrollmentId"));

      // Check if user can manage tour
      if (!enrollmentService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      enrollmentService.removeEnrollment(id, enrollmentId);
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // ==========================================
  // TOUR ADMIN ENDPOINTS
  // ==========================================

  // GET /api/tours/:id/admins - List tour admins
  app.get("/:id/admins", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));

      // Check if user can manage tour (anyone who can manage can view admins)
      if (!adminService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const admins = adminService.getTourAdmins(id);
      return c.json(admins);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/tours/:id/admins - Add tour admin
  app.post("/:id/admins", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();

      // Check if user can manage tour admins (more restrictive)
      if (!adminService.canManageTourAdmins(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      if (!body.userId) {
        return c.json({ error: "User ID is required" }, 400);
      }

      const admin = adminService.addTourAdmin(id, body.userId);
      return c.json(admin, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // DELETE /api/tours/:id/admins/:userId - Remove tour admin
  app.delete("/:id/admins/:userId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const userId = parseInt(c.req.param("userId"));

      // Check if user can manage tour admins (more restrictive)
      if (!adminService.canManageTourAdmins(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      adminService.removeTourAdmin(id, userId);
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // ==========================================
  // REGISTRATION LINK ENDPOINT
  // ==========================================

  // GET /api/tours/:id/registration-link - Generate registration link with email
  app.get("/:id/registration-link", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const email = c.req.query("email");

      // Check if user can manage tour
      if (!enrollmentService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      if (!email) {
        return c.json({ error: "Email is required" }, 400);
      }

      // Return the registration link format (frontend will construct the full URL)
      return c.json({
        email: email.toLowerCase(),
        path: `/register?email=${encodeURIComponent(email.toLowerCase())}`,
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // ==========================================
  // TOUR DOCUMENT ENDPOINTS
  // ==========================================

  // GET /api/tours/:id/documents/types - List document types for tour (respects visibility)
  // NOTE: This route must be defined BEFORE /:id/documents/:documentId to avoid matching "types" as documentId
  app.get("/:id/documents/types", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));

      // Check visibility
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }

      const types = await documentService.getDocumentTypes(id);
      return c.json(types);
    } catch (error: any) {
      if (error.message === "Tour not found") {
        return c.json({ error: "Tour not found" }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/tours/:id/documents - List tour documents (respects visibility)
  app.get("/:id/documents", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));

      // Check visibility
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }

      const documents = await documentService.findByTourId(id);
      return c.json(documents);
    } catch (error: any) {
      if (error.message === "Tour not found") {
        return c.json({ error: "Tour not found" }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /api/tours/:id/documents/:documentId - Get single document (respects visibility)
  app.get("/:id/documents/:documentId", async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const documentId = parseInt(c.req.param("documentId"));

      // Check visibility
      if (!enrollmentService.canViewTour(id, user?.id ?? null)) {
        return c.json({ error: "Tour not found" }, 404);
      }

      const document = await documentService.findById(documentId);
      if (!document || document.tour_id !== id) {
        return c.json({ error: "Document not found" }, 404);
      }

      return c.json(document);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /api/tours/:id/documents - Admin: Create document
  app.post("/:id/documents", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();

      // Check if user can manage tour
      if (!enrollmentService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const document = await documentService.create({
        title: body.title,
        content: body.content,
        type: body.type || "general",
        tour_id: id,
      });

      return c.json(document, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // PUT /api/tours/:id/documents/:documentId - Admin: Update document
  app.put("/:id/documents/:documentId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const documentId = parseInt(c.req.param("documentId"));
      const body = await c.req.json();

      // Check if user can manage tour
      if (!enrollmentService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      // Verify document belongs to this tour
      const existingDocument = await documentService.findById(documentId);
      if (!existingDocument || existingDocument.tour_id !== id) {
        return c.json({ error: "Document not found" }, 404);
      }

      const document = await documentService.update(documentId, {
        title: body.title,
        content: body.content,
        type: body.type,
      });

      return c.json(document);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // DELETE /api/tours/:id/documents/:documentId - Admin: Delete document
  app.delete("/:id/documents/:documentId", requireAuth(), async (c) => {
    try {
      const user = c.get("user");
      const id = parseInt(c.req.param("id"));
      const documentId = parseInt(c.req.param("documentId"));

      // Check if user can manage tour
      if (!enrollmentService.canManageTour(id, user!.id)) {
        return c.json({ error: "Forbidden" }, 403);
      }

      // Verify document belongs to this tour
      const existingDocument = await documentService.findById(documentId);
      if (!existingDocument || existingDocument.tour_id !== id) {
        return c.json({ error: "Document not found" }, 404);
      }

      await documentService.delete(documentId);
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  return app;
}
