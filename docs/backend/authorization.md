# Authorization & Access Control

Complete guide to the role-based access control (RBAC) system and permission management in the golf-serie application.

---

## Overview

The application uses a **hybrid authorization model** combining:
1. **System-wide roles** (SUPER_ADMIN, ORGANIZER, ADMIN, PLAYER)
2. **Entity-specific admin tables** (tour_admins, series_admins, competition_admins)
3. **Ownership permissions** (owner_id fields on entities)

---

## System Roles

### Role Hierarchy

Defined in `users.role` column:

```typescript
type UserRole = "SUPER_ADMIN" | "ORGANIZER" | "ADMIN" | "PLAYER";
```

| Role | Permissions | Typical Use Case |
|------|-------------|------------------|
| **SUPER_ADMIN** | Full system access, manage all users/roles | System administrators |
| **ORGANIZER** | Create tours/series/competitions, manage own entities | Tournament organizers |
| **ADMIN** | Manage entities as assigned admin | Delegated management |
| **PLAYER** | Play in competitions, view scores, self-register | Golfers |

### Role Capabilities Matrix

| Action | SUPER_ADMIN | ORGANIZER | ADMIN | PLAYER |
|--------|-------------|-----------|-------|--------|
| **User Management** |
| Update user roles | ✅ | ❌ | ❌ | ❌ |
| List all users | ✅ | ❌ | ❌ | ❌ |
| **Tour Management** |
| Create tour | ✅ | ✅ | ❌ | ❌ |
| Update own tour | ✅ | ✅ (owner) | ✅ (admin) | ❌ |
| Delete tour | ✅ | ✅ (owner) | ❌ | ❌ |
| Add tour admins | ✅ | ✅ (owner) | ❌ | ❌ |
| **Series Management** |
| Create series | ✅ | ✅ | ❌ | ❌ |
| Update own series | ✅ | ✅ (owner) | ✅ (admin) | ❌ |
| Delete series | ✅ | ✅ (owner) | ❌ | ❌ |
| Add series admins | ✅ | ✅ (owner) | ❌ | ❌ |
| **Competition Management** |
| Create competition | ✅ | ✅ | ❌ | ❌ |
| Update own competition | ✅ | ✅ (owner) | ✅ (admin) | ❌ |
| Delete competition | ✅ | ✅ (owner) | ❌ | ❌ |
| Lock/unlock scores | ✅ | ✅ (owner) | ✅ (admin) | ❌ |
| **Score Management** |
| Enter own scores | ✅ | ✅ | ✅ | ✅ |
| Edit any scores (admin) | ✅ | ✅ (owner/admin) | ✅ (admin) | ❌ |
| Disqualify participant | ✅ | ✅ (owner/admin) | ✅ (admin) | ❌ |
| **Enrollment** |
| Self-register for tour | ✅ | ✅ | ✅ | ✅ |
| Approve enrollments | ✅ | ✅ (tour owner/admin) | ✅ (tour admin) | ❌ |

---

## Authentication System

### Implementation

**Location**: `src/middleware/auth.ts`

### Session-Based Authentication

```typescript
// Session storage
sessions table {
  id: UUID (cookie value)
  user_id: integer
  expires_at: unix timestamp (7 days)
}
```

**Session Flow**:
1. User logs in (`POST /api/auth/login`)
2. Server creates session record, returns cookie
3. Subsequent requests include cookie
4. Middleware validates session, attaches user to context
5. Route handlers check permissions

### Middleware Functions

#### `createAuthMiddleware()`

Attaches user to Hono context if valid session exists.

```typescript
import { createAuthMiddleware } from "./middleware/auth";

app.use("/*", createAuthMiddleware(authService));

// In route handlers:
const user = c.get("user"); // AuthUser | null
```

#### `requireAuth()`

Blocks requests without valid authentication.

```typescript
import { requireAuth } from "./middleware/auth";

app.post("/api/tours", requireAuth(), async (c) => {
  const user = c.get("user"); // Guaranteed to exist
  // ...
});
```

**Response**: `401 Unauthorized` if not authenticated

#### `requireRole(...roles: UserRole[])`

Blocks requests unless user has one of the specified roles.

```typescript
import { requireRole } from "./middleware/auth";

// Only SUPER_ADMIN can access
app.put("/api/users/:id/role",
  requireAuth(),
  requireRole("SUPER_ADMIN"),
  async (c) => {
    // ...
  }
);

// SUPER_ADMIN or ORGANIZER can access
app.post("/api/tours",
  requireAuth(),
  requireRole("SUPER_ADMIN", "ORGANIZER"),
  async (c) => {
    // ...
  }
);
```

**Response**: `403 Forbidden` if user lacks required role

---

## Ownership System

### Owner Fields

Many entities have an `owner_id` field linking to the user who created them:

