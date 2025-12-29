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
  player_id?: number;
}

export interface UpdateParticipantDto {
  tee_order?: number;
  team_id?: number;
  tee_time_id?: number;
  position_name?: string;
  player_names?: string;
}

export interface LeaderboardEntry {
  participant: Participant & {
    team_name: string;
    player_id?: number;
    handicap_index?: number;
    category_id?: number;
    category_name?: string;
  };
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
  startTime: string;
  // Net score fields (only present for tours with net/both scoring mode)
  netTotalShots?: number;
  netRelativeToPar?: number;
  courseHandicap?: number;
  handicapStrokesPerHole?: number[];
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  // Competition info
  competitionId: number;
  scoringMode?: TourScoringMode;
  // Tee info (when competition has a default tee assigned)
  tee?: {
    id: number;
    name: string;
    color?: string;
    courseRating: number;
    slopeRating: number;
    strokeIndex?: number[];
  };
  // Category-specific tee assignments (used when categories have different tees)
  categoryTees?: {
    categoryId: number;
    categoryName: string;
    teeId: number;
    teeName: string;
    courseRating: number;
    slopeRating: number;
  }[];
  // Categories for filtering (only for tour competitions)
  categories?: TourCategory[];
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
export type TeeRatingGender = "men" | "women";

export interface CourseTeeRating {
  id: number;
  tee_id: number;
  gender: TeeRatingGender;
  course_rating: number;
  slope_rating: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseTeeRatingDto {
  gender: TeeRatingGender;
  course_rating: number;
  slope_rating?: number;
}

export interface UpdateCourseTeeRatingDto {
  course_rating?: number;
  slope_rating?: number;
}

export interface CourseTee {
  id: number;
  course_id: number;
  name: string;
  color?: string;
  // Legacy fields (kept for backward compatibility, use ratings array instead)
  course_rating: number;
  slope_rating: number;
  stroke_index?: number[];
  pars?: number[];
  // Gender-specific ratings (preferred for new code)
  ratings?: CourseTeeRating[];
  created_at: string;
  updated_at: string;
}

export interface CreateCourseTeeDto {
  name: string;
  color?: string;
  // Legacy fields (optional if ratings provided)
  course_rating?: number;
  slope_rating?: number;
  stroke_index?: number[];
  pars?: number[];
  // Gender-specific ratings (preferred)
  ratings?: CreateCourseTeeRatingDto[];
}

export interface UpdateCourseTeeDto {
  name?: string;
  color?: string;
  // Legacy fields
  course_rating?: number;
  slope_rating?: number;
  stroke_index?: number[];
  pars?: number[];
  // Gender-specific ratings can be updated via separate endpoints
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
  selected_scoring_type?: "gross" | "net";
  point_template?: {
    id: number;
    name: string;
  };
  categories?: TourCategory[];
  selected_category_id?: number;
}

// Tour competition registration types (for open-start competitions)
export type RegistrationStatus =
  | "looking_for_group"
  | "registered"
  | "playing"
  | "finished"
  | "withdrawn";

export type RegistrationMode = "solo" | "looking_for_group" | "create_group";

export interface TourCompetitionRegistration {
  id: number;
  competition_id: number;
  player_id: number;
  enrollment_id: number;
  tee_time_id?: number;
  participant_id?: number;
  status: RegistrationStatus;
  group_created_by?: number;
  registered_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface TourCompetitionRegistrationWithDetails
  extends TourCompetitionRegistration {
  player_name: string;
  handicap?: number;
  category_name?: string;
}

export interface CreateRegistrationDto {
  mode: RegistrationMode;
}

export interface AvailablePlayer {
  player_id: number;
  name: string;
  handicap?: number;
  status: "looking_for_group" | "available" | "in_group" | "playing" | "finished";
  group_tee_time_id?: number;
}

export interface PlayingGroup {
  tee_time_id: number;
  players: {
    player_id: number;
    name: string;
    handicap?: number;
    is_you?: boolean;
  }[];
  max_players: number;
}

export interface RegistrationResponse {
  registration: TourCompetitionRegistration;
  group?: PlayingGroup;
}

export interface ActiveRoundGroupMember {
  name: string;
  handicap?: number;
}

export interface ActiveRound {
  tour_id: number;
  tour_name: string;
  competition_id: number;
  competition_name: string;
  course_name: string;
  tee_time_id: number;
  participant_id: number;
  holes_played: number;
  current_score: string;
  group: ActiveRoundGroupMember[];
  open_until?: string;
  status: "playing" | "finished";
}

// Competition group types (Phase 15G)
export type CompetitionGroupStatus = "registered" | "on_course" | "finished";

export interface CompetitionGroupMember {
  player_id: number;
  name: string;
  handicap?: number;
  category_name?: string;
  registration_status: RegistrationStatus;
  holes_played: number;
  current_score: string; // e.g., "+2", "-1", "E"
}

export interface CompetitionGroup {
  tee_time_id: number;
  status: CompetitionGroupStatus;
  members: CompetitionGroupMember[];
  // Aggregate info for the group
  started_at?: string;
  finished_at?: string;
}

// Competition Category Tee Mapping (Phase 4)
export interface CompetitionCategoryTee {
  id: number;
  competition_id: number;
  category_id: number;
  category_name?: string;
  tee_id: number;
  tee_name?: string;
  tee_color?: string;
  created_at?: string;
}

export interface SetCompetitionCategoryTeesDto {
  mappings: { categoryId: number; teeId: number }[];
}
