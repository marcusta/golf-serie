# Tour System Implementation Plan

> Living document for tracking the implementation of the full Tour feature set.
> Last updated: 2025-12-25 (Phase 13 complete, Phase 14 planned)

## Overview

Transform the existing basic Tour infrastructure into a full-featured individual competition system with:
- Player enrollment with multiple states (pending, requested, active)
- Configurable enrollment modes (closed, request-based)
- Configurable visibility (private, public)
- Multi-level admin system
- Auto-enrollment on registration for pre-enrolled emails
- Handicap support (gross, net, or both scoring modes)
- Player categories/classes with separate standings

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
- ~~Tour enrollment service (business logic)~~ ✅ Phase 2
- ~~Tour admin service (business logic)~~ ✅ Phase 3
- ~~API endpoints for enrollments and admins~~ ✅ Phase 4
- ~~Auto-enrollment logic on registration~~ ✅ Phase 5
- ~~Frontend UI for tour management~~ ✅ Phase 6
- ~~Registration flow with email pre-fill (frontend)~~ ✅ Phase 7
- ~~Complete tour standings calculation~~ ✅ Phase 9
- ~~Fix Series/Team leakage in Tour UI~~ ✅ Phase 10
- ~~Add current round quick access~~ ✅ Phase 10

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

### Phase 2: Tour Enrollment Service ✅ COMPLETE
**Goal**: Backend logic for managing enrollments

#### Tasks
- [x] 2.1 Create `TourEnrollmentService` with core methods:
  - `addPendingEnrollment(tourId, email)` - Admin adds email
  - `requestEnrollment(tourId, playerId)` - Player requests to join
  - `approveEnrollment(enrollmentId)` - Admin approves request
  - `rejectEnrollment(enrollmentId)` - Admin rejects (deletes) request
  - `getEnrollments(tourId, status?)` - List enrollments
  - `getEnrollmentByEmail(tourId, email)` - Check if email is enrolled
  - `activateEnrollment(tourId, email, playerId)` - Called when user registers
- [x] 2.2 Add method to check if user can view tour (based on visibility + enrollment)
- [x] 2.3 Write tests for enrollment service

#### Notes (2025-12-24)
**Files created:**
- `src/services/tour-enrollment.service.ts` - Full enrollment service implementation

**Service methods implemented:**
- `addPendingEnrollment(tourId, email)` - Creates pending enrollment with normalized email
- `requestEnrollment(tourId, playerId)` - Creates requested enrollment (validates tour allows requests)
- `approveEnrollment(enrollmentId)` - Changes requested → active
- `rejectEnrollment(enrollmentId)` - Deletes enrollment record
- `getEnrollments(tourId, status?)` - Lists enrollments with optional status filter
- `getEnrollmentByEmail(tourId, email)` - Case-insensitive email lookup
- `findById(id)` - Get enrollment by ID
- `activateEnrollment(tourId, email, playerId)` - Links player and activates pending enrollment
- `getPendingEnrollmentsForEmail(email)` - Find all pending enrollments for an email (for auto-enrollment)
- `canViewTour(tourId, userId)` - Authorization check (public tours, SUPER_ADMIN, owner, tour admin, active enrollee)
- `canManageTour(tourId, userId)` - Management authorization (SUPER_ADMIN, owner, tour admin)
- `getEnrollmentsForPlayer(playerId)` - All enrollments for a player
- `removeEnrollment(tourId, enrollmentId)` - Delete enrollment with tour validation

**Tests created:**
- `tests/tour-enrollment-service.test.ts` - 44 tests covering all service methods

**Verification:**
- All 44 new tests pass
- All 71 tour-related tests pass (schema + API + enrollment service)
- No regressions in backend tests

---

### Phase 3: Tour Admin Service ✅ COMPLETE
**Goal**: Manage tour-level admin assignments

#### Tasks
- [x] 3.1 Create `TourAdminService` with core methods:
  - `addTourAdmin(tourId, userId)` - Assign admin to tour
  - `removeTourAdmin(tourId, userId)` - Remove admin from tour
  - `getTourAdmins(tourId)` - List admins for tour
  - `isTourAdmin(tourId, userId)` - Check if user is tour admin
  - `getToursForAdmin(userId)` - Get all tours where user is admin
  - `canManageTour(userId, tourId)` - Check if user can manage tour
  - `canManageTourAdmins(userId, tourId)` - Check if user can manage tour admins (more restrictive)
  - `findById(id)` - Find tour admin by ID
- [x] 3.2 Authorization logic respects tour admins (canManageTour allows SUPER_ADMIN, owner, tour admin)
- [x] 3.3 Write tests for admin service

#### Notes (2025-12-24)
**Files created:**
- `src/services/tour-admin.service.ts` - Full tour admin service implementation

**Types added to `src/types/index.ts`:**
- `TourAdminWithUser` - Extends TourAdmin with user email and role

**Service methods implemented:**
- `addTourAdmin(tourId, userId)` - Validates tour/user exist, checks for duplicates
- `removeTourAdmin(tourId, userId)` - Removes tour admin assignment
- `getTourAdmins(tourId)` - Returns admins with user details, ordered by created_at
- `isTourAdmin(tourId, userId)` - Simple boolean check
- `getToursForAdmin(userId)` - Returns all tours where user is admin, ordered by name
- `canManageTour(tourId, userId)` - SUPER_ADMIN, owner, or tour admin can manage
- `canManageTourAdmins(tourId, userId)` - Only SUPER_ADMIN or owner can manage admins
- `findById(id)` - Get tour admin by ID

**Tests created:**
- `tests/tour-admin-service.test.ts` - 33 tests covering all service methods

**Verification:**
- All 33 new tests pass
- All 104 tour-related tests pass (schema + API + enrollment + admin service)
- No regressions in backend tests

---

### Phase 4: Tour API Endpoints ✅ COMPLETE
**Goal**: Expose enrollment and admin functionality via API

#### Tasks
- [x] 4.1 Add enrollment endpoints to tours API:
  - `POST /api/tours/:id/enrollments` - Add pending enrollment (admin)
  - `GET /api/tours/:id/enrollments` - List enrollments (admin)
  - `POST /api/tours/:id/enrollments/request` - Request to join (player)
  - `PUT /api/tours/:id/enrollments/:enrollmentId/approve` - Approve request
  - `DELETE /api/tours/:id/enrollments/:enrollmentId` - Reject/remove
- [x] 4.2 Add tour admin endpoints:
  - `GET /api/tours/:id/admins` - List tour admins
  - `POST /api/tours/:id/admins` - Add tour admin
  - `DELETE /api/tours/:id/admins/:userId` - Remove tour admin
- [x] 4.3 Update existing tour endpoints with visibility checks
- [x] 4.4 Add endpoint to generate registration link with email
- [x] 4.5 Write API tests

#### Notes (2025-12-24)
**Files modified:**
- `src/api/tours.ts` - Added 9 new endpoints for enrollments, admins, and registration link
- `src/app.ts` - Initialize TourEnrollmentService and TourAdminService, pass to API

**Enrollment endpoints implemented:**
- `GET /api/tours/:id/enrollments` - List enrollments with optional status filter
- `POST /api/tours/:id/enrollments` - Add pending enrollment (requires canManageTour)
- `POST /api/tours/:id/enrollments/request` - Player requests to join (requires auth)
- `PUT /api/tours/:id/enrollments/:enrollmentId/approve` - Approve request (requires canManageTour)
- `DELETE /api/tours/:id/enrollments/:enrollmentId` - Remove enrollment (requires canManageTour)

**Admin endpoints implemented:**
- `GET /api/tours/:id/admins` - List tour admins with user details (requires canManageTour)
- `POST /api/tours/:id/admins` - Add tour admin (requires canManageTourAdmins - more restrictive)
- `DELETE /api/tours/:id/admins/:userId` - Remove tour admin (requires canManageTourAdmins)

