# Tour System Implementation Plan

> Living document for tracking the implementation of the full Tour feature set.
> Last updated: 2025-12-24

## Overview

Transform the existing basic Tour infrastructure into a full-featured individual competition system with:
- Player enrollment with multiple states (pending, requested, active)
- Configurable enrollment modes (closed, request-based)
- Configurable visibility (private, public)
- Multi-level admin system
- Auto-enrollment on registration for pre-enrolled emails

## Current State

### What Exists
- `tours` table: id, name, description, owner_id, enrollment_mode, visibility, created_at, updated_at
- `tour_enrollments` table: id, tour_id, player_id, email, status, created_at, updated_at
- `tour_admins` table: id, tour_id, user_id, created_at
- `users` table: id, email, password_hash, role (SUPER_ADMIN, ADMIN, PLAYER)
- `players` table: id, name, handicap, user_id (nullable), created_by
- Basic TourService with CRUD + incomplete standings
- Auth system with session-based authentication
- Point templates (not yet integrated with tours)
- TypeScript types for all tour enrollment entities

### What's Missing (to be implemented in remaining phases)
- Tour enrollment service (business logic)
- Tour admin service (business logic)
- API endpoints for enrollments and admins
- Registration flow with email pre-fill
- Auto-enrollment logic on registration
- Frontend UI for tour management
- Complete tour standings calculation

---

## Database Schema Design

### New Tables

```sql
-- Tour memberships/enrollments
CREATE TABLE tour_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'requested', 'active'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tour_id, email)
);

-- Tour-specific admin assignments
CREATE TABLE tour_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tour_id, user_id)
);
```

### Modified Tables

```sql
-- Add to tours table
ALTER TABLE tours ADD COLUMN enrollment_mode TEXT NOT NULL DEFAULT 'closed';
  -- 'closed': Admin-only enrollment
  -- 'request': Players can request to join

ALTER TABLE tours ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';
  -- 'private': Only admins and enrolled players can view
  -- 'public': Anyone can view leaderboards/standings
```

---

## Implementation Phases

### Phase 1: Database Schema & Core Types ✅ COMPLETE
**Goal**: Establish the data foundation

#### Tasks
- [x] 1.1 Create migration for `tour_enrollments` table
- [x] 1.2 Create migration for `tour_admins` table
- [x] 1.3 Create migration to add `enrollment_mode` and `visibility` to tours
- [x] 1.4 Add TypeScript types for new entities and enums
- [x] 1.5 Run migrations and verify schema

#### Notes (2025-12-24)
**Files created:**
- `src/database/migrations/021_add_tour_enrollments.ts` - Creates tour_enrollments table with indexes
- `src/database/migrations/022_add_tour_admins.ts` - Creates tour_admins table
- `src/database/migrations/023_add_tour_settings.ts` - Adds enrollment_mode and visibility to tours

**Types added to `src/types/index.ts`:**
- `TourEnrollmentStatus` = "pending" | "requested" | "active"
- `TourEnrollmentMode` = "closed" | "request"
- `TourVisibility` = "private" | "public"
- `Tour`, `TourEnrollment`, `TourAdmin` interfaces
- `CreateTourDto`, `UpdateTourDto`, `CreateTourEnrollmentDto`
- `TourEnrollmentWithPlayer` extended interface

**Tests created:**
- `tests/tour-enrollment-schema.test.ts` - 11 tests verifying schema, defaults, constraints, and cascades

**Verification:**
- All 227 existing backend tests pass (no regressions)
- All 11 new schema tests pass
- Schema verified via sqlite3 inspection

---

### Phase 2: Tour Enrollment Service
**Goal**: Backend logic for managing enrollments

#### Tasks
- [ ] 2.1 Create `TourEnrollmentService` with core methods:
  - `addPendingEnrollment(tourId, email)` - Admin adds email
  - `requestEnrollment(tourId, playerId)` - Player requests to join
  - `approveEnrollment(enrollmentId)` - Admin approves request
  - `rejectEnrollment(enrollmentId)` - Admin rejects (deletes) request
  - `getEnrollments(tourId, status?)` - List enrollments
  - `getEnrollmentByEmail(tourId, email)` - Check if email is enrolled
  - `activateEnrollment(tourId, email, playerId)` - Called when user registers
- [ ] 2.2 Add method to check if user can view tour (based on visibility + enrollment)
- [ ] 2.3 Write tests for enrollment service

#### Notes
_Space for implementation notes_

---

### Phase 3: Tour Admin Service
**Goal**: Manage tour-level admin assignments

#### Tasks
- [ ] 3.1 Create `TourAdminService` or extend TourService:
  - `addTourAdmin(tourId, userId)` - Assign admin to tour
  - `removeTourAdmin(tourId, userId)` - Remove admin from tour
  - `getTourAdmins(tourId)` - List admins for tour
  - `canManageTour(userId, tourId)` - Check if user can manage tour
- [ ] 3.2 Update authorization logic to respect tour admins
- [ ] 3.3 Write tests for admin service

#### Notes
_Space for implementation notes_

---

### Phase 4: Tour API Endpoints
**Goal**: Expose enrollment and admin functionality via API

#### Tasks
- [ ] 4.1 Add enrollment endpoints to tours API:
  - `POST /api/tours/:id/enrollments` - Add pending enrollment (admin)
  - `GET /api/tours/:id/enrollments` - List enrollments (admin)
  - `POST /api/tours/:id/enrollments/request` - Request to join (player)
  - `PUT /api/tours/:id/enrollments/:enrollmentId/approve` - Approve request
  - `DELETE /api/tours/:id/enrollments/:enrollmentId` - Reject/remove
