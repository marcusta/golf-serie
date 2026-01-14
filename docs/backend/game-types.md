# Game Type System

> **🎯 Design Goal: Open-Closed Principle Compliance**
>
> This system enables **adding new golf game types without modifying existing code**.
>
> **To add a new game type:**
> - ✅ Create 1 backend strategy class
> - ✅ Create 4 frontend components (SettingsForm, ScoreInput, LeaderboardRow, ScorecardDisplay)
> - ✅ Register both in their respective registries
> - ❌ NO changes to base components or existing game types
>
> **If adding a game type requires modifying ANY existing file, the architecture has failed its design goal.**

## Overview

The game type system enables support for multiple golf scoring formats, each with different rules for score entry, calculation, and display. The system uses the **Strategy Pattern** (backend) and **Plugin Pattern** (frontend) to encapsulate game-specific logic while sharing common infrastructure.

**Design Principle**: The system follows the **Open-Closed Principle** - it is **open for extension** (new game types can be added) but **closed for modification** (existing code should not need changes). Adding a new game type should involve:
- ✅ Creating a new strategy class (backend)
- ✅ Registering the strategy in the registry
- ✅ Creating four UI components (frontend)
- ✅ Registering components in frontend registry
- ❌ NO modification to base classes, core components, or existing game types

### Supported Game Types (Current & Planned)

| Game Type | Status | Description | Key Differences |
|-----------|--------|-------------|-----------------|
| **Stroke Play** | ✅ Implemented | Traditional golf - count total shots | Lowest score wins |
| **Stableford** | 🔮 Planned | Points-based scoring | Par=2pts, Birdie=3pts, etc. Highest points wins |
| **Scramble** | 🔮 Planned | Team format - best ball | Team picks best shot after each stroke |
| **Skins** | 🔮 Planned | Winner-take-all per hole | Player with lowest score on hole wins the "skin" |
| **Match Play** | 🔮 Planned | Hole-by-hole vs opponent | Win/lose/tie each hole, not cumulative score |

---

## Why This Matters

Different golf formats fundamentally change five key areas. Each area requires **extension points** that allow new game types to be added without modifying existing code:

### 1. Score Entry (Frontend Extension Point)
   - **Stroke Play**: Enter shots per hole (3, 4, 5)
   - **Stableford**: Can cap scores per hole (net double bogey max)
   - **Scramble**: Enter team score, not individual scores
   - **Skins**: Need UI for "who won this hole"

### 2. Score Calculation (Backend Extension Point - Strategy Pattern)
   - **Stroke Play**: Sum shots, apply handicap for net
   - **Stableford**: Convert shots to points per hole
   - **Scramble**: Team score only, no individual tracking
   - **Skins**: Binary win/loss per hole

### 3. Leaderboard Display (Frontend Extension Point)
   - **Stroke Play**: Total score, +/- par
   - **Stableford**: Total points (36 is even)
   - **Scramble**: Team standings, not individual
   - **Skins**: Skins won count, prize money

### 4. Scorecard Display (Frontend Extension Point)
   - **Stroke Play**: 18-hole grid showing shots, par, +/- per hole
   - **Stableford**: Grid showing shots AND points earned per hole
   - **Scramble**: Team scorecard (no individual hole-by-hole breakdown)
   - **Skins**: Highlight hole winners, show skin carryovers

### 5. Game Settings (Frontend & Backend Extension Point)
   - **Stroke Play**: Just scoring mode (gross/net/both)
   - **Stableford**: Points per hole table (configurable)
   - **Scramble**: Team size, handicap allowance %
   - **Skins**: Skin value, carryover rules

---

## Backend Architecture

### Strategy Pattern Components

```
┌─────────────────────────────────────────────────────────┐
│ GameTypeStrategy (Abstract Base Class)                  │
│ ├── validateSettings(settings): void                    │
│ ├── calculateResults(scores, handicaps, context): []    │
│ ├── validateScore(hole, shots, par): void               │
│ └── getDefaultSettings(): {}                            │
└─────────────────────────────────────────────────────────┘
                           ▲
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────┴────────┐ ┌────┴─────┐ ┌────────┴────────┐
│ StrokePlay       │ │Stableford│ │ Scramble        │
│ Strategy         │ │ Strategy │ │ Strategy        │
│ ✅ Implemented   │ │🔮 Planned│ │ 🔮 Planned      │
└──────────────────┘ └──────────┘ └─────────────────┘

┌──────────────────────────────────────────────────────────┐
│ GameTypeRegistry (Singleton)                             │
│ ├── register(StrategyClass): void                        │
│ ├── get(typeName, db): GameTypeStrategy                  │
│ ├── has(typeName): boolean                               │
│ └── listAvailable(): string[]                            │
└──────────────────────────────────────────────────────────┘
```

### File Structure

```
src/services/game-strategies/
├── base.ts                # Abstract base class + interfaces
├── stroke-play.ts         # Stroke Play implementation ✅
├── stableford.ts          # Stableford implementation 🔮
├── scramble.ts            # Scramble implementation 🔮
├── skins.ts               # Skins implementation 🔮
└── registry.ts            # Strategy registry + singleton
```

### Base Class Interface

