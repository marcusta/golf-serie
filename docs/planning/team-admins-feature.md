# Team Admins Feature

## Overview

Enable teams to optionally self-manage their participation in series competitions. Team admins can fill in participant slots for their team without requiring series organizer involvement.

## Philosophy

- **Opt-in**: No team is required to use this functionality
- **Flexible**: Team admins can use all, some, or none of the capabilities
- **Adaptive**: Works alongside existing organizer-managed workflow
- **Minimal constraints**: No deadlines, no mandatory fields, no "MUSTs"

## Current State

- Participants in competitions are "placeholder positions" (slots)
- Slots may or may not have names/players assigned
- Only series organizers can fill in participant information
- Empty slots are valid - someone plays, we just don't know who
- Teams exist as labels/groupings with no self-management capability

## Proposed State

- Team admins can be appointed (by super admins initially)
- Team admins can fill in their team's participant slots
- Existing organizer workflow unchanged
- Both can edit - no ownership/locking model

## Data Model

### New Table: team_admins
Many-to-many relationship between players and teams:

```sql
CREATE TABLE team_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES players(id),
  UNIQUE(team_id, player_id)
);
```

### Implicit Self-Management
- No `is_self_managed` flag on teams
- If a team has one or more team_admins → they can manage
- If a team has no team_admins → organizer-managed only (current behavior)

## Capabilities

### Team Admin Can:
1. **View** their team's participant slots in series competitions
2. **Assign registered player** to a participant position
3. **Set name** for non-registered player (guest/substitute)
4. **Clear** a position (return to empty slot)
5. **Edit past competitions** (for record-keeping corrections)

### Team Admin Cannot:
- Create/delete teams
- Add/remove tee times
- Modify competition settings
- Manage other teams

## User Interface

### Player Dashboard Integration
Team admins see a "My Teams" section in their player dashboard:

```
┌─ My Teams ─────────────────────────────────────────────┐
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Falsterbo GK Team A                                 ││
│ │ 2 upcoming competitions                        [→] ││
│ └─────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────┐│
│ │ Ljunghusen Mixed                                    ││
│ │ 1 upcoming competition                         [→] ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Team Management View
Clicking a team opens management view (styled as player UI, not admin):

```
┌─ Falsterbo GK Team A ──────────────────────────────────┐
│                                                         │
│ Upcoming Competitions                                   │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Skåne Tour - Round 3                                ││
│ │ May 15, 2025 · Falsterbo GK                         ││
│ │                                                     ││
│ │ Position 1: [Select player... ▼] or [Enter name]   ││
│ │ Position 2: Johan Andersson (registered)      [✕]  ││
│ │ Position 3: "Erik Gäst" (name only)           [✕]  ││
│ │ Position 4: — empty —                              ││
│ │                                          [Save]     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Past Competitions                                       │
│ ─────────────────────────────────────────────────────── │
│ │ Skåne Tour - Round 2 · May 8, 2025            [→]  ││
│ │ Skåne Tour - Round 1 · May 1, 2025            [→]  ││
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Position Editing Options
For each participant position:
1. **Select registered player** - Dropdown/search of available players
2. **Enter name** - Free text for non-registered players
3. **Clear** - Return to empty slot

## Admin Interface

### Appointing Team Admins
Super admins can appoint team admins via:
- Team detail page (new "Team Admins" section)
- Player search → select → add as team admin

```
┌─ Team Admins ──────────────────────────────────────────┐
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Anna Svensson                              [Remove] ││
│ │ Appointed: 2025-01-15                               ││
│ └─────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────┐│
│ │ Marcus Lindberg                            [Remove] ││
│ │ Appointed: 2025-01-10                               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [+ Add Team Admin]                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Authorization

### New Permission Check
```
canEditTeamParticipants(playerId, teamId, competitionId):
  - Is super admin? → yes
  - Is series organizer for this competition? → yes
  - Is team admin for this team? → yes
  - Otherwise → no
```

### API Endpoints
Existing participant update endpoints gain team admin authorization:
- `PUT /api/participants/:id` - Check team admin permission
- `GET /api/teams/:id/competitions` - New endpoint for team's competitions

## Rollout Strategy

### Phase 1: Foundation
- Add `team_admins` table
- Add team admin management UI in admin
- No player-facing UI yet

### Phase 2: Player UI
- Add "My Teams" section to player dashboard
- Implement team management view
- Connect to existing participant update APIs

### Phase 3: Polish
- Notifications (optional)
- Activity log for team admin actions
- Bulk editing capabilities

## Future Considerations

- Team admin invitation flow (email invite)
- Team admin self-registration (request to become admin)
- Team admin hierarchy (head admin vs assistant)
- Team communication tools (announcements to team members)
- Integration with club admins (club admin auto-becomes team admin for club's teams)

---

*This is a high-level planning document. Detailed implementation plan to be created before development.*
