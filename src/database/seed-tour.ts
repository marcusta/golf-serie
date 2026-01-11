/**
 * Tour Seed Data
 *
 * Creates a complete tour setup for manual verification:
 * - 2 point templates
 * - 1 tour with landing document and rules document
 * - 25 enrolled players
 * - 15 competitions (week 15 to week 30, open start format)
 * - Results for first 5 weeks with most players having scores
 *
 * Run with: bun run seed-tour
 * Run with clean slate: bun run seed-tour -- --clean
 */

import { createDatabase, initializeDatabase } from "./db";
import { Database } from "bun:sqlite";

// Check for --clean flag
const shouldClean = process.argv.includes("--clean");

// Golfer first names and last names for realistic player names
const firstNames = [
  "Marcus", "Erik", "Johan", "Anders", "Lars", "Olof", "Sven", "Magnus",
  "Henrik", "Per", "Fredrik", "Karl", "Mikael", "Niklas", "Peter", "Jonas",
  "Daniel", "Gustav", "Oscar", "Viktor", "Axel", "Emil", "Rasmus", "Adam", "Simon"
];

const lastNames = [
  "Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Larsson",
  "Olsson", "Persson", "Svensson", "Gustafsson", "Pettersson", "Jonsson",
  "Jansson", "Hansson", "Bengtsson", "Lindberg", "Lindqvist", "Lindgren",
  "Axelsson", "Berg", "Bergström", "Lundberg", "Lundgren", "Lindström", "Sandberg"
];

// Course holes pars for a standard 18-hole course
const coursePars = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 5, 3, 4, 4, 3, 5, 4, 4];
const totalPar = coursePars.reduce((a, b) => a + b, 0); // 72

// Generate a realistic golf score for a player (handicap affects variance)
function generateScore(handicap: number): number[] {
  const scores: number[] = [];
  for (const par of coursePars) {
    // Base score is par + handicap influence
    const handicapInfluence = Math.floor(handicap / 18);
    const base = par + handicapInfluence;

    // Add randomness (-2 to +3 from base, weighted toward small variations)
    const variance = Math.floor(Math.random() * 6) - 2;
    const score = Math.max(1, base + variance);
    scores.push(score);
  }
  return scores;
}

// Calculate total from score array
function totalScore(scores: number[]): number {
  return scores.reduce((a, b) => a + b, 0);
}

