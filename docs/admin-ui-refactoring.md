# Admin UI Refactoring Plan

## Overview

Refactor the admin interface to implement proper access control where non-super-admin users only see resources they own or have been invited to administer.

### Target State

**Regular Admin sees:**
- **Series** - Only series they own or are invited to admin
- **Tours** - Only tours they own or are invited to admin (+ points template management)
- **Competitions** - Only stand-alone competitions (not tied to Series/Tour) they own or are invited to admin

**Super Admin sees:**
- Everything (current behavior)

There are global tabs

* Courses
* Points
* Teams 

That should only be seen to super admin

As Teams will be invisible to admins on the global level we need to have local team management in the series scope

---

## Current State Assessment

### What Exists
| Resource | owner_id | Admin Table | API Filtering | Frontend Filtering |
|----------|----------|-------------|---------------|-------------------|
| Tours | ✅ | ✅ `tour_admins` | ✅ Visibility | ⚠️ Partial |
| Series | ⚠️ Column exists, unused | ❌ | ❌ | ❌ |
| Competitions | ❌ | ❌ | ❌ | ❌ |

### Reference Implementation
The `tour_admins` system is the gold standard to follow:
- `/src/services/tour-admin.service.ts`
- `/src/api/tours.ts` (lines 307-365)
- `/frontend/src/views/admin/TourDetail.tsx` (Admins tab)

---

## Phase 1: Series Admin System

### 1.1 Database Migration
Create `series_admins` table mirroring `tour_admins`.

**File:** `src/database/migrations/024_add_series_admins.ts`

```typescript
import { Migration } from "../migration";

export class AddSeriesAdmins extends Migration {
  version = 24;

  migrate(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS series_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(series_id, user_id)
      )
    `);

    this.db.run(`
      CREATE INDEX idx_series_admins_series_id ON series_admins(series_id)
    `);

    this.db.run(`
      CREATE INDEX idx_series_admins_user_id ON series_admins(user_id)
    `);
  }
}
```

### 1.2 Series Admin Service
Create service following `tour-admin.service.ts` pattern.

**File:** `src/services/series-admin.service.ts`

```typescript
export class SeriesAdminService {
  // Core methods needed:
  addSeriesAdmin(seriesId: number, userId: number, requestingUserId: number): void
  removeSeriesAdmin(seriesId: number, userId: number, requestingUserId: number): void
  getSeriesAdmins(seriesId: number): User[]
  isSeriesAdmin(seriesId: number, userId: number): boolean
  getSeriesForAdmin(userId: number): Series[]
  canManageSeries(seriesId: number, userId: number): boolean
  canManageSeriesAdmins(seriesId: number, userId: number): boolean
}
```

### 1.3 Update Series Service
Enforce `owner_id` on series operations.

**File:** `src/services/series.service.ts`

Changes needed:
- [ ] `createSeries()` - Set `owner_id` from authenticated user
- [ ] `updateSeries()` - Verify ownership or admin status
- [ ] `deleteSeries()` - Verify ownership or SUPER_ADMIN
- [ ] Add `getSeriesForUser(userId)` - Returns owned + admin series

### 1.4 Series API Endpoints
Add admin management endpoints.

**File:** `src/api/series.ts`

```typescript
// New endpoints:
GET    /api/series/:id/admins           // List admins (canManageSeries)
POST   /api/series/:id/admins           // Add admin (canManageSeriesAdmins)
DELETE /api/series/:id/admins/:userId   // Remove admin (canManageSeriesAdmins)

// Modify existing:
GET    /api/series                      // Filter by ownership/admin for non-SUPER_ADMIN
POST   /api/series                      // Set owner_id from authenticated user
PUT    /api/series/:id                  // Verify canManageSeries
DELETE /api/series/:id                  // Verify owner or SUPER_ADMIN
```

### 1.5 Frontend: Series Admin UI
Add admin management tab to Series detail.

**Files to modify:**
- `frontend/src/api/series.ts` - Add admin hooks
- `frontend/src/views/admin/SeriesDetail.tsx` - Add Admins tab
- `frontend/src/views/admin/Series.tsx` - Use filtered endpoint

---

## Phase 2: Competition Ownership System

### 2.1 Database Migration
Add `owner_id` to competitions and create `competition_admins` table.

**File:** `src/database/migrations/025_add_competition_ownership.ts`

```typescript
import { Migration } from "../migration";

export class AddCompetitionOwnership extends Migration {
  version = 25;

