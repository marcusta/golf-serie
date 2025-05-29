# Golf Series Backend

A simple backend system for managing golf courses, teams, and competitions.

## Technology Stack

- **Runtime**: Bun.js
- **Language**: TypeScript (strict mode)
- **Database**: SQLite3 using Bun's built-in SQLite library
- **HTTP Server**: Bun's built-in HTTP server
- **Testing**: Bun's built-in test runner

## Prerequisites

- [Bun](https://bun.sh/) installed on your system

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run database migrations:
   ```bash
   bun run migrate
   ```

## Development

Start the development server:
```bash
bun run dev
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## Testing

Run the test suite:
```bash
bun test
```

## API Endpoints

### Courses

- `POST /api/courses` - Create a course
- `GET /api/courses` - List all courses
- `GET /api/courses/:id` - Get single course
- `PUT /api/courses/:id` - Update a course

### Teams

- `POST /api/teams` - Create a team
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get single team
- `PUT /api/teams/:id` - Update team name

### Competitions

- `POST /api/competitions` - Create a competition
- `GET /api/competitions` - List all competitions
- `GET /api/competitions/:id` - Get single competition
- `PUT /api/competitions/:id` - Update a competition

## Data Models

### Course
- id (integer, primary key)
- name (text)
- pars (JSON array of 18 numbers)
- created_at, updated_at (datetime)

### Team
- id (integer, primary key)
- name (text, unique)
- created_at, updated_at (datetime)

### Competition
- id (integer, primary key)
- name (text)
- date (text/date)
- course_id (foreign key to Course)
- created_at, updated_at (datetime)

## Validation Rules

### Course
- Name is required and non-empty
- Pars must be array of exactly 18 positive integers (3-6 range)

### Team
- Name is required and non-empty
- Name must be unique

### Competition
- Name is required and non-empty
- Date is required (basic date format)
- course_id must reference existing course