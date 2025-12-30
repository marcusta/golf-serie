/**
 * Backfill script to calculate and store results for existing competitions
 * Run with: bun run src/scripts/backfill-competition-results.ts
 */

import { createDatabase, initializeDatabase } from "../database/db";
import { createCompetitionResultsService } from "../services/competition-results.service";

async function main() {
  console.log("Starting competition results backfill...\n");

  const db = createDatabase();
  await initializeDatabase(db);

  const competitionResultsService = createCompetitionResultsService(db);

  // Get all competitions that should be finalized
  // - Scheduled competitions: date < today
  // - Open competitions: open_end has passed (open_end < now)
  // IMPORTANT: Don't finalize open competitions based on date alone - they need open_end to pass
  const competitions = db
    .prepare(`
      SELECT id, name, date, tour_id, series_id, start_mode, open_end, is_results_final
      FROM competitions
      WHERE (
        (start_mode = 'scheduled' AND date < date('now'))
        OR (start_mode = 'open' AND open_end IS NOT NULL AND open_end < datetime('now'))
      )
      ORDER BY date ASC
    `)
    .all() as {
      id: number;
      name: string;
      date: string;
      tour_id: number | null;
      series_id: number | null;
      start_mode: string;
      open_end: string | null;
      is_results_final: number;
    }[];

  console.log(`Found ${competitions.length} competitions to process\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const competition of competitions) {
    if (competition.is_results_final === 1) {
      console.log(`  SKIP: ${competition.name} (${competition.date}) - already finalized`);
      skipped++;
      continue;
    }

    try {
      console.log(`  Processing: ${competition.name} (${competition.date})...`);
      competitionResultsService.finalizeCompetitionResults(competition.id);
      processed++;
      console.log(`    ✓ Finalized`);
    } catch (error: any) {
      console.log(`    ✗ Error: ${error.message}`);
      errors++;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Processed: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${competitions.length}`);

  // Show sample results
  const sampleResults = db
    .prepare(`
      SELECT
        cr.competition_id,
        c.name as competition_name,
        COUNT(*) as result_count
      FROM competition_results cr
      JOIN competitions c ON cr.competition_id = c.id
      GROUP BY cr.competition_id, c.name
      ORDER BY c.date DESC
      LIMIT 5
    `)
    .all() as { competition_id: number; competition_name: string; result_count: number }[];

  if (sampleResults.length > 0) {
    console.log("\n--- Sample Results ---");
    for (const r of sampleResults) {
      console.log(`  ${r.competition_name}: ${r.result_count} results`);
    }
  }

  db.close();
  console.log("\nDone!");
}

main().catch(console.error);
