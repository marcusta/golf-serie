export interface ParsData {
  holes: number[];
  out: number;
  in: number;
  total: number;
}

export interface Course {
  id: number;
  name: string;
  pars: ParsData;
  created_at: string;
  updated_at: string;
}

export interface Series {
  id: number;
  name: string;
  description?: string;
  banner_image_url?: string;
  is_public: boolean;
  landing_document_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Competition {
  id: number;
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
  created_at: string;
  updated_at: string;
}

export interface CreateCourseDto {
  name: string;
}

export interface UpdateCourseDto {
  name?: string;
}

export interface CreateSeriesDto {
  name: string;
  description?: string;
  banner_image_url?: string;
  is_public?: boolean;
}

export interface UpdateSeriesDto {
  name?: string;
  description?: string;
  banner_image_url?: string;
  is_public?: boolean;
  landing_document_id?: number;
}

export interface SeriesTeamStanding {
  team_id: number;
  team_name: string;
  total_points: number;
  competitions_played: number;
  position: number;
  competitions: {
    competition_id: number;
    competition_name: string;
    competition_date: string;
    points: number;
    position: number;
  }[];
}

export interface SeriesStandings {
  series: Series;
  team_standings: SeriesTeamStanding[];
  total_competitions: number;
}

export interface CreateTeamDto {
  name: string;
}

export interface UpdateTeamDto {
  name?: string;
}

export interface CreateCompetitionDto {
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
}

export interface UpdateCompetitionDto {
  name?: string;
  date?: string;
  course_id?: number;
  series_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
}

export interface TeeTime {
  id: number;
  teetime: string;
  competition_id: number;
  created_at: string;
  updated_at: string;
}

export interface TeeTimeWithParticipants {
  id: number;
  teetime: string;
  competition_id: number;
  created_at: string;
  updated_at: string;
  course_name: string;
  pars: ParsData;
  participants: Participant[];
}

export interface Participant {
  id: number;
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names?: string;
  score: number[];
  is_locked: boolean;
  locked_at?: string;
  manual_score_out?: number;
  manual_score_in?: number;
  manual_score_total?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTeeTimeDto {
  teetime: string;
  competition_id: number;
}

export interface UpdateTeeTimeDto {
  teetime?: string;
  competition_id?: number;
}

export interface CreateParticipantDto {
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names?: string;
}

export interface UpdateParticipantDto {
  tee_order?: number;
  team_id?: number;
  tee_time_id?: number;
  position_name?: string;
  player_names?: string;
}

export interface LeaderboardEntry {
  participant: Participant;
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  type: string;
  series_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentDto {
  title: string;
  content: string;
  type: string;
  series_id: number;
}

export interface UpdateDocumentDto {
  title?: string;
  content?: string;
  type?: string;
}

export interface CreateSeriesDocumentDto {
  title: string;
  content: string;
}

export interface UpdateSeriesDocumentDto {
  title?: string;
  content?: string;
}