  migrate(): void {
    // Add owner_id to competitions
    if (!this.columnExists("competitions", "owner_id")) {
      this.db.run(`
        ALTER TABLE competitions ADD COLUMN owner_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL
      `);
    }

    // Create competition_admins table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS competition_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competition_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(competition_id, user_id)
      )
    `);

    this.db.run(`
      CREATE INDEX idx_competition_admins_competition_id
      ON competition_admins(competition_id)
    `);

    this.db.run(`
      CREATE INDEX idx_competition_admins_user_id
      ON competition_admins(user_id)
    `);
  }
}
```

### 2.2 Competition Admin Service
**File:** `src/services/competition-admin.service.ts`

```typescript
export class CompetitionAdminService {
  addCompetitionAdmin(competitionId: number, userId: number, requestingUserId: number): void
  removeCompetitionAdmin(competitionId: number, userId: number, requestingUserId: number): void
  getCompetitionAdmins(competitionId: number): User[]
  isCompetitionAdmin(competitionId: number, userId: number): boolean
  getCompetitionsForAdmin(userId: number): Competition[]
  canManageCompetition(competitionId: number, userId: number): boolean
  canManageCompetitionAdmins(competitionId: number, userId: number): boolean
}
```

### 2.3 Stand-Alone Competition Logic
Competitions need to be filtered to show only those NOT linked to a Series or Tour.

**File:** `src/services/competition.service.ts`

Add method:
```typescript
getStandAloneCompetitionsForUser(userId: number): Competition[] {
  // Returns competitions where:
  // 1. series_id IS NULL AND tour_id IS NULL
  // 2. AND (owner_id = userId OR user is competition_admin OR user is SUPER_ADMIN)
}
```

### 2.4 Competition API Updates
**File:** `src/api/competitions.ts`

```typescript
// New endpoints:
GET    /api/competitions/:id/admins           // List admins
POST   /api/competitions/:id/admins           // Add admin
DELETE /api/competitions/:id/admins/:userId   // Remove admin

// New query parameter:
GET    /api/competitions?standalone=true      // Filter stand-alone only

// Modify existing:
GET    /api/competitions                      // Filter by ownership/admin for non-SUPER_ADMIN
POST   /api/competitions                      // Set owner_id from authenticated user
PUT    /api/competitions/:id                  // Verify canManageCompetition
DELETE /api/competitions/:id                  // Verify owner or SUPER_ADMIN
```

### 2.5 Frontend: Competition Admin UI
**Files to modify:**
- `frontend/src/api/competitions.ts` - Add admin hooks, standalone filter
- `frontend/src/views/admin/CompetitionDetail.tsx` - Add Admins tab
- `frontend/src/views/admin/Competitions.tsx` - Use filtered endpoint, show stand-alone only

---

## Phase 3: Tour Points Template Management

### 3.1 Add Points Tab to Tour Detail
Points templates are already linked to tours. Add UI to manage them from the Tour detail page.

**File:** `frontend/src/views/admin/TourDetail.tsx`

Add new tab "Points Templates" that:
- Lists all points templates for this tour
- Allows creating new templates
- Allows editing existing templates
- Allows deleting templates

### 3.2 Points API Updates (if needed)
Verify points templates respect tour ownership.

**File:** `src/api/points.ts`

- [ ] Verify `canManageTour` before allowing points template CRUD for tour-linked templates

---

## Phase 4: Admin Layout & Navigation

### 4.1 Update Admin Layout
Show/hide navigation items based on user role.

**File:** `frontend/src/views/admin/AdminLayout.tsx`

```typescript
// For non-SUPER_ADMIN users, only show:
const adminNavItems = [
  { label: "Series", path: "/admin/series" },
  { label: "Tours", path: "/admin/tours" },
  { label: "Competitions", path: "/admin/competitions" },  // Stand-alone only
];

// SUPER_ADMIN sees all current items:
const superAdminNavItems = [
  ...adminNavItems,
  { label: "Teams", path: "/admin/teams" },
  { label: "Courses", path: "/admin/courses" },
  { label: "Points", path: "/admin/points" },
];
```

### 4.2 Frontend Auth Context Enhancement
Add helper to check if user is super admin.

**File:** `frontend/src/context/AuthContext.tsx`

```typescript
const isSuperAdmin = user?.role === 'SUPER_ADMIN';
```

---

## Phase 5: Hierarchical Access (Series → Competitions)

When a user owns/admins a Series, they should automatically have access to all competitions within that series.

### 5.1 Access Check Hierarchy
**File:** `src/services/competition-admin.service.ts`

```typescript
canManageCompetition(competitionId: number, userId: number): boolean {
  const competition = this.getCompetition(competitionId);

  // Direct ownership
  if (competition.owner_id === userId) return true;

  // Direct admin
  if (this.isCompetitionAdmin(competitionId, userId)) return true;

  // Series admin (if competition is in a series)
  if (competition.series_id) {
    if (this.seriesAdminService.canManageSeries(competition.series_id, userId)) {
      return true;
    }
  }

  // Tour admin (if competition is in a tour)
  if (competition.tour_id) {
    if (this.tourAdminService.canManageTour(competition.tour_id, userId)) {
      return true;
    }
  }

  return false;
}
```

---

## Phase 6: Testing

### 6.1 Backend Tests
**Files to create:**
- `tests/series-admin.test.ts`
- `tests/competition-admin.test.ts`
- `tests/admin-access-control.test.ts`

Test scenarios:
- [ ] Owner can manage their own resources
- [ ] Invited admin can manage resources
- [ ] Non-admin cannot access others' resources
- [ ] SUPER_ADMIN bypasses all checks
- [ ] Hierarchical access (series admin → competitions)
- [ ] Stand-alone competition filtering

### 6.2 Frontend Tests
- [ ] Admin layout shows correct nav items per role
- [ ] Filtered lists only show owned/admin resources
- [ ] Admin tab works for Series/Competitions
- [ ] Points templates accessible from Tour detail

---

## Implementation Checklist

### Phase 1: Series Admin System ✅
- [x] Migration 041: series_admins table
- [x] SeriesAdminService
- [x] Update SeriesService with ownership enforcement
- [x] Series admin API endpoints
- [x] Frontend: Series admin hooks
- [x] Frontend: Series detail Admins tab
- [x] Frontend: Filtered series list

### Phase 2: Competition Ownership ✅
- [x] Migration 042: owner_id + competition_admins
- [x] CompetitionAdminService
- [x] Update CompetitionService with ownership enforcement
- [x] Competition admin API endpoints
- [x] Stand-alone competition query support
- [x] Frontend: Competition admin hooks
- [x] Frontend: Competition detail Admins tab
- [x] Frontend: Stand-alone competition filter

### Phase 3: Tour Points Templates ✅
- [x] Add Points Templates tab to TourDetail
- [x] Verify points API respects tour ownership

### Phase 4: Admin Layout ✅
- [x] Role-based navigation in AdminLayout
- [x] isSuperAdmin helper in AuthContext

### Phase 5: Hierarchical Access
- [x] Series → Competitions access inheritance (in CompetitionAdminService.canManageCompetition)
- [x] Tour → Competitions access inheritance (in CompetitionAdminService.canManageCompetition)

### Phase 6: Testing
- [ ] Backend unit tests
- [ ] Frontend integration tests

---

## Database Schema Summary (After Implementation)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │     │     series      │     │  series_admins  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │◄────│ owner_id        │     │ series_id       │──►
│ role            │     │ ...             │◄────│ user_id         │──►
│ ...             │     └─────────────────┘     └─────────────────┘
└─────────────────┘
        │
        │               ┌─────────────────┐     ┌─────────────────┐
        │               │     tours       │     │   tour_admins   │
        │               ├─────────────────┤     ├─────────────────┤
        └──────────────►│ owner_id        │     │ tour_id         │──►
                        │ ...             │◄────│ user_id         │──►
                        └─────────────────┘     └─────────────────┘

                        ┌─────────────────┐     ┌─────────────────────┐
                        │  competitions   │     │ competition_admins  │
                        ├─────────────────┤     ├─────────────────────┤
        ┌──────────────►│ owner_id        │     │ competition_id      │──►
        │               │ series_id       │──►  │ user_id             │──►
        │               │ tour_id         │──►  └─────────────────────┘
        │               └─────────────────┘
        │
   (owner_id FK to users)
```

---

## Notes

- **Backward Compatibility**: Existing data will have NULL owner_id. Consider a migration to assign ownership to first SUPER_ADMIN or leave as globally accessible.
- **Invitation Flow**: This plan assumes direct admin assignment. Email-based invitations could be a future enhancement.
- **Teams/Courses**: Currently remain globally accessible. Could be scoped to tours/series in future iterations.
