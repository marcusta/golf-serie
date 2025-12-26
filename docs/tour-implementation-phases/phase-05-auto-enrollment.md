# Phase 5: Auto-Enrollment on Registration

**Status**: COMPLETE (2025-12-24)
**Goal**: Automatically enroll users when they register with a pending email

## Tasks
- [x] 5.1 Modify `AuthService.register()` to:
  - Check for pending enrollments matching the email
  - Create player profile if needed
  - Activate matching enrollments
- [x] 5.2 Return enrollment info in registration response
- [x] 5.3 Write tests for auto-enrollment flow

## Implementation Notes

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
