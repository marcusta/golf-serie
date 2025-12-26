# Phase 2: Tour Enrollment Service

**Status**: COMPLETE (2025-12-24)
**Goal**: Backend logic for managing enrollments

## Tasks
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

## Implementation Notes

**Files created:**
- `src/services/tour-enrollment.service.ts` - Full enrollment service implementation

**Service methods implemented:**
- `addPendingEnrollment(tourId, email)` - Creates pending enrollment with normalized email
- `requestEnrollment(tourId, playerId)` - Creates requested enrollment (validates tour allows requests)
- `approveEnrollment(enrollmentId)` - Changes requested -> active
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