**Registration link endpoint:**
- `GET /api/tours/:id/registration-link?email=...` - Returns path for registration with pre-filled email

**Visibility checks added:**
- `GET /api/tours` - Now filters tours by visibility (uses canViewTour)
- `GET /api/tours/:id` - Returns 404 for private tours user can't view
- `GET /api/tours/:id/competitions` - Respects visibility
- `GET /api/tours/:id/standings` - Respects visibility

**Tests created:**
- `tests/tour-api-enrollments.test.ts` - 19 tests for enrollment endpoints
- `tests/tour-api-admins.test.ts` - 20 tests for admin and registration link endpoints
- Updated `tests/tours.test.ts` - 18 tests (added visibility behavior tests)

**Verification:**
- All 145 tour-related tests pass
- All 39 new API tests pass
- No regressions in existing functionality

---

### Phase 5: Auto-Enrollment on Registration ✅ COMPLETE
**Goal**: Automatically enroll users when they register with a pending email

#### Tasks
- [x] 5.1 Modify `AuthService.register()` to:
  - Check for pending enrollments matching the email
  - Create player profile if needed
  - Activate matching enrollments
- [x] 5.2 Return enrollment info in registration response
- [x] 5.3 Write tests for auto-enrollment flow

#### Notes (2025-12-24)
**Files modified:**
- `src/services/auth.service.ts` - Added auto-enrollment logic and new interfaces
- `src/app.ts` - Inject TourEnrollmentService and PlayerService into AuthService

**New types/interfaces added to `auth.service.ts`:**
- `RegisterResult` - Basic registration result (id, email, role)
- `RegisterResultWithEnrollments` - Extends with player_id and auto_enrollments
- `AuthServiceDependencies` - Optional services for auto-enrollment

**Implementation details:**
- `AuthService` now accepts optional `AuthServiceDependencies` with `tourEnrollmentService` and `playerService`
- `register()` method calls `processAutoEnrollments()` after creating the user
- `processAutoEnrollments()`:
  - Checks for pending enrollments via `getPendingEnrollmentsForEmail()`
  - Creates a player profile using email prefix as initial name
  - Activates all matching enrollments, linking them to the new player
  - Returns player_id and list of activated tours
- Backward compatible: works without services (no auto-enrollment)
- Error resilient: logs but doesn't fail if individual enrollment activation fails

**Registration response now includes:**
```json
{
  "user": {
    "id": 1,
    "email": "player@example.com",
    "role": "PLAYER",
    "player_id": 5,
    "auto_enrollments": [
      {
        "tour_id": 1,
        "tour_name": "Summer Tour 2025",
        "enrollment_id": 12
      }
    ]
  }
}
```

**Tests created:**
- `tests/auth-auto-enrollment.test.ts` - 15 tests covering:
  - Registration without pending enrollments
  - Registration with single pending enrollment
  - Registration with multiple pending enrollments
  - Backward compatibility (no services)
  - Error handling
  - Edge cases (special characters, case-insensitive matching)

**Verification:**
- All 15 new tests pass
- All 160 tour and auth-related tests pass
- No regressions in existing functionality

---

### Phase 6: Frontend - Admin Tour Management ✅ COMPLETE
**Goal**: UI for managing tour enrollments and settings

#### Tasks
- [x] 6.1 Add tour settings form (enrollment_mode, visibility)
- [x] 6.2 Create enrollment management view:
  - List pending/requested/active enrollments
  - Add email form with "Copy Registration Link" button
  - Approve/reject request buttons
- [x] 6.3 Create tour admin management view
- [x] 6.4 Update tour creation form with new settings

#### Notes (2025-12-24)
**Files modified:**
- `frontend/src/api/tours.ts` - Added types and hooks for enrollments and admins
- `frontend/src/views/admin/Tours.tsx` - Updated create/edit form with visibility and enrollment_mode settings
- `frontend/src/views/admin/TourDetail.tsx` - Complete rewrite with tabs for Competitions, Enrollments, and Admins
- `src/services/auth.service.ts` - Added `getAllUsers()` method
- `src/app.ts` - Added `/api/users` endpoint for admin user selection

**New API types added:**
- `TourEnrollmentStatus`, `TourEnrollmentMode`, `TourVisibility`
- `TourEnrollment`, `TourAdmin`, `CreateTourData`, `UpdateTourData`
- `TourCompetition` interface for typed competition data

**New React Query hooks:**
- `useTourEnrollments(tourId, status?)` - List enrollments with optional status filter
- `useAddEnrollment()` - Add pending enrollment by email
- `useApproveEnrollment()` - Approve requested enrollment
- `useRemoveEnrollment()` - Remove enrollment
- `useTourAdmins(tourId)` - List tour admins
- `useAddTourAdmin()` - Add user as tour admin
- `useRemoveTourAdmin()` - Remove tour admin
- `useUsers()` - List all users (for admin selection)

**UI Features implemented:**
- Tour cards now display visibility (public/private) and enrollment mode (closed/requests) badges
- Tour create/edit modal includes dropdown selects for visibility and enrollment mode
- TourDetail view has three tabs: Competitions, Enrollments, Admins
- Enrollments tab: Add email form, status filter buttons, copy registration link, approve/reject buttons
- Admins tab: User selector dropdown, list of tour admins with remove button, tour owner displayed

**Verification:**
- All 145 tour-related tests pass
- Frontend lint passes for new code (no new errors introduced)
- No regressions in existing functionality

---

### Phase 7: Frontend - Registration Flow ✅ COMPLETE
**Goal**: Support pre-filled email from registration links

#### Tasks
- [x] 7.1 Update registration page to read `?email=` query parameter
- [x] 7.2 Pre-fill and optionally disable email field when from link
- [x] 7.3 Show success message when auto-enrolled after registration
- [x] 7.4 Add "Request to Join" button on public tour pages

#### Notes (2025-12-24)
**Files modified:**
- `frontend/src/router.tsx` - Added search param validation for register route
- `frontend/src/api/auth.ts` - Added `AutoEnrollment` interface and updated `User` type
- `frontend/src/views/auth/Register.tsx` - Complete update with email pre-fill and auto-enrollment success
- `frontend/src/api/tours.ts` - Added `useRequestEnrollment()` and `usePlayerEnrollments()` hooks
- `src/app.ts` - Added `/api/player/enrollments` endpoint

**New files created:**
- `frontend/src/views/player/Tours.tsx` - Player tours page with enrollment status and request to join

**Registration flow features:**
- Email query parameter (`?email=...`) is parsed and validated in router
- When email is pre-filled from URL:
  - Email field is read-only with lock icon
  - Helper text indicates "email was provided via your invitation link"
- After registration with pending enrollments:
  - Success screen shows list of tours the user was auto-enrolled in
  - "Continue to Player View" button navigates to player home

**Player tours page features:**
- Lists "My Tours" (active enrollments) and "Available Tours" (public tours)
- Search functionality for finding tours
- Status badges show enrollment status (Active, Pending, Requested)
- "Request to Join" button for tours with `enrollment_mode: 'request'`
- Prompts unauthenticated users to sign in to join
- Shows "Invite only" for closed enrollment tours

**Verification:**
- All 145 tour-related tests pass
- All 15 auth-related tests pass
- No new lint errors introduced
- Frontend compiles successfully

---

### Phase 8: Player Tour Views, Documents & Hero Images ✅ COMPLETE
**Goal**: Tour browsing/viewing for players + document/hero image support (like Series)

