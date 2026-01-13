// Game types for frontend
export type GameStatus = 'setup' | 'ready' | 'active' | 'completed';
export type GameScoringMode = 'gross' | 'net' | 'both';

export interface Game {
  id: number;
  owner_id: number;
  course_id: number;
  game_type: string;
  scoring_mode: GameScoringMode;
  status: GameStatus;
  custom_settings?: Record<string, any>;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GamePlayer {
  id: number;
  game_id: number;
  player_id?: number;
  player_name?: string; // Joined from players table
  player_display_name?: string; // Joined from players table
  guest_name?: string;
  guest_handicap?: number;
  guest_gender?: "male" | "female";
  tee_id?: number;
  play_handicap?: number; // Calculated PHCP based on tee ratings and gender
  display_order: number;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameGroup {
  id: number;
  game_id: number;
  name?: string;
  start_hole: number;
  group_order: number;
  created_at: string;
  updated_at: string;
}

export interface GameGroupMember {
  id: number;
  game_group_id: number;
  game_player_id: number;
  tee_order: number;
  created_at: string;
}

export interface GameScore {
  id: number;
  game_group_member_id: number;
  score: number[];
  handicap_index?: number;
  is_locked: boolean;
  locked_at?: string;
  custom_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GameLeaderboardEntry {
  memberName: string;
  gamePlayerId: number;
  grossTotal: number;
  netTotal?: number;
  relativeToPar: number;
  netRelativeToPar?: number;
  holesPlayed: number;
  position: number;
  isLocked: boolean;
  customData?: Record<string, any>;
}

export interface GameWithDetails extends Game {
  course_name: string;
  owner_name: string;
  player_count: number;
  group_count: number;
}

export interface GameForDashboard {
  game_id: number;
  course_name: string;
  game_type: string;
  status: GameStatus;
  player_count: number;
  my_holes_played: number;
  my_current_score: string;
  scheduled_date?: string;
  started_at?: string;
}

// Extended types for game play view
export interface GameGroupWithScores {
  group: GameGroup;
  members: Array<{
    member: GameGroupMember;
    player: GamePlayer;
    score: GameScore;
  }>;
  pars: number[];
  strokeIndex?: number[];
}