| Table | Owner Field | Permissions |
|-------|-------------|-------------|
| tours | owner_id | Full control, can delete, manage admins |
| series | owner_id | Full control, can delete, manage admins |
| competitions | owner_id | Full control, can delete, manage admins |

### Ownership Checks

Ownership is checked in **service layer** methods:

```typescript
// Example from TourService
updateTour(id: number, data: UpdateTourDto, userId: number): Tour {
  const tour = this.findTourById(id);
  if (!tour) throw new Error("Tour not found");

  // Ownership check
  if (tour.owner_id !== userId) {
    throw new Error("Not authorized to update this tour");
  }

  return this.updateTourData(id, data);
}
```

**Important**:
- SUPER_ADMIN bypasses ownership checks
- Admins (from admin tables) may have permissions without ownership

---

## Entity-Specific Admin System

### Admin Tables

Three tables grant granular admin permissions:

#### tour_admins

Grants admin permissions on a specific tour.

```sql
CREATE TABLE tour_admins (
  id INTEGER PRIMARY KEY,
  tour_id INTEGER NOT NULL REFERENCES tours(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(tour_id, user_id)
);
```

#### series_admins

Grants admin permissions on a specific series.

```sql
CREATE TABLE series_admins (
  id INTEGER PRIMARY KEY,
  series_id INTEGER NOT NULL REFERENCES series(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(series_id, user_id)
);
```

#### competition_admins

Grants admin permissions on a specific competition.

```sql
CREATE TABLE competition_admins (
  id INTEGER PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(competition_id, user_id)
);
```

### Permission Patterns

#### Service-Level Permission Checks

Services provide `canManage()` methods:

```typescript
// TourAdminService
canManage(tourId: number, userId: number): boolean {
  const user = this.findUserById(userId);
  if (!user) return false;

  // SUPER_ADMIN always allowed
  if (user.role === "SUPER_ADMIN") return true;

  // Check if owner
  const tour = this.findTourById(tourId);
  if (tour && tour.owner_id === userId) return true;

  // Check if admin
  return this.isUserTourAdmin(tourId, userId);
}
```

#### Combined Permission Logic

**Permission hierarchy** (any grants access):
1. **SUPER_ADMIN role** → full access
2. **Owner** (owner_id matches) → full access except admin management
3. **Entity admin** (entry in admin table) → delegated access

```typescript
// Example: Who can update a tour?
function canUpdateTour(tour: Tour, user: User): boolean {
  // 1. SUPER_ADMIN
  if (user.role === "SUPER_ADMIN") return true;

  // 2. Owner
  if (tour.owner_id === user.id) return true;

  // 3. Tour admin
  return tourAdminService.isUserTourAdmin(tour.id, user.id);
}
```

### Admin Management

Only **owners** and **SUPER_ADMIN** can manage admin lists:

```typescript
// TourAdminService
canManageAdmins(tourId: number, userId: number): boolean {
  const user = this.findUserById(userId);
  if (!user) return false;

  // Only SUPER_ADMIN or owner
  if (user.role === "SUPER_ADMIN") return true;

  const tour = this.findTourById(tourId);
  return tour && tour.owner_id === userId;
}
```

**Admin management endpoints**:
- `POST /api/tours/:tourId/admins` - Add admin
- `DELETE /api/tours/:tourId/admins/:adminId` - Remove admin
- Similar for series and competitions

---

## Route Protection Patterns

### Public Routes

No authentication required:

```typescript
// Public leaderboards
app.get("/api/competitions/:id/leaderboard", async (c) => {
  // Anyone can view
});

// Public series info
app.get("/api/series/:id", async (c) => {
  // Anyone can view
});
```

### Authenticated Routes

Require authentication but no specific role:

```typescript
app.get("/api/players/me",
  requireAuth(),
  async (c) => {
    const user = c.get("user")!;
    // User can view own profile
  }
);
```

### Role-Protected Routes

Require specific system roles:

```typescript
// Only SUPER_ADMIN
app.put("/api/users/:id/role",
  requireAuth(),
  requireRole("SUPER_ADMIN"),
  async (c) => {
    // Update user role
  }
);

// ORGANIZER or above
app.post("/api/tours",
  requireAuth(),
  requireRole("SUPER_ADMIN", "ORGANIZER"),
  async (c) => {
    // Create tour
  }
);
```

### Owner/Admin-Protected Routes

Require ownership or admin status (checked in service layer):

```typescript
app.put("/api/tours/:id",
  requireAuth(),
  async (c) => {
    const user = c.get("user")!;
    const tourId = parseInt(c.req.param("id"));
    const data = await c.req.json();

    try {
      // Service throws if not authorized
      const tour = tourService.updateTour(tourId, data, user.id);
      return c.json(tour);
    } catch (error) {
      if (error.message.includes("Not authorized")) {
        return c.json({ error: error.message }, 403);
      }
      return c.json({ error: error.message }, 500);
    }
  }
);
```

