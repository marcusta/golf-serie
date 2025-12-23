import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

export type AuthUser = {
  id: number;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "PLAYER";
};

// Extend base context with user info
declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser | null;
  }
}

/**
 * Middleware to attach user to context from session cookie.
 * Use with authService.validateSession.
 */
export function createAuthMiddleware(authService: { validateSession: (sessionId: string) => Promise<any> }) {
  return async (c: Context, next: Next) => {
    const sessionId = getCookie(c, "session_id");
    
    if (sessionId) {
      const session = await authService.validateSession(sessionId);
      if (session) {
        c.set("user", session.user as AuthUser);
      } else {
        c.set("user", null);
      }
    } else {
      c.set("user", null);
    }

    await next();
  };
}

/**
 * Middleware to require authentication.
 * Returns 401 if not authenticated.
 */
export function requireAuth() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  };
}

/**
 * Middleware to require specific roles.
 * Returns 403 if user doesn't have required role.
 */
export function requireRole(...roles: ("SUPER_ADMIN" | "ADMIN" | "PLAYER")[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
