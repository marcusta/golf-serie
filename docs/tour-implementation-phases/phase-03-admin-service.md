# Phase 3: Tour Admin Service

**Status**: COMPLETE (2025-12-24)
**Goal**: Manage tour-level admin assignments

## Tasks
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

## Implementation Notes

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