---

## Authorization Decision Tree

When implementing a new protected route:

```
START: Does route need protection?
  │
  ├─→ NO: Public route (no middleware)
  │
  └─→ YES: Add requireAuth()
       │
       ├─→ Only specific roles? → Add requireRole(...)
       │
       └─→ Entity-specific permissions?
            │
            ├─→ Check in service layer
            │   - Call canManage() or similar
            │   - Throw error if not authorized
            │
            └─→ Handle 403 in route handler
```

---

## Service Layer Authorization Examples

### TourService

```typescript
class TourService {
  // Create: Must be ORGANIZER+
  createTour(data: CreateTourDto, ownerId: number): Tour {
    // Caller already checked role in route
    return this.insertTour({ ...data, owner_id: ownerId });
  }

  // Update: Owner or admin
  updateTour(id: number, data: UpdateTourDto, userId: number): Tour {
    const tour = this.findTourById(id);
    if (!tour) throw new Error("Tour not found");

    if (!this.canManage(tour.id, userId)) {
      throw new Error("Not authorized to update this tour");
    }

    return this.updateTourData(id, data);
  }

  // Delete: Owner only (not even admins)
  deleteTour(id: number, userId: number): void {
    const tour = this.findTourById(id);
    if (!tour) throw new Error("Tour not found");

    const user = this.findUserById(userId);
    if (user?.role !== "SUPER_ADMIN" && tour.owner_id !== userId) {
      throw new Error("Only the owner can delete a tour");
    }

    this.removeTour(id);
  }

  // Helper: Can manage?
  private canManage(tourId: number, userId: number): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;

    const tour = this.findTourById(tourId);
    if (tour && tour.owner_id === userId) return true;

    return this.tourAdminService.isUserTourAdmin(tourId, userId);
  }
}
```

### ParticipantService

```typescript
class ParticipantService {
  // Score entry: Player themselves, or admin
  updateScore(participantId: number, hole: number, strokes: number, userId: number): Participant {
    const participant = this.findParticipantById(participantId);
    if (!participant) throw new Error("Participant not found");

    // Can't update if locked
    if (participant.is_locked) {
      throw new Error("Scores are locked");
    }

    // Check authorization
    const canEdit = this.canEditScore(participant, userId);
    if (!canEdit) {
      throw new Error("Not authorized to edit scores");
    }

    return this.updateParticipantScore(participantId, hole, strokes);
  }

  // Admin actions: Lock/unlock, DQ
  lockParticipant(participantId: number, userId: number): Participant {
    const participant = this.findParticipantById(participantId);
    if (!participant) throw new Error("Participant not found");

    const competition = this.findCompetitionByParticipant(participantId);
    if (!this.canManageCompetition(competition.id, userId)) {
      throw new Error("Not authorized");
    }

    return this.setParticipantLocked(participantId, true);
  }

  private canEditScore(participant: Participant, userId: number): boolean {
    // 1. Is it the player themselves?
    if (participant.player_id === userId) return true;

    // 2. Is user an admin of the competition?
    const competition = this.findCompetitionByParticipant(participant.id);
    return this.canManageCompetition(competition.id, userId);
  }

  private canManageCompetition(competitionId: number, userId: number): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;

    const competition = this.findCompetitionById(competitionId);
    if (competition && competition.owner_id === userId) return true;

    return this.competitionAdminService.isUserCompetitionAdmin(competitionId, userId);
  }
}
```

---

## Error Handling

### Authorization Error Codes

| HTTP Status | Meaning | When to Use |
|-------------|---------|-------------|
| **401 Unauthorized** | No valid authentication | Missing or invalid session |
| **403 Forbidden** | Insufficient permissions | Valid auth but lacks required role/ownership |
| **404 Not Found** | Resource not found | Entity doesn't exist (or user can't see it) |

### Error Messages

**Good error messages** (user-facing):
- ❌ "Not authorized" (vague)
- ✅ "Only the tour owner can delete a tour"
- ✅ "You must be an admin to lock scores"
- ✅ "This competition belongs to a different series"

**Security consideration**: Don't leak information about resources the user shouldn't know about. Return 404 for both "doesn't exist" and "exists but you can't see it".

---

## Testing Authorization

### Test Patterns

