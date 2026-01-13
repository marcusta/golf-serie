# Casual Games Feature - Implementation Progress

**Last Updated**: 2026-01-12
**Status**: Backend Complete (Phase 1) - Starting Frontend (Phase 2)

## Overview

Implementation of casual "Play Golf" feature allowing users to organize informal rounds with friends (both registered and guest players). Uses strategy pattern for game types, starting with Stroke Play.

## Detailed Plan Reference

Full implementation plan: `/Users/marcust/.claude/plans/wise-percolating-kurzweil.md`

---

## Phase 1: Backend Foundation ✅ COMPLETE

### ✅ Database Schema (Migration 045)
- **File**: `src/database/migrations/045_add_casual_games.ts`
- **Status**: Complete
- **Tables Created**:
  - `games` - Main game entity (id, owner_id, course_id, game_type, scoring_mode, status, custom_settings)
  - `game_players` - Players (registered + guests) with CHECK constraint for player_id XOR guest_name
  - `game_groups` - Group assignments (like tee_times)
  - `game_group_members` - Junction table for players in groups
  - `game_scores` - Score tracking with handicap snapshots and custom_data
- **Indexes**: All foreign keys indexed for performance
- **Registered**: Added to `src/database/db.ts` (import + migrations array)

### ✅ Type Definitions
- **File**: `src/types/index.ts`
- **Status**: Complete
- **Types Added**: Game, GamePlayer, GameGroup, GameGroupMember, GameScore, CreateGameDto, AddGamePlayerDto, CreateGameGroupDto, GameLeaderboardEntry, GameWithDetails, GameForDashboard
- **Type Aliases**: GameStatus, GameScoringMode

### ✅ Game Type Strategy Pattern
- **Base Class**: `src/services/game-strategies/base.ts` ✅
  - GameTypeStrategy abstract class
  - GameScoreResult, GameLeaderboardContext interfaces
  - Methods: validateSettings(), calculateResults(), validateScore(), getDefaultSettings()

- **Stroke Play Strategy**: `src/services/game-strategies/stroke-play.ts` ✅
  - Implements gross/net/both scoring modes
  - Uses handicap utilities from `utils/handicap.ts`
  - Position assignment with tie handling
  - Net score calculation with course handicap distribution

- **Registry**: `src/services/game-strategies/registry.ts` ✅
  - Singleton pattern for strategy management
  - register(), get(), has(), listAvailable(), getAllMetadata()
  - StrokePlayStrategy registered by default

### ✅ Service Layer
- **GameService**: `src/services/game.service.ts` ✅
  - CRUD: createGame(), findById(), findByIdWithDetails(), findMyGames(), deleteGame()
  - Player Management: addPlayer(), removePlayer(), assignTee(), findGamePlayers()
  - Status: updateGameStatus(), canUserModifyGame()
  - Validation: game type, scoring mode, player data (XOR constraint)
  - Permissions: Owner-only modifications

- **GameGroupService**: `src/services/game-group.service.ts` ✅
  - Group Management: createGroup(), findGroupsForGame(), deleteGroup()
  - Member Management: addMemberToGroup(), removeMemberFromGroup(), findGroupMembers()
  - Reordering: reorderMembers(), setGroupMembers() (for drag-n-drop)

- **GameScoreService**: `src/services/game-score.service.ts` ✅
  - Score Entry: updateScore(), lockScore(), unlockScore()
  - Leaderboard: getLeaderboard() (delegates to strategy)
  - Handicap: captureHandicapSnapshot() (on first score)
  - Group Scores: findScoresForGroup()

### ✅ API Endpoints
- **Games API**: `src/api/games.ts` ✅
  - POST /api/games - Create game (requireAuth)
  - GET /api/games/:id - Get game details
  - GET /api/games/my - List user's games (requireAuth)
  - PUT /api/games/:id/status - Update status (owner only)
  - DELETE /api/games/:id - Delete game (setup only, owner only)
  - POST /api/games/:id/players - Add player (owner only)
  - DELETE /api/games/:id/players/:playerId - Remove player (owner only)
  - PUT /api/games/:id/players/:playerId/tee - Assign tee (owner only)
  - GET /api/games/:id/players - Get all players
  - POST /api/games/:id/groups - Create group (owner only)
  - PUT /api/games/:id/groups/:groupId/members - Set group members (owner only)
  - DELETE /api/games/:id/groups/:groupId - Delete group (owner only)
  - GET /api/games/:id/groups - Get all groups
  - GET /api/games/:id/groups/:groupId/scores - Get group scores
  - GET /api/games/:id/leaderboard - Get leaderboard (strategy-calculated)