```typescript
export abstract class GameTypeStrategy {
  abstract readonly typeName: string;       // e.g., "stroke_play"
  abstract readonly displayName: string;    // e.g., "Stroke Play"

  /**
   * Validate game-specific settings during game creation
   * Called by: GameService.createGame()
   * @throws Error if settings are invalid
   */
  abstract validateSettings(settings: Record<string, any>): void;

  /**
   * Calculate leaderboard results using game-specific rules
   * Called by: GameScoreService.getLeaderboard()
   * @param scores - Map of member_id to 18-hole score array
   * @param handicaps - Map of member_id to handicap_index
   * @param context - Game context (pars, stroke index, scoring mode, custom settings)
   * @returns Array of results sorted by position
   */
  abstract calculateResults(
    scores: Map<number, number[]>,
    handicaps: Map<number, number>,
    context: GameLeaderboardContext
  ): GameScoreResult[];

  /**
   * Validate a score entry (e.g., stableford max score per hole)
   * Called by: GameScoreService.updateScore()
   * @throws Error if score is invalid for this game type
   */
  validateScore(hole: number, shots: number, par: number): void;

  /**
   * Get default settings for this game type
   * Used by frontend to populate setup form
   */
  getDefaultSettings(): Record<string, any>;
}
```

### Result Interface

```typescript
export interface GameScoreResult {
  memberId: number;
  memberName: string;
  grossTotal: number;
  netTotal?: number;
  relativeToPar: number;
  netRelativeToPar?: number;
  holesPlayed: number;
  position: number;

  /**
   * Game-specific display data
   * Examples:
   * - Stableford: { points: 36, pointsPerHole: [2,3,1,...] }
   * - Skins: { skinsWon: 3, holeNumbers: [2,7,14] }
   * - Scramble: { teamId: 5, teamName: "Team Alpha" }
   */
  customDisplayData?: Record<string, any>;
}
```

### Usage Points

The strategy pattern is used in three places:

#### 1. Game Creation (Validation)
```typescript
// src/services/game.service.ts:491
const strategy = gameTypeRegistry.get(gameType, this.db);
strategy.validateSettings(data.custom_settings);
```

**Purpose**: Ensure game-specific settings are valid before creating the game.

**Examples**:
- Stroke Play: No additional settings needed
- Stableford: Validate points table structure
- Scramble: Validate team size is 2-4 players
- Skins: Validate skin value is positive

#### 2. Leaderboard Calculation
```typescript
// src/services/game-score.service.ts:372
const strategy = gameTypeRegistry.get(contextRow.game_type, this.db);
const results = strategy.calculateResults(scores, handicaps, context);
```

**Purpose**: Apply game-specific scoring rules to produce leaderboard.

**Examples**:
- Stroke Play: Sum shots, calculate net with handicap
- Stableford: Convert shots to points per hole
- Scramble: Calculate team scores, not individual
- Skins: Determine hole winners, count skins

#### 3. Score Validation (Future)
```typescript
// Not yet implemented, but planned for:
// src/services/game-score.service.ts - updateScore()
const strategy = gameTypeRegistry.get(game.game_type, this.db);
strategy.validateScore(hole, shots, par);
```

**Purpose**: Enforce game-specific constraints on score entry.

**Examples**:
- Stroke Play: Any positive score valid
- Stableford: Max net double bogey (can stop counting)
- Scramble: Team score must be <= best individual player's capability
- Skins: N/A - skins determined after all players post scores

---

## Frontend Architecture (Current + Planned)

### Current State: Stroke Play Only

The frontend currently assumes **Stroke Play** everywhere:

1. **Game Setup** (`GameSetup.tsx`):
   - Hardcoded to stroke play scoring mode selection (gross/net/both)
   - No game type selector
   - No custom settings per game type

2. **Score Entry** (`ScoreEntry.tsx` / future `GamePlay.tsx`):
   - Assumes 18-hole score array input
   - Shows gross + net scores
   - No game-specific UI variations

3. **Leaderboard** (`GameLeaderboard.tsx`):
   - Displays total score and +/- par
   - Assumes ascending sort (lower is better)
   - No support for `customDisplayData`

### Target Architecture: Open-Closed Principle Compliance

To achieve true extensibility, the frontend needs a **plugin/registry architecture** similar to the backend. New game types should be added by:
1. Creating game-specific components (settings form, score input, leaderboard renderer, scorecard renderer)
2. Registering these components in a frontend game type registry
3. **NO modification** to base components like `GameSetup`, `GamePlay`, `GameLeaderboard`, `ParticipantScorecard`

### Frontend Game Type Registry (Planned)

```typescript
// frontend/src/lib/game-types/registry.ts

export interface GameTypeComponents {
  typeName: string;
  displayName: string;

  // Extension point 1: Settings form during game setup
  SettingsForm: React.ComponentType<{
    value: Record<string, any>;
    onChange: (settings: Record<string, any>) => void;
  }>;

  // Extension point 2: Score input UI during game play
  ScoreInput: React.ComponentType<{
    hole: number;
    par: number;
    players: GamePlayer[];
    scores: Map<number, number>;
    onScoreUpdate: (playerId: number, score: number) => void;
  }>;

  // Extension point 3: Leaderboard row renderer
  LeaderboardRow: React.ComponentType<{
    entry: GameLeaderboardEntry;
    scoringMode: GameScoringMode;
    onClick?: () => void;
  }>;

  // Extension point 4: Scorecard display (NEW - critical!)
  ScorecardDisplay: React.ComponentType<{
    player: GamePlayer;
    scores: number[];
    pars: number[];
    strokeIndex: number[];
    customSettings?: Record<string, any>;
  }>;

  // Helper: Default settings for this game type
  defaultSettings: Record<string, any>;
}

class GameTypeComponentRegistry {
  private components = new Map<string, GameTypeComponents>();

  register(components: GameTypeComponents): void {
    this.components.set(components.typeName, components);
  }

  get(typeName: string): GameTypeComponents | undefined {
    return this.components.get(typeName);
  }

  listAvailable(): GameTypeComponents[] {
    return Array.from(this.components.values());
  }
}

export const gameTypeRegistry = new GameTypeComponentRegistry();
```