#### Tasks - Database & Backend
- [x] 8.1 Create migration 024 for `banner_image_url` and `landing_document_id` on tours
- [x] 8.2 Create migration 025 for `tour_documents` table
- [x] 8.3 Add TypeScript types for `TourDocument`, `CreateTourDocumentDto`, etc.
- [x] 8.4 Create `TourDocumentService` with CRUD operations
- [x] 8.5 Update `TourService` to validate `landing_document_id`
- [x] 8.6 Add tour document API endpoints: `/api/tours/:tourId/documents`
- [x] 8.7 Write backend tests for tour documents

#### Tasks - Frontend Admin
- [x] 8.8 Add React Query hooks for tour documents
- [x] 8.9 Update admin `TourDetail.tsx` with Documents tab:
  - Document CRUD with markdown editor
  - Landing page settings
  - Banner image URL input

#### Tasks - Frontend Player
- [x] 8.10 Create tour listing page (respecting visibility) - Updated `Tours.tsx` with banner images
- [x] 8.11 Create `TourDetail.tsx` with:
  - Hero image display
  - Landing document / description
  - Competitions list
  - Enrollment status / request button
- [x] 8.12 Create `TourDocuments.tsx` - list tour documents
- [x] 8.13 Create `TourDocumentDetail.tsx` - view single document
- [x] 8.14 Create `TourCompetitions.tsx` - list tour competitions with filtering
- [x] 8.15 Add tour player routes to router.tsx

#### Notes (2025-12-24)
**Database migrations created:**
- `src/database/migrations/024_add_tour_fields.ts` - Adds `banner_image_url` and `landing_document_id` to tours
- `src/database/migrations/025_add_tour_documents.ts` - Creates `tour_documents` table with indexes

**Backend files created/modified:**
- `src/services/tour-document.service.ts` - Full CRUD service for tour documents
- `src/services/tour.service.ts` - Updated to handle banner_image_url and landing_document_id validation
- `src/api/tours.ts` - Added document endpoints (list, get, create, update, delete, types)
- `src/types/index.ts` - Added TourDocument and related DTOs

**Backend tests created:**
- `tests/tour-document-service.test.ts` - 27 tests for TourDocumentService
- `tests/tour-api-documents.test.ts` - 24 tests for document API endpoints

**Frontend admin files modified:**
- `frontend/src/api/tours.ts` - Added document hooks (useTourDocuments, useCreateTourDocument, etc.)
- `frontend/src/views/admin/TourDetail.tsx` - Added Documents and Settings tabs

**Frontend player files created:**
- `frontend/src/views/player/TourDetail.tsx` - Tour detail with hero, landing doc, competitions, enrollment
- `frontend/src/views/player/TourDocuments.tsx` - Document listing with search
- `frontend/src/views/player/TourDocumentDetail.tsx` - Single document view with navigation
- `frontend/src/views/player/TourCompetitions.tsx` - Competition listing with filters

**Frontend routing updated:**
- `frontend/src/router.tsx` - Added 4 new player tour routes

**Bug fixes:**
- Fixed TypeScript errors in `Competitions.tsx` for TourCompetition type handling

**Verification:**
- All 68 tour-related backend tests pass (27 document service + 24 document API + 17 existing)
- Frontend build passes with no TypeScript errors
- All new player views follow existing patterns (PlayerPageLayout, consistent styling)

---

### Phase 9: Tour Standings & Points ✅ COMPLETE
**Goal**: Complete the standings calculation for tours

#### Tasks
- [x] 9.1 Implement proper `TourService.getStandings()`:
  - Aggregate player results across tour competitions
  - Calculate points using point_template or default formula
  - Handle ties appropriately
- [x] 9.2 Add point_template_id to tours table (optional)
- [x] 9.3 Create standings display component
- [x] 9.4 Write tests for standings calculation

#### Notes (2025-12-24)
**Database migration created:**
- `src/database/migrations/026_add_tour_point_template.ts` - Adds `point_template_id` to tours table

**Backend files modified:**
- `src/services/tour.service.ts` - Complete rewrite with proper standings calculation
  - Added `getFullStandings()` for detailed competition breakdown per player
  - Calculates points using point template or default formula
  - Handles ties properly
  - Aggregates across multiple competitions
  - Only counts finished players (is_locked and valid scores)
- `src/api/tours.ts` - Updated standings endpoint to return full standings by default
  - Supports `?format=simple` query param for backward compatibility
- `src/types/index.ts` - Added `TourStandings`, `TourPlayerStanding` interfaces

**Backend tests created:**
- `tests/tour-standings.test.ts` - 14 comprehensive tests covering:
  - Empty tour scenarios
  - Single competition standings
  - Multiple competition aggregation
  - Tie handling
  - Point template usage
  - Default formula calculation
  - Manual scores support
  - Competition breakdown details
  - Legacy method compatibility

**Frontend files created:**
- `frontend/src/views/player/TourStandings.tsx` - Full standings page with:
  - Top 3 performers highlight cards
  - Expandable player details with competition breakdown
  - Score relative to par display
  - Share and export functionality
  - Loading and error states
- Added `useTourStandings()` hook to `frontend/src/api/tours.ts`
- Added standings link to `TourDetail.tsx` quick access cards
- Added route `/player/tours/$tourId/standings` to router.tsx

**Points calculation:**
- With point template: Uses custom points_structure (e.g., "1": 100, "2": 75, "default": 10)
- Default formula: 1st = N+2, 2nd = N, 3rd+ = N-(pos-1), min 0 (where N = number of enrolled players)

**Verification:**
- All 33 tour-related tests pass (14 standings + 19 existing)
- Frontend builds successfully
- No TypeScript errors

---

### Phase 10: UI Polish & Bug Fixes ✅ COMPLETE
**Goal**: Fix Series/Team leakage in Tour UI and improve UX

#### Bug Fixes

##### 10.1 Competition Leaderboard - Series/Team Leakage
**Problem**: When viewing a Tour competition, the leaderboard shows:
- "Team Result" tab (should be hidden for Tours)
- "Player/Team" column header (should be just "Player")
- "Individual Players Individual" under player names (team_name + position_name leaking)

**Files to modify:**
- `frontend/src/views/player/CompetitionDetail.tsx`

**Changes:**
- [x] 10.1.1 Add `tour_id` to frontend Competition type (already in backend)
- [x] 10.1.2 Hide "Team Result" tab when `competition.tour_id` is set
- [x] 10.1.3 Change column header from "Player/Team" to "Player" for Tour competitions
- [x] 10.1.4 Hide team_name display under player name for Tour competitions

##### 10.2 Scorecard Modal - Team/Position Leakage
**Problem**: Scorecard shows "Individual Players, Individual" instead of clean player display

**Files to modify:**
- `frontend/src/components/scorecard/ParticipantScorecard.tsx`
- `frontend/src/components/scorecard/Scorecard.tsx`

**Changes:**
- [x] 10.2.1 Pass `isTourCompetition` flag to scorecard components
- [x] 10.2.2 When tour competition, don't show team_name/position_name
- [x] 10.2.3 Only show player name in scorecard header for Tour participants

##### 10.3 Current Round Quick Access
**Problem**: No easy way to quickly access the currently open round from Tour detail page

**Files to modify:**
- `frontend/src/views/player/TourDetail.tsx`
- `frontend/src/views/player/TourCompetitions.tsx`

**Changes:**
- [x] 10.3.1 Add "Play Now" card/button on TourDetail when a round is currently open
- [x] 10.3.2 Highlight current open round in competitions list with visual indicator
- [x] 10.3.3 Show "Open until [date]" badge on current competition
- [x] 10.3.4 Add "Current Round" filter/jump button in TourCompetitions

#### Edge Cases (deferred)
- [ ] 10.4 Handle player deletion (what happens to enrollments?)
- [ ] 10.5 Handle tour deletion (cascade enrollments)
- [ ] 10.6 Add email validation in enrollment
- [ ] 10.7 Add pagination for large enrollment lists
- [ ] 10.8 E2E tests for critical flows

