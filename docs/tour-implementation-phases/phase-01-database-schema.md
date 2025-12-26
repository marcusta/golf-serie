# Phase 1: Database Schema & Core Types

**Status**: COMPLETE (2025-12-24)
**Goal**: Establish the data foundation

## Tasks
- [x] 1.1 Create migration for `tour_enrollments` table
- [x] 1.2 Create migration for `tour_admins` table
- [x] 1.3 Create migration to add `enrollment_mode` and `visibility` to tours
- [x] 1.4 Add TypeScript types for new entities and enums
- [x] 1.5 Run migrations and verify schema

## Implementation Notes

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
