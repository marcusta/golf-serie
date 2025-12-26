# Phase 6: Frontend - Admin Tour Management

**Status**: COMPLETE (2025-12-24)
**Goal**: UI for managing tour enrollments and settings

## Tasks
- [x] 6.1 Add tour settings form (enrollment_mode, visibility)
- [x] 6.2 Create enrollment management view:
  - List pending/requested/active enrollments
  - Add email form with "Copy Registration Link" button
  - Approve/reject request buttons
- [x] 6.3 Create tour admin management view
- [x] 6.4 Update tour creation form with new settings

## Implementation Notes

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