#### Notes (2025-12-24)
**Files modified:**
- `frontend/src/api/competitions.ts` - Added `tour_id` to Competition interface
- `frontend/src/api/tours.ts` - Updated TourCompetition interface with open mode fields (start_mode, open_start, open_end)
- `frontend/src/views/player/CompetitionDetail.tsx` - Hide Team Result tab for Tour competitions, pass isTourCompetition to LeaderboardComponent and ParticipantScorecard
- `frontend/src/components/competition/LeaderboardComponent.tsx` - Added isTourCompetition prop, conditional column header "Player" vs "Player/Team", hide team/position info for Tour competitions
- `frontend/src/components/scorecard/ParticipantScorecard.tsx` - Added isTourCompetition prop, conditionally hide type info in scorecard
- `frontend/src/views/player/TourDetail.tsx` - Added "Play Now" card with LIVE indicator for currently open rounds
- `frontend/src/views/player/TourCompetitions.tsx` - Added "Open Now" filter button, highlight open competitions with coral border/ring, LIVE badge, and "Open until" date display

**Verification:**
- Frontend TypeScript compilation passes
- All lint errors are pre-existing (not related to Phase 10 changes)
- No new regressions introduced

---

### Phase 11: Handicap Support ✅ IN PROGRESS
**Goal**: Allow tours to use gross, net, or both scoring modes

#### Background
Golf handicaps allow players of different skill levels to compete fairly. Net score = Gross score - Handicap strokes (distributed across holes based on stroke index).

**Swedish/WHS System:**
- Players have a **Handicap Index** (e.g., 15.4)
- Courses have **Course Rating** (CR) and **Slope Rating** (SR)
- **Course Handicap** = Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
- Course handicap is then distributed to holes based on stroke index

#### Database Changes

##### 11.1 Schema
```sql
-- Add scoring mode to tours
ALTER TABLE tours ADD COLUMN scoring_mode TEXT NOT NULL DEFAULT 'gross';
  -- 'gross': Raw scores only (current behavior)
  -- 'net': Net scores only (gross - handicap)
  -- 'both': Track and display both, points can be awarded for either

-- Tee boxes table (each course has multiple tee sets with different ratings)
CREATE TABLE course_tees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- "Championship", "Men", "Ladies", "Senior", "Yellow", "Red"
  color TEXT,                       -- "white", "yellow", "red", "blue" (for display)
  course_rating REAL NOT NULL,      -- CR - expected score for scratch golfer, e.g., 72.3
  slope_rating INTEGER NOT NULL DEFAULT 113,  -- SR - relative difficulty 55-155
  stroke_index TEXT,                -- JSON array [1-18] hole difficulty order (can differ per tee)
  pars TEXT,                        -- JSON array of pars (if different from course default)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, name)
);

-- Link competitions to specific tee box
ALTER TABLE competitions ADD COLUMN tee_id INTEGER REFERENCES course_tees(id);
  -- Which tee box is used for this competition
  -- NULL = use course defaults (backward compatible)

-- Players already have handicap column, but ensure it's used as Handicap Index
-- players.handicap is the Handicap Index (decimal, e.g., 15.4)

-- Track playing handicap per enrollment (may differ from profile handicap)
ALTER TABLE tour_enrollments ADD COLUMN playing_handicap REAL;
  -- Overrides player.handicap if set, allows tour-specific handicap index
```

**Example tee boxes for a course:**
| Name | Color | CR | SR | Notes |
|------|-------|-----|-----|-------|
| Championship | White | 74.2 | 138 | Back tees |
| Men | Yellow | 72.3 | 128 | Standard men's |
| Ladies | Red | 71.8 | 125 | Forward tees |
| Senior | Blue | 70.1 | 118 | Senior tees |

#### Tasks

##### Backend - Database
- [x] 11.1 Create migration 027 for `scoring_mode` on tours
- [x] 11.2 Create migration 028 for `course_tees` table
- [x] 11.3 Create migration 029 for `tee_id` on competitions
- [x] 11.4 Create migration 030 for `playing_handicap` on tour_enrollments
- [x] 11.5 Add TypeScript types:
  - `TourScoringMode = 'gross' | 'net' | 'both'`
  - `CourseTee` interface
  - `CreateCourseTeeDto`, `UpdateCourseTeeDto`

##### Backend - Handicap Utilities
- [x] 11.6 Create `src/utils/handicap.ts` with calculation functions:
  - `calculateCourseHandicap(handicapIndex, slopeRating, courseRating, par)` - WHS formula
  - `distributeHandicapStrokes(courseHandicap, strokeIndex)` - per-hole strokes array
  - `calculateNetScores(grossScores, handicapStrokes)` - per-hole net calculation
  - `calculateNetTotal(grossTotal, courseHandicap)` - simple total calculation
- [x] 11.7 Write comprehensive tests for handicap calculations (36 tests)

##### Backend - Services & API
- [x] 11.8 Create `CourseTeeService` with CRUD operations
- [x] 11.9 Add tee box API endpoints:
  - `GET /api/courses/:courseId/tees` - List tee boxes
  - `POST /api/courses/:courseId/tees` - Create tee box
  - `PUT /api/courses/:courseId/tees/:teeId` - Update tee box
  - `DELETE /api/courses/:courseId/tees/:teeId` - Delete tee box
- [x] 11.10 Update competition create/update to accept `tee_id`
- [x] 11.11 Update `TourService.getFullStandings()` to include scoring_mode
- [ ] 11.12 Update competition leaderboard API to return both gross and net when applicable
- [ ] 11.13 Add player handicap update endpoint: `PUT /api/players/:id/handicap`

##### Frontend Admin
- [x] 11.14 Add scoring_mode selector in tour create/edit form
- [x] 11.15 Create tee box management UI for courses:
  - List tee boxes with CR/SR display
  - Add/edit tee box modal (name, color, CR, SR)
  - Stroke Index editor (deferred for future)
- [ ] 11.16 Add tee box selector in competition create/edit form
- [ ] 11.17 Add playing_handicap field in enrollment management
- [ ] 11.18 Show calculated course handicap preview when editing enrollment

##### Frontend Player
- [ ] 11.19 Add handicap display/edit on player profile page
- [ ] 11.20 Show tee box info on competition detail (name, color, CR/SR)
- [ ] 11.21 Update leaderboard to show Net column when applicable
- [ ] 11.22 Update standings to show both Gross and Net when mode is 'both'
- [ ] 11.23 Update scorecard to display:
  - Handicap strokes per hole (dots or indicators)
  - Net score per hole (when tour uses net)
  - Net total alongside gross total
- [ ] 11.24 Show player's course handicap for the competition

#### Design Decisions

##### Course Handicap Calculation (WHS Formula)
```
Course Handicap = (Handicap Index × Slope Rating / 113) + (Course Rating - Par)
```

**Example:**
- Player Handicap Index: 15.4
- Course: Par 72, CR 72.3, SR 128
- Course Handicap = (15.4 × 128 / 113) + (72.3 - 72) = 17.4 + 0.3 = 17.7 → **18**

##### Handicap Stroke Distribution
- Course handicap is rounded to nearest integer
- Strokes distributed to holes based on stroke_index
- Hole with stroke_index 1 is hardest, gets first stroke
- If course handicap > 18, second round starts at stroke_index 1
- If course handicap > 36, third round starts, etc.

**Example:** Course handicap 23, stroke_index = [5, 13, 1, 9, ...]
- Holes with stroke_index 1-18: get 1 stroke each
- Holes with stroke_index 1-5: get 2nd stroke (5 extra strokes)
- Total: 18 + 5 = 23 strokes distributed

##### Net Score Calculation
- Per-hole: Net = Gross - Handicap Strokes for that hole
- Total: Net Total = Gross Total - Course Handicap

