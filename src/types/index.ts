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
  tour_id?: number;
  tee_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
  points_multiplier: number;
  venue_type: "outdoor" | "indoor";
  start_mode: "scheduled" | "open";
  open_start?: string;
  open_end?: string;
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
  tour_id?: number;
  tee_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
  points_multiplier?: number;
  venue_type?: "outdoor" | "indoor";
  start_mode?: "scheduled" | "open";
  open_start?: string;
  open_end?: string;
}

export interface UpdateCompetitionDto {
  name?: string;
  date?: string;
  course_id?: number;
  series_id?: number;
  tour_id?: number;
  tee_id?: number | null;
  manual_entry_format?: "out_in_total" | "total_only";
  points_multiplier?: number;
  venue_type?: "outdoor" | "indoor";
  start_mode?: "scheduled" | "open";
  open_start?: string | null;
  open_end?: string | null;
}

export interface TeeTime {
  id: number;
  teetime: string;
  competition_id: number;
  start_hole: number;
  hitting_bay?: number;
  created_at: string;
  updated_at: string;
}

export interface TeeTimeWithParticipants {
  id: number;
  teetime: string;
  competition_id: number;
  start_hole: number;
  hitting_bay?: number;
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
  start_hole?: number; // 1 or 10
  hitting_bay?: number;
}

export interface UpdateTeeTimeDto {
  teetime?: string;
  competition_id?: number;
  start_hole?: number; // 1 or 10
  hitting_bay?: number;
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
  participant: Participant & { team_name: string };
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
  startTime: string;
}

export interface TeamLeaderboardEntry {
  teamId: number;
  teamName: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
  displayProgress: string; // E.g., "Starts 09:30", "Thru 14", or "F" for Finished.
  totalRelativeScore: number | null; // Null if not started.
  totalShots: number | null; // Null if not started.
  teamPoints: number | null; // Null if not started.
  startTime: string | null; // Start time from tee time data
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

// Tour enrollment types
export type TourEnrollmentStatus = "pending" | "requested" | "active";
export type TourEnrollmentMode = "closed" | "request";
export type TourVisibility = "private" | "public";
export type TourScoringMode = "gross" | "net" | "both";

// Course tee types
export interface CourseTee {
  id: number;
  course_id: number;
  name: string;
  color?: string;
  course_rating: number;
  slope_rating: number;
  stroke_index?: number[];
  pars?: number[];
  created_at: string;
  updated_at: string;
}

export interface CreateCourseTeeDto {
  name: string;
  color?: string;
  course_rating: number;
  slope_rating?: number;
  stroke_index?: number[];
  pars?: number[];
}

export interface UpdateCourseTeeDto {
  name?: string;
  color?: string;
  course_rating?: number;
  slope_rating?: number;
  stroke_index?: number[];
  pars?: number[];
}

// Handicap calculation types
export interface HandicapCalculation {
  handicap_index: number;
  course_handicap: number;
  strokes_per_hole: number[];
}

export interface NetScoreResult {
  gross_scores: number[];
  net_scores: number[];
  gross_total: number;
  net_total: number;
  course_handicap: number;
}

export interface Tour {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  enrollment_mode: TourEnrollmentMode;
  visibility: TourVisibility;
  scoring_mode: TourScoringMode;
  banner_image_url?: string;
  landing_document_id?: number;
  point_template_id?: number;
  created_at: string;
  updated_at: string;
}

export interface TourEnrollment {
  id: number;
  tour_id: number;
  player_id?: number;
  email: string;
  status: TourEnrollmentStatus;
  playing_handicap?: number;
  category_id?: number;
  created_at: string;
  updated_at: string;
}

// Tour category types
export interface TourCategory {
  id: number;
  tour_id: number;
  name: string;
  description?: string;
  sort_order: number;
  created_at: string;
}

export interface CreateTourCategoryDto {
  name: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateTourCategoryDto {
  name?: string;
  description?: string;
  sort_order?: number;
}

export interface TourCategoryWithCount extends TourCategory {
  enrollment_count: number;
}

export interface TourAdmin {
  id: number;
  tour_id: number;
  user_id: number;
  created_at: string;
}

export interface CreateTourDto {
  name: string;
  description?: string;
  enrollment_mode?: TourEnrollmentMode;
  visibility?: TourVisibility;
  scoring_mode?: TourScoringMode;
  banner_image_url?: string;
  point_template_id?: number;
}

export interface UpdateTourDto {
  name?: string;
  description?: string;
  enrollment_mode?: TourEnrollmentMode;
  visibility?: TourVisibility;
  scoring_mode?: TourScoringMode;
  banner_image_url?: string;
  landing_document_id?: number | null;
  point_template_id?: number | null;
}

export interface CreateTourEnrollmentDto {
  email: string;
}

export interface TourEnrollmentWithPlayer extends TourEnrollment {
  player_name?: string;
  category_name?: string;
}

export interface TourAdminWithUser extends TourAdmin {
  email: string;
  role: string;
}

// Tour document types
export interface TourDocument {
  id: number;
  title: string;
  content: string;
  type: string;
  tour_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTourDocumentDto {
  title: string;
  content: string;
  type?: string;
  tour_id: number;
}

export interface UpdateTourDocumentDto {
  title?: string;
  content?: string;
  type?: string;
}

// Tour standings types
export interface TourPlayerStanding {
  player_id: number;
  player_name: string;
  handicap_index?: number;
  category_id?: number;
  category_name?: string;
  total_points: number;
  competitions_played: number;
  position: number;
  competitions: {
    competition_id: number;
    competition_name: string;
    competition_date: string;
    points: number;
    position: number;
    score_relative_to_par: number;
    net_score_relative_to_par?: number;
    course_handicap?: number;
  }[];
}

export interface TourStandings {
  tour: Tour;
  player_standings: TourPlayerStanding[];
  total_competitions: number;
  scoring_mode: TourScoringMode;
  point_template?: {
    id: number;
    name: string;
  };
  categories?: TourCategory[];
  selected_category_id?: number;
}