// Get ISO date for a given week number in 2025
function getDateForWeek(weekNum: number): string {
  // Week 1 of 2025 starts on Monday, Dec 30, 2024 (ISO week numbering)
  // But let's use a simpler approach: week 15 starts around April 7
  const startOfYear = new Date(2025, 0, 1);
  const daysToAdd = (weekNum - 1) * 7;
  const date = new Date(startOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

async function seedTour() {
  console.log("🏌️ Seeding Tour data...\n");

  // Connect to the database (respects DB_PATH environment variable)
  const dbPath = process.env.DB_PATH || "golf_series.db";
  const db = createDatabase(dbPath);
  await initializeDatabase(db);

  try {
    // Start transaction for atomicity
    db.run("BEGIN TRANSACTION");

    // Clean existing tour seed data if --clean flag is passed
    if (shouldClean) {
      console.log("🧹 Cleaning existing tour seed data...");

      // Delete participants from tour competitions
      db.run(`
        DELETE FROM participants WHERE tee_time_id IN (
          SELECT t.id FROM tee_times t
          JOIN competitions c ON t.competition_id = c.id
          WHERE c.tour_id IS NOT NULL
        )
      `);

      // Delete tee times from tour competitions
      db.run(`
        DELETE FROM tee_times WHERE competition_id IN (
          SELECT id FROM competitions WHERE tour_id IS NOT NULL
        )
      `);

      // Delete tour competitions
      db.run("DELETE FROM competitions WHERE tour_id IS NOT NULL");

      // Delete tour documents
      db.run("DELETE FROM tour_documents");

      // Delete tour enrollments
      db.run("DELETE FROM tour_enrollments");

      // Delete tour admins
      db.run("DELETE FROM tour_admins");

      // Delete tours
      db.run("DELETE FROM tours");

      // Delete players created for tour (those with user_id linked to player users)
      const playerUserEmails = firstNames.map((fn, i) =>
        `${fn.toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`
      );
      for (const email of playerUserEmails) {
        db.run("DELETE FROM players WHERE user_id IN (SELECT id FROM users WHERE email = ?)", [email]);
        db.run("DELETE FROM users WHERE email = ?", [email]);
      }

      // Delete tour admin user
      db.run("DELETE FROM users WHERE email = 'tour-admin@example.com'");

      // Delete point templates created for tour (leave any existing ones)
      db.run("DELETE FROM point_templates WHERE name IN ('Standard Tour Points', 'Progressive Points')");

      // Delete the tour-specific course
      db.run("DELETE FROM courses WHERE name = 'Stockholms Golfklubb'");

      console.log("  ✓ Cleaned existing tour data\n");
    }

    // 1. Create admin user for tour ownership
    console.log("Creating admin user...");
    const adminPassword = await Bun.password.hash("admin123", "bcrypt");
    const admin = db.prepare(`
      INSERT INTO users (email, password_hash, role)
      VALUES (?, ?, ?)
      RETURNING id
    `).get("tour-admin@example.com", adminPassword, "SUPER_ADMIN") as { id: number };
    console.log(`  ✓ Admin user created (id: ${admin.id})`);

    // 2. Create point templates
    console.log("\nCreating point templates...");

    // Standard template: top 3 get bonus points
    const standardTemplate = db.prepare(`
      INSERT INTO point_templates (name, points_structure, created_by)
      VALUES (?, ?, ?)
      RETURNING id
    `).get(
      "Standard Tour Points",
      JSON.stringify({
        "1": 100,
        "2": 80,
        "3": 65,
        "4": 55,
        "5": 50,
        "6": 45,
        "7": 40,
        "8": 36,
        "9": 32,
        "10": 29,
        "11": 26,
        "12": 24,
        "13": 22,
        "14": 20,
        "15": 18,
        "16": 16,
        "17": 14,
        "18": 12,
        "19": 10,
        "20": 8,
        "default": 5
      }),
      admin.id
    ) as { id: number };
    console.log(`  ✓ Standard Tour Points template (id: ${standardTemplate.id})`);

    // Progressive template: winner takes more
    const progressiveTemplate = db.prepare(`
      INSERT INTO point_templates (name, points_structure, created_by)
      VALUES (?, ?, ?)
      RETURNING id
    `).get(
      "Progressive Points",
      JSON.stringify({
        "1": 150,
        "2": 100,
        "3": 75,
        "4": 60,
        "5": 50,
        "6": 42,
        "7": 36,
        "8": 30,
        "9": 25,
        "10": 20,
        "default": 10
      }),
      admin.id
    ) as { id: number };
    console.log(`  ✓ Progressive Points template (id: ${progressiveTemplate.id})`);

    // 3. Create a golf course
    console.log("\nCreating course...");
    const course = db.prepare(`
      INSERT INTO courses (name, pars)
      VALUES (?, ?)
      RETURNING id
    `).get(
      "Stockholms Golfklubb",
      JSON.stringify(coursePars)
    ) as { id: number };
    console.log(`  ✓ Course created (id: ${course.id}, par: ${totalPar})`);

    // 4. Create tour
    console.log("\nCreating tour...");
    const tour = db.prepare(`
      INSERT INTO tours (name, description, owner_id, enrollment_mode, visibility, point_template_id, banner_image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).get(
      "2025 Summer Golf Tour",
      "Welcome to the 2025 Summer Golf Tour! Compete over 15 weeks for the championship title.",
      admin.id,
      "request",
      "public",
      standardTemplate.id,
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200"
    ) as { id: number };
    console.log(`  ✓ Tour created (id: ${tour.id})`);

    // 5. Create tour documents
    console.log("\nCreating tour documents...");

    // Landing document
    const landingDoc = db.prepare(`
      INSERT INTO tour_documents (title, content, type, tour_id)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).get(
      "Welcome to the 2025 Summer Tour",
      `# 2025 Summer Golf Tour

Welcome to the most exciting individual golf competition of the year!

## About the Tour

The Summer Golf Tour runs from **Week 15 to Week 30** (April through July 2025), with 15 weekly competitions at Stockholms Golfklubb.

### Format

- **Open Start**: Each competition runs for one week
- Play anytime during the competition week
- Submit your scorecard before Sunday midnight
- All 18 holes must be completed in a single round

### Points System

We use the **Standard Tour Points** system:
- 1st Place: 100 points
- 2nd Place: 80 points
- 3rd Place: 65 points
- Top 10 finishers earn significant points
- Everyone who completes a round earns at least 5 points

### Prizes

🏆 **Tour Champion**: Winner's trophy + exclusive membership benefits
🥈 **Runner-up**: Silver medal + pro shop voucher
🥉 **Third Place**: Bronze medal + lesson with our club pro

### Contact

Questions? Reach out to the tour committee at tour@stockholmsgk.se

*Good luck and play well!*`,
      "landing",
      tour.id
    ) as { id: number };
    console.log(`  ✓ Landing document created (id: ${landingDoc.id})`);

    // Update tour with landing document
    db.prepare(`UPDATE tours SET landing_document_id = ? WHERE id = ?`).run(landingDoc.id, tour.id);

    // Rules document
    const rulesDoc = db.prepare(`
      INSERT INTO tour_documents (title, content, type, tour_id)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).get(
      "Tour Rules & Regulations",
      `# Tour Rules & Regulations

## 1. Eligibility

1.1 All registered players with active enrollment are eligible to participate.

1.2 Players must have a valid golf handicap registered with the Swedish Golf Federation.

1.3 Guest players may participate with tour admin approval.

## 2. Competition Format

2.1 **Open Start Period**: Each competition begins Monday 00:00 and ends Sunday 23:59.

2.2 **Scoring**: Stroke play format. All 18 holes must be completed in a single round.

2.3 **Handicap**: Gross scores only. No handicap adjustments.

## 3. Scoring & Results

3.1 Players must submit scores via the official scoring system.

3.2 All scorecards must be attested by a playing partner.

3.3 Incorrect scores may result in disqualification from that competition.

## 4. Tiebreakers

4.1 In case of a tie, the following tiebreakers apply:
   - a) Lower back-9 score
   - b) Lower back-6 score
   - c) Lower back-3 score
   - d) Lower final hole score
   - e) Countback continues hole-by-hole from 18

## 5. Points Allocation

5.1 Points are awarded based on finishing position in each competition.

5.2 Only completed rounds count toward the standings.

5.3 The player with the most total points at the end of the tour wins.

## 6. Code of Conduct

6.1 Players must adhere to the Rules of Golf as established by R&A.

6.2 Proper golf attire is required at all times.

6.3 Unsportsmanlike conduct may result in disqualification.

## 7. Protests & Appeals

7.1 Any protests must be submitted within 24 hours of results posting.

7.2 The tour committee's decision is final.

---

