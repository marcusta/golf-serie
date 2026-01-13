/**
 * Player Gender Seed Script
 *
 * Updates gender for existing players based on Swedish name patterns.
 * Uses common Swedish first names to infer gender.
 *
 * Run with: bun run src/database/seed-player-genders.ts
 */

import { createDatabase, initializeDatabase } from "./db";

// Common Swedish male first names
const maleNames = [
  "Marcus", "Erik", "Johan", "Anders", "Lars", "Olof", "Sven", "Magnus",
  "Henrik", "Per", "Fredrik", "Karl", "Mikael", "Niklas", "Peter", "Jonas",
  "Daniel", "Gustav", "Oscar", "Viktor", "Axel", "Emil", "Rasmus", "Adam",
  "Simon", "Björn", "Mats", "Thomas", "Bengt", "Göran", "Lennart", "Stefan",
  "Christer", "Jan", "Bo", "Leif", "Ulf", "Kjell", "Rolf", "Kent", "Tommy",
  "Ronnie", "Patrik", "Andreas", "Mattias", "Tobias", "Sebastian", "Alexander",
  "William", "Lucas", "Oliver", "Hugo", "Elias", "Anton", "Filip", "Leo",
  "Carl", "David", "Hans", "Jakob", "Linus", "Nils",
];

// Common Swedish female first names
const femaleNames = [
  "Anna", "Maria", "Karin", "Eva", "Lisa", "Ingrid", "Kristina", "Birgitta",
  "Lena", "Emma", "Sofia", "Sara", "Helena", "Åsa", "Annika", "Marie", "Elin",
  "Camilla", "Jenny", "Linda", "Malin", "Susanne", "Cecilia", "Jessica", "Monica",
  "Margareta", "Elisabet", "Agneta", "Christina", "Marianne", "Berit", "Ann",
  "Barbro", "Ulla", "Gunilla", "Inger", "Kerstin", "Gunnel", "Britt", "Maja",
  "Alice", "Alicia", "Olivia", "Elsa", "Ebba", "Wilma", "Ella", "Stella",
  "Alma", "Astrid", "Saga", "Freja", "Signe", "Vera", "Klara", "Nellie",
  "Greta", "Ida", "Hanna",
];

async function seedPlayerGenders() {
  console.log("🏌️ Updating player genders based on Swedish name patterns...\n");

  const dbPath = process.env.DB_PATH || "golf_series.db";
  const db = createDatabase(dbPath);
  await initializeDatabase(db);

  try {
    // Get all players
    const players = db.prepare("SELECT id, name, gender FROM players").all() as Array<{
      id: number;
      name: string;
      gender: string | null;
    }>;

    console.log(`Found ${players.length} players\n`);

    let maleCount = 0;
    let femaleCount = 0;
    let unknownCount = 0;
    let alreadySetCount = 0;

    db.run("BEGIN TRANSACTION");

    for (const player of players) {
      // Skip if gender already set
      if (player.gender) {
        alreadySetCount++;
        console.log(`  ✓ ${player.name} - already has gender: ${player.gender}`);
        continue;
      }

      // Extract first name
      const firstName = player.name.split(" ")[0];

      // Determine gender based on first name
      let gender: "male" | "female" | null = null;

      if (maleNames.includes(firstName)) {
        gender = "male";
        maleCount++;
      } else if (femaleNames.includes(firstName)) {
        gender = "female";
        femaleCount++;
      } else {
        unknownCount++;
        console.log(`  ? ${player.name} - unknown first name: ${firstName}`);
        continue;
      }

      // Update player gender
      db.prepare(`
        UPDATE players
        SET gender = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(gender, player.id);

      console.log(`  ✓ ${player.name} - set to ${gender}`);
    }

    db.run("COMMIT");

    console.log("\n✅ Gender seeding complete!");
    console.log(`   - ${maleCount} players set to male`);
    console.log(`   - ${femaleCount} players set to female`);
    console.log(`   - ${alreadySetCount} players already had gender set`);
    console.log(`   - ${unknownCount} players with unknown names (not updated)\n`);

  } catch (error) {
    db.run("ROLLBACK");
    console.error("❌ Error seeding player genders:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the seed
seedPlayerGenders();
