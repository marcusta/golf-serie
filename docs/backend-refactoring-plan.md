# Backend Refactoring Plan

**Created:** 2025-12-31
**Updated:** 2026-01-01
**Goal:** Refactor backend services to comply with new code quality rules in CLAUDE.md
**Safety Net:** 670+ integration tests must pass after each change

---

## Core Rule Reminder

> Within a service, a method contains EITHER a single SQL query OR business logic - never both.

**Method Categories:**
- **Query Methods** (private): Single SQL query, prefix `find*`, `get*`, `insert*`, `update*`, `delete*`
- **Logic Methods** (private): Pure business logic, no SQL, prefix `validate*`, `calculate*`, `build*`, `transform*`
- **Public API Methods**: Orchestration only - calls query and logic methods

---

## Principles

1. **Tests are the safety net** - Run `bun test` after every change
2. **One service at a time** - Never refactor multiple services in parallel
3. **Additive first** - Create new code before modifying existing code
4. **Behavior-preserving** - No functional changes during restructuring
5. **Bottom-up extraction** - Start with deepest/most isolated logic

---

## Phase 0: Foundation (Zero Risk)

Create supporting infrastructure before touching existing code.

### Step 0.1: Create Golf Constants
- [x] Create `src/constants/golf.ts`
- [x] Export `GOLF` object with all domain constants
- [x] Run tests: `bun test`

### Step 0.2: Create Parsing Utilities
- [x] Create `src/utils/parsing.ts`
- [x] Add `safeParseJson<T>()` utility
- [x] Add `parseScoreArray()` utility
- [x] Add `parseParsArray()` utility
- [x] Run tests: `bun test`

### Step 0.3: Verify Baseline
- [x] Run full test suite: `bun test` (677 pass, 1 skip - Playwright tests excluded)
- [x] Run type check: `bun run type-check` (new files pass, pre-existing issues in tests)
- [ ] Run linter: `bun run lint`
- [x] Phase 0 complete - foundation files created

---

## Phase 1: Simple Services

### 1.1 TeamService (`src/services/team-service.ts`)
**Complexity:** Low (~106 lines after refactoring)
**Tests:** `tests/teams.test.ts`

#### Completed (Type Safety Pass)
- [x] Fix `any` types - Fixed `values: any[]` to `values: (string | number)[]`

#### Completed (Method Separation) - 2025-12-31

**`create()` refactored:**
- [x] Extract `validateTeamName(name: string): void`
- [x] Extract `insertTeam(name: string): Team` (single INSERT query)
- [x] Extract `translateUniqueConstraintError(error: Error): Error`
- [x] Refactor `create()` to orchestration only

**`update()` refactored:**
- [x] Extract `validateTeamUpdate(data: UpdateTeamDto): void`
- [x] Extract `updateTeamRow(id: number, name: string): Team | null` (single UPDATE query)
- [x] Refactor `update()` to orchestration only

- [x] Run tests: `bun test tests/teams.test.ts` - 16 pass
- [x] Run full suite: `bun test`

---

### 1.2 DocumentService (`src/services/document-service.ts`)
**Complexity:** Low (~202 lines after refactoring)
**Tests:** `tests/documents.test.ts`

#### Completed (Type Safety Pass)
- [x] Fix `any` types - Fixed `values: any[]` to `values: (string | number)[]`

#### Completed (Method Separation) - 2025-12-31

**Logic methods extracted:**
- [x] Extract `validateCreateDocumentData(data: CreateDocumentDto): void`
- [x] Extract `validateUpdateDocumentData(data: UpdateDocumentDto): void`
- [x] Extract `extractTypes(rows: { type: string }[]): string[]`

**Query methods extracted:**
- [x] Extract `findSeriesExists(id: number): boolean`
- [x] Extract `insertDocument(data: CreateDocumentDto): Document`
- [x] Extract `findDocumentsBySeries(seriesId: number): Document[]`
- [x] Extract `findDocumentsBySeriesAndType(seriesId: number, type: string): Document[]`
- [x] Extract `findDistinctTypesBySeries(seriesId: number): { type: string }[]`
- [x] Extract `updateDocumentRow(id, title, content, type): Document`
- [x] Extract `deleteDocumentRow(id: number): void`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, series check, insert
- [x] `findBySeriesId()` - series check, query
- [x] `findBySeriesIdAndType()` - series check, query
- [x] `update()` - find existing, validation, merge fields, update
- [x] `delete()` - find existing, delete
- [x] `getDocumentTypes()` - series check, query, extract

- [x] Run tests: `bun test tests/documents.test.ts` - 22 pass
- [x] Run full suite: `bun test`

---

### 1.3 PointTemplateService (`src/services/point-template.service.ts`)
**Complexity:** Low (~144 lines after refactoring)
**Tests:** `tests/point-templates.test.ts`

#### Completed (Type Safety Pass)
- [x] Fix `any` types - Fixed `values: any[]` to `values: (string | number)[]`
- [x] Add safe JSON parsing - Using `safeParseJson()` for points_structure

#### Completed (Method Separation) - 2025-12-31

**Logic methods extracted:**
- [x] Extract `getPointsForPosition(structure: PointsStructure, position: number): number`

**Query methods extracted:**
- [x] Extract `insertPointTemplate(name, pointsStructureJson, createdBy): PointTemplate`
- [x] Extract `updatePointTemplateRow(id, name, pointsStructureJson): PointTemplate`

**Public methods refactored to orchestration:**
- [x] `create()` - serialize JSON, insert
- [x] `update()` - check exists, merge fields, update
- [x] `calculatePoints()` - get template, parse JSON, call logic method

- [x] Run tests: `bun test tests/point-templates.test.ts` - 17 pass
- [x] Run full suite: `bun test`

---

## Phase 2: Medium Services

### 2.1 CourseService (`src/services/course-service.ts`)
**Complexity:** Medium (~185 lines after refactoring)
**Tests:** `tests/courses.test.ts`

#### Completed (Constants & Parsing Pass)
- [x] Replace `18` with `GOLF.HOLES_PER_ROUND`
- [x] Replace par range checks with `GOLF.MIN_PAR`, `GOLF.MAX_PAR`
- [x] Fix `any` types - Fixed `values: any[]` to `values: (string | number)[]`
- [x] Add defensive JSON parsing - Using `parseParsArray()` for all pars

#### Completed (Method Separation) - 2025-12-31

**Logic methods extracted:**
- [x] Extract `calculatePars(pars: number[]): ParsData`
- [x] Extract `transformCourseRow(row: CourseRow): Course`
- [x] Extract `validateCourseName(name: string): void`
- [x] Extract `validateCourseNameNotEmpty(name: string): void`
- [x] Extract `validateParsArray(pars: number[]): void`

