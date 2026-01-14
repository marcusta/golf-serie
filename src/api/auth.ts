import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { AuthService } from "../services/auth.service";

// Rate limiting: track ongoing login attempts by email
const ongoingLoginAttempts = new Set<string>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createAuthApi(authService: AuthService) {
  const app = new Hono();

  // POST /api/auth/register
  app.post("/register", async (c) => {
    try {
      const {
        email,
        password,
        role,
        display_name,
        handicap,
        gender,
        home_club_id,
      } = await c.req.json();

      if (!email || !password) {
        return c.json({ error: "Email and password are required" }, 400);
      }

      // Only allow PLAYER registration by default
      // Admin creation should be handled by Super Admin
      const userRole = role === "ADMIN" || role === "SUPER_ADMIN" ? "PLAYER" : "PLAYER";

      // Build profile data if any profile fields are provided
      const profileData = (display_name || handicap !== undefined || gender || home_club_id)
        ? {
            display_name,
            handicap: handicap !== undefined ? parseFloat(handicap) : undefined,
            gender,
            home_club_id: home_club_id !== undefined ? parseInt(home_club_id) : undefined,
          }
        : undefined;

      const user = await authService.register(email, password, userRole, profileData);

      // Auto-login after registration by creating a session
      const { sessionId } = await authService.login(email, password);

      setCookie(c, "session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return c.json({ user }, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  // POST /api/auth/login
  app.post("/login", async (c) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const normalizedEmail = email.toLowerCase();

    // Rate limiting: if login already in progress for this email, delay and reject
    if (ongoingLoginAttempts.has(normalizedEmail)) {
      await sleep(1000);
      return c.json({ error: "Too many login attempts, please wait" }, 429);
    }

    // Mark login attempt as in progress
    ongoingLoginAttempts.add(normalizedEmail);

    try {
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
      // On failed login, delay 3 seconds to slow down brute force attacks
      await sleep(3000);
      return c.json({ error: "Invalid credentials" }, 401);
    } finally {
      ongoingLoginAttempts.delete(normalizedEmail);
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
