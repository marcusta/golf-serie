# Phase 4: Tour API Endpoints

**Status**: COMPLETE (2025-12-24)
**Goal**: Expose enrollment and admin functionality via API

## Tasks
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

## Implementation Notes

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