##### Leaderboard Display
| Mode | Columns Shown | Ranking By |
|------|---------------|------------|
| gross | Gross, To Par | Gross |
| net | Net, Gross | Net |
| both | Gross, Net, To Par | Configurable (default: Net) |

##### Player Handicap Sources (Priority Order)
1. `tour_enrollments.playing_handicap` - Tour-specific override
2. `players.handicap` - Player's profile handicap index
3. Default: 0 (scratch)

#### Notes (2025-12-25)
**Database migrations created:**
- `src/database/migrations/027_add_tour_scoring_mode.ts` - Adds `scoring_mode` column to tours table
- `src/database/migrations/028_add_course_tees.ts` - Creates `course_tees` table with CR, SR, stroke_index, pars
- `src/database/migrations/029_add_competition_tee_id.ts` - Adds `tee_id` to competitions table
- `src/database/migrations/030_add_enrollment_playing_handicap.ts` - Adds `playing_handicap` to tour_enrollments

**Backend files created:**
- `src/utils/handicap.ts` - Comprehensive handicap calculation utilities:
  - `calculateCourseHandicap()` - WHS formula implementation
  - `distributeHandicapStrokes()` - Distributes handicap strokes to holes based on stroke index
  - `calculateNetScores()` - Per-hole net score calculation
  - `calculateNetTotal()` - Simple total calculation
  - `calculateFullNetScoreResult()` - Combined calculation returning all results
  - `getDefaultStrokeIndex()` - Provides standard 1-18 stroke index
- `src/services/course-tee.service.ts` - Full CRUD service for course tees with validation
  - Validates course rating (50-90), slope rating (55-155)
  - Validates stroke index contains 1-18 exactly once
  - Prevents duplicate tee names per course
  - Prevents deletion of tees used in competitions

**Backend files modified:**
- `src/api/courses.ts` - Added 5 new tee box endpoints (GET list, GET single, POST, PUT, DELETE)
- `src/services/competition-service.ts` - Added tee_id validation in create/update
- `src/services/tour.service.ts` - Added scoring_mode handling, updated standings to return scoring_mode
- `src/types/index.ts` - Added CourseTee, TourScoringMode, handicap-related interfaces
- `src/database/db.ts` - Registered migrations 027-030
- `src/app.ts` - Initialize CourseTeeService, add tee route handlers

**Backend tests created:**
- `tests/handicap-utils.test.ts` - 36 comprehensive tests for handicap calculations
- `tests/course-tees.test.ts` - 30 tests for CourseTeeService and API

**Frontend files modified:**
- `frontend/src/api/tours.ts` - Added TourScoringMode type, updated Tour/TourStandings interfaces
- `frontend/src/api/courses.ts` - Added CourseTee types and CRUD hooks
- `frontend/src/views/admin/Tours.tsx` - Added scoring_mode selector in create/edit modal, scoring mode badge
- `frontend/src/views/admin/TourDetail.tsx` - Added scoring_mode selector in Settings tab, scoring mode badge in header
- `frontend/src/views/admin/Courses.tsx` - Added tee box management dialog with CRUD operations

**Verification:**
- All 36 handicap utility tests pass
- All 30 course tee tests pass
- All 14 tour standings tests pass
- Frontend TypeScript compilation passes
- No regressions in existing functionality

---

### Phase 12: Player Categories/Classes ✅ COMPLETE
**Goal**: Support different player groups within a tour, each with separate standings

#### Background
Tours often need to segment players into categories for fairer competition:
- Gender: Men's, Women's
- Age: Seniors (55+), Juniors (under 18)
- Handicap ranges: A-Class (0-12), B-Class (13-24), C-Class (25+)
- Mixed: "Senior Women", "Junior Boys", etc.

Each category has its own leaderboard and points calculation, but all play the same competitions.

#### Database Changes

##### 12.1 Schema
```sql
-- Tour categories table
CREATE TABLE tour_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- "Men", "Women", "Seniors", "A-Class"
  description TEXT,                 -- Optional longer description
  sort_order INTEGER DEFAULT 0,     -- Display order
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tour_id, name)
);

-- Add category to enrollments
ALTER TABLE tour_enrollments ADD COLUMN category_id INTEGER REFERENCES tour_categories(id) ON DELETE SET NULL;

-- Optional: Auto-assignment rules (future enhancement)
-- CREATE TABLE tour_category_rules (
--   id INTEGER PRIMARY KEY,
--   category_id INTEGER REFERENCES tour_categories(id),
--   rule_type TEXT,  -- 'handicap_range', 'gender', 'age_range'
--   rule_value TEXT  -- JSON: {"min": 0, "max": 12} or {"gender": "M"}
-- );
```

#### Tasks

##### Backend
- [x] 12.1 Create migration 031 for `tour_categories` table
- [x] 12.2 Create migration 032 for `category_id` on tour_enrollments
- [x] 12.3 Add TypeScript types: `TourCategory`, `CreateTourCategoryDto`
- [x] 12.4 Create `TourCategoryService`:
  - `create(tourId, data)` - Create category
  - `update(id, data)` - Update category
  - `delete(id)` - Delete category (set enrollments to null)
  - `findByTour(tourId)` - List categories for tour
  - `findById(id)` - Get single category
  - `reorder(tourId, categoryIds)` - Update sort order
- [x] 12.5 Add category API endpoints:
  - `GET /api/tours/:id/categories` - List categories
  - `POST /api/tours/:id/categories` - Create category
  - `PUT /api/tours/:id/categories/:categoryId` - Update category
  - `DELETE /api/tours/:id/categories/:categoryId` - Delete category
  - `PUT /api/tours/:id/categories/reorder` - Reorder categories
- [x] 12.6 Update enrollment endpoints to accept/return category_id:
  - `PUT /api/tours/:id/enrollments/:enrollmentId/category` - Assign category
  - `PUT /api/tours/:id/enrollments/bulk-category` - Bulk assign category
- [x] 12.7 Update `TourService.getFullStandings()`:
  - Accept optional `categoryId` filter
  - Return category info with standings
  - When no filter, return all players (overall standings)
- [x] 12.8 Update standings API: `GET /api/tours/:id/standings?category=:categoryId`
- [x] 12.9 Write tests for category service and API (46 tests total)

##### Frontend Admin
- [x] 12.10 Add Categories tab in tour admin detail
- [x] 12.11 Category management UI:
  - Create/edit/delete categories
  - Up/down reordering buttons
  - Show enrollment count per category
- [x] 12.12 Add category selector in enrollment management
- [x] 12.13 Bulk category assignment via dropdown in enrollment list

##### Frontend Player
- [x] 12.14 Update TourStandings with category tabs/filter
- [ ] 12.15 Show category name on player cards in standings (deferred)
- [ ] 12.16 Update TourDetail to show categories overview (deferred)
- [ ] 12.17 Competition leaderboard category filter (deferred)

#### Design Decisions

##### Category Assignment
- Manual assignment by admin (MVP)
- Optional: Auto-assignment based on rules (future)
- Players can only be in one category per tour
- Category is optional (null = "uncategorized" or "overall only")

##### Standings Display
```
Tour Standings
├── Overall (all players)
├── Men (category)
├── Women (category)
└── Seniors (category)
```

- Default view: Overall standings
- Tab/dropdown to switch categories
- Each category shows only players in that category
- Points are calculated separately per category

##### Points Calculation
- Each category calculates positions independently
- Example: If Men's category has 10 players, 1st place Men gets points for position 1 out of 10
- Overall standings can either:
  - (A) Sum category points (players compete within their category)
  - (B) Calculate globally (all players compete together) - **Default for MVP**

#### Notes (2025-12-25)
**Database migrations created:**
- `src/database/migrations/031_add_tour_categories.ts` - Creates `tour_categories` table with indexes
- `src/database/migrations/032_add_enrollment_category.ts` - Adds `category_id` to `tour_enrollments`