**Query methods extracted:**
- [x] Extract `insertCourseRow(name: string): CourseRow`
- [x] Extract `findAllCourseRows(): CourseRow[]`
- [x] Extract `findCourseRowById(id: number): CourseRow | null`
- [x] Extract `updateCourseNameRow(id: number, name: string): CourseRow`
- [x] Extract `updateCourseParsRow(id: number, pars: number[]): CourseRow`
- [x] Extract `findCompetitionsByCourse(courseId: number): { id: number }[]`
- [x] Extract `deleteCourseRow(id: number): void`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, insert, transform
- [x] `findAll()` - query, transform each
- [x] `findById()` - query, transform
- [x] `update()` - check exists, validation, update, transform
- [x] `updateHoles()` - check exists, validation, update, transform
- [x] `delete()` - check exists, check competitions, delete

- [x] Run tests: `bun test tests/courses.test.ts` - 12 pass
- [x] Run full suite: `bun test`

---

### 2.2 CourseTeeService (`src/services/course-tee.service.ts`)
**Complexity:** High (~548 lines after refactoring) - Originally marked Medium, actually complex
**Tests:** `tests/course-tees.test.ts`, `tests/course-tee-ratings.test.ts`, `tests/course-tee-ratings-api.test.ts`

#### Completed (Constants & Parsing Pass)
- [x] Replace `113` with `GOLF.STANDARD_SLOPE_RATING`
- [x] Replace rating range checks with `GOLF.MIN_COURSE_RATING`, `GOLF.MAX_COURSE_RATING`, `GOLF.MIN_SLOPE_RATING`, `GOLF.MAX_SLOPE_RATING`
- [x] Replace `18` checks with `GOLF.HOLES_PER_ROUND`
- [x] Replace par range checks with `GOLF.MIN_PAR`, `GOLF.MAX_PAR`
- [x] Add defensive JSON parsing - Using `parseStrokeIndex()` and `parseParsArray()`

#### Completed (Method Separation) - 2025-12-31

**Critical fix: `parseRow()` → `transformTeeRow()` (pure, no SQL)**
- [x] Renamed to `transformTeeRow()` - pure transformation, no SQL calls
- [x] Ratings loading now explicit in each public method

**Logic methods extracted:**
- [x] `transformTeeRow(row: CourseTeeRow): CourseTee`
- [x] `transformRatingRow(row: CourseTeeRatingRow): CourseTeeRating`
- [x] `validateRatingGender(gender: string): void`
- [x] `validateCourseRating(courseRating: number): void`
- [x] `validateSlopeRating(slopeRating: number): void`
- [x] `validateTeeName(name: string): void`
- [x] `validateTeeNameNotEmpty(name: string): void`
- [x] `validateStrokeIndexArray(strokeIndex: number[]): void`
- [x] `validateParsArray(pars: number[]): void`
- [x] `validateRatingsArray(ratings: CreateCourseTeeRatingDto[]): void`
- [x] `determineCourseAndSlopeRating(data: CreateCourseTeeDto): { courseRating, slopeRating }`

**Query methods extracted:**
- [x] `findTeeRowById(id: number): CourseTeeRow | null`
- [x] `findTeeRowsByCourse(courseId: number): CourseTeeRow[]`
- [x] `findRatingRowsByTee(teeId: number): CourseTeeRatingRow[]`
- [x] `findRatingRowById(id: number): CourseTeeRatingRow | null`
- [x] `findRatingRowByGender(teeId, gender): CourseTeeRatingRow | null`
- [x] `findCourseExists(courseId: number): boolean`
- [x] `findDuplicateTee(courseId, name): boolean`
- [x] `findDuplicateTeeExcluding(courseId, name, excludeId): boolean`
- [x] `findCompetitionsByTee(teeId: number): { id: number }[]`
- [x] `insertTeeRow(...): CourseTeeRow`
- [x] `upsertRatingRow(...): CourseTeeRatingRow`
- [x] `updateRatingRow(...): CourseTeeRatingRow`
- [x] `updateTeeRow(...): CourseTeeRow`
- [x] `deleteRatingRow(id: number): void`
- [x] `deleteRatingRowByGender(teeId, gender): void`
- [x] `deleteTeeRow(id: number): void`
- [x] `findTeeRowsByCourseWithDetails(courseId): (CourseTeeRow & { course_name })`

**Public methods refactored to orchestration:**
- [x] `getRatingsForTee()` - query, transform each
- [x] `getRatingByGender()` - query, transform
- [x] `getRatingById()` - query, transform
- [x] `upsertRating()` - check tee exists, validation, upsert, transform
- [x] `updateRating()` - check exists, validation, merge, update, transform
- [x] `deleteRating()` - check exists, delete
- [x] `deleteRatingByGender()` - delete
- [x] `findByCourse()` - query rows, transform each, load ratings
- [x] `findById()` - query, transform, load ratings
- [x] `create()` - validations, determine ratings, insert, create ratings, return with ratings
- [x] `update()` - check exists, validations, merge values, update, return with ratings
- [x] `delete()` - check exists, check competitions, delete
- [x] `findByCourseWithDetails()` - query, transform each, load ratings

- [x] Run tests: `bun test tests/course-tees.test.ts tests/course-tee-ratings.test.ts tests/course-tee-ratings-api.test.ts` - 72 pass
- [x] Run full suite: `bun test`

---

### 2.3 TeeTimeService (`src/services/tee-time-service.ts`)
**Complexity:** Medium (~337 lines after refactoring)
**Tests:** `tests/tee-times.test.ts`

#### Completed (Method Separation) - 2025-12-31

**Logic methods extracted:**
- [x] `validateTeeTimeRequired(teetime: string): void`
- [x] `validateTeeTimeNotEmpty(teetime: string): void`
- [x] `validateCreateForVenueType(data, venueType): void`
- [x] `validateUpdateForVenueType(data, venueType): void`
- [x] `transformParticipantRow(row): ParticipantWithTeamRow`
- [x] `transformTeeTimeWithParticipants(teeTimeRow, participantRows): TeeTimeWithParticipants`
- [x] `validateParticipantIds(newOrder, validIds): void`