*Last updated: January 2025*`,
      "rules",
      tour.id
    ) as { id: number };
    console.log(`  ✓ Rules document created (id: ${rulesDoc.id})`);

    // 6. Create players and enrollments
    console.log("\nCreating players and enrollments...");

    // Create or get team for players (required for participants)
    let team = db.prepare(`SELECT id FROM teams WHERE name = ?`).get("Individual Players") as { id: number } | null;
    if (!team) {
      team = db.prepare(`
        INSERT INTO teams (name)
        VALUES (?)
        RETURNING id
      `).get("Individual Players") as { id: number };
    }

    const players: { id: number; name: string; handicap: number }[] = [];

    for (let i = 0; i < 25; i++) {
      const firstName = firstNames[i];
      const lastName = lastNames[i];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
      const handicap = Math.floor(Math.random() * 20) + 5; // 5-24 handicap

      // Create user account
      const password = await Bun.password.hash("player123", "bcrypt");
      const user = db.prepare(`
        INSERT INTO users (email, password_hash, role)
        VALUES (?, ?, ?)
        RETURNING id
      `).get(email, password, "PLAYER") as { id: number };

      // Create player
      const player = db.prepare(`
        INSERT INTO players (name, handicap, user_id, created_by)
        VALUES (?, ?, ?, ?)
        RETURNING id
      `).get(name, handicap, user.id, admin.id) as { id: number };

      players.push({ id: player.id, name, handicap });

      // Create active enrollment
      db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'active')
      `).run(tour.id, player.id, email);
    }
    console.log(`  ✓ Created ${players.length} players with enrollments`);

    // 7. Create competitions (week 15 to week 30 = 16 weeks, we'll do 15)
    console.log("\nCreating competitions...");

    const competitions: { id: number; name: string; weekNum: number }[] = [];

    for (let week = 15; week < 30; week++) {
      const weekNum = week;
      const startDate = getDateForWeek(weekNum);
      const endDate = getDateForWeek(weekNum + 1);

      const competition = db.prepare(`
        INSERT INTO competitions (name, date, course_id, tour_id, start_mode, open_start, open_end)
        VALUES (?, ?, ?, ?, 'open', ?, ?)
        RETURNING id
      `).get(
        `Week ${weekNum} Open`,
        startDate,
        course.id,
        tour.id,
        startDate,
        endDate
      ) as { id: number };

      competitions.push({ id: competition.id, name: `Week ${weekNum} Open`, weekNum });
    }
    console.log(`  ✓ Created ${competitions.length} competitions`);

    // 8. Add results for first 5 competitions
    console.log("\nAdding results for first 5 competitions...");

    for (let compIdx = 0; compIdx < 5; compIdx++) {
      const competition = competitions[compIdx];

      // Determine which players participate (80-95% of players each week)
      const participatingPlayers = players.filter(() => Math.random() < 0.88);

      // Create tee times and participants with scores
      let teeTimeCounter = 0;
      for (const player of participatingPlayers) {
        // Create a tee time for this player
        const teeHour = 8 + Math.floor(teeTimeCounter / 4);
        const teeMinute = (teeTimeCounter % 4) * 15;
        const teeTimeStr = `${teeHour.toString().padStart(2, '0')}:${teeMinute.toString().padStart(2, '0')}`;

        const teeTime = db.prepare(`
          INSERT INTO tee_times (teetime, competition_id, start_hole)
          VALUES (?, ?, 1)
          RETURNING id
        `).get(teeTimeStr, competition.id) as { id: number };

        // Generate realistic score based on handicap
        const scores = generateScore(player.handicap);
        const total = totalScore(scores);

        // Create participant with score
        db.prepare(`
          INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score, is_locked)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          1,
          team.id,
          teeTime.id,
          "Individual",
          player.id,
          player.name,
          JSON.stringify(scores)
        );

        teeTimeCounter++;
      }

      console.log(`  ✓ Week ${competition.weekNum}: ${participatingPlayers.length} players with results`);
    }

    // 9. Create empty tee times for remaining competitions (future)
    console.log("\nSetting up future competitions...");
    for (let compIdx = 5; compIdx < competitions.length; compIdx++) {
      console.log(`  • Week ${competitions[compIdx].weekNum}: Ready for entries`);
    }

    // Commit transaction
    db.run("COMMIT");

    console.log("\n✅ Tour seed data created successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Tour: ${tour.id} (2025 Summer Golf Tour)`);
    console.log(`   - Point Templates: 2 (Standard + Progressive)`);
    console.log(`   - Documents: 2 (Landing + Rules)`);
    console.log(`   - Players: 25`);
    console.log(`   - Competitions: 15 (Week 15-29)`);
    console.log(`   - Competitions with results: 5 (Week 15-19)`);
    console.log("\n🔑 Login credentials:");
    console.log("   Admin: tour-admin@example.com / admin123");
    console.log("   Players: firstname.lastname@example.com / player123");

  } catch (error) {
    db.run("ROLLBACK");
    console.error("❌ Error seeding tour data:", error);
    throw error;
  } finally {
    db.close();
  }
}