**Backend files created/modified:**
- `src/services/tour-category.service.ts` - Full CRUD service with:
  - `create(tourId, data)` - Create category with auto sort_order
  - `update(id, data)` - Update name/description
  - `delete(id)` - Delete category, clears enrollment category_id
  - `findById(id)` - Get single category
  - `findByTour(tourId)` - List with enrollment counts
  - `reorder(tourId, categoryIds)` - Update sort order
  - `assignToEnrollment(enrollmentId, categoryId)` - Single assignment
  - `bulkAssign(enrollmentIds, categoryId)` - Bulk assignment
  - `getEnrollmentsByCategory(categoryId)` - List enrollments in category
- `src/api/tours.ts` - Added 7 new category endpoints:
  - GET/POST `/api/tours/:id/categories`
  - PUT/DELETE `/api/tours/:id/categories/:categoryId`
  - PUT `/api/tours/:id/categories/reorder`
  - PUT `/api/tours/:id/enrollments/:enrollmentId/category`
  - PUT `/api/tours/:id/enrollments/bulk-category`
- `src/services/tour-enrollment.service.ts` - Updated to include category_name via JOIN
- `src/services/tour.service.ts` - Updated `getFullStandings()` to accept categoryId filter
- `src/types/index.ts` - Added TourCategory, CreateTourCategoryDto, UpdateTourCategoryDto, TourCategoryWithCount

**Backend tests created:**
- `tests/tour-category-service.test.ts` - 27 tests for TourCategoryService
- `tests/tour-api-categories.test.ts` - 19 tests for category API endpoints

**Frontend files modified:**
- `frontend/src/api/tours.ts` - Added category types and 8 React Query hooks:
  - `useTourCategories`, `useCreateTourCategory`, `useUpdateTourCategory`, `useDeleteTourCategory`
  - `useReorderTourCategories`, `useAssignEnrollmentCategory`, `useBulkAssignCategory`
  - Updated `useTourStandings` to accept optional categoryId parameter
- `frontend/src/views/admin/TourDetail.tsx` - Added Categories tab with:
  - Create/edit/delete category dialog
  - Up/down reorder buttons with sort_order
  - Enrollment count display per category
  - Category selector dropdown in enrollment list
- `frontend/src/views/player/TourStandings.tsx` - Added category filter tabs:
  - "All Players" tab for overall standings
  - Category tabs when categories exist
  - Persists filter selection in query

**Key implementation details:**
- Route ordering fix: `/categories/reorder` route defined before `/:categoryId` parameterized routes
- Category deletion sets `category_id` to NULL on enrollments via service (no FK cascade)
- Standings endpoint returns `categories` array with `selected_category_id` for UI sync
- Player standings include `category_id` and `category_name` when available

**Verification:**
- All 46 new category tests pass (27 service + 19 API)
- All 550+ backend tests pass
- Frontend TypeScript compilation passes
- No regressions in existing functionality

---

### Phase 13: Tee Box Gender-Specific Ratings ✅ COMPLETE
**Goal**: Fix data model to support gender-specific course ratings per tee box

#### Background
The current `course_tees` table has a single `course_rating` and `slope_rating` per tee box. However, in the World Handicap System (WHS), the **same physical tee box** has different ratings depending on the gender of the player:

**Example - Landeryd Classic Yellow Tees:**
| Gender | Course Rating | Slope Rating |
|--------|---------------|--------------|
| Men | 67.2 | 118 |
| Women | 69.5 | 122 |

This is because women typically have shorter driving distances, making the same course relatively longer/harder for them.

#### Current Problem
```sql
-- Current schema (incorrect for WHS)
CREATE TABLE course_tees (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL,
  name TEXT NOT NULL,           -- "Yellow", "Red", etc.
  color TEXT,
  course_rating REAL NOT NULL,  -- Only ONE rating!
  slope_rating INTEGER NOT NULL, -- Only ONE slope!
  stroke_index TEXT,
  ...
);
```

#### Proposed Schema Change
```sql
-- Option A: Add gender-specific columns
ALTER TABLE course_tees ADD COLUMN course_rating_women REAL;
ALTER TABLE course_tees ADD COLUMN slope_rating_women INTEGER;
-- Rename existing columns for clarity
-- course_rating -> course_rating_men
-- slope_rating -> slope_rating_men

-- Option B: Separate ratings table (more flexible) ✅ CHOSEN
CREATE TABLE course_tee_ratings (
  id INTEGER PRIMARY KEY,
  tee_id INTEGER NOT NULL REFERENCES course_tees(id) ON DELETE CASCADE,
  gender TEXT NOT NULL,          -- 'men', 'women'
  course_rating REAL NOT NULL,
  slope_rating INTEGER NOT NULL,
  UNIQUE(tee_id, gender)
);
```

#### Tasks
- [x] 13.1 Decide on schema approach (Option A vs B) - **Chose Option B (separate ratings table)**
- [x] 13.2 Create migration to update course_tees or add course_tee_ratings
- [x] 13.3 Update CourseTeeService to handle gender-specific ratings
- [x] 13.4 Update tee box API endpoints
- [x] 13.5 Update handicap calculation to use correct gender-based CR/SR
- [x] 13.6 Update frontend tee box management UI for dual ratings
- [x] 13.7 Update existing tee box data with correct gender-specific ratings (via migration)
- [x] 13.8 Write tests for gender-specific handicap calculations

#### Notes (2025-12-25)
**Schema Decision: Option B (Separate Ratings Table)**
Chose Option B for several reasons:
- More normalized database design
- Extensible for future categories (juniors, seniors, etc.)
- No need to rename existing columns
- Cleaner queries with JOIN on gender
- Better data integrity with UNIQUE constraint

**Database migration created:**
- `src/database/migrations/033_add_course_tee_ratings.ts` - Creates `course_tee_ratings` table
  - Migrates existing tee data to men's ratings automatically
  - Preserves legacy `course_rating`/`slope_rating` columns for backward compatibility

**Backend files modified:**
- `src/services/course-tee.service.ts` - Added rating methods:
  - `getRatingsForTee(teeId)` - Get all ratings for a tee
  - `getRatingByGender(teeId, gender)` - Get rating by gender
  - `getRatingById(id)` - Get rating by ID
  - `upsertRating(teeId, data)` - Create or update rating (INSERT OR REPLACE)
  - `updateRating(id, data)` - Update existing rating
  - `deleteRating(id)` - Delete rating by ID
  - `deleteRatingByGender(teeId, gender)` - Delete rating by gender
  - Updated `create()` to accept ratings array and create gender-specific ratings
  - Updated `parseRow()` to include ratings when fetching tees
- `src/api/courses.ts` - Added 5 new rating endpoints:
  - `GET /api/courses/:courseId/tees/:teeId/ratings` - List all ratings
  - `GET /api/courses/:courseId/tees/:teeId/ratings/:gender` - Get by gender
  - `POST /api/courses/:courseId/tees/:teeId/ratings` - Upsert rating
  - `PUT /api/courses/:courseId/tees/:teeId/ratings/:ratingId` - Update rating
  - `DELETE /api/courses/:courseId/tees/:teeId/ratings/:gender` - Delete by gender
- `src/utils/handicap.ts` - Added gender-based calculation utilities:
  - `getRatingForGender(ratings, gender, fallbackCR?, fallbackSR?)` - Get correct rating for gender
  - `calculateFullHandicapWithGender(handicapIndex, ratings, gender, par, strokeIndex, ...)` - Full calculation with gender
- `src/types/index.ts` - Added types:
  - `TeeRatingGender = "men" | "women"`
  - `CourseTeeRating` interface
  - `CreateCourseTeeRatingDto`, `UpdateCourseTeeRatingDto`