**Query methods extracted:**
- [x] `findCompetitionVenueInfo(competitionId): CompetitionVenueInfo | null`
- [x] `findCompetitionExists(competitionId): boolean`
- [x] `insertTeeTimeRow(...): TeeTime`
- [x] `findTeeTimeRowsByCompetition(competitionId): TeeTime[]`
- [x] `findTeeTimeRowsWithCourseByCompetition(competitionId): TeeTimeWithCourseRow[]`
- [x] `findTeeTimeRowById(id): TeeTime | null`
- [x] `findTeeTimeRowWithCourse(id): TeeTimeWithCourseRow | null`
- [x] `findParticipantRowsByTeeTime(teeTimeId): ParticipantWithTeamRow[]`
- [x] `findParticipantIdsByTeeTime(teeTimeId): number[]`
- [x] `updateTeeTimeRow(...): TeeTime`
- [x] `deleteTeeTimeRow(id): void`
- [x] `updateParticipantOrderRow(participantId, order): void`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, get venue info, validate for venue type, insert
- [x] `findAllForCompetition()` - check exists, query
- [x] `findAllForCompetitionWithParticipants()` - check exists, query, transform each with participants
- [x] `findById()` - query
- [x] `findByIdWithParticipants()` - query with course, get participants, transform
- [x] `update()` - check exists, validation, get venue info, validate for venue type, merge, update
- [x] `delete()` - check exists, delete
- [x] `updateParticipantsOrder()` - check exists, validate ids, update each, return with participants

**Type safety fixed:**
- [x] Fixed `any[]` type to proper typed interfaces

- [x] Run tests: `bun test tests/tee-times.test.ts` - 15 pass
- [x] Run full suite: `bun test`

---

## Phase 3: Complex Services

### 3.1 ParticipantService (`src/services/participant-service.ts`)
**Complexity:** High (~667 lines after refactoring)
**Tests:** `tests/participants.test.ts`

#### Completed (Method Separation) - 2025-12-31

**Internal types added:**
- [x] `ParticipantRow`, `ParticipantRowWithTeam`, `ParticipantCourseInfo`

**Validation methods extracted:**
- [x] `validatePositionName(name: string): void`
- [x] `validatePositionNameNotEmpty(name: string): void`
- [x] `validateTeeOrder(order: number): void`
- [x] `validateHoleNumber(hole: number, maxHoles: number): void`
- [x] `validateShotsValue(shots: number): void`
- [x] `validateTotalScore(score: number | null): void`
- [x] `validateOutInScore(score: number | null | undefined, fieldName: string): void`
- [x] `validateScoreArray(score: number[]): void`

**Transform/Logic methods extracted:**
- [x] `transformParticipantRow(row: ParticipantRow): Participant`
- [x] `transformParticipantRowWithTeam(row: ParticipantRowWithTeam): Participant`
- [x] `parseScoreJson(json: string | null): number[]`
- [x] `initializeScoreArray(existingScore, length): number[]`
- [x] `shouldCaptureHandicap(courseInfo, shots, existingScore): boolean`
- [x] `buildUpdateFields(data: UpdateParticipantDto): { updates, values }`
- [x] `buildManualScoreFields(scores): { updates, values }`
- [x] `determineHandicapToCapture(courseInfo): number | null`

**Query methods extracted:**
- [x] `findTeamExists(id: number): boolean`
- [x] `findTeeTimeExists(id: number): boolean`
- [x] `findCompetitionExists(id: number): boolean`
- [x] `insertParticipantRow(...): ParticipantRow`
- [x] `findAllParticipantRows(): ParticipantRow[]`
- [x] `findParticipantRowWithTeam(id: number): ParticipantRowWithTeam | null`
- [x] `updateParticipantRow(id, updates, values): ParticipantRow`
- [x] `findParticipantRowsByCompetition(competitionId): ParticipantRowWithTeam[]`
- [x] `findParticipantCourseInfo(id: number): ParticipantCourseInfo | null`
- [x] `findPlayerHandicapFromTour(tourId, playerId): number | null`
- [x] `findPlayerHandicap(playerId): number | null`
- [x] `updateScoreRow(id, scoreJson): void`
- [x] `updateScoreWithHandicapRow(id, scoreJson, handicapIndex): void`
- [x] `deleteParticipantRow(id: number): void`
- [x] `updateLockedRow(id, isLocked): ParticipantRow`
- [x] `updateManualScoreRow(id, updates, values): void`
- [x] `updateDQRow(id, isDQ, adminNotes, adminUserId): void`
- [x] `updateAdminScoreRow(id, scoreJson, adminNotes, adminUserId): void`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, existence checks, insert, transform
- [x] `findAll()` - query, transform each
- [x] `findById()` - query, transform
- [x] `update()` - validation, existence checks, build fields, update, transform
- [x] `findAllForCompetition()` - existence check, query, transform each
- [x] `updateScore()` - validation, course info, handicap capture, update
- [x] `delete()` - existence check, delete
- [x] `lock()` / `unlock()` - existence check, update, transform
- [x] `updateManualScore()` - validation, build fields, update, transform
- [x] `adminSetDQ()` / `adminUpdateScore()` - existence check, validation, update

**Type safety fixed:**
- [x] All `any[]` types replaced with proper typed arrays
- [x] Using `GOLF.HOLES_PER_ROUND` and `GOLF.UNREPORTED_HOLE` constants
- [x] Using `safeParseJson()` for defensive JSON parsing

- [x] Run tests: `bun test tests/participants.test.ts` - 41 pass
- [x] Run full suite: `bun test` - 677 pass

---

### 3.2 SeriesService (`src/services/series-service.ts`)
**Complexity:** High (~520 lines after refactoring)
**Tests:** `tests/series.test.ts`

#### Completed (Method Separation) - 2025-12-31

**Internal types added:**
- [x] `SeriesRow`, `CompetitionRow`, `TeamRow`, `DocumentRow`
- [x] `CompetitionInfo`, `CompetitionWithCourse`

**Validation methods extracted:**
- [x] `validateSeriesName(name: string): void`
- [x] `validateSeriesNameNotEmpty(name: string): void`
- [x] `translateUniqueConstraintError(error: Error): Error`

**Transform/Logic methods extracted:**
- [x] `transformSeriesRow(row: SeriesRow): Series`
- [x] `transformCompetitionRow(row: CompetitionRow): CompetitionWithCourse`
- [x] `buildUpdateFields(data: UpdateSeriesDto): { updates, values }`
- [x] `isPastCompetition(competitionDate: Date): boolean`
- [x] `teamResultsHaveScores(teamResults: TeamLeaderboardEntry[]): boolean`
- [x] `shouldIncludeCompetition(competitionDate, teamResults): boolean`
- [x] `calculateTeamStandings(competitions, teamResultsByCompetition): SeriesTeamStanding[]`
- [x] `sortAndRankTeamStandings(standings): SeriesTeamStanding[]`

