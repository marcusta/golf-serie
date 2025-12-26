# Phase 8: Player Tour Views, Documents & Hero Images

**Status**: COMPLETE (2025-12-24)
**Goal**: Tour browsing/viewing for players + document/hero image support (like Series)

## Tasks - Database & Backend
- [x] 8.1 Create migration 024 for `banner_image_url` and `landing_document_id` on tours
- [x] 8.2 Create migration 025 for `tour_documents` table
- [x] 8.3 Add TypeScript types for `TourDocument`, `CreateTourDocumentDto`, etc.
- [x] 8.4 Create `TourDocumentService` with CRUD operations
- [x] 8.5 Update `TourService` to validate `landing_document_id`
- [x] 8.6 Add tour document API endpoints: `/api/tours/:tourId/documents`
- [x] 8.7 Write backend tests for tour documents

## Tasks - Frontend Admin
- [x] 8.8 Add React Query hooks for tour documents
- [x] 8.9 Update admin `TourDetail.tsx` with Documents tab:
  - Document CRUD with markdown editor
  - Landing page settings
  - Banner image URL input

## Tasks - Frontend Player
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

## Implementation Notes

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