**Backend tests created:**
- `tests/course-tee-ratings.test.ts` - 24 tests for service and handicap utilities:
  - CourseTeeService rating methods (create, upsert, update, delete, cascade delete)
  - Validation (course rating 50-90, slope rating 55-155, valid gender)
  - `getRatingForGender` utility with fallbacks
  - `calculateFullHandicapWithGender` with real-world examples
- `tests/course-tee-ratings-api.test.ts` - 18 tests for API endpoints:
  - GET ratings list and by gender
  - POST upsert (create new, update existing)
  - PUT update individual rating
  - DELETE by gender
  - Tees with ratings included in response
  - Create tee with ratings array

**Frontend files modified:**
- `frontend/src/api/courses.ts` - Added types and hooks:
  - `TeeRatingGender`, `CourseTeeRating`, `CreateCourseTeeRatingData`, `UpdateCourseTeeRatingData`
  - `useCourseTeeRatings(courseId, teeId)` - Fetch ratings for tee
  - `useUpsertCourseTeeRating()` - Create/update rating
  - `useDeleteCourseTeeRating()` - Delete rating by gender
  - Updated `CourseTee` interface to include `ratings?: CourseTeeRating[]`
  - Updated `CreateCourseTeeData` to accept `ratings` array
- `frontend/src/views/admin/Courses.tsx` - Updated tee management UI:
  - Added separate Men's and Women's rating sections
  - Course Rating and Slope Rating inputs for each gender
  - Checkbox toggle to include women's rating
  - Displays both ratings in tee list (Men: CR/SR, Women: CR/SR)
  - Create/edit forms support ratings array

**Verification:**
- All 42 new tests pass (24 service + 18 API)
- All 30 existing course tee tests pass
- Frontend TypeScript compilation passes
- No regressions in existing functionality
- Backward compatible: legacy `course_rating`/`slope_rating` fields preserved

---

### Phase 14: Fix Categories & Net Scores Display
**Goal**: Debug and fix missing category and net score display in leaderboards/standings

#### Background
Phase 11 added `scoring_mode` ('gross', 'net', 'both') to tours and Phase 12 added player categories. However, when viewing a tour with these features enabled:
- Category filter tabs may not be showing in standings
- Net scores are not displayed in leaderboards
- Competition results don't show both gross and net rankings
- Category-filtered standings may not be calculating correctly

#### Known Issues
1. **Standings page**: Category tabs added but may not be receiving categories from API
2. **Leaderboard**: No net score column even when tour.scoring_mode is 'net' or 'both'
3. **Competition detail**: No indication of which tee box was used
4. **Scorecard**: No handicap stroke indicators per hole
5. **Player standings**: Category name not displayed on player cards

#### Tasks

##### Backend Investigation
- [ ] 14.1 Verify standings API returns categories array correctly
- [ ] 14.2 Verify category filtering in getFullStandings() works
- [ ] 14.3 Add net score calculation to competition leaderboard API
- [ ] 14.4 Ensure competition has tee_id linked for handicap calculation

##### Frontend - Standings
- [ ] 14.5 Debug category tabs not appearing in TourStandings
- [ ] 14.6 Add category name display on player standing cards
- [ ] 14.7 Show both gross and net points when scoring_mode is 'both'

##### Frontend - Leaderboard
- [ ] 14.8 Add Net column to LeaderboardComponent when applicable
- [ ] 14.9 Show tee box info (name, CR, SR) on competition detail
- [ ] 14.10 Add toggle between Gross/Net ranking when mode is 'both'

##### Frontend - Scorecard
- [ ] 14.11 Display handicap strokes per hole (dots/indicators)
- [ ] 14.12 Show net score per hole alongside gross
- [ ] 14.13 Display player's course handicap for the competition

#### Notes
_Space for implementation notes_

---

### Phase 15: Future Enhancements (Backlog)
**Goal**: Track potential future improvements

#### Potential Features
- [ ] Email notifications for enrollment status changes
- [ ] Maximum enrollment limit per tour
- [ ] Waitlist when tour is full
- [ ] Player transfer between tours
- [ ] Season/year rollover for recurring tours
- [ ] Auto-category assignment based on handicap/age/gender rules
- [ ] Handicap index calculation and tracking
- [ ] World Handicap System (WHS) integration
- [ ] Multiple rounds per competition (36-hole events)
- [ ] Cut line after round 1 for multi-round events

---

## Progress Log

### 2025-12-25 - Phase 13 Complete
- **Phase 13 completed (Tee Box Gender-Specific Ratings):**
  - Chose Option B (separate `course_tee_ratings` table) for flexibility and normalization
  - Created migration 033 for `course_tee_ratings` table with automatic data migration
  - Updated `CourseTeeService` with 7 new rating methods (getRatings, upsert, update, delete)
  - Added 5 new API endpoints for rating management
  - Updated handicap utilities with gender-aware calculation functions
  - Added `TeeRatingGender`, `CourseTeeRating` types to backend and frontend
  - Updated frontend tee management UI with Men's and Women's rating sections
  - Created 42 comprehensive tests (24 service + 18 API)
  - All tests pass, frontend builds successfully
  - Backward compatible with legacy `course_rating`/`slope_rating` fields preserved

### 2025-12-25 - Phase 12 Complete
- **Phase 12 completed (Player Categories/Classes):**
  - Created 2 database migrations (031, 032) for tour_categories table and category_id on enrollments
  - Created `TourCategoryService` with full CRUD, reorder, and enrollment assignment
  - Added 7 category API endpoints to tours.ts
  - Updated `TourEnrollmentService` to include category_name via JOIN
  - Updated `TourService.getFullStandings()` with category filtering
  - Created 46 comprehensive tests (27 service + 19 API)
  - Added Categories tab in admin TourDetail with create/edit/delete/reorder UI
  - Added category selector dropdown in enrollment management
  - Updated player TourStandings with category filter tabs
  - Added 8 React Query hooks for categories
  - All 550+ backend tests pass
  - Frontend TypeScript compilation passes

### 2025-12-25 - Phase 11 In Progress
- **Phase 11 backend implementation complete:**
  - Created 4 database migrations (027-030) for scoring_mode, course_tees, tee_id, playing_handicap
  - Created `src/utils/handicap.ts` with WHS formula implementation
  - Created `CourseTeeService` with full CRUD and validation
  - Added 5 tee box API endpoints to courses.ts
  - Updated competition service for tee_id support
  - Updated tour service for scoring_mode support
  - Created 36 handicap utility tests (all pass)
  - Created 30 course tee tests (all pass)
- **Phase 11 frontend admin implementation complete:**
  - Added scoring_mode selector to tour create/edit modal in Tours.tsx
  - Added scoring_mode badge display in tour list and TourDetail header
  - Added scoring_mode selector to TourDetail settings tab
  - Created tee box management dialog in Courses.tsx (list, add, edit, delete tees)
  - Added React Query hooks for course tees (useCourseTees, useCreateCourseTee, etc.)
- **Remaining frontend player tasks deferred:**
  - Handicap display on player profile
  - Tee box info on competition detail
  - Net column in leaderboard
  - Handicap strokes on scorecard

### 2025-12-24 - Phase 10 Complete
- **Phase 10 completed (UI Polish & Bug Fixes):**
  - **10.1 Competition Leaderboard - Series/Team Leakage:**
    - Added `tour_id` to frontend Competition interface
    - "Team Result" tab now hidden for Tour competitions
    - Column header shows "Player" instead of "Player/Team" for Tours
    - Team/position info hidden under player names for Tour competitions
  - **10.2 Scorecard Modal - Team/Position Leakage:**
    - Added `isTourCompetition` prop to ParticipantScorecard
    - Scorecard header now shows only player name for Tour participants
    - Team/position "type" display hidden for Tour competitions
  - **10.3 Current Round Quick Access:**
    - Added "Play Now" card on TourDetail with LIVE indicator for open rounds
    - Shows "Open until [date]" with formatted end time
    - Added `TourCompetition` interface with open mode fields (start_mode, open_start, open_end)
    - Added "Open Now" filter button in TourCompetitions (only shows when there are open competitions)
    - Open competitions highlighted with coral border, ring, and LIVE badge
    - Competition cards show "OPEN NOW" badge and "Open until [date]" text
  - Edge cases (10.4-10.8) deferred for future implementation
  - All frontend TypeScript compilation passes
  - No new regressions introduced

