# Backend Refactoring Plan

**Created:** 2025-12-31
**Updated:** 2025-12-31
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
**Complexity:** Medium
**Tests:** `tests/tour-enrollment-service.test.ts`, `tests/tour-api-enrollments.test.ts`

- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Fix any `any` types
- [ ] Run tests
- [ ] Run full suite: `bun test`

### 4.3 TourCompetitionRegistrationService
**Complexity:** High
**Tests:** `tests/tour-competition-registration.test.ts`

- [ ] Replace `18` with `GOLF.HOLES_PER_ROUND`
- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Extract logic methods
- [ ] Fix any `any` types
- [ ] Run tests
- [ ] Run full suite: `bun test`

### 4.4 Other Tour Services
- [ ] `tour-admin.service.ts`
- [ ] `tour-category.service.ts`
- [ ] `tour-document.service.ts`

---

## Phase 5: CompetitionService (The Big One)

**File:** `src/services/competition-service.ts`
**Complexity:** Highest (~1136 lines)
**Critical Method:** `getLeaderboardWithDetails()` (530 lines)
**Tests:** `tests/competitions.test.ts`, `tests/competition-leaderboard-net-scores.test.ts`

### 5.1 Document Current Structure

Before touching code, map what `getLeaderboardWithDetails()` does:

```
Lines 317-330:   Load competition with course
Lines 336-341:   Get scoring mode from tour
Lines 344-399:   Get tee info
Lines 413-427:   Get handicaps from enrollments
Lines 430-450:   Get participants
Lines 453-465:   Get categories
Lines 476-547:   Get category tee ratings
Lines 549-555:   Parse course pars
Lines 563-700:   Calculate leaderboard entries
Lines 703-724:   Sort leaderboard
Lines 727-747:   Build category tees response
Lines 750-833:   Add points for tour competitions
Lines 835-844:   Return response
```

### 5.2 Extract Query Methods (one at a time)

- [ ] `findCompetitionWithCourse(id: number)`
- [ ] `findTourScoringMode(tourId: number)`
- [ ] `findTeeWithRatings(teeId: number)`
- [ ] `findPlayerHandicaps(tourId: number)`
- [ ] `findParticipantsForCompetition(competitionId: number)`
- [ ] `findCategoriesForCompetition(tourId: number, competitionId: number)`
- [ ] `findCategoryTeeRatings(competitionId: number)`
- [ ] `findStoredResults(competitionId: number)`
- [ ] Run tests after EACH extraction

### 5.3 Extract Logic Methods (one at a time)

- [ ] `parseTeeInfo(tee: TeeRow): TeeInfo`
- [ ] `parseStrokeIndex(json: string): number[]`
- [ ] `calculateEntryScore(participant, pars, handicapInfo): LeaderboardEntry`
- [ ] `calculateNetScore(grossScore, handicapStrokes, pars): NetScoreResult`
- [ ] `sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[]`
- [ ] `calculateProjectedPoints(position, numPlayers, template, multiplier)`
- [ ] `buildLeaderboardResponse(entries, competition, teeInfo, ...)`
- [ ] Run tests after EACH extraction

### 5.4 Refactor Other Methods

- [ ] `create()` - extract validation
- [ ] `update()` - extract dynamic SQL building
- [ ] `getTeamLeaderboard()` - extract team grouping logic
- [ ] `transformLeaderboardToTeamLeaderboard()` - break into smaller methods

### 5.5 Final Verification

- [ ] Run: `bun test tests/competitions.test.ts`
- [ ] Run: `bun test tests/competition-leaderboard-net-scores.test.ts`
- [ ] Run full suite: `bun test`
- [ ] Run type check: `bun run type-check`

---

## Phase 6: Competition Results Service

**File:** `src/services/competition-results.service.ts`
**Tests:** Related competition tests

- [ ] Replace magic numbers with `GOLF.*` constants
- [ ] Analyze method violations
- [ ] Extract query methods
- [ ] Extract calculation logic
- [ ] Run full suite: `bun test`

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
| Phase 4: Tour Services | **In Progress** (4.1 TourService done) | 2025-12-31 | |
| Phase 5: CompetitionService | Not Started | | |
| Phase 6: CompetitionResultsService | Not Started | | |
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
# Run all tests
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