- **Game Scores API**: `src/api/game-scores.ts` ✅
  - PUT /api/game-scores/:memberId/hole/:hole - Update hole score (requireAuth)
  - POST /api/game-scores/:memberId/lock - Lock scorecard (requireAuth)
  - POST /api/game-scores/:memberId/unlock - Unlock scorecard (owner only)

### 🔄 Route Registration (IN PROGRESS)
- **File**: `src/app.ts`
- **Status**: Services initialized, routes pending
- **Done**:
  - ✅ Imports added (API + services)
  - ✅ Services initialized (gameService, gameGroupService, gameScoreService)
  - ✅ API factories created (gamesApi, gameScoresApi)
- **TODO**: Register routes in app (insert before line 491 - TeeTime routes)

---

## Phase 2: Frontend Core (PENDING)

### Frontend Files to Create

1. **React Query Hooks**: `frontend/src/api/games.ts`
   - useMyGames(), useGame(id), useCreateGame()
   - useAddGamePlayer(), useGameGroupScores()
   - useUpdateGameScore(), useGameLeaderboard()
   - useGameSync(gameId) - polling hook (30s interval)

2. **Game Setup Wizard**: `frontend/src/views/player/GameSetup.tsx`
   - Step 1: Course selection
   - Step 2: Player setup (search registered + add guests)
   - Step 3: Tee box assignment per player
   - Step 4: Group assignment (drag-n-drop with @dnd-kit)
   - Step 5: Game type config (stroke play gross/net/both)

3. **Guest Selection**: `frontend/src/views/player/GameGuestSelect.tsx`
   - URL: `/games/:gameId/guest-select`
   - Simple player list (registered + guests)
   - Click → localStorage.setItem('selected_game_player_id', playerId)
   - Navigate to game

4. **Dashboard Integration**: `frontend/src/views/player/Dashboard.tsx`
   - Add 3D skeumorphic "Play Golf" button (centered in top bar)
   - Add "Active Games" section (below active rounds)
   - Card format: course name, player count, current score

5. **Routes**: `frontend/src/router.tsx`
   - `/player/games/new` → GameSetup
   - `/games/:gameId/guest-select` → GameGuestSelect
   - `/player/games/:gameId/play` → GamePlay

---

## Phase 3: In-Game Experience (PENDING)

### Files to Create

1. **Game Play View**: `frontend/src/views/player/GamePlay.tsx`
   - Reuse: ScoreEntry, HoleNavigation, BottomTabNavigation, LeaderboardComponent
   - Transform game data to TeeTimeGroup format
   - Permission: localStorage check for guest players
   - Polling: useGameSync(gameId)

2. **Game Leaderboard**: `frontend/src/components/games/GameLeaderboard.tsx`
   - Props: gameId, scoringMode, courseStrokeIndex
   - Query: useGameLeaderboard(gameId)
   - Display: Position, Name, Score (gross/net), Thru, Status
   - Click row → scorecard modal

3. **Polling Hook**: `frontend/src/hooks/useGameSync.ts`
   - Pattern: Similar to useCompetitionSync
   - Poll every 30s when game active
   - Update React Query cache automatically

---

## Phase 4: Dashboard Integration (PENDING)

1. Add "Active Games" section to Dashboard
2. Format game cards (course, players, score)
3. Handle navigation to games

---

## Phase 5: Testing & Verification (PENDING)

### Backend Tests
- `test/services/game.service.test.ts` - CRUD, player management, permissions
- `test/services/game-strategies/stroke-play.test.ts` - Gross/net calculations, ties
- `test/api/games.test.ts` - Authorization, validation

### Frontend Tests
- E2E: Complete game setup wizard flow
- E2E: Guest player selection and score entry
- Integration: Polling updates leaderboard

### Manual Verification
```bash
# Backend
bun run db:migrate  # Apply migration 045
sqlite3 golf_series.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'game%';"
bun run dev  # Start server

# Frontend
cd frontend && npm run dev
# Test: Dashboard → Play Golf → Setup → Play → Leaderboard
```

---

## Critical Next Steps

### Immediate (Complete Phase 1)
1. **Finish Route Registration** (in app.ts around line 491)
   - Add games routes (POST, GET, PUT, DELETE for games)
   - Add player routes (POST, DELETE, PUT for game players)
   - Add group routes (POST, PUT, DELETE, GET for groups)
   - Add score routes (PUT, POST for scores)

### After Route Registration
2. Run migration: `bun run db:migrate`
3. Verify schema: Check all 5 tables created
4. Test backend: Create game via API, add players, create groups

