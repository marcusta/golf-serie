import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  cleanupTestDatabase,
  expectJsonResponse,
  type MakeRequestFunction,
  setupTestDatabase,
} from "./test-helpers";
import { ParticipantService } from "../src/services/participant-service";
import { TourService } from "../src/services/tour.service";

// Course: 18 holes of par 4, stroke index 1..18, tee slope 113 / rating 72.
// With that tee the course handicap equals the rounded handicap index.
const PARS = Array(18).fill(4) as number[];
const STROKE_INDEX = Array.from({ length: 18 }, (_, i) => i + 1);

// Score arrays. Front-9 rounds leave holes 10-18 at 0 (not played).
const front9 = (strokes: number[]): number[] => [...strokes, ...Array(9).fill(0)];
const holes = (count: number, value: number): number[] => Array(count).fill(value);

describe("Doped handicap", () => {
  let db: Database;
  let makeRequest: MakeRequestFunction;
  let tourService: TourService;
  let participantService: ParticipantService;
  let teamCounter = 0;

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    makeRequest = setup.makeRequest;
    tourService = new TourService(db);
    participantService = new ParticipantService(db);
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  // ---------------------------------------------------------------------------
  // Fixtures
  // ---------------------------------------------------------------------------

  async function createOrganizer(email = "organizer@test.com"): Promise<number> {
    await makeRequest("/api/auth/register", "POST", { email, password: "password123" });
    db.prepare("UPDATE users SET role = 'ORGANIZER' WHERE email = ?").run(email);
    await makeRequest("/api/auth/login", "POST", { email, password: "password123" });
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number };
    return user.id;
  }

  function createCourse(): { courseId: number; teeId: number } {
    const course = db
      .prepare(`INSERT INTO courses (name, pars, stroke_index) VALUES ('Course', ?, ?) RETURNING id`)
      .get(JSON.stringify(PARS), JSON.stringify(STROKE_INDEX)) as { id: number };
    const tee = db
      .prepare(
        `INSERT INTO course_tees (course_id, name, course_rating, slope_rating)
         VALUES (?, 'Yellow', 72.0, 113) RETURNING id`
      )
      .get(course.id) as { id: number };
    return { courseId: course.id, teeId: tee.id };
  }

  function createTour(
    ownerId: number,
    options: { scoringFormat?: "stableford" | "stroke_play"; dopedEnabled?: boolean } = {}
  ): number {
    const tour = db
      .prepare(
        `INSERT INTO tours (name, owner_id, enrollment_mode, visibility, scoring_mode, scoring_format, doped_handicap_enabled)
         VALUES ('Tour', ?, 'closed', 'public', 'net', ?, ?) RETURNING id`
      )
      .get(ownerId, options.scoringFormat ?? "stableford", options.dopedEnabled === false ? 0 : 1) as {
      id: number;
    };
    return tour.id;
  }

  function createPlayer(name: string, tourId: number, handicap: number): number {
    const player = db
      .prepare(`INSERT INTO players (name, handicap) VALUES (?, ?) RETURNING id`)
      .get(name, handicap) as { id: number };
    db.prepare(
      `INSERT INTO tour_enrollments (tour_id, player_id, email, status, playing_handicap)
       VALUES (?, ?, ?, 'active', ?)`
    ).run(tourId, player.id, `${name.toLowerCase()}@test.com`, handicap);
    return player.id;
  }

  function createCompetition(
    tourId: number,
    course: { courseId: number; teeId: number },
    options: {
      name?: string;
      date?: string;
      roundType?: "full_18" | "front_9" | "back_9";
      scoringFormat?: "stableford" | "stroke_play" | null;
      useDoped?: boolean;
      exclude?: boolean;
      handicapMode?: "whs" | "exact";
      allowance?: number;
      ownerId?: number;
    } = {}
  ): number {
    const competition = db
      .prepare(
        `INSERT INTO competitions
           (name, date, course_id, tour_id, tee_id, round_type, scoring_format,
            use_doped_handicap, exclude_from_doped_handicap, handicap_mode, handicap_allowance, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .get(
        options.name ?? "Round",
        options.date ?? "2024-05-01",
        course.courseId,
        tourId,
        course.teeId,
        options.roundType ?? "front_9",
        options.scoringFormat ?? null,
        options.useDoped ? 1 : 0,
        options.exclude ? 1 : 0,
        options.handicapMode ?? "whs",
        options.allowance ?? 100,
        options.ownerId ?? null
      ) as { id: number };
    db.prepare(`INSERT INTO tee_times (competition_id, teetime, start_hole) VALUES (?, '09:00', 1)`).run(
      competition.id
    );
    return competition.id;
  }

  function addParticipant(
    competitionId: number,
    playerId: number | null,
    options: {
      score?: number[];
      handicapIndex?: number | null;
      dopedHandicap?: number | null;
      locked?: boolean;
      name?: string;
    } = {}
  ): number {
    const teeTime = db
      .prepare(`SELECT id FROM tee_times WHERE competition_id = ? ORDER BY id LIMIT 1`)
      .get(competitionId) as { id: number };
    const team = db
      .prepare(`INSERT INTO teams (name) VALUES (?) RETURNING id`)
      .get(`Team ${++teamCounter}`) as { id: number };
    const participant = db
      .prepare(
        `INSERT INTO participants
           (tee_order, team_id, tee_time_id, position_name, player_names, player_id, score, is_locked, handicap_index, doped_handicap)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .get(
        team.id,
        teeTime.id,
        options.name ?? "Player",
        options.name ?? null,
        playerId,
        JSON.stringify(options.score ?? []),
        options.locked === false ? 0 : 1,
        options.handicapIndex === undefined ? 0 : options.handicapIndex,
        options.dopedHandicap ?? null
      ) as { id: number };
    return participant.id;
  }

  // Finished round in a competition, played to the given per-hole strokes
  function playRound(
    competitionId: number,
    playerId: number,
    score: number[],
    options: { handicapIndex?: number; locked?: boolean } = {}
  ): number {
    return addParticipant(competitionId, playerId, {
      score,
      handicapIndex: options.handicapIndex ?? 0,
      locked: options.locked,
    });
  }

  // ---------------------------------------------------------------------------
  // Calculation
  // ---------------------------------------------------------------------------

  describe("calculation", () => {
    test("9-hole stableford: shortfall is scaled to 18 holes", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 0);

      // 7 bogeys and 2 pars with handicap 0 = 11 net points on 9 holes
      const competitionId = createCompetition(tourId, course, { roundType: "front_9" });
      playRound(competitionId, playerId, front9([...holes(7, 5), ...holes(2, 4)]));

      const summary = tourService.getDopedHandicaps(tourId).get(playerId)!;
      expect(summary.rounds_counted).toBe(1);
      expect(summary.rounds[0].holes).toBe(9);
      expect(summary.rounds[0].net_stableford_points).toBe(11);
      expect(summary.rounds[0].shortfall).toBe(14);
      expect(summary.doped_handicap).toBe(14);
    });

    test("net stableford points use the frozen handicap_index", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 9);

      // Handicap 9 gives one stroke on each of stroke index 1-9 (holes 1-9).
      // All bogeys on the front nine then score 18 net points: shortfall 0.
      const competitionId = createCompetition(tourId, course, { roundType: "front_9" });
      playRound(competitionId, playerId, front9(holes(9, 5)), { handicapIndex: 9 });

      const summary = tourService.getDopedHandicaps(tourId).get(playerId)!;
      expect(summary.rounds[0].net_stableford_points).toBe(18);
      expect(summary.doped_handicap).toBe(0);
    });

    test("mixed 9 and 18 hole rounds: mean of scaled shortfalls", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 0);

      // 9 holes: 11 points -> shortfall 14
      const nine = createCompetition(tourId, course, { roundType: "front_9", date: "2024-05-01" });
      playRound(nine, playerId, front9([...holes(7, 5), ...holes(2, 4)]));
      // 18 holes: 5 bogeys, 13 pars -> 31 points -> shortfall 5
      const eighteen = createCompetition(tourId, course, { roundType: "full_18", date: "2024-05-08" });
      playRound(eighteen, playerId, [...holes(5, 5), ...holes(13, 4)]);

      const summary = tourService.getDopedHandicaps(tourId).get(playerId)!;
      expect(summary.rounds_counted).toBe(2);
      expect(summary.rounds.map((r) => r.shortfall).sort()).toEqual([14, 5].sort());
      expect(summary.doped_handicap).toBe(9.5);
    });

    test("rounding: mean is rounded to one decimal after averaging", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 0);

      // Shortfalls 14, 5 and 6 -> 25 / 3 = 8.333 -> 8.3
      const a = createCompetition(tourId, course, { roundType: "front_9", date: "2024-05-01" });
      playRound(a, playerId, front9([...holes(7, 5), ...holes(2, 4)]));
      const b = createCompetition(tourId, course, { roundType: "full_18", date: "2024-05-08" });
      playRound(b, playerId, [...holes(5, 5), ...holes(13, 4)]);
      const c = createCompetition(tourId, course, { roundType: "full_18", date: "2024-05-15" });
      playRound(c, playerId, [...holes(6, 5), ...holes(12, 4)]);

      expect(tourService.getDopedHandicaps(tourId).get(playerId)!.doped_handicap).toBe(8.3);
    });

    test("stroke-play round falls back to net relative to par", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId, { scoringFormat: "stroke_play" });
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 0);

      // 9 holes, +5 net -> shortfall 10
      const competitionId = createCompetition(tourId, course, {
        roundType: "front_9",
        scoringFormat: "stroke_play",
      });
      playRound(competitionId, playerId, front9([...holes(5, 5), ...holes(4, 4)]));

      const summary = tourService.getDopedHandicaps(tourId).get(playerId)!;
      expect(summary.rounds[0].net_stableford_points).toBeNull();
      expect(summary.rounds[0].net_relative_to_par).toBe(5);
      expect(summary.rounds[0].shortfall).toBe(10);
      expect(summary.doped_handicap).toBe(10);
    });

    test("excluded competitions do not count", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 0);

      const counted = createCompetition(tourId, course, { date: "2024-05-01" });
      playRound(counted, playerId, front9([...holes(7, 5), ...holes(2, 4)]));
      const excluded = createCompetition(tourId, course, { date: "2024-05-08", exclude: true });
      playRound(excluded, playerId, front9(holes(9, 6)));

      const summary = tourService.getDopedHandicaps(tourId).get(playerId)!;
      expect(summary.rounds_counted).toBe(1);
      expect(summary.rounds[0].competition_id).toBe(counted);
      expect(summary.doped_handicap).toBe(14);
    });

    test("negative value when the player beats net par", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 0);

      // All birdies on 9 holes = 27 points -> (18 - 27) * 2 = -18
      const competitionId = createCompetition(tourId, course, { roundType: "front_9" });
      playRound(competitionId, playerId, front9(holes(9, 3)));

      expect(tourService.getDopedHandicaps(tourId).get(playerId)!.doped_handicap).toBe(-18);
    });

    test("unfinished rounds are not counted", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 0);

      const competitionId = createCompetition(tourId, course, { roundType: "front_9" });
      // Four holes played, scorecard not locked
      playRound(competitionId, playerId, [...holes(4, 5), ...holes(14, 0)], { locked: false });

      expect(tourService.getDopedHandicaps(tourId).get(playerId)).toBeUndefined();
    });

    test("stored net results from finalized competitions are used", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const playerId = createPlayer("Anna", tourId, 0);

      const competitionId = createCompetition(tourId, course, { roundType: "front_9" });
      // Live calculation would give 11 points; the stored row says 12
      const participantId = playRound(competitionId, playerId, front9([...holes(7, 5), ...holes(2, 4)]));
      db.prepare(
        `INSERT INTO competition_results
           (competition_id, participant_id, player_id, scoring_type, position, points, relative_to_par, stableford_points)
         VALUES (?, ?, ?, 'net', 1, 10, 6, 12)`
      ).run(competitionId, participantId, playerId);
      db.prepare(`UPDATE competitions SET is_results_final = 1 WHERE id = ?`).run(competitionId);

      const summary = tourService.getDopedHandicaps(tourId).get(playerId)!;
      expect(summary.rounds[0].net_stableford_points).toBe(12);
      expect(summary.rounds[0].is_projected).toBe(false);
      expect(summary.doped_handicap).toBe(12);
    });

    test("standings carry doped_handicap when the tour flag is on, 0 with no rounds", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const bertil = createPlayer("Bertil", tourId, 0);

      const counted = createCompetition(tourId, course, { date: "2024-05-01" });
      playRound(counted, anna, front9([...holes(7, 5), ...holes(2, 4)]));
      // Bertil only played an excluded round: in standings, but no doped rounds
      const excluded = createCompetition(tourId, course, { date: "2024-05-08", exclude: true });
      playRound(excluded, bertil, front9(holes(9, 5)));

      const response = await makeRequest(`/api/tours/${tourId}/standings`);
      const standings = await expectJsonResponse(response);
      const annaStanding = standings.player_standings.find((s: { player_id: number }) => s.player_id === anna);
      const bertilStanding = standings.player_standings.find((s: { player_id: number }) => s.player_id === bertil);
      expect(annaStanding.doped_handicap).toBe(14);
      expect(annaStanding.doped_handicap_rounds).toBe(1);
      expect(bertilStanding.doped_handicap).toBe(0);
      expect(bertilStanding.doped_handicap_rounds).toBe(0);
    });

    test("standings omit doped fields when the tour flag is off", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId, { dopedEnabled: false });
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const competitionId = createCompetition(tourId, course);
      playRound(competitionId, anna, front9(holes(9, 5)));

      const standings = await expectJsonResponse(await makeRequest(`/api/tours/${tourId}/standings`));
      expect(standings.player_standings[0].doped_handicap).toBeUndefined();
    });

    test("GET /api/tours/:id/doped-handicaps returns players sorted by value desc", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const bertil = createPlayer("Bertil", tourId, 0);
      const competitionId = createCompetition(tourId, course);
      playRound(competitionId, anna, front9(holes(9, 4)));
      playRound(competitionId, bertil, front9(holes(9, 5)));

      const list = await expectJsonResponse(await makeRequest(`/api/tours/${tourId}/doped-handicaps`));
      expect(list.map((s: { player_id: number }) => s.player_id)).toEqual([bertil, anna]);
      expect(list[0]).toMatchObject({ player_name: "Bertil", doped_handicap: 18, rounds_counted: 1 });
      expect(list[1]).toMatchObject({ player_name: "Anna", doped_handicap: 0, rounds_counted: 1 });
    });
  });

  // ---------------------------------------------------------------------------
  // Tour and competition flags
  // ---------------------------------------------------------------------------

  describe("flags", () => {
    test("tour create and update persist doped_handicap_enabled as a boolean", async () => {
      await createOrganizer();
      const created = await expectJsonResponse(
        await makeRequest("/api/tours", "POST", { name: "T", doped_handicap_enabled: true })
      );
      expect(created.doped_handicap_enabled).toBe(true);

      const updated = await expectJsonResponse(
        await makeRequest(`/api/tours/${created.id}`, "PUT", { doped_handicap_enabled: false })
      );
      expect(updated.doped_handicap_enabled).toBe(false);

      const invalid = await makeRequest(`/api/tours/${created.id}`, "PUT", { doped_handicap_enabled: "yes" });
      expect(invalid.status).toBe(400);
    });

    test("competition create and update persist the two doped flags", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();

      const created = await expectJsonResponse(
        await makeRequest("/api/competitions", "POST", {
          name: "C",
          date: "2024-05-01",
          course_id: course.courseId,
          tour_id: tourId,
          use_doped_handicap: true,
        })
      );
      expect(created.use_doped_handicap).toBe(true);
      expect(created.exclude_from_doped_handicap).toBe(false);

      const updated = await expectJsonResponse(
        await makeRequest(`/api/competitions/${created.id}`, "PUT", {
          use_doped_handicap: false,
          exclude_from_doped_handicap: true,
        })
      );
      expect(updated.use_doped_handicap).toBe(false);
      expect(updated.exclude_from_doped_handicap).toBe(true);

      const fetched = await expectJsonResponse(await makeRequest(`/api/competitions/${created.id}`));
      expect(fetched.exclude_from_doped_handicap).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Freezing
  // ---------------------------------------------------------------------------

  describe("freeze", () => {
    test("endpoint sets NULL values only, force overwrites all", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const bertil = createPlayer("Bertil", tourId, 0);

      const earlier = createCompetition(tourId, course, { date: "2024-05-01" });
      playRound(earlier, anna, front9(holes(9, 5))); // 18
      playRound(earlier, bertil, front9(holes(9, 6))); // 36

      const sideBet = createCompetition(tourId, course, { date: "2024-05-08", useDoped: true });
      const annaParticipant = addParticipant(sideBet, anna);
      const bertilParticipant = addParticipant(sideBet, bertil, { dopedHandicap: 3 });

      const first = await expectJsonResponse(
        await makeRequest(`/api/competitions/${sideBet}/doped-handicaps/freeze`, "POST", {})
      );
      expect(first.updated).toBe(1);
      expect(first.participants).toEqual([
        { participant_id: annaParticipant, player_name: "Anna", doped_handicap: 18 },
        { participant_id: bertilParticipant, player_name: "Bertil", doped_handicap: 3 },
      ]);

      const forced = await expectJsonResponse(
        await makeRequest(`/api/competitions/${sideBet}/doped-handicaps/freeze`, "POST", { force: true })
      );
      expect(forced.updated).toBe(2);
      expect(forced.participants[1]).toEqual({
        participant_id: bertilParticipant,
        player_name: "Bertil",
        doped_handicap: 36,
      });

      const participants = await expectJsonResponse(
        await makeRequest(`/api/competitions/${sideBet}/participants`)
      );
      expect(participants.map((p: { doped_handicap: number | null }) => p.doped_handicap)).toEqual([18, 36]);
    });

    test("endpoint requires competition admin rights", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const competitionId = createCompetition(tourId, course, { useDoped: true });

      await makeRequest("/api/auth/logout", "POST");
      const anonymous = await makeRequest(`/api/competitions/${competitionId}/doped-handicaps/freeze`, "POST", {});
      expect(anonymous.status).toBe(401);
    });

    test("first score entry captures doped_handicap when use_doped_handicap is on", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);

      const earlier = createCompetition(tourId, course, { date: "2024-05-01" });
      playRound(earlier, anna, front9([...holes(7, 5), ...holes(2, 4)])); // 14

      const sideBet = createCompetition(tourId, course, { date: "2024-05-08", useDoped: true });
      const participantId = addParticipant(sideBet, anna, { handicapIndex: null, locked: false });

      const updated = await participantService.updateScore(participantId, 1, 5);
      expect(updated.doped_handicap).toBe(14);

      // A later score entry keeps the frozen value even when the calculation changes
      db.prepare(`UPDATE participants SET handicap_index = 0 WHERE id = ?`).run(participantId);
      const again = await participantService.updateScore(participantId, 2, 9);
      expect(again.doped_handicap).toBe(14);
    });

    test("first score entry leaves doped_handicap NULL when the flag is off", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const competitionId = createCompetition(tourId, course);
      const participantId = addParticipant(competitionId, anna, { handicapIndex: null, locked: false });

      const updated = await participantService.updateScore(participantId, 1, 5);
      expect(updated.doped_handicap).toBeNull();
    });

    test("admins can set doped_handicap through participant update", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const competitionId = createCompetition(tourId, course, { useDoped: true });
      const participantId = addParticipant(competitionId, anna);

      const updated = await expectJsonResponse(
        await makeRequest(`/api/participants/${participantId}`, "PUT", { doped_handicap: 7.5 })
      );
      expect(updated.doped_handicap).toBe(7.5);
    });

    test("participant update rejects non-finite handicap values", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const competitionId = createCompetition(tourId, course, { useDoped: true });
      const participantId = addParticipant(competitionId, anna);

      const asString = await makeRequest(`/api/participants/${participantId}`, "PUT", {
        doped_handicap: "7.5",
      });
      expect(asString.status).toBe(400);
      const nanIndex = await makeRequest(`/api/participants/${participantId}`, "PUT", {
        handicap_index: "abc",
      });
      expect(nanIndex.status).toBe(400);

      const cleared = await expectJsonResponse(
        await makeRequest(`/api/participants/${participantId}`, "PUT", { doped_handicap: null })
      );
      expect(cleared.doped_handicap).toBeNull();
    });

    test("anonymous callers can rename but not change handicap fields", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const competitionId = createCompetition(tourId, course, { useDoped: true });
      const participantId = addParticipant(competitionId, anna);
      await makeRequest("/api/auth/logout", "POST");

      const rename = await makeRequest(`/api/participants/${participantId}`, "PUT", {
        player_names: "Anna B",
      });
      expect(rename.status).toBe(200);

      const doped = await makeRequest(`/api/participants/${participantId}`, "PUT", {
        doped_handicap: 3,
      });
      expect(doped.status).toBe(401);
      const index = await makeRequest(`/api/participants/${participantId}`, "PUT", {
        handicap_index: 3,
      });
      expect(index.status).toBe(401);
    });

    test("a failing doped lookup does not lose the score entry", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const competitionId = createCompetition(tourId, course, { useDoped: true });
      const participantId = addParticipant(competitionId, anna, { handicapIndex: null, locked: false });

      const brokenTourService = (participantService as unknown as { tourService: TourService }).tourService;
      const original = brokenTourService.getDopedHandicaps.bind(brokenTourService);
      brokenTourService.getDopedHandicaps = () => {
        throw new Error("boom");
      };
      try {
        const updated = await participantService.updateScore(participantId, 1, 5);
        expect(updated.score[0]).toBe(5);
        expect(updated.doped_handicap).toBeNull();
      } finally {
        brokenTourService.getDopedHandicaps = original;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Doped leaderboard
  // ---------------------------------------------------------------------------

  describe("leaderboard", () => {
    test("whs: rounded doped strokes are added after allowance", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 10);

      // Handicap 10 at 50% allowance = 5 strokes, doped 5.4 rounds to 5: 10 in total.
      const competitionId = createCompetition(tourId, course, {
        roundType: "full_18",
        allowance: 50,
        useDoped: true,
      });
      addParticipant(competitionId, anna, {
        score: holes(18, 5),
        handicapIndex: 10,
        dopedHandicap: 5.4,
      });

      const doped = await expectJsonResponse(
        await makeRequest(`/api/competitions/${competitionId}/leaderboard/details?variant=doped`)
      );
      expect(doped.variant).toBe("doped");
      expect(doped.use_doped_handicap).toBe(true);
      expect(doped.exclude_from_doped_handicap).toBe(false);
      const entry = doped.entries[0];
      expect(entry.courseHandicap).toBe(10);
      expect(entry.doped_course_handicap).toBe(10);
      expect(entry.doped_handicap).toBe(5.4);
      expect(entry.netTotalShots).toBe(80);
      expect(entry.netRelativeToPar).toBe(8);
      // Stroke index 1-10 get one stroke each: 10 net pars and 8 bogeys
      expect(entry.netStablefordPoints).toBe(28);

      const normal = await expectJsonResponse(
        await makeRequest(`/api/competitions/${competitionId}/leaderboard/details`)
      );
      expect(normal.variant).toBe("normal");
      const normalEntry = normal.entries[0];
      expect(normalEntry.courseHandicap).toBe(5);
      expect(normalEntry.netTotalShots).toBe(85);
      expect(normalEntry.netStablefordPoints).toBe(23);
      expect(normalEntry.doped_handicap).toBeUndefined();
      expect(normalEntry.doped_course_handicap).toBeUndefined();
    });

    test("whs: unfrozen participant plays with 0 and reports doped_handicap null", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 10);
      const competitionId = createCompetition(tourId, course, { roundType: "full_18", useDoped: true });
      addParticipant(competitionId, anna, { score: holes(18, 5), handicapIndex: 10 });

      const doped = await expectJsonResponse(
        await makeRequest(`/api/competitions/${competitionId}/leaderboard?variant=doped`)
      );
      expect(doped[0].doped_handicap).toBeNull();
      expect(doped[0].courseHandicap).toBe(10);
      expect(doped[0].doped_course_handicap).toBe(10);
    });

    test("exact: decimal doped value is added to the playing handicap", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId, { scoringFormat: "stroke_play" });
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 10.4);
      const competitionId = createCompetition(tourId, course, {
        roundType: "full_18",
        handicapMode: "exact",
        scoringFormat: "stroke_play",
        useDoped: true,
      });
      addParticipant(competitionId, anna, {
        score: holes(18, 5),
        handicapIndex: 10.4,
        dopedHandicap: 5.2,
      });

      const doped = await expectJsonResponse(
        await makeRequest(`/api/competitions/${competitionId}/leaderboard/details?variant=doped`)
      );
      expect(doped.entries[0].courseHandicap).toBe(15.6);
      expect(doped.entries[0].doped_course_handicap).toBe(15.6);
      expect(doped.entries[0].netTotalShots).toBe(74.4);

      const normal = await expectJsonResponse(
        await makeRequest(`/api/competitions/${competitionId}/leaderboard/details`)
      );
      expect(normal.entries[0].courseHandicap).toBe(10.4);
      expect(normal.entries[0].netTotalShots).toBe(79.6);
    });

    test("net ranking uses doped values and writes nothing to competition_results", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const bertil = createPlayer("Bertil", tourId, 0);
      const competitionId = createCompetition(tourId, course, { roundType: "front_9", useDoped: true });
      // Both shoot 45 gross; Bertil has 4 doped strokes
      addParticipant(competitionId, anna, { score: front9(holes(9, 5)), handicapIndex: 0, dopedHandicap: 0, name: "Anna" });
      addParticipant(competitionId, bertil, { score: front9(holes(9, 5)), handicapIndex: 0, dopedHandicap: 4, name: "Bertil" });

      const doped = await expectJsonResponse(
        await makeRequest(`/api/competitions/${competitionId}/leaderboard/details?variant=doped`)
      );
      const byPlayer = (playerId: number) =>
        doped.entries.find((e: { participant: { player_id: number } }) => e.participant.player_id === playerId);
      // Doped strokes land on stroke index 1-4: four net pars and five bogeys
      expect(byPlayer(bertil).doped_course_handicap).toBe(4);
      expect(byPlayer(bertil).netStablefordPoints).toBe(13);
      expect(byPlayer(bertil).netPosition).toBe(1);
      expect(byPlayer(anna).netStablefordPoints).toBe(9);
      expect(byPlayer(anna).netPosition).toBe(2);

      const rows = db
        .prepare(`SELECT COUNT(*) as count FROM competition_results WHERE competition_id = ?`)
        .get(competitionId) as { count: number };
      expect(rows.count).toBe(0);
    });

    test("finalized competition: doped variant ranks doped values and awards no points", async () => {
      const ownerId = await createOrganizer();
      const tourId = createTour(ownerId);
      const course = createCourse();
      const anna = createPlayer("Anna", tourId, 0);
      const bertil = createPlayer("Bertil", tourId, 0);

      const competitionId = createCompetition(tourId, course, { roundType: "front_9", useDoped: true });
      // Anna wins gross and net on the normal leaderboard (44 vs 45)
      const annaId = addParticipant(competitionId, anna, {
        score: front9([...holes(8, 5), 4]),
        handicapIndex: 0,
        dopedHandicap: 0,
        name: "Anna",
      });
      const bertilId = addParticipant(competitionId, bertil, {
        score: front9(holes(9, 5)),
        handicapIndex: 0,
        dopedHandicap: 4,
        name: "Bertil",
      });
      const insert = db.prepare(
        `INSERT INTO competition_results
           (competition_id, participant_id, player_id, scoring_type, position, points, relative_to_par, stableford_points)
         VALUES (?, ?, ?, 'net', ?, ?, ?, ?)`
      );
      insert.run(competitionId, annaId, anna, 1, 20, 8, 10);
      insert.run(competitionId, bertilId, bertil, 2, 15, 9, 9);
      db.prepare(`UPDATE competitions SET is_results_final = 1 WHERE id = ?`).run(competitionId);

      const normal = await expectJsonResponse(
        await makeRequest(`/api/competitions/${competitionId}/leaderboard/details`)
      );
      const normalAnna = normal.entries.find(
        (e: { participant: { id: number } }) => e.participant.id === annaId
      );
      expect(normalAnna.netPosition).toBe(1);
      expect(normalAnna.netPoints).toBe(20);

      const doped = await expectJsonResponse(
        await makeRequest(`/api/competitions/${competitionId}/leaderboard/details?variant=doped`)
      );
      const byId = (id: number) =>
        doped.entries.find((e: { participant: { id: number } }) => e.participant.id === id);
      expect(byId(bertilId).netStablefordPoints).toBe(13);
      expect(byId(bertilId).netPosition).toBe(1);
      expect(byId(annaId).netPosition).toBe(2);
      for (const entry of doped.entries) {
        expect(entry.points ?? 0).toBe(0);
        expect(entry.netPoints ?? 0).toBe(0);
      }
    });
  });
});