```typescript
// Test file structure
describe("TourService Authorization", () => {
  let db: Database;
  let tourService: TourService;
  let superAdmin: User;
  let organizer: User;
  let player: User;

  beforeEach(() => {
    db = createTestDatabase();
    superAdmin = createUser(db, { role: "SUPER_ADMIN" });
    organizer = createUser(db, { role: "ORGANIZER" });
    player = createUser(db, { role: "PLAYER" });
  });

  test("owner can update tour", () => {
    const tour = tourService.createTour({...}, organizer.id);
    expect(() =>
      tourService.updateTour(tour.id, { name: "Updated" }, organizer.id)
    ).not.toThrow();
  });

  test("non-owner cannot update tour", () => {
    const tour = tourService.createTour({...}, organizer.id);
    expect(() =>
      tourService.updateTour(tour.id, { name: "Updated" }, player.id)
    ).toThrow("Not authorized");
  });

  test("admin can update tour", () => {
    const tour = tourService.createTour({...}, organizer.id);
    tourAdminService.addAdmin(tour.id, player.id, organizer.id);

    expect(() =>
      tourService.updateTour(tour.id, { name: "Updated" }, player.id)
    ).not.toThrow();
  });

  test("SUPER_ADMIN bypasses ownership", () => {
    const tour = tourService.createTour({...}, organizer.id);
    expect(() =>
      tourService.updateTour(tour.id, { name: "Updated" }, superAdmin.id)
    ).not.toThrow();
  });
});
```

---

## Security Best Practices

### 1. Defense in Depth

- **Route level**: `requireAuth()` and `requireRole()` middleware
- **Service level**: Ownership and admin checks
- **Database level**: Foreign key constraints prevent orphans

### 2. Principle of Least Privilege

- Default to most restrictive permissions
- Grant specific access only when needed
- Use entity-specific admin tables instead of elevating system roles

### 3. Never Trust Client Input

```typescript
// ❌ Bad: Trust user_id from request body
const { user_id, tour_id } = await c.req.json();
tourService.updateTour(tour_id, data, user_id);

// ✅ Good: Use authenticated user from context
const user = c.get("user")!;
tourService.updateTour(tour_id, data, user.id);
```

### 4. Consistent Permission Checks

- Always check permissions before mutation operations
- Use service-layer methods (don't duplicate checks in routes)
- Test authorization paths thoroughly

### 5. Audit Trail

```typescript
// Log significant actions
console.log(`User ${userId} updated tour ${tourId} at ${new Date()}`);

// Store audit data in database
audit_log {
  user_id,
  action: "update_tour",
  entity_type: "tour",
  entity_id: tourId,
  timestamp
}
```

---

## Common Authorization Patterns

### Pattern 1: Public Read, Protected Write

```typescript
// Anyone can view
app.get("/api/tours/:id", async (c) => {
  const tour = tourService.getTour(parseInt(c.req.param("id")));
  return c.json(tour);
});

// Only owner/admin can update
app.put("/api/tours/:id",
  requireAuth(),
  async (c) => {
    const user = c.get("user")!;
    // Service checks authorization
    const tour = tourService.updateTour(..., user.id);
    return c.json(tour);
  }
);
```

### Pattern 2: Scope to User's Own Data

```typescript
// List only tours I own/admin
app.get("/api/tours/my",
  requireAuth(),
  async (c) => {
    const user = c.get("user")!;
    const tours = tourService.getMyTours(user.id);
    return c.json(tours);
  }
);
```

### Pattern 3: Hierarchical Permissions

```typescript
// Competition inherits tour permissions
function canManageCompetition(competitionId: number, userId: number): boolean {
  // 1. Direct competition admin?
  if (competitionAdminService.isUserAdmin(competitionId, userId)) return true;

  // 2. Competition owner?
  const comp = competitionService.get(competitionId);
  if (comp.owner_id === userId) return true;

  // 3. Parent tour admin?
  if (comp.tour_id) {
    return tourAdminService.isUserTourAdmin(comp.tour_id, userId);
  }

  // 4. Parent series admin?
  if (comp.series_id) {
    return seriesAdminService.isUserSeriesAdmin(comp.series_id, userId);
  }

  return false;
}
```

---

## Troubleshooting

### Issue: "Not authorized" but user is owner

**Check**:
1. Is `owner_id` correctly set on entity?
2. Is `userId` parameter correct in service call?
3. Is SUPER_ADMIN check bypassing correctly?

**Debug**:
```typescript
console.log({ entityOwnerId: entity.owner_id, requestUserId: userId, userRole: user.role });
```

### Issue: Admin can't perform action

**Check**:
1. Is admin entry in correct admin table?
2. Is `canManage()` checking admin table?
3. Does action require owner-only (like delete)?

**Debug**:
```typescript
const isAdmin = tourAdminService.isUserTourAdmin(tourId, userId);
console.log({ isAdmin, userId, tourId });
```

### Issue: 401 vs 403 confusion

**Rule of thumb**:
- **401**: No session or invalid session → need to log in
- **403**: Valid session but insufficient permissions → need higher role or ownership

---

## Related Documentation

- **Database Schema** → `database-schema.md` - Admin table structures
- **Tours & Enrollments** → `tours-and-enrollments.md` - Tour permission examples
- **Competitions & Results** → `competitions-and-results.md` - Competition permission examples