**Query methods extracted:**
- [x] `insertSeriesRow(name, description, bannerImageUrl, isPublic): SeriesRow`
- [x] `findAllSeriesRows(): SeriesRow[]`
- [x] `findPublicSeriesRows(): SeriesRow[]`
- [x] `findSeriesRowById(id: number): SeriesRow | null`
- [x] `findDocumentRow(id: number): DocumentRow | null`
- [x] `updateSeriesRow(id, updates, values): SeriesRow`
- [x] `deleteSeriesRow(id: number): void`
- [x] `findCompetitionRowsBySeries(seriesId): CompetitionRow[]`
- [x] `findTeamRowsBySeries(seriesId): TeamRow[]`
- [x] `findTeamExists(id: number): boolean`
- [x] `insertSeriesTeamRow(seriesId, teamId): void`
- [x] `deleteSeriesTeamRow(seriesId, teamId): number`
- [x] `findAvailableTeamRows(seriesId): TeamRow[]`
- [x] `findCompetitionInfoBySeries(seriesId): CompetitionInfo[]`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, insert, transform
- [x] `findAll()` / `findPublic()` - query, transform each
- [x] `findById()` - query, transform
- [x] `update()` - existence check, validation, document validation, build fields, update, transform
- [x] `delete()` - existence check, delete
- [x] `getCompetitions()` - existence check, query, transform each
- [x] `getTeams()` - existence check, query
- [x] `addTeam()` - existence checks, insert
- [x] `removeTeam()` - delete, check changes
- [x] `getAvailableTeams()` - query
- [x] `getStandings()` - existence check, query competitions, collect team results, calculate standings

**Type safety fixed:**
- [x] All `any` types replaced with proper typed interfaces
- [x] Return types `CompetitionWithCourse[]` and `TeamRow[]` instead of `any[]`

- [x] Run tests: `bun test tests/series.test.ts` - 35 pass
- [x] Run full suite: `bun test` - 677 pass

---

### 3.3 AuthService (`src/services/auth.service.ts`)
**Complexity:** Medium (~317 lines after refactoring)
**Tests:** `tests/auth-auto-enrollment.test.ts`

#### Completed (Method Separation) - 2025-12-31

**Constants added:**
- [x] `SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7` (7 days)
- [x] `MIN_PASSWORD_LENGTH = 6`

**Internal types added:**
- [x] `UserRow`, `SessionRow`

**Validation methods extracted:**
- [x] `validateNewPassword(password: string): void`
- [x] `extractEmailName(email: string): string`

**Query methods extracted:**
- [x] `findUserByEmail(email: string): UserRow | null`
- [x] `findUserById(id: number): UserRow | null`
- [x] `findUserExistsByEmail(email: string): boolean`
- [x] `findUserExistsByEmailExcluding(email, excludeUserId): boolean`
- [x] `insertUserRow(email, passwordHash, role): RegisterResult`
- [x] `findSessionWithUser(sessionId: string): SessionRow | null`
- [x] `insertSessionRow(sessionId, userId, expiresAt): void`
- [x] `deleteSessionRow(sessionId: string): void`
- [x] `updateUserEmailRow(userId, email): void`
- [x] `updateUserPasswordRow(userId, passwordHash): void`
- [x] `findTourName(tourId: number): string | null`
- [x] `findAllUsersRows(): Array<{ id, email, role }>`

**Public methods refactored to orchestration:**
- [x] `register()` - existence check, hash password, insert, process auto-enrollments
- [x] `login()` - find user, verify password, create session
- [x] `validateSession()` - find session, check expiry
- [x] `logout()` - delete session
- [x] `updateEmail()` - find user, verify password, check email unique, update
- [x] `updatePassword()` - find user, verify password, validate, hash, update
- [x] `getAllUsers()` - query

**Type safety fixed:**
- [x] All `any` types replaced with proper typed interfaces

- [x] Run tests: `bun test tests/auth-auto-enrollment.test.ts` - 15 pass
- [x] Run full suite: `bun test` - 677 pass

---

## Phase 4: Tour Services

### 4.1 TourService (`src/services/tour.service.ts`)
**Complexity:** Very High (~900 lines after refactoring)
**Tests:** `tests/tours.test.ts`, `tests/tour-standings.test.ts`

#### Completed (Method Separation) - 2025-12-31

**Constants & Type Safety:**
- [x] Replace all magic numbers with `GOLF.*` constants (`18`, `113`, `72`, `-1`)
- [x] Fix `getCompetitions(): any[]` → `CompetitionWithCourseRow[]`
- [x] Fix `enrollmentParams: any[]` → `number[]`
- [x] Add internal types: `TourRow`, `CompetitionWithCourseRow`, `ParticipantRow`, `EnrollmentRow`, `StoredResultRow`, `PointTemplateRow`, `DocumentRow`

**Validation methods extracted:**
- [x] `validateScoringMode(mode: string): void`
- [x] `validatePointTemplateExists(templateId: number): void`
- [x] `validateLandingDocument(documentId: number, tourId: number): void`

**Query methods extracted:**
- [x] `findPointTemplateExists(id: number): boolean`
- [x] `findDocumentRow(id: number): DocumentRow | null`
- [x] `findCategoriesByTour(tourId: number): TourCategory[]`
- [x] `findPointTemplateRow(id: number): PointTemplateRow | null`
- [x] `findEnrollmentCount(tourId: number, categoryId?: number): number`
- [x] `findEnrollmentRows(tourId: number): EnrollmentRow[]`
- [x] `findFinalizedCompetitionIds(tourId: number): Set<number>`
- [x] `findStoredResultRows(tourId: number, scoringType: string): StoredResultRow[]`
- [x] `findCompetitionStartInfo(competitionId: number): { start_mode, open_end } | null`
- [x] `findParticipantRowsForCompetition(competitionId: number): ParticipantRow[]`
- [x] `insertTourRow(...): Tour`
- [x] `updateTourRow(...): Tour`

**Logic methods extracted:**
- [x] `buildUpdateFields(data: UpdateTourInput): { updates, values }`
- [x] `isPastCompetition(competitionDate: string): boolean`
- [x] `buildEnrollmentMaps(enrollments): { playerCategories, playerHandicaps, playerNames }`
- [x] `sortAndRankStandings(standings): TourPlayerStanding[]`
- [x] `initializePlayerStanding(playerId, playerName, category): TourPlayerStanding`
- [x] `isCompetitionWindowClosed(startInfo): boolean`
- [x] `determineParticipantFinished(participant, isOpenCompetitionClosed): { isFinished, totalShots, relativeToPar }`
- [x] `calculateRelativeToPar(score, pars): number`
- [x] `adjustResultsForScoring(results, scoringType, handicaps, competition): CompetitionResult[]`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, insert
- [x] `update()` - validation, build fields, update
- [x] `getFullStandings()` - broken into smaller methods
- [x] `getCompetitionPlayerResults()` - uses extracted query/logic methods