async function seedWinterTour() {
  console.log("\n🏔️ Seeding Winter Tour data...\n");

  const dbPath = process.env.DB_PATH || "golf_series.db";
  const db = createDatabase(dbPath);
  await initializeDatabase(db);

  try {
    db.run("BEGIN TRANSACTION");

    // Clean existing winter tour data if --clean flag
    if (shouldClean) {
      console.log("🧹 Cleaning existing winter tour data...");

      // Delete winter tour competitions and related data
      db.run(`
        DELETE FROM participants WHERE tee_time_id IN (
          SELECT t.id FROM tee_times t
          JOIN competitions c ON t.competition_id = c.id
          JOIN tours tour ON c.tour_id = tour.id
          WHERE tour.name = 'Winter Tour 2025-2026'
        )
      `);
      db.run(`
        DELETE FROM tee_times WHERE competition_id IN (
          SELECT c.id FROM competitions c
          JOIN tours tour ON c.tour_id = tour.id
          WHERE tour.name = 'Winter Tour 2025-2026'
        )
      `);
      db.run(`
        DELETE FROM competitions WHERE tour_id IN (
          SELECT id FROM tours WHERE name = 'Winter Tour 2025-2026'
        )
      `);
      db.run(`DELETE FROM tour_documents WHERE tour_id IN (SELECT id FROM tours WHERE name = 'Winter Tour 2025-2026')`);
      db.run(`DELETE FROM tour_enrollments WHERE tour_id IN (SELECT id FROM tours WHERE name = 'Winter Tour 2025-2026')`);
      db.run(`DELETE FROM tour_admins WHERE tour_id IN (SELECT id FROM tours WHERE name = 'Winter Tour 2025-2026')`);
      db.run(`DELETE FROM tours WHERE name = 'Winter Tour 2025-2026'`);
      db.run("DELETE FROM courses WHERE name = 'Indoor Golf Arena'");

      // Delete winter tour players (those with @wintergolf.se emails)
      db.run("DELETE FROM players WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@wintergolf.se')");
      db.run("DELETE FROM users WHERE email LIKE '%@wintergolf.se'");

      console.log("  ✓ Cleaned existing winter tour data\n");
    }

    // 1. Find or create admin user
    let admin = db.prepare(`SELECT id FROM users WHERE email = 'tour-admin@example.com'`).get() as { id: number } | null;
    if (!admin) {
      const adminPassword = await Bun.password.hash("admin123", "bcrypt");
      admin = db.prepare(`
        INSERT INTO users (email, password_hash, role)
        VALUES (?, ?, ?)
        RETURNING id
      `).get("tour-admin@example.com", adminPassword, "SUPER_ADMIN") as { id: number };
    }
    console.log(`Using admin user (id: ${admin.id})`);

    // 2. Find the real user (marcus.andersson1975@gmail.com)
    const realUser = db.prepare(`SELECT id FROM users WHERE email = ?`).get("marcus.andersson1975@gmail.com") as { id: number } | null;
    if (!realUser) {
      console.log("⚠️  User marcus.andersson1975@gmail.com not found - will create enrollment anyway");
    } else {
      console.log(`Found real user (id: ${realUser.id})`);
    }

    // 3. Create indoor golf course
    console.log("\nCreating indoor course...");
    const indoorPars = [4, 3, 4, 5, 3, 4, 4, 3, 5, 4, 4, 3, 5, 4, 3, 4, 5, 4];
    const course = db.prepare(`
      INSERT INTO courses (name, pars)
      VALUES (?, ?)
      RETURNING id
    `).get("Indoor Golf Arena", JSON.stringify(indoorPars)) as { id: number };
    console.log(`  ✓ Indoor course created (id: ${course.id})`);

    // 4. Get or create point template
    let pointTemplate = db.prepare(`SELECT id FROM point_templates WHERE name = 'Standard Tour Points'`).get() as { id: number } | null;
    if (!pointTemplate) {
      pointTemplate = db.prepare(`
        INSERT INTO point_templates (name, points_structure, created_by)
        VALUES (?, ?, ?)
        RETURNING id
      `).get(
        "Standard Tour Points",
        JSON.stringify({ "1": 100, "2": 80, "3": 65, "4": 55, "5": 50, "6": 45, "7": 40, "8": 36, "9": 32, "10": 29, "default": 5 }),
        admin.id
      ) as { id: number };
    }

    // 5. Create Winter Tour
    console.log("\nCreating Winter Tour...");
    const tour = db.prepare(`
      INSERT INTO tours (name, description, owner_id, enrollment_mode, visibility, point_template_id, banner_image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).get(
      "Winter Tour 2025-2026",
      "Indoor golf competition running through the winter months. Two-week competition periods.",
      admin.id,
      "closed",
      "public",
      pointTemplate.id,
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=1200"
    ) as { id: number };
    console.log(`  ✓ Winter Tour created (id: ${tour.id})`);

    // 6. Create tour documents
    const landingDoc = db.prepare(`
      INSERT INTO tour_documents (title, content, type, tour_id)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).get(
      "Welcome to Winter Tour 2025-2026",
      `# Winter Tour 2025-2026

Keep your game sharp through the cold months!

## Format

- **Two-week competition periods** - Play anytime during the open window
- **Indoor simulators** at Indoor Golf Arena
- **November 2025 through April 2026**

## Schedule

| Competition | Dates |
|------------|-------|
| Round 1 | Nov 3 - Nov 16 |
| Round 2 | Nov 17 - Nov 30 |
| Round 3 | Dec 1 - Dec 14 |
| Round 4 | Dec 15 - Dec 28 |
| Round 5 | Dec 29 - Jan 11 |
| Round 6 | Jan 12 - Jan 25 |
| Round 7 | Jan 26 - Feb 8 |
| Round 8 | Feb 9 - Feb 22 |
| Round 9 | Feb 23 - Mar 8 |
| Round 10 | Mar 9 - Mar 22 |
| Round 11 | Mar 23 - Apr 5 |
| Round 12 | Apr 6 - Apr 19 |

Good luck and stay warm! ⛳🏔️`,
      "landing",
      tour.id
    ) as { id: number };
    db.prepare(`UPDATE tours SET landing_document_id = ? WHERE id = ?`).run(landingDoc.id, tour.id);
    console.log(`  ✓ Landing document created`);

    // 7. Create or get team
    let team = db.prepare(`SELECT id FROM teams WHERE name = ?`).get("Individual Players") as { id: number } | null;
    if (!team) {
      team = db.prepare(`INSERT INTO teams (name) VALUES (?) RETURNING id`).get("Individual Players") as { id: number };
    }

    // 8. Create players for winter tour (reuse some, create new ones)
    console.log("\nCreating/enrolling players...");
    const winterPlayers: { id: number; name: string; handicap: number; isRealUser: boolean }[] = [];

    // First, enroll the real user (marcus.andersson1975@gmail.com)
    if (realUser) {
      // Check if player profile exists for this user
      let realPlayer = db.prepare(`SELECT id, name, handicap FROM players WHERE user_id = ?`).get(realUser.id) as { id: number; name: string; handicap: number } | null;
      if (!realPlayer) {
        // Create player profile
        realPlayer = db.prepare(`
          INSERT INTO players (name, handicap, user_id, created_by)
          VALUES (?, ?, ?, ?)
          RETURNING id, name, handicap
        `).get("Marcus Andersson", 15, realUser.id, admin.id) as { id: number; name: string; handicap: number };
      }
      winterPlayers.push({ id: realPlayer.id, name: realPlayer.name, handicap: realPlayer.handicap, isRealUser: true });

      // Create enrollment for real user
      db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'active')
      `).run(tour.id, realPlayer.id, "marcus.andersson1975@gmail.com");
      console.log(`  ✓ Enrolled real user: ${realPlayer.name}`);
    }

    // Create 15 additional winter players
    const winterFirstNames = ["Anna", "Björn", "Carl", "David", "Eva", "Filip", "Greta", "Hans", "Ida", "Jakob", "Karin", "Linus", "Maria", "Nils", "Olivia"];
    const winterLastNames = ["Lindqvist", "Bergman", "Nyström", "Holmberg", "Ekström", "Sjöberg", "Wallin", "Engström", "Nordin", "Lundqvist", "Åkesson", "Fransson", "Magnusson", "Blom", "Holm"];

    for (let i = 0; i < 15; i++) {
      const firstName = winterFirstNames[i];
      const lastName = winterLastNames[i];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@wintergolf.se`;
      const handicap = Math.floor(Math.random() * 25) + 3;

      // Create user
      const password = await Bun.password.hash("winter123", "bcrypt");
      const user = db.prepare(`
        INSERT INTO users (email, password_hash, role)
        VALUES (?, ?, ?)
        RETURNING id
      `).get(email, password, "PLAYER") as { id: number };

      // Create player
      const player = db.prepare(`
        INSERT INTO players (name, handicap, user_id, created_by)
        VALUES (?, ?, ?, ?)
        RETURNING id
      `).get(name, handicap, user.id, admin.id) as { id: number };

      winterPlayers.push({ id: player.id, name, handicap, isRealUser: false });

      // Enroll in tour
      db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'active')
      `).run(tour.id, player.id, email);
    }
    console.log(`  ✓ Created ${winterPlayers.length} enrolled players`);

    // 9. Create competitions (12 rounds, 2 weeks each, Nov 2025 - Apr 2026)
    console.log("\nCreating competitions...");

    // Competition schedule
    const schedule = [
      { round: 1, start: "2025-11-03", end: "2025-11-16", status: "completed" },
      { round: 2, start: "2025-11-17", end: "2025-11-30", status: "completed" },
      { round: 3, start: "2025-12-01", end: "2025-12-14", status: "completed" },
      { round: 4, start: "2025-12-15", end: "2025-12-28", status: "current" },  // CURRENT!
      { round: 5, start: "2025-12-29", end: "2026-01-11", status: "future" },
      { round: 6, start: "2026-01-12", end: "2026-01-25", status: "future" },
      { round: 7, start: "2026-01-26", end: "2026-02-08", status: "future" },
      { round: 8, start: "2026-02-09", end: "2026-02-22", status: "future" },
      { round: 9, start: "2026-02-23", end: "2026-03-08", status: "future" },
      { round: 10, start: "2026-03-09", end: "2026-03-22", status: "future" },
      { round: 11, start: "2026-03-23", end: "2026-04-05", status: "future" },
      { round: 12, start: "2026-04-06", end: "2026-04-19", status: "future" },
    ];

    const competitions: { id: number; round: number; status: string }[] = [];

    for (const comp of schedule) {
      const competition = db.prepare(`
        INSERT INTO competitions (name, date, course_id, tour_id, start_mode, open_start, open_end, venue_type)
        VALUES (?, ?, ?, ?, 'open', ?, ?, 'indoor')
        RETURNING id
      `).get(
        `Round ${comp.round}`,
        comp.start,
        course.id,
        tour.id,
        comp.start,
        comp.end
      ) as { id: number };

      competitions.push({ id: competition.id, round: comp.round, status: comp.status });
    }
    console.log(`  ✓ Created ${competitions.length} competitions`);

    // 10. Add results for completed competitions
    console.log("\nAdding results...");

    for (const competition of competitions) {
      if (competition.status === "completed") {
        // All players have results for completed rounds
        for (const player of winterPlayers) {
          const teeTime = db.prepare(`
            INSERT INTO tee_times (teetime, competition_id, start_hole)
            VALUES (?, ?, 1)
            RETURNING id
          `).get("10:00", competition.id) as { id: number };

          const scores = generateScore(player.handicap);
          db.prepare(`
            INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score, is_locked)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          `).run(1, team.id, teeTime.id, "Individual", player.id, player.name, JSON.stringify(scores));
        }
        console.log(`  ✓ Round ${competition.round}: All ${winterPlayers.length} players completed`);

      } else if (competition.status === "current") {
        // Current competition: some have played, some haven't
        // Real user should NOT have played yet
        const playedCount = Math.floor(winterPlayers.length * 0.6); // 60% have played

        let playedSoFar = 0;
        for (const player of winterPlayers) {
          // Skip real user - they haven't played yet
          if (player.isRealUser) {
            console.log(`  • ${player.name} (YOU): Not yet played - waiting for you!`);
            continue;
          }

          // 60% of other players have played
          if (playedSoFar < playedCount - 1) { // -1 to account for real user slot
            const teeTime = db.prepare(`
              INSERT INTO tee_times (teetime, competition_id, start_hole)
              VALUES (?, ?, 1)
              RETURNING id
            `).get("10:00", competition.id) as { id: number };

            const scores = generateScore(player.handicap);
            db.prepare(`
              INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score, is_locked)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `).run(1, team.id, teeTime.id, "Individual", player.id, player.name, JSON.stringify(scores));
            playedSoFar++;
          }
        }
        console.log(`  ⏳ Round ${competition.round} (CURRENT): ${playedSoFar}/${winterPlayers.length} players have submitted scores`);
        console.log(`     Open until: 2025-12-28`);
      }
      // Future competitions: no results
    }

    db.run("COMMIT");

    console.log("\n✅ Winter Tour seed data created successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Tour: ${tour.id} (Winter Tour 2025-2026)`);
    console.log(`   - Players: ${winterPlayers.length} (including you!)`);
    console.log(`   - Competitions: 12 rounds (2-week periods)`);
    console.log(`   - Completed: Rounds 1-3`);
    console.log(`   - Current: Round 4 (Dec 15-28) - PLAY NOW!`);
    console.log(`   - Upcoming: Rounds 5-12`);
    console.log("\n🔑 Your enrollment:");
    console.log("   Email: marcus.andersson1975@gmail.com");
    console.log("   Status: Active - ready to play Round 4!");

  } catch (error) {
    db.run("ROLLBACK");
    console.error("❌ Error seeding winter tour:", error);
    throw error;
  } finally {
    db.close();
  }
}

