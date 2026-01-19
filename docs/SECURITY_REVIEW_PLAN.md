# Security Review Plan

This document tracks security findings from the initial review and the plan to remediate them. Use the checkboxes to track progress.

## Findings

- [ ] **Critical**: Multiple mutation routes are publicly accessible without `requireAuth`/`requireRole`.
  - Affected routes in `src/app.ts`:
    - `POST /api/clubs`
    - `PUT /api/clubs/:id`
    - `DELETE /api/clubs/:id`
    - `POST /api/courses`
    - `PUT /api/courses/:id`
    - `DELETE /api/courses/:id`
    - `PUT /api/courses/:id/holes`
    - `POST /api/courses/import`
    - `POST /api/courses/:id/import`
    - `POST /api/courses/:courseId/tees`
    - `PUT /api/courses/:courseId/tees/:teeId`
    - `DELETE /api/courses/:courseId/tees/:teeId`
    - `POST /api/courses/:courseId/tees/:teeId/ratings`
    - `PUT /api/courses/:courseId/tees/:teeId/ratings/:ratingId`
    - `DELETE /api/courses/:courseId/tees/:teeId/ratings/:gender`
    - `POST /api/teams`
    - `PUT /api/teams/:id`
    - `PUT /api/competitions/:id`
    - `DELETE /api/competitions/:id`
    - `PUT /api/competitions/:competitionId/category-tees`
    - `POST /api/competitions/:competitionId/tee-times`
    - `PUT /api/tee-times/:id`
    - `DELETE /api/tee-times/:id`
    - `PUT /api/tee-times/:id/participants/order`
    - `POST /api/participants`
    - `PUT /api/participants/:id`
    - `DELETE /api/participants/:id`
    - `PUT /api/participants/:id/score`
    - `PUT /api/participants/:id/manual-score`
    - `POST /api/participants/:id/lock`
    - `POST /api/participants/:id/unlock`
    - `POST /api/documents`
    - `PUT /api/documents/:id`
    - `DELETE /api/documents/:id`
    - `POST /api/series/:seriesId/documents`
    - `PUT /api/series/:seriesId/documents/:documentId`
    - `DELETE /api/series/:seriesId/documents/:documentId`
    - `PUT /api/series/:id`
    - `DELETE /api/series/:id`
    - `POST /api/series/:id/teams/:teamId`
    - `DELETE /api/series/:id/teams/:teamId`
    - `POST /api/series/:id/admins`
    - `DELETE /api/series/:id/admins/:userId`
- [x] **High**: Competition finalization checks a Promise instead of the resolved competition, so the existence check always passes.
  - `src/app.ts` in `POST /api/competitions/:competitionId/finalize`
- [x] **High**: CORS reflects any origin while sending credentials, allowing authenticated cross-origin requests from any site.
  - `src/app.ts` CORS config
- [x] **High**: Casual game creation inserts `users.id` into `game_players.player_id` (FK to `players.id`), which can violate FK constraints or link incorrect records.
  - `src/services/game.service.ts` in `createGame`
- [x] **Medium**: Unsafe JSON parsing can crash read endpoints; safe parsing utilities exist but are not consistently used.
  - `src/services/game.service.ts` (`custom_settings`, `course_pars`)
  - `src/services/course-service.ts` (`stroke_index`)

## Plan

### Phase 1: Lock down mutation routes
- [ ] Confirm required roles per mutation group (clubs, courses, tees, teams, competitions, tee-times, participants, documents, series).
- [ ] Apply `requireAuth`/`requireRole` consistently in `src/app.ts` based on the agreed role matrix.
- [ ] Add or update tests if authorization coverage is missing.

### Phase 2: Fix high-severity correctness/security bugs
- [ ] Await the competition lookup in finalize route and return 404 when missing.
- [ ] Fix casual game owner/player linkage by resolving `player_id` from `user_id` (or define intended mapping).
- [x] Restrict CORS origin handling to the allowed set for credentialed requests.

### Phase 3: Parsing hardening
- [ ] Replace raw `JSON.parse` calls with `safeParseJson` or `safeParseJsonWithDefault` where appropriate.
- [ ] Add targeted tests for malformed JSON rows (if feasible).

## Notes

- Role matrix required before Phase 1 changes can land.
- Use `docs/CODE_REVIEW_GUIDE.md` checklist for follow-up review.