**Helper methods for `getFullStandings()`:**
- [x] `buildEmptyStandingsResponse(tour, categories, categoryId): TourStandings`
- [x] `processStoredResults(tourId, scoringType, categoryId, playerCategories, playerStandings): void`
- [x] `processLiveCompetitions(...): boolean` (returns hasProjectedResults)

**Defensive JSON parsing:**
- [x] Using `parseParsArray()` for course pars
- [x] Using `parseScoreArray()` for participant scores
- [x] Using `safeParseJson<PointsStructure>()` for point templates

- [x] Run tests: `bun test tests/tours.test.ts tests/tour-standings.test.ts` - 33 pass
- [x] Run full suite: `bun test ./tests/*.test.ts` - 677 pass

---

### 4.2 TourEnrollmentService (`src/services/tour-enrollment.service.ts`)
**Complexity:** Medium (~280 lines after refactoring)
**Tests:** `tests/tour-enrollment-service.test.ts`, `tests/tour-api-enrollments.test.ts`

#### Completed (Method Separation) - 2026-01-01

**Internal types added:**
- [x] `TourRow`, `UserRow`, `PlayerWithEmailRow`

**Query methods extracted:**
- [x] `findTourExists(tourId: number): boolean`
- [x] `findTourWithMode(tourId): { id, enrollment_mode } | null`
- [x] `findTourVisibility(tourId): { id, visibility, owner_id } | null`
- [x] `findTourOwnerId(tourId: number): number | null`
- [x] `findUserByEmailLower(email: string): UserRow | null`
- [x] `findUserRole(userId: number): string | null`
- [x] `findPlayerByUserId(userId: number): { id } | null`
- [x] `findPlayerWithEmail(playerId): PlayerWithEmailRow | null`
- [x] `findTourAdminExists(tourId, userId): boolean`
- [x] `findActiveEnrollmentByUser(tourId, userId): boolean`
- [x] `insertPlayerRow(name, userId): { id }`
- [x] `insertActiveEnrollmentRow(tourId, playerId, email): TourEnrollment`
- [x] `insertPendingEnrollmentRow(tourId, email): TourEnrollment`
- [x] `insertRequestedEnrollmentRow(tourId, playerId, email): TourEnrollment`
- [x] `updateEnrollmentStatusRow(enrollmentId, status): TourEnrollment`
- [x] `updateEnrollmentWithPlayerRow(enrollmentId, playerId): TourEnrollment`
- [x] `deleteEnrollmentRow(enrollmentId): number`
- [x] `deleteEnrollmentByTourRow(enrollmentId, tourId): number`
- [x] `findEnrollmentsByTour(tourId): TourEnrollmentWithPlayer[]`
- [x] `findEnrollmentsByTourAndStatus(tourId, status): TourEnrollmentWithPlayer[]`
- [x] `findEnrollmentsByPlayer(playerId): TourEnrollment[]`

**Logic methods extracted:**
- [x] `extractEmailName(email: string): string`
- [x] `validateEnrollmentStatus(enrollment, expectedStatus, action): void`

**Public methods refactored to orchestration:**
- [x] `addPendingEnrollment()` - tour exists check, email check, user lookup, player lookup/create, insert
- [x] `requestEnrollment()` - tour mode check, player lookup, email check, insert
- [x] `approveEnrollment()` - find by id, validate status, update
- [x] `rejectEnrollment()` - delete, check changes
- [x] `getEnrollments()` - uses extracted query methods (no more `any` type)
- [x] `activateEnrollment()` - find by email, validate status, update with player
- [x] `canViewTour()` - tour visibility, user role, owner check, admin check, enrollment check
- [x] `canManageTour()` - user role, owner check, admin check
- [x] `getEnrollmentsForPlayer()` - uses extracted query method
- [x] `removeEnrollment()` - delete by tour, check changes

**Type safety fixed:**
- [x] Removed `any[]` type (was `params: any[]` in `getEnrollments`)

- [x] Run tests: `bun test tests/tour-enrollment-service.test.ts tests/tour-api-enrollments.test.ts` - 65 pass
- [x] Run full suite: `bun test` - 677 pass

---

### 4.3 TourCompetitionRegistrationService (`src/services/tour-competition-registration.service.ts`)
**Complexity:** High (~1190 lines after refactoring)
**Tests:** `tests/tour-competition-registration.test.ts`

#### Completed (Method Separation) - 2026-01-01

**Constants & Type Safety:**
- [x] Import `GOLF` constants and `safeParseJson`
- [x] Replace `18` with `GOLF.HOLES_PER_ROUND`

**Internal types added:**
- [x] `CompetitionRow`, `PlayerRow`, `EnrollmentRow`, `TeeTimeRow`, `ParticipantRow`
- [x] `RegistrationRoundRow`, `GroupParticipantRow`, `AvailablePlayerRow`
- [x] `GroupMemberRow`, `GroupMemberWithHandicapRow`

**Query methods extracted:**
- [x] Competition lookups: `findCompetitionWithTour`, `findCompetitionTourId`, `findCoursePars`
- [x] Player lookups: `findPlayerById`, `findPlayerName`, `findActiveEnrollment`
- [x] Registration queries: `findRegistrationRow`, `findRegistrationsByCompetition`, `findAvailablePlayersForCompetition`
- [x] Team operations: `findTeamByName`, `insertTeamRow`
- [x] Tee time operations: `insertTeeTimeRow`, `deleteTeeTimeRow`, `findParticipantCountByTeeTime`, `findMaxTeeOrderForTeeTime`
- [x] Participant operations: `insertParticipantRow`, `deleteParticipantRow`, `updateParticipantTeeTime`
- [x] Registration operations: `insertRegistrationRow`, `deleteRegistrationRow`, `updateRegistrationStatusRow`
- [x] Status updates: `updateRegistrationStartedRow`, `updateRegistrationFinishedRow`, `updateRegistrationTeeTime`, `updateRegistrationTeeTimeOnly`
- [x] Group queries: `findGroupMembersByTeeTime`, `findRegistrationCountByTeeTime`, `findGroupMembersExcludingPlayer`
- [x] Active rounds: `findActiveRoundsForPlayer`, `findCompetitionGroupParticipants`