- [ ] 4.2 Add tour admin endpoints:
  - `GET /api/tours/:id/admins` - List tour admins
  - `POST /api/tours/:id/admins` - Add tour admin
  - `DELETE /api/tours/:id/admins/:userId` - Remove tour admin
- [ ] 4.3 Update existing tour endpoints with visibility checks
- [ ] 4.4 Add endpoint to generate registration link with email
- [ ] 4.5 Write API tests

#### Notes
_Space for implementation notes_

---

### Phase 5: Auto-Enrollment on Registration
**Goal**: Automatically enroll users when they register with a pending email

#### Tasks
- [ ] 5.1 Modify `AuthService.register()` to:
  - Check for pending enrollments matching the email
  - Create player profile if needed
  - Activate matching enrollments
- [ ] 5.2 Return enrollment info in registration response
- [ ] 5.3 Write tests for auto-enrollment flow

#### Notes
_Space for implementation notes_

---

### Phase 6: Frontend - Admin Tour Management
**Goal**: UI for managing tour enrollments and settings

#### Tasks
- [ ] 6.1 Add tour settings form (enrollment_mode, visibility)
- [ ] 6.2 Create enrollment management view:
  - List pending/requested/active enrollments
  - Add email form with "Copy Registration Link" button
  - Approve/reject request buttons
- [ ] 6.3 Create tour admin management view
- [ ] 6.4 Update tour creation form with new settings

#### Notes
_Space for implementation notes_

---

### Phase 7: Frontend - Registration Flow
**Goal**: Support pre-filled email from registration links

#### Tasks
- [ ] 7.1 Update registration page to read `?email=` query parameter
- [ ] 7.2 Pre-fill and optionally disable email field when from link
- [ ] 7.3 Show success message when auto-enrolled after registration
- [ ] 7.4 Add "Request to Join" button on public tour pages

#### Notes
_Space for implementation notes_

---

### Phase 8: Frontend - Player Tour Views
**Goal**: Tour browsing and viewing for players

#### Tasks
- [ ] 8.1 Create tour listing page (respecting visibility)
- [ ] 8.2 Create tour detail page with:
  - Competitions list
  - Standings (when visible)
  - Enrollment status / request button
- [ ] 8.3 Add "My Tours" section to player dashboard
- [ ] 8.4 Ensure proper access control on all views

#### Notes
_Space for implementation notes_

---

### Phase 9: Tour Standings & Points
**Goal**: Complete the standings calculation for tours

#### Tasks
- [ ] 9.1 Implement proper `TourService.getStandings()`:
  - Aggregate player results across tour competitions
  - Calculate points using point_template or default formula
  - Handle ties appropriately
- [ ] 9.2 Add point_template_id to tours table (optional)
- [ ] 9.3 Create standings display component
- [ ] 9.4 Write tests for standings calculation

#### Notes
_Space for implementation notes_

---

### Phase 10: Polish & Edge Cases
**Goal**: Handle edge cases and improve UX

#### Tasks
- [ ] 10.1 Handle player deletion (what happens to enrollments?)
- [ ] 10.2 Handle tour deletion (cascade enrollments)
- [ ] 10.3 Add email validation in enrollment
- [ ] 10.4 Add pagination for large enrollment lists
- [ ] 10.5 Add search/filter for enrollments
- [ ] 10.6 E2E tests for critical flows

#### Notes
_Space for implementation notes_

---

## Progress Log

### 2025-12-24 - Phase 1 Complete
- Created initial implementation plan
- Analyzed existing codebase architecture
- Defined database schema for new tables
- Broke down work into 10 phases
- **Phase 1 completed:**
  - Created 3 database migrations (021, 022, 023)
  - Added TypeScript types for Tour enrollment system
  - Registered migrations in db.ts
  - Created 11 schema verification tests
  - Verified all 227 existing tests still pass

---

## Design Decisions

### Enrollment States
| State | Description | Transition From | Transition To |
|-------|-------------|-----------------|---------------|
| `pending` | Admin added email, no account | - | `active` (on registration) |
| `requested` | Player requested to join | - | `active` (approved) or deleted (rejected) |
| `active` | Fully enrolled | `pending`, `requested` | - |

### Admin Hierarchy
| Role | Scope | Can Manage |
|------|-------|------------|
| SUPER_ADMIN | Global | All tours |
| ADMIN | Global | Tours they created |
| PLAYER + tour_admin | Per-tour | Specific tours they're assigned to |

### Visibility Rules
| Setting | Who Can View |
|---------|--------------|
| `private` | SUPER_ADMIN, tour owner, tour admins, active enrollees |
| `public` | Everyone (including anonymous) |

### Registration Link Format
```
https://domain.com/register?email=player@example.com
```
- Email is URL-encoded
- Registration form pre-fills email field
- On successful registration, system checks for pending enrollments

---

## Open Questions

1. ~~Should rejected requests be tracked or just deleted?~~ **Decision: Just delete (simpler)**
2. Should there be email notifications for enrollment status changes? **Deferred to future**
3. Should tours have a maximum enrollment limit? **Not for MVP**
4. How to handle a player leaving a tour mid-season? **Need to decide**

---

## Technical Notes

### Key Files to Modify
- `src/database/migrations/` - New migrations
- `src/types/index.ts` - New types
- `src/services/tour.service.ts` - Extend or split
- `src/api/tours.ts` - New endpoints
- `src/services/auth.service.ts` - Auto-enrollment
- `frontend/src/views/admin/` - Admin UI
- `frontend/src/views/player/` - Player UI

### Patterns to Follow
- Factory functions for API creation
- Service classes with Database injection
- Prepared statements for all queries
- DTOs for create/update operations
- Consistent error handling with proper HTTP codes
