# Product Roadmap

## Priority Order

1. **Player Profile & Handicap Management** - Foundation for player identity
2. **Ad-hoc Competitions** - Casual play without tour/series context
3. **Notifications System** - Player engagement and retention
4. **Stableford Scoring** - Common scoring format, easy implementation
5. **Friends & Social Connections** - Build on player profiles
6. **Additional Game Formats** - Match play, scramble, better ball
7. **Internationalization (i18n)** - Full UI translation support
8. **Team Formats (Ryder Cup style)** - Multi-day team competitions
9. **Side Games** - Wolf, umbrella, skins, and betting formats

---

## Feature Descriptions

### 1. Player Profile & Handicap Management

**Why:** Players currently have no way to manage their handicap or see their history. This is blocking core functionality.

**Scope:**
- Private profile page accessible to logged-in player
- Handicap index entry and history tracking
- Playing handicap auto-calculated per course/tee
- Round history with scores and stats
- Public profile view (name, handicap, recent results)
- Profile visibility settings (public/friends/private)

**Technical notes:**
- Extend existing `users` table or create `player_profiles`
- Add handicap history table for tracking changes
- New API endpoints: `GET/PUT /api/player/profile`, `GET /api/players/:id`

---

### 2. Ad-hoc Competitions

**Why:** Transforms the app from "tournament tool" to "play golf anytime with friends" - much larger market opportunity.

**Scope:**
- Lightweight competition creation (no tour/series required)
- Quick flow: select course, pick tee, invite friends, play
- Single tee time or multiple tee times for larger groups
- Results feed into player profile stats
- Share link to invite non-users
- Templates for common setups

**Technical notes:**
- Competitions already support standalone mode, need simplified creation flow
- New player-facing creation UI (not admin)
- Consider "quick start" from course selection

---

### 3. Notifications System

**Why:** No way to alert players about important events. Critical for engagement and retention.

**Scope:**
- In-app notification center
- Push notifications (PWA / mobile)
- Email notifications (optional, per preference)
- Notification types:
  - Upcoming tee time reminders
  - Competition results posted
  - Enrollment approved/requested
  - Friend activity (when social features added)
  - Score submissions in your group
- User preferences for notification channels

**Technical notes:**
- New `notifications` table
- Consider web push API for browser notifications
- Email integration (SendGrid, Resend, or similar)

---

### 4. Stableford Scoring

**Why:** Very common scoring format. Relatively easy to implement as it's a calculation layer on top of existing stroke data.

**Scope:**
- Stableford point calculation per hole based on net score vs par
- Standard points: 0 (double+), 1 (bogey), 2 (par), 3 (birdie), 4 (eagle), 5 (albatross)
- Competition-level setting for scoring format
- Leaderboard showing Stableford points
- Support for Modified Stableford (configurable points)

**Technical notes:**
- Add `scoring_format` to competitions (stroke_gross, stroke_net, stableford, modified_stableford)
- Calculation service for point conversion
- Leaderboard already supports multiple display modes

---

### 5. Friends & Social Connections

**Why:** Builds engagement through social graph. Players want to track friends' results and play together.

**Scope:**
- Follow/unfollow other players (asymmetric, simpler than mutual friends)
- Activity feed showing followed players' rounds
- "Friends playing" indicator on competitions
- Quick invite friends to ad-hoc rounds
- Privacy controls (who can follow me, who sees my scores)
- Find friends by name/email

**Technical notes:**
- New `player_follows` table (follower_id, followed_id)
- Activity feed query joining recent rounds of followed players
- Privacy settings in player profile

---

### 6. Additional Game Formats

**Why:** Expands use cases beyond stroke play. Popular for casual groups and golf trips.

**Formats to add (in order):**
1. **Match Play** - Hole-by-hole win/loss, useful for 1v1 and team matches
2. **Scramble** - Team format, best ball position, one score per hole
3. **Better Ball (Four-Ball)** - Best score from team counts
4. **Alternate Shot (Foursomes)** - Partners alternate, one ball

**Technical notes:**
- Need `game_format` on competitions
- Match play needs pairing/bracket management
- Team formats need team composition within tee time
- Scramble may need special score entry (team score, not individual)

---

### 7. Internationalization (i18n)

**Why:** Opens markets beyond English speakers. Important for Nordic/European expansion.

**Scope:**
- All UI strings translatable
- Initial languages: English, Swedish (based on likely market)
- Locale-aware date/time/number formatting
- Language selector in settings
- API error messages translated

**Technical notes:**
- Use `react-i18next` for frontend
- Extract all hardcoded strings to translation files
- Consider lazy-loading language packs
- RTL support not needed initially

---

### 8. Team Formats (Ryder Cup Style)

**Why:** Great for golf trips and club events. High engagement but complex implementation.

**Scope:**
- Multi-day team competition format
- Team rosters with captain designation
- Match scheduling (singles, foursomes, four-ball sessions)
- Points system (1 for win, 0.5 for tie, 0 for loss)
- Team standings and match results
- Captain's picks for pairings

**Technical notes:**
- New data model: team_competitions, teams, matches, sessions
- Complex scheduling logic
- Consider starting with simplified "points per round" team format
- Could leverage existing team infrastructure from series

---

### 9. Side Games

**Why:** Popular among recreational golfers. Adds fun betting/competition layer.

**Formats to consider:**
- **Skins** - Win hole outright to claim skin, carryovers
- **Nassau** - Three bets: front 9, back 9, total
- **Wolf** - Rotating picker chooses partner or goes alone
- **Umbrella** - Collection of side bets (sandy, greenie, etc.)
- **Dots/Trash** - Point-based side game

**Technical notes:**
- These are overlay games on regular rounds
- Need separate tracking from main competition
- Wolf has complex rotation and decision logic
- Consider as premium/optional feature
- May want configurable stakes (for display, not real money)

---

## Future Considerations

These are ideas that may be valuable but aren't prioritized yet:

- **Offline Support / PWA** - Score entry with sync when back online
- **Live Scoring Feed** - Real-time activity during competitions
- **Course Discovery** - Search/browse courses, link to external databases
- **Statistics Dashboard** - Deep analytics (GIR, FIR, putts)
- **Competition Templates** - Clone and recurring competitions
- **Magic Link Invites** - Easy onboarding for invited players
- **GPS/Yardage** - Course maps and distances (ambitious)
- **Betting Integration** - Real money (regulatory complexity)