### Then Start Phase 2
5. Create React Query hooks (frontend/src/api/games.ts)
6. Implement GameSetup wizard (5-step flow)
7. Add "Play Golf" button to Dashboard

---

## Route Registration Template (TO INSERT)

```typescript
// ============================================================================
// Casual Games Routes
// ============================================================================

// Games
app.post("/api/games", requireAuth(), async (c) => {
  const userId = c.get("userId");
  return await gamesApi.create(c.req, userId);
});

app.get("/api/games/my", requireAuth(), async (c) => {
  const userId = c.get("userId");
  return await gamesApi.findMyGames(userId);
});

app.get("/api/games/:id", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  return await gamesApi.findById(gameId);
});

app.put("/api/games/:id/status", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  const userId = c.get("userId");
  return await gamesApi.updateStatus(c.req, gameId, userId);
});

app.delete("/api/games/:id", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  const userId = c.get("userId");
  return await gamesApi.deleteGame(gameId, userId);
});

// Game Players
app.post("/api/games/:id/players", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  const userId = c.get("userId");
  return await gamesApi.addPlayer(c.req, gameId, userId);
});

app.delete("/api/games/:id/players/:playerId", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  const playerId = parseInt(c.req.param("playerId"));
  const userId = c.get("userId");
  return await gamesApi.removePlayer(gameId, playerId, userId);
});

app.put("/api/games/:id/players/:playerId/tee", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  const playerId = parseInt(c.req.param("playerId"));
  const userId = c.get("userId");
  return await gamesApi.assignTee(c.req, gameId, playerId, userId);
});

app.get("/api/games/:id/players", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  return await gamesApi.getPlayers(gameId);
});

// Game Groups
app.post("/api/games/:id/groups", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  const userId = c.get("userId");
  return await gamesApi.createGroup(c.req, gameId, userId);
});

app.put("/api/games/:id/groups/:groupId/members", requireAuth(), async (c) => {
  const groupId = parseInt(c.req.param("groupId"));
  const userId = c.get("userId");
  return await gamesApi.setGroupMembers(c.req, groupId, userId);
});

app.delete("/api/games/:id/groups/:groupId", requireAuth(), async (c) => {
  const groupId = parseInt(c.req.param("groupId"));
  const userId = c.get("userId");
  return await gamesApi.deleteGroup(groupId, userId);
});

app.get("/api/games/:id/groups", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  return await gamesApi.getGroups(gameId);
});

app.get("/api/games/:id/groups/:groupId/scores", requireAuth(), async (c) => {
  const groupId = parseInt(c.req.param("groupId"));
  return await gamesApi.getGroupScores(groupId);
});

// Game Leaderboard
app.get("/api/games/:id/leaderboard", requireAuth(), async (c) => {
  const gameId = parseInt(c.req.param("id"));
  return await gamesApi.getLeaderboard(gameId);
});

// Game Scores
app.put("/api/game-scores/:memberId/hole/:hole", requireAuth(), async (c) => {
  const memberId = parseInt(c.req.param("memberId"));
  const hole = parseInt(c.req.param("hole"));
  return await gameScoresApi.updateScore(c.req, memberId, hole);
});

app.post("/api/game-scores/:memberId/lock", requireAuth(), async (c) => {
  const memberId = parseInt(c.req.param("memberId"));
  return await gameScoresApi.lockScore(memberId);
});

app.post("/api/game-scores/:memberId/unlock", requireAuth(), async (c) => {
  const memberId = parseInt(c.req.param("memberId"));
  const userId = c.get("userId");
  return await gameScoresApi.unlockScore(memberId, userId);
});
```

---

## Key Design Decisions

1. **Separate Tables**: New game_* tables keep casual games isolated from tournaments
2. **Guest Players**: Single game_players table with CHECK constraint (player_id XOR guest_name)
3. **Strategy Pattern**: Runtime registry for game types (easy to add stableford, scramble, etc.)
4. **Guest Auth**: Simple localStorage (trust-based, no complex tokens)
5. **Polling**: 30s intervals (consistent with competitions, can upgrade to WebSockets later)

## Success Criteria

**Backend** ✅:
- Migration 045 applies successfully
- All 5 tables created with indexes
- Services implement CRUD correctly
- Strategy pattern calculates leaderboards
- API endpoints return correct shapes
- Authorization enforces owner-only actions

**Frontend** (Pending):
- "Play Golf" button renders on dashboard
- Setup wizard completes all 5 steps
- Guest player selection works
- Score entry reuses competition components
- Leaderboard updates with polling
- Games appear in "Active Rounds"
