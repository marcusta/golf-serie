// Helper to create a course with specific pars
export async function createCourse(port: number, name: string, pars: number[]) {
  const API_URL = `http://localhost:${port}/api`;
  let response = await fetch(`${API_URL}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const course = await response.json();

  response = await fetch(`${API_URL}/courses/${course.id}/holes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pars),
  });
  return await response.json();
}

// Helper to create a team
export async function createTeam(port: number, name: string) {
  const API_URL = `http://localhost:${port}/api`;
  const response = await fetch(`${API_URL}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return await response.json();
}

// Helper to create a competition
export async function createCompetition(
  port: number,
  name: string,
  date: string,
  course_id: number
) {
  const API_URL = `http://localhost:${port}/api`;
  const response = await fetch(`${API_URL}/competitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, date, course_id }),
  });
  return await response.json();
}

// Helper to create a tee time
export async function createTeeTime(
  port: number,
  competitionId: number,
  teetime: string
) {
  const API_URL = `http://localhost:${port}/api`;
  const response = await fetch(
    `${API_URL}/competitions/${competitionId}/tee-times`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teetime }),
    }
  );
  return await response.json();
}

// Helper to create a participant
export async function createParticipant(
  port: number,
  data: {
    tee_time_id: number;
    team_id: number;
    position_name: string;
    tee_order: number;
  }
) {
  const API_URL = `http://localhost:${port}/api`;
  const response = await fetch(`${API_URL}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await response.json();
}
