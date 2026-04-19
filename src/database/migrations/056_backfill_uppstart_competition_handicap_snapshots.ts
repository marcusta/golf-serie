import { Migration } from "./base";

export class BackfillUppstartCompetitionHandicapSnapshotsMigration extends Migration {
  version = 56;
  description =
    "Backfill handicap snapshots for Uppstart competitions that already started";

  async up(): Promise<void> {
    await this.execute(`
      UPDATE participants
      SET handicap_index = (
        SELECT COALESCE(te.playing_handicap, pl.handicap)
        FROM tee_times tt
        JOIN competitions c ON tt.competition_id = c.id
        LEFT JOIN players pl ON pl.id = participants.player_id
        LEFT JOIN tour_enrollments te
          ON te.player_id = participants.player_id
         AND te.tour_id = c.tour_id
         AND te.status = 'active'
        WHERE tt.id = participants.tee_time_id
          AND participants.player_id IS NOT NULL
          AND c.date = '2026-04-18'
          AND c.name IN ('Uppstart, första 9', 'Uppstart, andra 9')
      )
      WHERE handicap_index IS NULL
        AND player_id IS NOT NULL
        AND (
          is_locked = 1
          OR manual_score_total IS NOT NULL
          OR EXISTS (
            SELECT 1
            FROM json_each(COALESCE(score, '[]'))
            WHERE value != 0
          )
        )
        AND tee_time_id IN (
          SELECT tt.id
          FROM tee_times tt
          JOIN competitions c ON tt.competition_id = c.id
          WHERE c.date = '2026-04-18'
            AND c.name IN ('Uppstart, första 9', 'Uppstart, andra 9')
        )
        AND (
          SELECT COALESCE(te.playing_handicap, pl.handicap)
          FROM tee_times tt
          JOIN competitions c ON tt.competition_id = c.id
          LEFT JOIN players pl ON pl.id = participants.player_id
          LEFT JOIN tour_enrollments te
            ON te.player_id = participants.player_id
           AND te.tour_id = c.tour_id
           AND te.status = 'active'
          WHERE tt.id = participants.tee_time_id
            AND participants.player_id IS NOT NULL
            AND c.date = '2026-04-18'
            AND c.name IN ('Uppstart, första 9', 'Uppstart, andra 9')
        ) IS NOT NULL
    `);

    await this.execute(`
      UPDATE participants
      SET handicap_index = (
        SELECT te.playing_handicap
        FROM tee_times tt
        JOIN competitions c ON tt.competition_id = c.id
        JOIN tour_enrollments te
          ON te.player_id IS NULL
         AND te.tour_id = c.tour_id
         AND te.status = 'active'
         AND LOWER(TRIM(COALESCE(te.name, ''))) =
             LOWER(TRIM(COALESCE(participants.player_names, participants.position_name, '')))
        WHERE tt.id = participants.tee_time_id
          AND participants.player_id IS NULL
          AND c.date = '2026-04-18'
          AND c.name IN ('Uppstart, första 9', 'Uppstart, andra 9')
      )
      WHERE handicap_index IS NULL
        AND player_id IS NULL
        AND (
          is_locked = 1
          OR manual_score_total IS NOT NULL
          OR EXISTS (
            SELECT 1
            FROM json_each(COALESCE(score, '[]'))
            WHERE value != 0
          )
        )
        AND tee_time_id IN (
          SELECT tt.id
          FROM tee_times tt
          JOIN competitions c ON tt.competition_id = c.id
          WHERE c.date = '2026-04-18'
            AND c.name IN ('Uppstart, första 9', 'Uppstart, andra 9')
        )
        AND (
          SELECT te.playing_handicap
          FROM tee_times tt
          JOIN competitions c ON tt.competition_id = c.id
          JOIN tour_enrollments te
            ON te.player_id IS NULL
           AND te.tour_id = c.tour_id
           AND te.status = 'active'
           AND LOWER(TRIM(COALESCE(te.name, ''))) =
               LOWER(TRIM(COALESCE(participants.player_names, participants.position_name, '')))
          WHERE tt.id = participants.tee_time_id
            AND participants.player_id IS NULL
            AND c.date = '2026-04-18'
            AND c.name IN ('Uppstart, första 9', 'Uppstart, andra 9')
        ) IS NOT NULL
    `);
  }

  async down(): Promise<void> {
    // One-way data repair migration. We do not unset snapshots on rollback.
  }
}