### Base Components Using the Registry

With this registry, base components become game type-agnostic:

#### GameSetup.tsx (Step 5 - Settings)
```typescript
// ✅ Open-Closed Compliant: No modification needed when adding game types

const GameSetup = () => {
  const [gameType, setGameType] = useState('stroke_play');
  const [customSettings, setCustomSettings] = useState({});

  // Fetch available game types from registry
  const availableTypes = gameTypeRegistry.listAvailable();

  // Get components for selected game type
  const typeComponents = gameTypeRegistry.get(gameType);
  const SettingsForm = typeComponents?.SettingsForm;

  return (
    <div>
      {/* Step 5: Game Type & Settings */}
      <Select value={gameType} onChange={setGameType}>
        {availableTypes.map(type => (
          <option key={type.typeName} value={type.typeName}>
            {type.displayName}
          </option>
        ))}
      </Select>

      {/* Dynamically render game-specific settings form */}
      {SettingsForm && (
        <SettingsForm
          value={customSettings}
          onChange={setCustomSettings}
        />
      )}
    </div>
  );
};
```

#### GamePlay.tsx (Score Entry)
```typescript
// ✅ Open-Closed Compliant: No modification needed when adding game types

const GamePlay = ({ gameId }: { gameId: number }) => {
  const { data: game } = useGame(gameId);
  const [currentHole, setCurrentHole] = useState(1);

  // Get components for this game's type
  const typeComponents = gameTypeRegistry.get(game.game_type);
  const ScoreInput = typeComponents?.ScoreInput;

  if (!ScoreInput) {
    return <div>Unsupported game type: {game.game_type}</div>;
  }

  return (
    <div>
      <HoleNavigation current={currentHole} onChange={setCurrentHole} />

      {/* Dynamically render game-specific score input */}
      <ScoreInput
        hole={currentHole}
        par={game.course.pars[currentHole - 1]}
        players={game.players}
        scores={scoresForHole}
        onScoreUpdate={handleScoreUpdate}
      />
    </div>
  );
};
```

#### GameLeaderboard.tsx
```typescript
// ✅ Open-Closed Compliant: No modification needed when adding game types

const GameLeaderboard = ({ gameId }: { gameId: number }) => {
  const { data: game } = useGame(gameId);
  const { data: leaderboard } = useGameLeaderboard(gameId);

  // Get components for this game's type
  const typeComponents = gameTypeRegistry.get(game.game_type);
  const LeaderboardRow = typeComponents?.LeaderboardRow;

  return (
    <div>
      {leaderboard.map(entry => (
        <LeaderboardRow
          key={entry.memberId}
          entry={entry}
          scoringMode={game.scoring_mode}
          onClick={() => showScorecard(entry.memberId)}
        />
      ))}
    </div>
  );
};
```

#### ParticipantScorecard.tsx (Modal)
```typescript
// ✅ Open-Closed Compliant: No modification needed when adding game types

const ParticipantScorecard = ({ gameId, playerId }: Props) => {
  const { data: game } = useGame(gameId);
  const { data: player } = useGamePlayer(playerId);
  const { data: scores } = usePlayerScores(playerId);

  // Get components for this game's type
  const typeComponents = gameTypeRegistry.get(game.game_type);
  const ScorecardDisplay = typeComponents?.ScorecardDisplay;

  if (!ScorecardDisplay) {
    return <div>Scorecard not available for {game.game_type}</div>;
  }

  return (
    <Modal>
      <h2>{player.name}'s Scorecard</h2>

      {/* Dynamically render game-specific scorecard */}
      <ScorecardDisplay
        player={player}
        scores={scores}
        pars={game.course.pars}
        strokeIndex={game.course.strokeIndex}
        customSettings={game.custom_settings}
      />
    </Modal>
  );
};
```

### Game Type Component Implementations

Each game type provides four React components that implement the extension points. These components are registered in the frontend registry and dynamically loaded by base components.

**Open-Closed Principle**: Adding a new game type means creating these four components and registering them. No modification to `GameSetup`, `GamePlay`, `GameLeaderboard`, or `ParticipantScorecard` needed.

---

#### 1. SettingsForm Component

Renders game-specific configuration during game setup (Step 5).

**Stroke Play** (`frontend/src/lib/game-types/stroke-play/SettingsForm.tsx`):
```typescript
export const StrokePlaySettingsForm: React.FC<SettingsFormProps> = ({
  value,
  onChange
}) => {
  // Stroke play has no additional settings beyond gross/net/both
  // which is handled by base GameSetup component
  return (
    <div className="text-sm text-muted-foreground">
      No additional settings needed for Stroke Play.
    </div>
  );
};
```

