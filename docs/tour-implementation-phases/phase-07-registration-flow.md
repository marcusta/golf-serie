# Phase 7: Frontend - Registration Flow

**Status**: COMPLETE (2025-12-24)
**Goal**: Support pre-filled email from registration links

## Tasks
- [x] 7.1 Update registration page to read `?email=` query parameter
- [x] 7.2 Pre-fill and optionally disable email field when from link
- [x] 7.3 Show success message when auto-enrolled after registration
- [x] 7.4 Add "Request to Join" button on public tour pages

## Implementation Notes

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