async function seedLanderydTour() {
  console.log("\n🏌️‍♀️ Seeding Landeryd Mixed Tour data...\n");

  const dbPath = process.env.DB_PATH || "golf_series.db";
  const db = createDatabase(dbPath);
  await initializeDatabase(db);

  try {
    db.run("BEGIN TRANSACTION");

    // Clean existing Landeryd tour data if --clean flag
    if (shouldClean) {
      console.log("🧹 Cleaning existing Landeryd tour data...");

      db.run(`
        DELETE FROM participants WHERE tee_time_id IN (
          SELECT t.id FROM tee_times t
          JOIN competitions c ON t.competition_id = c.id
          JOIN tours tour ON c.tour_id = tour.id
          WHERE tour.name = 'Landeryd Mixed Tour 2025'
        )
      `);
      db.run(`
        DELETE FROM tee_times WHERE competition_id IN (
          SELECT c.id FROM competitions c
          JOIN tours tour ON c.tour_id = tour.id
          WHERE tour.name = 'Landeryd Mixed Tour 2025'
        )
      `);
      db.run(`
        DELETE FROM competitions WHERE tour_id IN (
          SELECT id FROM tours WHERE name = 'Landeryd Mixed Tour 2025'
        )
      `);
      db.run(`DELETE FROM tour_categories WHERE tour_id IN (SELECT id FROM tours WHERE name = 'Landeryd Mixed Tour 2025')`);
      db.run(`DELETE FROM tour_documents WHERE tour_id IN (SELECT id FROM tours WHERE name = 'Landeryd Mixed Tour 2025')`);
      db.run(`DELETE FROM tour_enrollments WHERE tour_id IN (SELECT id FROM tours WHERE name = 'Landeryd Mixed Tour 2025')`);
      db.run(`DELETE FROM tour_admins WHERE tour_id IN (SELECT id FROM tours WHERE name = 'Landeryd Mixed Tour 2025')`);
      db.run(`DELETE FROM tours WHERE name = 'Landeryd Mixed Tour 2025'`);

      // Delete Landeryd tour players
      db.run("DELETE FROM players WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@landeryd.se')");
      db.run("DELETE FROM users WHERE email LIKE '%@landeryd.se'");

      console.log("  ✓ Cleaned existing Landeryd tour data\n");
    }

    // 1. Find the Landeryd courses (no admin user creation needed)
    const classicCourse = db.prepare(`SELECT id, name FROM courses WHERE name = 'Landeryd Classic'`).get() as { id: number; name: string } | null;
    const mastersCourse = db.prepare(`SELECT id, name FROM courses WHERE name = 'Landeryd Masters'`).get() as { id: number; name: string } | null;

    if (!classicCourse || !mastersCourse) {
      console.log("⚠️  Landeryd courses not found in database!");
      console.log("   Please ensure 'Landeryd Classic' and 'Landeryd Masters' courses exist.");
      console.log("   Aborting Landeryd Tour seed.");
      db.run("ROLLBACK");
      return;
    }
    console.log(`Found courses: ${classicCourse.name} (id: ${classicCourse.id}), ${mastersCourse.name} (id: ${mastersCourse.id})`);

    // 2. Find an owner for the tour (real user or any super admin)
    let ownerId: number;
    const realUser = db.prepare(`SELECT id FROM users WHERE email = ?`).get("marcus.andersson1975@gmail.com") as { id: number } | null;
    if (realUser) {
      ownerId = realUser.id;
      console.log(`Using real user as owner (id: ${realUser.id})`);
    } else {
      // Find any super admin
      const superAdmin = db.prepare(`SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1`).get() as { id: number } | null;
      if (!superAdmin) {
        console.log("⚠️  No SUPER_ADMIN user found. Please create one first:");
        console.log("   bun run create-admin <email> <password>");
        db.run("ROLLBACK");
        return;
      }
      ownerId = superAdmin.id;
      console.log(`Using super admin as owner (id: ${superAdmin.id})`);
    }

    // 3. Get or create point template
    let pointTemplate = db.prepare(`SELECT id FROM point_templates WHERE name = 'Standard Tour Points'`).get() as { id: number } | null;
    if (!pointTemplate) {
      pointTemplate = db.prepare(`
        INSERT INTO point_templates (name, points_structure, created_by)
        VALUES (?, ?, ?)
        RETURNING id
      `).get(
        "Standard Tour Points",
        JSON.stringify({ "1": 100, "2": 80, "3": 65, "4": 55, "5": 50, "6": 45, "7": 40, "8": 36, "9": 32, "10": 29, "default": 5 }),
        ownerId
      ) as { id: number };
    }

    // 4. Create Landeryd Mixed Tour with scoring_mode = 'both'
    console.log("\nCreating Landeryd Mixed Tour...");
    const tour = db.prepare(`
      INSERT INTO tours (name, description, owner_id, enrollment_mode, visibility, point_template_id, banner_image_url, scoring_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).get(
      "Landeryd Mixed Tour 2025",
      "Mixed tour with separate Men's and Women's categories. Both gross and net scores tracked. Alternating between Landeryd Classic and Landeryd Masters.",
      ownerId,
      "closed",
      "public",
      pointTemplate.id,
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=1200",
      "both"  // Gross and Net scoring
    ) as { id: number };
    console.log(`  ✓ Tour created (id: ${tour.id}) with scoring_mode: both`);

    // 6. Create categories
    console.log("\nCreating categories...");
    const mensCategory = db.prepare(`
      INSERT INTO tour_categories (tour_id, name, description, sort_order)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).get(tour.id, "Mens", "Men's division", 0) as { id: number };
    console.log(`  ✓ Mens category created (id: ${mensCategory.id})`);

    const womensCategory = db.prepare(`
      INSERT INTO tour_categories (tour_id, name, description, sort_order)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).get(tour.id, "Womens", "Women's division", 1) as { id: number };
    console.log(`  ✓ Womens category created (id: ${womensCategory.id})`);

    // 7. Create tour landing document
    const landingDoc = db.prepare(`
      INSERT INTO tour_documents (title, content, type, tour_id)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).get(
      "Welcome to Landeryd Mixed Tour 2025",
      `# Landeryd Mixed Tour 2025

Welcome to the Landeryd Mixed Tour! A unique competition featuring both men's and women's divisions.

## Format

- **Scoring**: Both Gross and Net scores tracked
- **Categories**: Separate standings for Men and Women
- **Courses**: Alternating weekly between Landeryd Classic and Landeryd Masters
- **Period**: November 2025 through April 2026

## Schedule

| Round | Course | Dates |
|-------|--------|-------|
| Round 1 | Landeryd Classic | Nov 3 - Nov 16 |
| Round 2 | Landeryd Masters | Nov 17 - Nov 30 |
| Round 3 | Landeryd Classic | Dec 1 - Dec 14 |
| Round 4 | Landeryd Masters | Dec 15 - Dec 28 |
| Round 5 | Landeryd Classic | Dec 29 - Jan 11 |
| Round 6 | Landeryd Masters | Jan 12 - Jan 25 |
| Round 7 | Landeryd Classic | Jan 26 - Feb 8 |
| Round 8 | Landeryd Masters | Feb 9 - Feb 22 |
| Round 9 | Landeryd Classic | Feb 23 - Mar 8 |
| Round 10 | Landeryd Masters | Mar 9 - Mar 22 |
| Round 11 | Landeryd Classic | Mar 23 - Apr 5 |
| Round 12 | Landeryd Masters | Apr 6 - Apr 19 |

## Standings

Results are calculated separately for:
- **Overall** - All players combined
- **Mens** - Men's division only
- **Womens** - Women's division only

Both **Gross** and **Net** scores are tracked for handicap-adjusted competition.

Good luck! ⛳`,
      "landing",
      tour.id
    ) as { id: number };
    db.prepare(`UPDATE tours SET landing_document_id = ? WHERE id = ?`).run(landingDoc.id, tour.id);
    console.log(`  ✓ Landing document created`);

    // 8. Create or get team
    let team = db.prepare(`SELECT id FROM teams WHERE name = ?`).get("Individual Players") as { id: number } | null;
    if (!team) {
      team = db.prepare(`INSERT INTO teams (name) VALUES (?) RETURNING id`).get("Individual Players") as { id: number };
    }

    // 9. Create players - 10 men and 10 women
    console.log("\nCreating/enrolling players...");
    const landerydPlayers: { id: number; name: string; handicap: number; categoryId: number; isRealUser: boolean }[] = [];

    // Men's names
    const menFirstNames = ["Erik", "Johan", "Anders", "Lars", "Magnus", "Henrik", "Per", "Fredrik", "Karl", "Mikael"];
    const menLastNames = ["Lindberg", "Bergström", "Holmgren", "Ekberg", "Sjöström", "Wallén", "Norberg", "Åsberg", "Eklund", "Blomqvist"];

    // Women's names
    const womenFirstNames = ["Anna", "Maria", "Eva", "Karin", "Sara", "Emma", "Linda", "Sofia", "Elin", "Hanna"];
    const womenLastNames = ["Lindqvist", "Bergman", "Nyström", "Holmberg", "Ekström", "Sjöberg", "Wallin", "Engström", "Nordin", "Lundqvist"];

    // First, enroll the real user in Men's category
    if (realUser) {
      let realPlayer = db.prepare(`SELECT id, name, handicap FROM players WHERE user_id = ?`).get(realUser.id) as { id: number; name: string; handicap: number } | null;
      if (!realPlayer) {
        realPlayer = db.prepare(`
          INSERT INTO players (name, handicap, user_id, created_by)
          VALUES (?, ?, ?, ?)
          RETURNING id, name, handicap
        `).get("Marcus Andersson", 15, realUser.id, ownerId) as { id: number; name: string; handicap: number };
      }
      landerydPlayers.push({ id: realPlayer.id, name: realPlayer.name, handicap: realPlayer.handicap, categoryId: mensCategory.id, isRealUser: true });

      db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status, category_id)
        VALUES (?, ?, ?, 'active', ?)
      `).run(tour.id, realPlayer.id, "marcus.andersson1975@gmail.com", mensCategory.id);
      console.log(`  ✓ Enrolled real user: ${realPlayer.name} (Mens)`);
    }

    // Create 10 men
    for (let i = 0; i < 10; i++) {
      const firstName = menFirstNames[i];
      const lastName = menLastNames[i];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@landeryd.se`;
      const handicap = Math.floor(Math.random() * 20) + 5; // 5-24

      const password = await Bun.password.hash("landeryd123", "bcrypt");
      const user = db.prepare(`
        INSERT INTO users (email, password_hash, role)
        VALUES (?, ?, ?)
        RETURNING id
      `).get(email, password, "PLAYER") as { id: number };

      const player = db.prepare(`
        INSERT INTO players (name, handicap, user_id, created_by)
        VALUES (?, ?, ?, ?)
        RETURNING id
      `).get(name, handicap, user.id, ownerId) as { id: number };

      landerydPlayers.push({ id: player.id, name, handicap, categoryId: mensCategory.id, isRealUser: false });

      db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status, category_id)
        VALUES (?, ?, ?, 'active', ?)
      `).run(tour.id, player.id, email, mensCategory.id);
    }
    console.log(`  ✓ Created 10 men enrolled in Mens category`);

    // Create 10 women
    for (let i = 0; i < 10; i++) {
      const firstName = womenFirstNames[i];
      const lastName = womenLastNames[i];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@landeryd.se`;
      const handicap = Math.floor(Math.random() * 25) + 8; // 8-32

      const password = await Bun.password.hash("landeryd123", "bcrypt");
      const user = db.prepare(`
        INSERT INTO users (email, password_hash, role)
        VALUES (?, ?, ?)
        RETURNING id
      `).get(email, password, "PLAYER") as { id: number };

      const player = db.prepare(`
        INSERT INTO players (name, handicap, user_id, created_by)
        VALUES (?, ?, ?, ?)
        RETURNING id
      `).get(name, handicap, user.id, ownerId) as { id: number };

      landerydPlayers.push({ id: player.id, name, handicap, categoryId: womensCategory.id, isRealUser: false });

      db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status, category_id)
        VALUES (?, ?, ?, 'active', ?)
      `).run(tour.id, player.id, email, womensCategory.id);
    }
    console.log(`  ✓ Created 10 women enrolled in Womens category`);
    console.log(`  Total: ${landerydPlayers.length} enrolled players`);

    // 10. Create competitions (12 rounds, alternating courses)
    console.log("\nCreating competitions...");

    const schedule = [
      { round: 1, start: "2025-11-03", end: "2025-11-16", status: "completed", course: classicCourse },
      { round: 2, start: "2025-11-17", end: "2025-11-30", status: "completed", course: mastersCourse },
      { round: 3, start: "2025-12-01", end: "2025-12-14", status: "completed", course: classicCourse },
      { round: 4, start: "2025-12-15", end: "2025-12-28", status: "current", course: mastersCourse },
      { round: 5, start: "2025-12-29", end: "2026-01-11", status: "future", course: classicCourse },
      { round: 6, start: "2026-01-12", end: "2026-01-25", status: "future", course: mastersCourse },
      { round: 7, start: "2026-01-26", end: "2026-02-08", status: "future", course: classicCourse },
      { round: 8, start: "2026-02-09", end: "2026-02-22", status: "future", course: mastersCourse },
      { round: 9, start: "2026-02-23", end: "2026-03-08", status: "future", course: classicCourse },
      { round: 10, start: "2026-03-09", end: "2026-03-22", status: "future", course: mastersCourse },
      { round: 11, start: "2026-03-23", end: "2026-04-05", status: "future", course: classicCourse },
      { round: 12, start: "2026-04-06", end: "2026-04-19", status: "future", course: mastersCourse },
    ];

    const competitions: { id: number; round: number; status: string; courseName: string }[] = [];

    for (const comp of schedule) {
      const competition = db.prepare(`
        INSERT INTO competitions (name, date, course_id, tour_id, start_mode, open_start, open_end)
        VALUES (?, ?, ?, ?, 'open', ?, ?)
        RETURNING id
      `).get(
        `Round ${comp.round} - ${comp.course.name}`,
        comp.start,
        comp.course.id,
        tour.id,
        comp.start,
        comp.end
      ) as { id: number };

      competitions.push({ id: competition.id, round: comp.round, status: comp.status, courseName: comp.course.name });
    }
    console.log(`  ✓ Created ${competitions.length} competitions (alternating courses)`);

    // 11. Add results for completed competitions
    console.log("\nAdding results...");

    for (const competition of competitions) {
      if (competition.status === "completed") {
        for (const player of landerydPlayers) {
          const teeTime = db.prepare(`
            INSERT INTO tee_times (teetime, competition_id, start_hole)
            VALUES (?, ?, 1)
            RETURNING id
          `).get("10:00", competition.id) as { id: number };

          const scores = generateScore(player.handicap);
          db.prepare(`
            INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score, is_locked)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          `).run(1, team.id, teeTime.id, "Individual", player.id, player.name, JSON.stringify(scores));
        }
        console.log(`  ✓ Round ${competition.round} (${competition.courseName}): All ${landerydPlayers.length} players completed`);

      } else if (competition.status === "current") {
        const playedCount = Math.floor(landerydPlayers.length * 0.5); // 50% have played
        let playedSoFar = 0;

        for (const player of landerydPlayers) {
          if (player.isRealUser) {
            console.log(`  • ${player.name} (YOU): Not yet played - waiting for you!`);
            continue;
          }

          if (playedSoFar < playedCount - 1) {
            const teeTime = db.prepare(`
              INSERT INTO tee_times (teetime, competition_id, start_hole)
              VALUES (?, ?, 1)
              RETURNING id
            `).get("10:00", competition.id) as { id: number };

            const scores = generateScore(player.handicap);
            db.prepare(`
              INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_id, player_names, score, is_locked)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `).run(1, team.id, teeTime.id, "Individual", player.id, player.name, JSON.stringify(scores));
            playedSoFar++;
          }
        }
        console.log(`  ⏳ Round ${competition.round} (${competition.courseName}) CURRENT: ${playedSoFar}/${landerydPlayers.length} players have submitted`);
        console.log(`     Open until: 2025-12-28`);
      }
    }

    db.run("COMMIT");

    console.log("\n✅ Landeryd Mixed Tour seed data created successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Tour: ${tour.id} (Landeryd Mixed Tour 2025)`);
    console.log(`   - Scoring Mode: both (Gross + Net)`);
    console.log(`   - Categories: Mens (${mensCategory.id}), Womens (${womensCategory.id})`);
    console.log(`   - Courses: Landeryd Classic & Landeryd Masters (alternating)`);
    console.log(`   - Players: ${landerydPlayers.length} (11 men incl. you, 10 women)`);
    console.log(`   - Competitions: 12 rounds (2-week periods)`);
    console.log(`   - Completed: Rounds 1-3`);
    console.log(`   - Current: Round 4 (Dec 15-28) at Landeryd Masters - PLAY NOW!`);
    console.log(`   - Upcoming: Rounds 5-12`);
    console.log("\n🔑 Your enrollment:");
    console.log("   Email: marcus.andersson1975@gmail.com");
    console.log("   Category: Mens");
    console.log("   Status: Active - ready to play Round 4!");

  } catch (error) {
    db.run("ROLLBACK");
    console.error("❌ Error seeding Landeryd tour:", error);
    throw error;
  } finally {
    db.close();
  }
}

// Run if executed directly
async function main() {
  // Only run Landeryd Mixed Tour for production
  await seedLanderydTour();
}

main().catch(console.error);