**Stableford** (`frontend/src/lib/game-types/stableford/SettingsForm.tsx`):
```typescript
export const StablefordSettingsForm: React.FC<SettingsFormProps> = ({
  value = DEFAULT_STABLEFORD_SETTINGS,
  onChange
}) => {
  const pointsTable = value.pointsTable || DEFAULT_POINTS_TABLE;

  return (
    <div className="space-y-4">
      <h3>Stableford Points Table</h3>
      <div className="grid grid-cols-2 gap-4">
        <Label>
          Albatross (-3 or better)
          <Input
            type="number"
            value={pointsTable.albatross}
            onChange={e => onChange({
              ...value,
              pointsTable: { ...pointsTable, albatross: Number(e.target.value) }
            })}
          />
        </Label>
        <Label>
          Eagle (-2)
          <Input
            type="number"
            value={pointsTable.eagle}
            onChange={e => onChange({
              ...value,
              pointsTable: { ...pointsTable, eagle: Number(e.target.value) }
            })}
          />
        </Label>
        {/* More inputs for birdie, par, bogey, doubleBogeyOrWorse */}
      </div>
    </div>
  );
};

const DEFAULT_POINTS_TABLE = {
  albatross: 5,
  eagle: 4,
  birdie: 3,
  par: 2,
  bogey: 1,
  doubleBogeyOrWorse: 0,
};
```

---

#### 2. ScoreInput Component

Renders game-specific score entry UI during game play.

