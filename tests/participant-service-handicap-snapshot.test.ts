import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { ParticipantService } from "../src/services/participant-service";

describe("ParticipantService handicap snapshots", () => {
  let db: Database;
  let service: ParticipantService;

  beforeEach(async () => {
    db = await createTestDatabase();
    service = new ParticipantService(db);
  });

  afterEach(() => {
    db.close();
  });

  const createUser = (email: string) =>
    db.prepare(
      `INSERT INTO users (email, password_hash, role) VALUES (?, 'hash123', 'ADMIN') RETURNING *`
    ).get(email) as { id: number };

  const createTour = (ownerId: number) =>
    db.prepare(
      `INSERT INTO tours (name, owner_id, enrollment_mode, visibility, scoring_mode)
       VALUES ('Tour', ?, 'closed', 'public', 'net')
       RETURNING *`
    ).get(ownerId) as { id: number };

  const createCourse = () =>
    db.prepare(
      `INSERT INTO courses (name, pars, stroke_index)
       VALUES ('Course', ?, ?)
       RETURNING *`
    ).get(
      JSON.stringify(Array(18).fill(4)),
      JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
    ) as { id: number };

  const createCompetition = (courseId: number, tourId: number) =>
    db.prepare(
      `INSERT INTO competitions (name, date, course_id, tour_id)
       VALUES ('Competition', '2024-01-01', ?, ?)
       RETURNING *`
    ).get(courseId, tourId) as { id: number };

  const createTeeTime = (competitionId: number) =>
    db.prepare(
      `INSERT INTO tee_times (competition_id, teetime, start_hole)
       VALUES (?, '09:00', 1)
       RETURNING *`
    ).get(competitionId) as { id: number };

  const createTeam = () =>
    db.prepare(`INSERT INTO teams (name) VALUES ('Team') RETURNING *`).get() as { id: number };

  test("captures manual-score snapshot from tour enrollment handicap for player participant", async () => {
    const owner = createUser("owner@test.com");
    const tour = createTour(owner.id);
    const course = createCourse();
    const competition = createCompetition(course.id, tour.id);
    const teeTime = createTeeTime(competition.id);
    const team = createTeam();

    const player = db.prepare(
      `INSERT INTO players (name, handicap) VALUES ('Player', 18.4) RETURNING *`
    ).get() as { id: number };

    db.prepare(
      `INSERT INTO tour_enrollments (tour_id, player_id, email, status, playing_handicap)
       VALUES (?, ?, 'player@test.com', 'active', 15.2)`
    ).run(tour.id, player.id);

    const participant = await service.create({
      tee_order: 1,
      team_id: team.id,
      tee_time_id: teeTime.id,
      position_name: "Player",
      player_id: player.id,
    });

    const updated = await service.updateManualScore(participant.id, { total: 84 });
    expect(updated.handicap_index).toBe(15.2);
  });

  test("captures admin-score snapshot from matching name-only enrollment", async () => {
    const owner = createUser("owner@test.com");
    const admin = createUser("admin@test.com");
    const tour = createTour(owner.id);
    const course = createCourse();
    const competition = createCompetition(course.id, tour.id);
    const teeTime = createTeeTime(competition.id);
    const team = createTeam();

    db.prepare(
      `INSERT INTO tour_enrollments (tour_id, player_id, email, name, status, playing_handicap)
       VALUES (?, NULL, 'name-only@test.com', 'Name Only Player', 'active', 17.2)`
    ).run(tour.id);

    const participant = await service.create({
      tee_order: 1,
      team_id: team.id,
      tee_time_id: teeTime.id,
      position_name: "Name Only Player",
      player_names: "Name Only Player",
    });

    const updated = await service.adminUpdateScore(
      participant.id,
      Array(18).fill(4),
      "Imported by admin",
      admin.id
    );

    expect(updated.handicap_index).toBe(17.2);
  });
});