**Logic methods extracted:**
- [x] Validation: `validateCompetitionOpen`, `validateNotPlayingOrFinished`, `validateCanStartPlaying`, `validateCanFinishPlaying`
- [x] Status helpers: `determineInitialStatus`, `determineGroupCreatedBy`, `mapToAvailableStatus`
- [x] Score calculation: `parseScoreArray`, `calculateHolesPlayed`, `calculateRelativeToPar`
- [x] Display formatting: `formatScoreDisplay`, `formatScoreDisplayWithDash`
- [x] Round status: `isRoundExpired`, `isRoundFinished`
- [x] Group helpers: `buildPlayingGroup`, `groupParticipantsByTeeTime`, `determineMemberStatus`, `determineGroupStatus`, `sortGroupsByStatus`, `getTourTeamName`

**Public methods refactored to orchestration:**
- [x] `register()` - validation, player check, enrollment check, create tee time, participant, registration
- [x] `withdraw()` - validation, delete participant, cleanup tee time, delete registration
- [x] `getRegistration()`, `getRegistrationsForCompetition()` - use query methods
- [x] `getAvailablePlayers()` - tour lookup, query, status mapping
- [x] `addToGroup()` - validation, group size check, add each player
- [x] `removeFromGroup()`, `leaveGroup()` - validation, move to solo
- [x] `getGroupByTeeTime()`, `getGroupMemberCount()` - use query and logic methods
- [x] `startPlaying()`, `finishPlaying()` - validation, status updates
- [x] `getActiveRounds()` - query, score calculation, filtering
- [x] `getCompetitionGroups()` - query, grouping, status determination

**Private helpers refactored:**
- [x] `getOrCreateTourTeam()` - uses query methods
- [x] `addPlayerToGroup()` - uses query and validation methods
- [x] `movePlayerToSoloGroup()` - uses query methods

- [x] Run tests: `bun test tests/tour-competition-registration.test.ts` - 25 pass
- [x] Run full suite: `bun test` - 677 pass

---

### 4.4 Other Tour Services

#### TourAdminService (`tour-admin.service.ts`) - Completed 2026-01-01

**Internal types added:**
- [x] `UserRoleRow`, `TourOwnerRow`

**Query methods extracted:**
- [x] `findTourExists(tourId): boolean`
- [x] `findUserExists(userId): boolean`
- [x] `findTourAdminExists(tourId, userId): boolean`
- [x] `findUserRole(userId): string | null`
- [x] `findTourOwnerId(tourId): number | null`
- [x] `insertTourAdminRow(tourId, userId): TourAdmin`
- [x] `deleteTourAdminRow(tourId, userId): number`
- [x] `findTourAdminsWithUser(tourId): TourAdminWithUser[]`
- [x] `findToursForUser(userId): { tour_id, tour_name }[]`
- [x] `findTourAdminById(id): TourAdmin | null`

**Logic methods extracted:**
- [x] `isSuperAdmin(role): boolean`

**Public methods refactored to orchestration:**
- [x] `addTourAdmin()` - existence checks, insert
- [x] `removeTourAdmin()` - delete, check changes
- [x] `getTourAdmins()` - existence check, query
- [x] `isTourAdmin()` - uses query method
- [x] `getToursForAdmin()` - uses query method
- [x] `canManageTour()` - role check, owner check, admin check
- [x] `canManageTourAdmins()` - role check, owner check
- [x] `findById()` - uses query method

- [x] Run tests: `bun test tests/tour-admin-service.test.ts` - 34 pass

---

#### TourCategoryService (`tour-category.service.ts`) - Completed 2026-01-01

**Internal types added:**
- [x] `MaxOrderRow`, `EnrollmentTourRow`, `EnrollmentByCategoryRow`

**Query methods extracted:**
- [x] `findTourExists(tourId): boolean`
- [x] `findCategoryByTourAndName(tourId, name): boolean`
- [x] `findCategoryByTourAndNameExcluding(tourId, name, excludeId): boolean`
- [x] `findMaxSortOrder(tourId): number`
- [x] `insertCategoryRow(tourId, name, description, sortOrder): TourCategory`
- [x] `updateCategoryRow(id, name, description, sortOrder): TourCategory`
- [x] `deleteCategoryRow(id): void`
- [x] `findCategoryById(id): TourCategory | null`
- [x] `findCategoriesByTourWithCount(tourId): TourCategoryWithCount[]`
- [x] `updateCategorySortOrder(id, sortOrder): void`
- [x] `findEnrollmentTourId(enrollmentId): number | null`
- [x] `updateEnrollmentCategory(enrollmentId, categoryId): void`
- [x] `findEnrollmentsByIds(enrollmentIds): EnrollmentTourRow[]`
- [x] `updateEnrollmentsCategory(enrollmentIds, categoryId): number`
- [x] `findEnrollmentsByCategory(categoryId): EnrollmentByCategoryRow[]`

**Logic methods extracted:**
- [x] `validateCategoriesInTour(categoryIds, validCategoryIds): void`
- [x] `validateAllEnrollmentsSameTour(enrollments, expectedCount): number`

**Public methods refactored to orchestration:**
- [x] `create()` - existence check, duplicate check, sort order, insert
- [x] `update()` - existence check, duplicate check, update
- [x] `delete()` - existence check, delete
- [x] `findById()` - uses query method
- [x] `findByTour()` - existence check, query
- [x] `reorder()` - get categories, validate, update each
- [x] `assignToEnrollment()` - existence check, tour validation, update
- [x] `bulkAssign()` - get enrollments, validate same tour, validate category, update
- [x] `getEnrollmentsByCategory()` - existence check, query

- [x] Run tests: `bun test tests/tour-category-service.test.ts` - 26 pass

---

#### TourDocumentService (`tour-document.service.ts`) - Completed 2026-01-01

**Breaking changes:**
- [x] Removed unnecessary `async/await` (SQLite in Bun is synchronous)
- [x] Methods now return values directly instead of Promises

**Internal types added:**
- [x] `DocumentTypeRow`

**Query methods extracted:**
- [x] `findTourExists(tourId): boolean`
- [x] `insertDocumentRow(title, content, type, tourId): TourDocument`
- [x] `findAllDocuments(): TourDocument[]`
- [x] `findDocumentById(id): TourDocument | null`
- [x] `findDocumentsByTour(tourId): TourDocument[]`
- [x] `findDocumentsByTourAndType(tourId, type): TourDocument[]`
- [x] `updateDocumentRow(id, updates, values): TourDocument`
- [x] `deleteDocumentRow(id): void`
- [x] `findDistinctTypesByTour(tourId): DocumentTypeRow[]`