### 2025-12-24 - Phases 10-12 Planned
- **Identified UI bugs from manual testing:**
  - Competition leaderboard shows "Team Result" tab for Tour competitions (should be hidden)
  - "Player/Team" column header showing instead of just "Player"
  - "Individual Players Individual" team/position leakage under player names
  - Scorecard modal shows "Individual Players, Individual"
  - No quick access to current open round from Tour detail page
- **Added Phase 10: UI Polish & Bug Fixes**
  - Tasks to fix Series/Team leakage in CompetitionDetail.tsx
  - Tasks to fix scorecard modal display
  - Tasks to add "Play Now" quick access for current round
- **Added Phase 11: Handicap Support**
  - Schema for `scoring_mode` on tours ('gross', 'net', 'both')
  - Schema for `course_tees` table (CR, SR, stroke_index per tee box)
  - Schema for `tee_id` on competitions (link to specific tee box)
  - Schema for `playing_handicap` on enrollments (override player's default)
  - WHS formula for course handicap calculation
  - Handicap stroke distribution based on stroke index
  - Handicap calculation utilities in `src/utils/handicap.ts`
  - CourseTeeService with full CRUD
  - Tee box management UI for courses
  - Tee box selector in competition form
  - Player handicap profile management
  - Leaderboard/standings updates for net scores
  - Scorecard display with handicap strokes per hole
- **Added Phase 12: Player Categories/Classes**
  - Schema for `tour_categories` table
  - Schema for `category_id` on enrollments
  - TourCategoryService with full CRUD
  - Category-filtered standings
  - Admin UI for category management
  - Player UI for category standings view
- **Added Phase 13: Future Enhancements backlog**

### 2025-12-24 - Phase 9 Complete
- **Phase 9 completed:**
  - Created migration 026 for `point_template_id` on tours table
  - Rewrote `TourService.getStandings()` with full standings calculation
  - Added `getFullStandings()` method with detailed competition breakdown
  - Points calculation uses point template or default formula
  - Proper tie handling and position assignment
  - Only counts finished players (locked with valid scores)
  - Updated API endpoint to return full standings by default
  - Created 14 comprehensive backend tests for standings
  - Created `TourStandings.tsx` frontend component
  - Added `useTourStandings()` React Query hook
  - Added standings link to TourDetail quick access
  - Added route `/player/tours/$tourId/standings`
  - All 33 tour-related tests passing
  - Frontend builds successfully

### 2025-12-24 - Phase 8 Complete
- **Phase 8 completed:**
  - Created migrations 024 and 025 for tour banner_image_url, landing_document_id, and tour_documents table
  - Created `TourDocumentService` with full CRUD operations
  - Updated `TourService` to validate landing_document_id belongs to the same tour
  - Added 6 new API endpoints for tour documents (list, get, create, update, delete, types)
  - Created 51 backend tests for documents (27 service + 24 API)
  - Added React Query hooks for tour documents
  - Updated admin `TourDetail.tsx` with Documents and Settings tabs
  - Created 4 new player views: TourDetail, TourDocuments, TourDocumentDetail, TourCompetitions
  - Updated `Tours.tsx` to display banner images in tour cards
  - Added 4 new player routes for tour navigation
  - Fixed pre-existing TypeScript errors in `Competitions.tsx` for TourCompetition type handling
  - All 68+ tour-related backend tests passing
  - Frontend builds successfully with no TypeScript errors

### 2025-12-24 - Phase 7 Complete
- **Phase 7 completed:**
  - Updated `Register.tsx` to read `?email=` query parameter and pre-fill email field
  - Email field shows read-only with lock icon when pre-filled from invitation link
  - Added auto-enrollment success screen showing tours the user was enrolled in
  - Created `frontend/src/views/player/Tours.tsx` - player tours page
  - Added `useRequestEnrollment()` and `usePlayerEnrollments()` hooks to tours API
  - Added `/api/player/enrollments` endpoint for getting current player's enrollments
  - Player tours page shows "My Tours" and "Available Tours" sections
  - "Request to Join" button for tours with request-based enrollment
  - All 145 tour-related tests passing
  - All 15 auth-related tests passing
  - No new lint errors introduced

### 2025-12-24 - Phase 6 Complete
- **Phase 6 completed:**
  - Added frontend types and React Query hooks for enrollments and admins
  - Updated `Tours.tsx` with visibility and enrollment_mode settings in create/edit modal
  - Complete rewrite of `TourDetail.tsx` with tabbed interface (Competitions, Enrollments, Admins)
  - Added enrollment management: add by email, status filters, copy registration link, approve/reject
  - Added admin management: user selector, admin list with remove capability
  - Added `/api/users` endpoint and `getAllUsers()` method to AuthService
  - All 145 tour-related tests passing
  - No new lint errors introduced

### 2025-12-24 - Phase 5 Complete
- **Phase 5 completed:**
  - Modified `AuthService.register()` to check for pending tour enrollments
  - Added `AuthServiceDependencies` interface for optional service injection
  - Implemented `processAutoEnrollments()` for automatic player creation and enrollment activation
  - Registration response now includes `player_id` and `auto_enrollments` when applicable
  - Created 15 comprehensive tests in `tests/auth-auto-enrollment.test.ts`
  - Updated `app.ts` to inject enrollment and player services into auth service
  - All 160 tour and auth-related tests passing

### 2025-12-24 - Phase 4 Complete
- **Phase 4 completed:**
  - Added 9 new API endpoints to `src/api/tours.ts`
  - Enrollment endpoints: list, add, request, approve, remove
  - Admin endpoints: list, add, remove
  - Registration link endpoint for generating invite URLs
  - Updated existing GET endpoints with visibility checks
  - Updated `src/app.ts` to initialize enrollment and admin services
  - Created 39 new API tests across 2 test files
  - Updated 18 existing tests for visibility behavior
  - All 145 tour-related tests passing

### 2025-12-24 - Phase 3 Complete
- **Phase 3 completed:**
  - Created `TourAdminService` with 8 methods
  - Implemented admin assignment/removal lifecycle
  - Added `canManageTourAdmins` for more restrictive admin management
  - Added `TourAdminWithUser` type for listing admins with user details
  - Created 33 comprehensive tests for the admin service
  - All 104 tour-related tests passing

### 2025-12-24 - Phase 2 Complete
- **Phase 2 completed:**
  - Created `TourEnrollmentService` with 13 methods
  - Implemented full enrollment lifecycle (pending → active, requested → active)
  - Added authorization methods (`canViewTour`, `canManageTour`)
  - Created 44 comprehensive tests for the enrollment service
  - All 71 tour-related tests passing

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
- `src/database/migrations/` - New migrations ✅
- `src/types/index.ts` - New types ✅
- `src/services/tour.service.ts` - Extend with standings ✅
- `src/services/tour-enrollment.service.ts` - Enrollment business logic ✅
- `src/services/tour-admin.service.ts` - Admin management ✅
- `src/api/tours.ts` - New endpoints ✅
- `src/services/auth.service.ts` - Auto-enrollment ✅
- `frontend/src/views/admin/` - Admin UI ✅
- `frontend/src/views/player/` - Player UI ✅

### Patterns to Follow
- Factory functions for API creation
- Service classes with Database injection
- Prepared statements for all queries
- DTOs for create/update operations
- Consistent error handling with proper HTTP codes
