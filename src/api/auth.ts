import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { AuthService } from "../services/auth.service";

export function createAuthApi(authService: AuthService) {
  const app = new Hono();

  // POST /api/auth/register
  app.post("/register", async (c) => {
    try {
      const { email, password, role } = await c.req.json();

      if (!email || !password) {
        return c.json({ error: "Email and password are required" }, 400);
      }

      // Only allow PLAYER registration by default
      // Admin creation should be handled by Super Admin
      const userRole = role === "ADMIN" || role === "SUPER_ADMIN" ? "PLAYER" : "PLAYER";

      const user = await authService.register(email, password, userRole);
      return c.json({ user }, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // POST /api/auth/login
  app.post("/login", async (c) => {
    try {
      const { email, password } = await c.req.json();

      if (!email || !password) {
        return c.json({ error: "Email and password are required" }, 400);
      }

      const { sessionId, user } = await authService.login(email, password);

      setCookie(c, "session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return c.json({ user });
    } catch (error: any) {
      return c.json({ error: error.message }, 401);
    }
  });

  // POST /api/auth/logout
  app.post("/logout", async (c) => {
    const sessionId = c.req.header("Cookie")?.match(/session_id=([^;]+)/)?.[1];
    if (sessionId) {
      await authService.logout(sessionId);
    }
    deleteCookie(c, "session_id", { path: "/" });
    return c.json({ success: true });
  });

  // GET /api/auth/me
  app.get("/me", (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ user: null });
    }
    return c.json({ user });
  });

  // PUT /api/auth/email - Update email (requires current password)
  app.put("/email", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      const { newEmail, currentPassword } = await c.req.json();

      if (!newEmail || !currentPassword) {
        return c.json({ error: "New email and current password are required" }, 400);
      }

      const result = await authService.updateEmail(user.id, newEmail, currentPassword);
      return c.json({ email: result.email });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // PUT /api/auth/password - Update password (requires current password)
  app.put("/password", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      const { currentPassword, newPassword } = await c.req.json();

      if (!currentPassword || !newPassword) {
        return c.json({ error: "Current password and new password are required" }, 400);
      }

      await authService.updatePassword(user.id, currentPassword, newPassword);
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  return app;
}
