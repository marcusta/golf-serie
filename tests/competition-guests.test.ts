import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { CompetitionGuestService } from "../src/services/competition-guest-service";

describe("CompetitionGuestService", () => {
  let db: Database;
  let service: CompetitionGuestService;
  let competitionId: number;

  const createCompetition = (): number => {
    const course = db
      .prepare(`INSERT INTO courses (name, pars) VALUES (?, ?) RETURNING *`)
      .get("Course", JSON.stringify(new Array(18).fill(4))) as { id: number };
    const comp = db
      .prepare(
        `INSERT INTO competitions (name, date, course_id) VALUES (?, ?, ?) RETURNING *`
      )
      .get("Comp", "2026-01-01", course.id) as { id: number };
    return comp.id;
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    service = new CompetitionGuestService(db);
    competitionId = createCompetition();
  });

  afterEach(() => {
    db.close();
  });

  test("creates a guest with handicap and lists it", () => {
    const guest = service.create(competitionId, {
      name: "Jane Doe",
      handicap_index: 12.4,
    });
    expect(guest.name).toBe("Jane Doe");
    expect(guest.handicap_index).toBe(12.4);

    const all = service.findAllForCompetition(competitionId);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(guest.id);
  });

  test("allows a guest with no handicap", () => {
    const guest = service.create(competitionId, { name: "No HCP" });
    expect(guest.handicap_index).toBeNull();
  });

  test("rejects empty name", () => {
    expect(() => service.create(competitionId, { name: "  " })).toThrow(
      "Guest name is required"
    );
  });

  test("rejects duplicate name (case-insensitive) in same competition", () => {
    service.create(competitionId, { name: "Jane Doe" });
    expect(() =>
      service.create(competitionId, { name: "jane doe" })
    ).toThrow("already exists");
  });

  test("rejects non-existent competition", () => {
    expect(() => service.create(99999, { name: "X" })).toThrow(
      "Competition not found"
    );
  });

  test("deletes a guest", () => {
    const guest = service.create(competitionId, { name: "Temp" });
    service.delete(guest.id);
    expect(service.findAllForCompetition(competitionId)).toHaveLength(0);
  });
});