**Logic methods extracted:**
- [x] `validateCreateData(data): void`
- [x] `validateUpdateData(data): void`
- [x] `buildUpdateQuery(data, id): { updates, values }`
- [x] `extractTypes(rows): string[]`

**Public methods refactored to orchestration:**
- [x] `create()` - validation, tour check, insert
- [x] `findAll()` - query
- [x] `findById()` - query
- [x] `findByTourId()` - tour check, query
- [x] `findByTourIdAndType()` - tour check, query
- [x] `update()` - existence check, validation, build query, update
- [x] `delete()` - existence check, delete
- [x] `getDocumentTypes()` - tour check, query, extract

- [x] Run tests: `bun test tests/tour-document-service.test.ts` - 27 pass

---

**Phase 4.4 Complete:** All three services refactored (87 tests pass)

---

## Phase 5: CompetitionService (The Big One)

**File:** `src/services/competition-service.ts`
**Complexity:** Highest (~1405 lines after refactoring)
**Critical Method:** `getLeaderboardWithDetails()` (220 lines after refactoring, was 530)
**Tests:** `tests/competitions.test.ts`, `tests/competition-leaderboard-net-scores.test.ts`

#### Completed (Constants & Type Safety Pass) - 2026-01-01

- [x] Import `GOLF` constants and replace magic numbers (`18`, `72`, `113`)
- [x] Import `parseParsArray`, `safeParseJson` utilities
- [x] Fix `any` types - replaced with proper typed interfaces
- [x] Add internal types: `CompetitionRow`, `CompetitionWithCourseRow`, `TeeRow`, `TeeRating`, `ParticipantWithDetailsRow`, `CategoryRow`, `CategoryTeeRow`, `CategoryTeeRating`, `PlayerHandicapRow`, `StoredResultRow`, `PointTemplateRow`

#### Completed (Query Methods) - 2026-01-01

- [x] `findCourseExists(id: number): boolean`
- [x] `findSeriesExists(id: number): boolean`
- [x] `findTourExists(id: number): boolean`
- [x] `findTeeWithCourse(id: number): { id, course_id } | null`
- [x] `findTeeTimesForCompetition(competitionId: number): { id }[]`
- [x] `findAllCompetitionRows(): CompetitionWithCourseRow[]`
- [x] `findCompetitionRowById(id: number): CompetitionWithCourseRow | null`
- [x] `findCompetitionWithPars(id: number): CompetitionRow | null`
- [x] `findTourScoringMode(tourId: number): TourScoringMode | undefined`
- [x] `findTeeWithRatings(teeId: number): TeeRow | null`
- [x] `findPlayerHandicapRows(tourId: number): PlayerHandicapRow[]`
- [x] `findParticipantsForCompetition(competitionId: number): ParticipantWithDetailsRow[]`
- [x] `findCategoriesForCompetition(tourId, competitionId): CategoryRow[]`
- [x] `findCategoryTeeRows(competitionId: number): CategoryTeeRow[]`
- [x] `findStoredResultRows(competitionId: number): StoredResultRow[]`
- [x] `findPointTemplateRow(templateId: number): PointTemplateRow | null`
- [x] `findSeriesTeamCount(seriesId: number): number`
- [x] `insertCompetitionRow(data: CreateCompetitionDto): Competition`
- [x] `updateCompetitionRow(id, updates, values): Competition`
- [x] `deleteCompetitionRow(id: number): void`

#### Completed (Logic Methods) - 2026-01-01

- [x] `transformCompetitionRowToResult(row): Competition & { course }`
- [x] `parseStrokeIndex(json: string | null): number[]`
- [x] `extractTeeRatings(tee: TeeRow): { courseRating, slopeRating }`
- [x] `buildTeeInfo(tee, strokeIndex, courseRating, slopeRating): LeaderboardResponse["tee"]`
- [x] `buildDefaultTeeInfo(courseRating, slopeRating, strokeIndex): LeaderboardResponse["tee"]`
- [x] `buildPlayerHandicapMap(rows: PlayerHandicapRow[]): Map<number, number>`
- [x] `transformCategoryTeeRow(row: CategoryTeeRow): CategoryTeeRating`
- [x] `buildCategoryTeeRatingsMap(rows: CategoryTeeRow[]): Map<number, CategoryTeeRating>`
- [x] `parseParticipantScore(score): number[]`
- [x] `calculateHolesPlayed(score: number[]): number`
- [x] `calculateTotalShots(score: number[]): number`
- [x] `calculateRelativeToPar(score, pars): number`
- [x] `calculateNetScores(score, pars, holesPlayed, totalShots, courseHandicap, handicapStrokes): { netTotalShots, netRelativeToPar }`
- [x] `isCompetitionWindowClosed(competition: CompetitionRow): boolean`
- [x] `getTeeInfoForCompetition(teeId, scoringMode): { teeInfo, strokeIndex, courseRating, slopeRating }`
- [x] `getPlayerHandicapsForCompetition(tourId, scoringMode): Map<number, number>`
- [x] `getCategoryTeeRatingsForCompetition(competitionId, tourId, scoringMode): Map<number, CategoryTeeRating>`
- [x] `sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[]`
- [x] `buildCategoryTeesResponse(categories, categoryTeeRatings): LeaderboardResponse["categoryTees"]`
- [x] `addStoredPointsToLeaderboard(entries, storedResults): LeaderboardEntry[]`
- [x] `addProjectedPointsToLeaderboard(sortedEntries, pointTemplate, pointsMultiplier): LeaderboardEntry[]`
- [x] `validateCompetitionName(name: string): void`
- [x] `validateCompetitionDate(date: string): void`
- [x] `validateCompetitionNameNotEmpty(name: string): void`
- [x] `validateCompetitionDateFormat(date: string): void`
- [x] `buildUpdateFields(data: UpdateCompetitionDto): { updates, values }`

#### Completed (Public Methods to Orchestration) - 2026-01-01

- [x] `create()` - validation, existence checks, insert
- [x] `findAll()` - query, transform each
- [x] `findById()` - query, transform
- [x] `update()` - validation, existence checks, build fields, update
- [x] `delete()` - existence check, check tee times, delete
- [x] `getLeaderboardWithDetails()` - refactored to use extracted query and logic methods
- [x] `getTeamLeaderboard()` - uses query methods

#### Completed (Final Verification) - 2026-01-01