**Stroke Play** (`frontend/src/lib/game-types/stroke-play/ScoreInput.tsx`):
```typescript
export const StrokePlayScoreInput: React.FC<ScoreInputProps> = ({
  hole,
  par,
  players,
  scores,
  onScoreUpdate
}) => {
  return (
    <div className="space-y-4">
      {players.map(player => {
        const score = scores.get(player.id);
        const netScore = calculateNetScore(score, player.handicap, hole);

        return (
          <div key={player.id} className="flex items-center justify-between">
            <span>{player.name}</span>
            <div className="flex gap-2 items-center">
              <ScoreInputModal
                value={score}
                par={par}
                onChange={value => onScoreUpdate(player.id, value)}
              />
              {netScore && (
                <span className="text-sm text-muted-foreground">
                  (Net: {netScore})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

**Stableford** (`frontend/src/lib/game-types/stableford/ScoreInput.tsx`):
```typescript
export const StablefordScoreInput: React.FC<ScoreInputProps> = ({
  hole,
  par,
  players,
  scores,
  onScoreUpdate,
  customSettings
}) => {
  const pointsTable = customSettings?.pointsTable || DEFAULT_POINTS_TABLE;

  return (
    <div className="space-y-4">
      {players.map(player => {
        const score = scores.get(player.id);
        const netScore = calculateNetScore(score, player.handicap, hole);
        const points = calculateStablefordPoints(netScore, par, pointsTable);

        return (
          <div key={player.id} className="flex items-center justify-between">
            <span>{player.name}</span>
            <div className="flex gap-2 items-center">
              <ScoreInputModal
                value={score}
                par={par}
                onChange={value => onScoreUpdate(player.id, value)}
              />
              <div className="text-sm">
                <span className="text-muted-foreground">Net: {netScore}</span>
                <Badge variant={points > 0 ? "default" : "secondary"}>
                  {points} {points === 1 ? 'pt' : 'pts'}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Net double bogey or worse = 0 points (stop counting)
      </p>
    </div>
  );
};
```

---

#### 3. LeaderboardRow Component

Renders a single row in the leaderboard with game-specific formatting.

**Stroke Play** (`frontend/src/lib/game-types/stroke-play/LeaderboardRow.tsx`):
```typescript
export const StrokePlayLeaderboardRow: React.FC<LeaderboardRowProps> = ({
  entry,
  scoringMode,
  onClick
}) => {
  const score = scoringMode === 'net' && entry.netTotal
    ? entry.netTotal
    : entry.grossTotal;

  const toPar = scoringMode === 'net' && entry.netRelativeToPar !== undefined
    ? entry.netRelativeToPar
    : entry.relativeToPar;

  return (
    <div className="flex items-center justify-between p-4" onClick={onClick}>
      <div className="flex items-center gap-4">
        <span className="font-bold">{entry.position}</span>
        <span>{entry.memberName}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono">{score}</span>
        <span className={cn("font-mono", getToParColor(toPar))}>
          {formatToPar(toPar)}
        </span>
      </div>
    </div>
  );
};
```

**Stableford** (`frontend/src/lib/game-types/stableford/LeaderboardRow.tsx`):
```typescript
export const StablefordLeaderboardRow: React.FC<LeaderboardRowProps> = ({
  entry,
  scoringMode,
  onClick
}) => {
  // In Stableford, customDisplayData contains { points: number }
  const points = entry.customDisplayData?.points || 0;
  const toPar = entry.relativeToPar; // Already calculated as points - 36

  return (
    <div className="flex items-center justify-between p-4" onClick={onClick}>
      <div className="flex items-center gap-4">
        <span className="font-bold">{entry.position}</span>
        <span>{entry.memberName}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-mono font-bold">{points} pts</div>
          <div className={cn("text-sm", getToParColor(toPar))}>
            {formatToPar(toPar, { baseScore: 36 })}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

#### 4. ScorecardDisplay Component (NEW - Critical!)

Renders the full scorecard in the scorecard modal. Different game types show different information.

**Stroke Play** (`frontend/src/lib/game-types/stroke-play/ScorecardDisplay.tsx`):
```typescript
export const StrokePlayScorecardDisplay: React.FC<ScorecardDisplayProps> = ({
  player,
  scores,
  pars,
  strokeIndex,
  customSettings
}) => {
  const { front9, back9 } = splitScores(scores);

  return (
    <div className="space-y-4">
      {/* Front 9 */}
      <div className="overflow-x-auto">
        <table className="scorecard-table">
          <thead>
            <tr>
              <th>Hole</th>
              {[1,2,3,4,5,6,7,8,9].map(h => <th key={h}>{h}</th>)}
              <th>Out</th>
            </tr>
            <tr>
              <th>Par</th>
              {front9.pars.map((p, i) => <td key={i}>{p}</td>)}
              <td>{sum(front9.pars)}</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Score</th>
              {front9.scores.map((s, i) => (
                <td key={i} className={getScoreColor(s, front9.pars[i])}>
                  {s > 0 ? s : '-'}
                </td>
              ))}
              <td>{sum(front9.scores.filter(s => s > 0))}</td>
            </tr>
            {player.handicap && (
              <tr>
                <th>Net</th>
                {front9.scores.map((s, i) => {
                  if (s <= 0) return <td key={i}>-</td>;
                  const strokes = getStrokesForHole(player.handicap, strokeIndex[i]);
                  const netScore = s - strokes;
                  return (
                    <td key={i} className={getScoreColor(netScore, front9.pars[i])}>
                      {netScore}
                    </td>
                  );
                })}
                <td>{calculateNetTotal(front9.scores, player.handicap)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Back 9 - similar structure */}
      {/* Totals row */}
    </div>
  );
};
```

**Stableford** (`frontend/src/lib/game-types/stableford/ScorecardDisplay.tsx`):
```typescript
export const StablefordScorecardDisplay: React.FC<ScorecardDisplayProps> = ({
  player,
  scores,
  pars,
  strokeIndex,
  customSettings
}) => {
  const pointsTable = customSettings?.pointsTable || DEFAULT_POINTS_TABLE;
  const { front9, back9 } = splitScores(scores);

  return (
    <div className="space-y-4">
      {/* Front 9 */}
      <div className="overflow-x-auto">
        <table className="scorecard-table">
          <thead>
            <tr>
              <th>Hole</th>
              {[1,2,3,4,5,6,7,8,9].map(h => <th key={h}>{h}</th>)}
              <th>Out</th>
            </tr>
            <tr>
              <th>Par</th>
              {front9.pars.map((p, i) => <td key={i}>{p}</td>)}
              <td>{sum(front9.pars)}</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Score</th>
              {front9.scores.map((s, i) => (
                <td key={i}>{s > 0 ? s : '-'}</td>
              ))}
              <td>{sum(front9.scores.filter(s => s > 0))}</td>
            </tr>
            <tr className="font-bold">
              <th>Points</th>
              {front9.scores.map((s, i) => {
                if (s <= 0) return <td key={i}>-</td>;
                const strokes = getStrokesForHole(player.handicap, strokeIndex[i]);
                const netScore = s - strokes;
                const points = calculateStablefordPoints(
                  netScore,
                  front9.pars[i],
                  pointsTable
                );
                return (
                  <td key={i} className={getPointsColor(points)}>
                    {points}
                  </td>
                );
              })}
              <td>{calculateTotalPoints(front9.scores, ...)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Back 9 - similar with points row */}
      {/* Final totals showing 36 points = par */}
    </div>
  );
};
```

---

### Game Type Registration: The Open-Closed Principle in Action

**This is where extensibility happens.** Adding a new game type means creating the four components above and registering them. No modification to base components needed.

**Stroke Play Registration** (`frontend/src/lib/game-types/stroke-play/index.ts`):
```typescript
import { gameTypeRegistry } from '../registry';
import { StrokePlaySettingsForm } from './SettingsForm';
import { StrokePlayScoreInput } from './ScoreInput';
import { StrokePlayLeaderboardRow } from './LeaderboardRow';
import { StrokePlayScorecardDisplay } from './ScorecardDisplay';

// Register stroke play components
gameTypeRegistry.register({
  typeName: 'stroke_play',
  displayName: 'Stroke Play',
  SettingsForm: StrokePlaySettingsForm,
  ScoreInput: StrokePlayScoreInput,
  LeaderboardRow: StrokePlayLeaderboardRow,
  ScorecardDisplay: StrokePlayScorecardDisplay,
  defaultSettings: {},
});
```

**Stableford Registration** (`frontend/src/lib/game-types/stableford/index.ts`):
```typescript
import { gameTypeRegistry } from '../registry';
import { StablefordSettingsForm } from './SettingsForm';
import { StablefordScoreInput } from './ScoreInput';
import { StablefordLeaderboardRow } from './LeaderboardRow';
import { StablefordScorecardDisplay } from './ScorecardDisplay';

// Register stableford components
gameTypeRegistry.register({
  typeName: 'stableford',
  displayName: 'Stableford',
  SettingsForm: StablefordSettingsForm,
  ScoreInput: StablefordScoreInput,
  LeaderboardRow: StablefordLeaderboardRow,
  ScorecardDisplay: StablefordScorecardDisplay,
  defaultSettings: {
    pointsTable: {
      albatross: 5,
      eagle: 4,
      birdie: 3,
      par: 2,
      bogey: 1,
      doubleBogeyOrWorse: 0,
    },
  },
});
```

**Application Entry Point** (`frontend/src/App.tsx` or `main.tsx`):
```typescript
// Import game type registrations to trigger registration
import './lib/game-types/stroke-play';  // Registers stroke play
import './lib/game-types/stableford';   // Registers stableford
import './lib/game-types/scramble';     // Registers scramble
import './lib/game-types/skins';        // Registers skins

// Now all game types are available to GameSetup, GamePlay, etc.
```

**File Structure**:
```
frontend/src/lib/game-types/
├── registry.ts                   # Central registry + interfaces
├── stroke-play/
│   ├── index.ts                  # Registration
│   ├── SettingsForm.tsx          # Step 5 settings
│   ├── ScoreInput.tsx            # Score entry UI
│   ├── LeaderboardRow.tsx        # Leaderboard row
│   └── ScorecardDisplay.tsx      # Full scorecard
├── stableford/
│   ├── index.ts
│   ├── SettingsForm.tsx
│   ├── ScoreInput.tsx
│   ├── LeaderboardRow.tsx
│   └── ScorecardDisplay.tsx
├── scramble/
│   └── [same structure]
└── skins/
    └── [same structure]
```

**Key Insight**: To add a new game type:
1. ✅ Create a new directory (e.g., `match-play/`)
2. ✅ Implement the four required components
3. ✅ Create `index.ts` that registers them
4. ✅ Import `'./lib/game-types/match-play'` in app entry point
5. ❌ NO changes to `GameSetup.tsx`, `GamePlay.tsx`, `GameLeaderboard.tsx`, `ParticipantScorecard.tsx`
6. ❌ NO changes to registry.ts
7. ❌ NO changes to existing game types

This is **true open-closed principle compliance**: the system is open for extension (new game types) but closed for modification (existing code).

---

### Frontend Data Flow (Planned)

```
┌────────────────────────────────────────────────────────┐
│ GameSetup (Step 5: Game Settings)                     │
│ ├── Select game type                                  │
│ ├── Render game-specific settings form                │
│ └── Validate & save to custom_settings                │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
              POST /games (with game_type + custom_settings)
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Backend: GameTypeStrategy.validateSettings()          │
│ └── Throws error if settings invalid                  │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
                   Game Created ✅
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ GamePlay (Score Entry)                                │
│ ├── Fetch game, detect game_type                      │
│ ├── Render game-specific score input UI               │
│ └── POST /game-scores/{memberId}/hole/{hole}          │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Backend: GameTypeStrategy.validateScore()             │
│ └── Throws error if score invalid for game type       │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ GameLeaderboard                                        │
│ ├── GET /games/{id}/leaderboard                       │
│ ├── Backend: GameTypeStrategy.calculateResults()      │
│ ├── Render game-specific leaderboard format           │
│ └── Use customDisplayData for game-specific metrics   │
└────────────────────────────────────────────────────────┘
```

---

## Implementation Examples

### Example 1: Stroke Play (Current)

**Backend** (`stroke-play.ts`):
```typescript
export class StrokePlayStrategy extends GameTypeStrategy {
  readonly typeName = "stroke_play";
  readonly displayName = "Stroke Play";

  validateSettings(settings: Record<string, any>): void {
    // No additional settings needed for stroke play
    return;
  }

  calculateResults(
    scores: Map<number, number[]>,
    handicaps: Map<number, number>,
    context: GameLeaderboardContext
  ): GameScoreResult[] {
    const results: GameScoreResult[] = [];

    for (const [memberId, scoreArray] of scores.entries()) {
      // Calculate gross total
      const grossTotal = scoreArray
        .filter(s => s > 0)
        .reduce((sum, s) => sum + s, 0);

      // Calculate net if handicap available
      let netTotal = undefined;
      if (handicaps.has(memberId)) {
        const courseHandicap = calculateCourseHandicap(...);
        const strokes = distributeHandicapStrokes(courseHandicap, ...);
        netTotal = calculateNetScore(scoreArray, strokes);
      }

      results.push({
        memberId,
        memberName: "", // Filled by service layer
        grossTotal,
        netTotal,
        relativeToPar: grossTotal - totalPar,
        netRelativeToPar: netTotal ? netTotal - totalPar : undefined,
        holesPlayed: scoreArray.filter(s => s > 0).length,
        position: 0, // Assigned after sorting
      });
    }

    // Sort by score (ascending)
    results.sort((a, b) => a.relativeToPar - b.relativeToPar);

    return results;
  }

  validateScore(hole: number, shots: number, par: number): void {
    // Allow any positive score, -1 (unreported), or 0 (cleared)
    if (shots !== -1 && shots !== 0 && shots < 1) {
      throw new Error("Invalid score value");
    }
  }
}
```

**Frontend**: No game-specific extensions needed (this is the default).

### Example 2: Stableford (Future)

**Backend** (`stableford.ts`):
```typescript
export class StablefordStrategy extends GameTypeStrategy {
  readonly typeName = "stableford";
  readonly displayName = "Stableford";

  validateSettings(settings: Record<string, any>): void {
    // Validate points table
    const required = ['albatross', 'eagle', 'birdie', 'par', 'bogey', 'doubleBogeyOrWorse'];
    for (const key of required) {
      if (typeof settings.pointsTable?.[key] !== 'number') {
        throw new Error(`Missing or invalid pointsTable.${key}`);
      }
    }
  }

  calculateResults(
    scores: Map<number, number[]>,
    handicaps: Map<number, number>,
    context: GameLeaderboardContext
  ): GameScoreResult[] {
    const results: GameScoreResult[] = [];
    const pointsTable = context.customSettings?.pointsTable || DEFAULT_STABLEFORD_POINTS;

    for (const [memberId, scoreArray] of scores.entries()) {
      const pointsPerHole: number[] = [];
      let totalPoints = 0;

      // Calculate course handicap
      const courseHandicap = handicaps.has(memberId)
        ? calculateCourseHandicap(...)
        : 0;
      const strokes = distributeHandicapStrokes(courseHandicap, ...);

      // Calculate points per hole
      for (let i = 0; i < 18; i++) {
        if (scoreArray[i] <= 0) {
          pointsPerHole.push(0);
          continue;
        }

        const netScore = scoreArray[i] - strokes[i];
        const netScoreToPar = netScore - context.pars[i];

        // Convert score to points
        let points = 0;
        if (netScoreToPar <= -3) points = pointsTable.albatross;
        else if (netScoreToPar === -2) points = pointsTable.eagle;
        else if (netScoreToPar === -1) points = pointsTable.birdie;
        else if (netScoreToPar === 0) points = pointsTable.par;
        else if (netScoreToPar === 1) points = pointsTable.bogey;
        else points = pointsTable.doubleBogeyOrWorse;

        pointsPerHole.push(points);
        totalPoints += points;
      }

      const grossTotal = scoreArray.filter(s => s > 0).reduce((sum, s) => sum + s, 0);

      results.push({
        memberId,
        memberName: "",
        grossTotal,
        netTotal: undefined, // Stableford is net-only by nature
        relativeToPar: totalPoints - 36, // 36 = par in Stableford
        netRelativeToPar: undefined,
        holesPlayed: scoreArray.filter(s => s > 0).length,
        position: 0,
        customDisplayData: {
          points: totalPoints,
          pointsPerHole,
        },
      });
    }

    // Sort by points (descending - higher is better)
    results.sort((a, b) => b.relativeToPar - a.relativeToPar);

    return results;
  }

  validateScore(hole: number, shots: number, par: number): void {
    // In stableford, can stop counting after net double bogey
    // This validation is same as stroke play - any score allowed
    if (shots !== -1 && shots !== 0 && shots < 1) {
      throw new Error("Invalid score value");
    }
  }

  getDefaultSettings(): Record<string, any> {
    return {
      pointsTable: {
        albatross: 5,
        eagle: 4,
        birdie: 3,
        par: 2,
        bogey: 1,
        doubleBogeyOrWorse: 0,
      },
    };
  }
}
```

**Frontend** (Future):

1. **Setup Step 5** - Game Type Settings:
```tsx
{gameType === 'stableford' && (
  <StablefordSettings
    value={customSettings}
    onChange={setCustomSettings}
  />
)}
```

2. **Score Entry** - Show points earned:
```tsx
<div className="score-display">
  <span className="shots">{shots}</span>
  {gameType === 'stableford' && (
    <span className="points">({points} pts)</span>
  )}
</div>
```

3. **Leaderboard** - Points display:
```tsx
{gameType === 'stableford' ? (
  <>
    <div className="points">{entry.customDisplayData.points}</div>
    <div className="relative">
      {formatToPar(entry.relativeToPar, { baseScore: 36 })}
    </div>
  </>
) : (
  // Stroke play display
  <div className="score">{entry.grossTotal}</div>
)}
```

### Example 3: Scramble (Future)

**Key Differences**:
- **Score Storage**: Only one score per group (team), not per player
- **Leaderboard**: Team-based, not individual
- **Database**: Would need `game_team_scores` table separate from `game_scores`

**Backend** (`scramble.ts`):
```typescript
export class ScrambleStrategy extends GameTypeStrategy {
  readonly typeName = "scramble";
  readonly displayName = "Scramble";

  validateSettings(settings: Record<string, any>): void {
    if (settings.teamSize < 2 || settings.teamSize > 4) {
      throw new Error("Team size must be 2-4 players");
    }
    if (settings.handicapAllowance < 0 || settings.handicapAllowance > 1) {
      throw new Error("Handicap allowance must be 0-1 (0-100%)");
    }
  }

  calculateResults(
    scores: Map<number, number[]>, // In scramble, these are TEAM scores, not player scores
    handicaps: Map<number, number>, // Team aggregate handicaps
    context: GameLeaderboardContext
  ): GameScoreResult[] {
    // Implementation would aggregate team scores
    // Note: This would require schema changes to support team-based scoring
  }

  getDefaultSettings(): Record<string, any> {
    return {
      teamSize: 4,
      handicapAllowance: 0.25, // 25% of team handicap
      formatType: 'best_ball',
    };
  }
}
```

---

## Migration Path

### Phase 1: Current State ✅
- Stroke Play only
- No game type selection in UI
- Hardcoded stroke play logic throughout

### Phase 2: Backend Infrastructure ✅ (Complete)
- `GameTypeStrategy` base class
- `StrokePlayStrategy` implementation
- `GameTypeRegistry` for strategy lookup
- Strategy used in 2/3 places (creation validation, leaderboard calculation)

### Phase 3: Complete Backend Integration (TODO)
- Add score validation using strategy in `GameScoreService.updateScore()`
- Add `GET /game-types` endpoint to list available types for frontend
- Add `GET /game-types/:type/settings-schema` for dynamic form generation

### Phase 4: Frontend Extension Points (TODO)
- Add game type selector to GameSetup
- Create `GameTypeSettings` component with dynamic settings forms
- Create `GameTypeScoreInput` component for game-specific score entry
- Create `GameTypeLeaderboard` component for game-specific display
- Update `GamePlay.tsx` to use game type-aware components

### Phase 5: Additional Game Types (TODO)
- Implement `StablefordStrategy`
- Implement `ScrambleStrategy` (requires schema changes)
- Implement `SkinsStrategy`
- Implement `MatchPlayStrategy`

---

## Testing Considerations

### Backend Tests
- Each strategy needs comprehensive unit tests:
  - `validateSettings()` with valid/invalid settings
  - `calculateResults()` with various score scenarios
  - `validateScore()` with edge cases
  - Tie handling
  - Incomplete rounds

### Frontend Tests
- Game type selection in setup
- Dynamic settings form rendering
- Score entry UI variations per game type
- Leaderboard display per game type
- Error handling for invalid game types

---

## API Changes Needed

### New Endpoints

#### GET /game-types
Returns list of available game types.

**Response**:
```json
[
  {
    "typeName": "stroke_play",
    "displayName": "Stroke Play",
    "description": "Traditional golf - lowest score wins",
    "defaultSettings": {}
  },
  {
    "typeName": "stableford",
    "displayName": "Stableford",
    "description": "Points-based scoring - highest points wins",
    "defaultSettings": {
      "pointsTable": {
        "albatross": 5,
        "eagle": 4,
        "birdie": 3,
        "par": 2,
        "bogey": 1,
        "doubleBogeyOrWorse": 0
      }
    }
  }
]
```

#### GET /game-types/:type/settings-schema
Returns JSON Schema for game type-specific settings (for dynamic form generation).

**Response** (example for stableford):
```json
{
  "type": "object",
  "properties": {
    "pointsTable": {
      "type": "object",
      "title": "Points Table",
      "description": "Points awarded for each score type",
      "properties": {
        "albatross": { "type": "number", "default": 5, "title": "Albatross (-3 or better)" },
        "eagle": { "type": "number", "default": 4, "title": "Eagle (-2)" },
        "birdie": { "type": "number", "default": 3, "title": "Birdie (-1)" },
        "par": { "type": "number", "default": 2, "title": "Par (0)" },
        "bogey": { "type": "number", "default": 1, "title": "Bogey (+1)" },
        "doubleBogeyOrWorse": { "type": "number", "default": 0, "title": "Double Bogey or worse (+2+)" }
      }
    }
  }
}
```

---

## Summary

### Open-Closed Principle Compliance

The game type system is **explicitly designed to follow the Open-Closed Principle**:

**Open for Extension:**
- ✅ New game types can be added at any time
- ✅ Each game type provides its own components and logic
- ✅ System automatically discovers and uses new game types

**Closed for Modification:**
- ❌ Adding a new game type does NOT require modifying:
  - Base components (`GameSetup`, `GamePlay`, `GameLeaderboard`, `ParticipantScorecard`)
  - Registry classes (backend `GameTypeRegistry`, frontend `GameTypeComponentRegistry`)
  - Other existing game types (Stroke Play, Stableford, etc.)
  - Core infrastructure or routing

### How It Works

**Backend** (Strategy Pattern):
```
1. Create StablefordStrategy extends GameTypeStrategy
2. Implement: validateSettings(), calculateResults(), validateScore()
3. Register: gameTypeRegistry.register(StablefordStrategy)
4. Done - backend now supports Stableford
```

**Frontend** (Plugin Pattern):
```
1. Create four components:
   - StablefordSettingsForm (game setup)
   - StablefordScoreInput (score entry)
   - StablefordLeaderboardRow (leaderboard display)
   - StablefordScorecardDisplay (scorecard modal)

2. Register:
   gameTypeRegistry.register({
     typeName: 'stableford',
     displayName: 'Stableford',
     SettingsForm: StablefordSettingsForm,
     ScoreInput: StablefordScoreInput,
     LeaderboardRow: StablefordLeaderboardRow,
     ScorecardDisplay: StablefordScorecardDisplay,
     defaultSettings: { ... }
   });

3. Import './lib/game-types/stableford' in App.tsx

4. Done - frontend now supports Stableford
```

**Base components automatically**:
- Discover available game types from registry
- Dynamically load game-specific components
- Render appropriate UI based on game type
- NO if/switch statements on game type needed

### Current State

**Backend**: ✅ Infrastructure complete, Stroke Play implemented
- `GameTypeStrategy` base class
- `GameTypeRegistry` singleton
- Used in: game creation validation, leaderboard calculation
- Ready for: additional strategies (Stableford, Scramble, Skins, Match Play)

**Frontend**: ⚠️ Stroke Play only, needs registry pattern
- Currently hardcoded to stroke play
- Needs: `GameTypeComponentRegistry` implementation
- Needs: Base components refactored to use registry
- Needs: Four extension points in each game type plugin

### Future Work

**Phase 1**: Frontend Registry Infrastructure
- Implement `GameTypeComponentRegistry`
- Refactor `GameSetup` to use registry for settings forms
- Refactor `GamePlay` to use registry for score input
- Refactor `GameLeaderboard` to use registry for row rendering
- Refactor `ParticipantScorecard` to use registry for scorecard display

**Phase 2**: Stroke Play Plugin
- Extract current stroke play UI into plugin structure
- Create `frontend/src/lib/game-types/stroke-play/` directory
- Implement and register four components
- Verify base components remain game-type agnostic

**Phase 3**: Additional Game Types
- Implement `StablefordStrategy` (backend)
- Implement Stableford plugin (frontend)
- Implement `ScrambleStrategy` + plugin (may require schema changes)
- Implement `SkinsStrategy` + plugin
- Implement `MatchPlayStrategy` + plugin

### Key Success Criteria

A developer should be able to add a new game type by:
1. Creating 1 backend strategy class (inherits from `GameTypeStrategy`)
2. Creating 4 frontend components (implement standardized interfaces)
3. Registering both (one-line registrations)
4. **WITHOUT** touching ANY existing code

If ANY existing file needs modification when adding a game type, the open-closed principle is violated and the architecture needs revision.
