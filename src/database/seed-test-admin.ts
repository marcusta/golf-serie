/**
 * Test Admin Seed
 *
 * Creates a regular ADMIN user and makes them an admin of the Landeryd Mixed Tour 2025.
 * Used for testing role-based navigation in the admin UI.
 *
 * Run with: bun run src/database/seed-test-admin.ts
 */

import { createDatabase, initializeDatabase } from "./db";

async function seedTestAdmin() {
  console.log("Creating test admin user...\n");

  const db = createDatabase();
  await initializeDatabase(db);

  try {
    // Check if user already exists
    const existingUser = db.prepare(`SELECT id FROM users WHERE email = ?`).get("test-admin@example.com") as { id: number } | null;

    if (existingUser) {
      console.log("User test-admin@example.com already exists (id: " + existingUser.id + ")");
      console.log("Checking tour_admins...");

      const existingAdmin = db.prepare(`
        SELECT ta.id, t.name as tour_name
        FROM tour_admins ta
        JOIN tours t ON ta.tour_id = t.id
        WHERE ta.user_id = ?
      `).all(existingUser.id);

      if (existingAdmin.length > 0) {
        console.log("Already admin of tours:", existingAdmin);
      }

      db.close();
      return;
    }

    // Find the Landeryd Mixed Tour 2025
    const tour = db.prepare(`SELECT id, name FROM tours WHERE name LIKE '%Landeryd%'`).get() as { id: number; name: string } | null;

    if (!tour) {
      console.error("Could not find Landeryd Mixed Tour 2025!");
      db.close();
      return;
    }
    console.log(`Found tour: ${tour.name} (id: ${tour.id})`);

    // Create new ADMIN user (not SUPER_ADMIN)
    const password = await Bun.password.hash("admin123", "bcrypt");
    const user = db.prepare(`
      INSERT INTO users (email, password_hash, role)
      VALUES (?, ?, ?)
      RETURNING id
    `).get("test-admin@example.com", password, "ADMIN") as { id: number };

    console.log(`Created ADMIN user: test-admin@example.com (id: ${user.id})`);

    // Add user as tour admin
    db.prepare(`
      INSERT INTO tour_admins (tour_id, user_id)
      VALUES (?, ?)
    `).run(tour.id, user.id);

    console.log(`Added as admin of: ${tour.name}`);

    console.log("\n Login credentials:");
    console.log("   Email: test-admin@example.com");
    console.log("   Password: admin123");
    console.log("   Role: ADMIN (not SUPER_ADMIN)");
    console.log("\n This user should:");
    console.log("   - See only Series, Tours, Competitions tabs in admin nav");
    console.log("   - NOT see Teams, Courses, Points tabs");
    console.log("   - Have access to manage Landeryd Mixed Tour 2025");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    db.close();
  }
}

seedTestAdmin().catch(console.error);