- [x] Run: `bun test tests/competitions.test.ts` - 28 pass
- [x] Run: `bun test tests/competition-leaderboard-net-scores.test.ts` - 7 pass
- [x] Run full suite: `bun run test:server` - 677 pass

---

## Phase 6: Competition Results Service

**File:** `src/services/competition-results.service.ts`
**Complexity:** Medium (~636 lines after refactoring)
**Tests:** Related competition tests (no dedicated test file, tested via integration)

#### Completed (Constants & Type Safety Pass) - 2026-01-01

- [x] Import `GOLF` constants and `parseParsArray`, `safeParseJson` utilities
- [x] Replace `72` with `GOLF.STANDARD_COURSE_RATING`
- [x] Replace `-1` checks with `GOLF.UNREPORTED_HOLE`
- [x] Replace `18` with `GOLF.HOLES_PER_ROUND`
- [x] Fix `any[]` type in `getPlayerResults()` → `PlayerResultRow[]`

#### Completed (Internal Types) - 2026-01-01

- [x] `CompetitionDetailsRow`, `PointTemplateRow`, `EnrollmentCountRow`
- [x] `CompetitionFinalRow`, `TourStandingRow`, `PlayerTourPointsRow`
- [x] `PlayerResultRow`

#### Completed (Query Methods) - 2026-01-01

- [x] `findCompetitionDetails(competitionId): CompetitionDetailsRow | null`
- [x] `findPointTemplateRow(templateId): PointTemplateRow | null`
- [x] `findActiveEnrollmentCount(tourId): number`
- [x] `findParticipantDataRows(competitionId): ParticipantData[]`
- [x] `deleteCompetitionResultRows(competitionId): void`
- [x] `insertCompetitionResultRow(competitionId, result, scoringType): void`
- [x] `updateCompetitionFinalizedRow(competitionId): void`
- [x] `findCompetitionResultRows(competitionId, scoringType): StoredCompetitionResult[]`
- [x] `findPlayerResultRows(playerId, scoringType): PlayerResultRow[]`
- [x] `findCompetitionFinalizedRow(competitionId): CompetitionFinalRow | null`
- [x] `findPlayerTourPointsRow(playerId, tourId, scoringType): PlayerTourPointsRow`
- [x] `findTourStandingRows(tourId, scoringType): TourStandingRow[]`

#### Completed (Logic Methods) - 2026-01-01

- [x] `parseParsFromCompetition(competition): { pars, totalPar }`
- [x] `isOpenCompetitionClosed(competition): boolean`
- [x] `parseParticipantScore(score): number[]`
- [x] `hasInvalidHole(score): boolean`
- [x] `calculateHolesPlayed(score): number`
- [x] `calculateGrossScore(score): number`
- [x] `calculateRelativeToParFromScore(score, pars): number`
- [x] `calculateNetScore(grossScore, handicapIndex): number | null`
- [x] `isParticipantFinished(participant, score, isOpenCompetitionClosed): boolean`
- [x] `buildParticipantResult(participant, pars, totalPar, isOpenCompetitionClosed): CompetitionResult`
- [x] `sortResultsByScore(results): CompetitionResult[]`
- [x] `assignPositionsAndPoints(sortedResults, numberOfPlayers, pointTemplate, multiplier): CompetitionResult[]`
- [x] `calculatePointsForPosition(position, numberOfPlayers, pointTemplate): number`
- [x] `assignStandingPositions(standings): (TourStandingRow & { position })[]`

#### Completed (Public Methods to Orchestration) - 2026-01-01

- [x] `finalizeCompetitionResults()` - orchestrates query and logic methods
- [x] `getCompetitionResults()` - delegates to query method
- [x] `getPlayerResults()` - delegates to query method
- [x] `isCompetitionFinalized()` - delegates to query method
- [x] `recalculateResults()` - delegates to finalizeCompetitionResults
- [x] `getPlayerTourPoints()` - query + transform
- [x] `getTourStandingsFromResults()` - query + logic method

#### Completed (Final Verification) - 2026-01-01

- [x] Run: `bun run test:server` - 677 pass

---

## Phase 7: Player Services

### 7.1 PlayerService (`src/services/player.service.ts`)
- [ ] Analyze method violations
- [ ] Fix any `any` types
- [ ] Extract query methods
- [ ] Run tests

### 7.2 PlayerProfileService (`src/services/player-profile.service.ts`)
- [ ] Replace handicap range with `GOLF.*` constants
- [ ] Replace `72` default par with `GOLF.STANDARD_COURSE_RATING`
- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Fix any `any` types
- [ ] Run tests

---

## Phase 8: Final Cleanup

- [ ] Remove unused imports across all refactored files
- [ ] Run full test suite: `bun test`
- [ ] Run type check: `bun run type-check`
- [ ] Run linter: `bun run lint`
- [ ] Update `docs/opus-backend-review.md` with completion status

---

## Progress Tracking

| Phase | Status | Date Started | Date Completed |
|-------|--------|--------------|----------------|
| Phase 0: Foundation | Complete | 2025-12-31 | 2025-12-31 |
| Phase 1: Simple Services | **Complete** | 2025-12-31 | 2025-12-31 |
| Phase 2: Medium Services | **Complete** | 2025-12-31 | 2025-12-31 |
| Phase 3: Complex Services | **Complete** | 2025-12-31 | 2025-12-31 |
| Phase 4: Tour Services | **Complete** | 2025-12-31 | 2026-01-01 |
| Phase 5: CompetitionService | **Complete** | 2026-01-01 | 2026-01-01 |
| Phase 6: CompetitionResultsService | **Complete** | 2026-01-01 | 2026-01-01 |
| Phase 7: Player Services | Not Started | | |
| Phase 8: Final Cleanup | Not Started | | |

---

## Rollback Strategy

If tests fail after an extraction:

1. `git stash` or `git checkout -- <file>` to revert
2. Analyze why the extraction broke behavior
3. Try a smaller, more isolated extraction
4. Consider if the extraction accidentally changed logic

---

## Commands Reference

```bash
# Run server tests only (recommended for refactoring)
bun run test:server

# Run all tests (includes frontend - may have flaky failures)
bun test

# Run specific test file
bun test tests/competitions.test.ts

# Run tests matching pattern
bun test --grep "leaderboard"

# Type check
bun run type-check

# Lint
bun run lint
```

---

## Notes

- Each phase can be a separate PR for easier review
- Never skip running tests after an extraction
- If unsure about an extraction, make it smaller
- The goal is structure change, not behavior change
- **Method separation is the core work** - type fixes and constants were just preparation
