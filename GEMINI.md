
# Gemini Code-Assist Configuration

This document provides a comprehensive guide for the Gemini code-assist agent to understand and effectively contribute to this project. It outlines the project's architecture, technology stack, development workflows, and coding conventions.

## 1. Project Overview

This is a full-stack web application for managing golf series. It consists of a backend API built with Hono and a frontend single-page application (SPA) built with React and Vite. The project is structured as a monorepo with separate `package.json` files for the backend and frontend.

- **Backend**: A Hono-based API server using Bun as the runtime. It follows a hexagonal architecture to separate business logic from external concerns.
- **Frontend**: A modern React application built with Vite, using TypeScript, Tailwind CSS, and TanStack libraries for routing and data fetching.
- **Database**: The application uses a database (likely SQLite, given the `golf_series.db` file) with Drizzle ORM for data access and migrations.

## 2. Tech Stack

### Backend

- **Runtime**: Bun
- **Web Framework**: Hono
- **Language**: TypeScript
- **Database ORM**: Drizzle
- **Schema Validation**: Zod
- **Testing**: `bun:test`
- **Linting**: ESLint

### Frontend

- **Framework**: React
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, `lucide-react` for icons
- **Routing**: TanStack Router (`@tanstack/react-router`)
- **Data Fetching/State**: TanStack Query (`@tanstack/react-query`)
- **E2E Testing**: Playwright
- **Linting**: ESLint

## 3. Project Structure

The project is organized into a root directory for the backend and a `frontend` directory for the frontend application.

```
/
├── src/                  # Backend source code
│   ├── api/              # API route definitions (Hono)
│   ├── services/         # Business logic (application layer)
│   ├── database/         # Database access, schema, and migrations (Drizzle)
│   ├── types/            # Shared TypeScript types
│   └── index.ts          # Application entry point
├── frontend/             # Frontend source code
│   ├── src/              # React application source
│   │   ├── api/          # Functions for making API calls to the backend
│   │   ├── components/   # Reusable React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Utility functions
│   │   ├── views/        # Top-level page components
│   │   └── router.tsx    # TanStack Router configuration
│   └── vite.config.ts    # Vite configuration
├── frontend_dist/        # Compiled frontend assets, served by the backend
├── tests/                # Backend tests
└── package.json          # Backend dependencies and scripts
```

### Architectural Patterns

- **Hexagonal Architecture (Backend)**: The backend is designed to isolate the core application logic from external dependencies.
    - **`src/services`**: Contains the core business logic (the "hexagon"). These services should have no knowledge of Hono or the database implementation.
    - **`src/api`**: The primary adapter, which handles HTTP requests using Hono and calls the appropriate services.
    - **`src/database`**: The secondary adapter, which implements the data persistence logic using Drizzle.

## 4. Key Scripts

### Backend (`/package.json`)

- `bun dev`: Starts the backend server in development mode with hot-reloading.
- `bun prod`: Starts the backend server in production mode.
- `bun test`: Runs the backend test suite.
- `bun migrate`: Applies database migrations.
- `bun type-check`: Runs the TypeScript compiler to check for type errors.
- `bun lint`: Lints the backend codebase with ESLint.

### Frontend (`/frontend/package.json`)

- `npm run dev`: Starts the Vite development server for the frontend.
- `npm run build`: Compiles the frontend application for production.
- `npm run deploy`: Builds the frontend and copies the output to the `../frontend_dist` directory.
- `npm run lint`: Lints the frontend codebase with ESLint.
- `npm run test:e2e`: Runs the Playwright end-to-end tests.

## 5. Development Workflow

### Getting Started

1.  Run `bun install` in the root directory.
2.  Run `npm install` in the `frontend` directory.
3.  Run `bun migrate` in the root directory to set up the database.

### Typical Development Session

-   To work on the backend, run `bun dev` in the root directory.
-   To work on the frontend, run `npm run dev` in the `/frontend` directory.
-   The frontend dev server will proxy API requests to the backend server.

### Testing

-   Backend tests are located in `/tests` and are run with `bun test`.
-   Frontend E2E tests are in `/frontend/tests` and are run with `npm run test:e2e`.

## 6. Code Style and Conventions

-   **Language**: Use modern TypeScript features.
-   **Formatting**: Code formatting is not explicitly defined in scripts, but follow the existing style.
-   **API**: The backend exposes a RESTful JSON API. API endpoint definitions are in `src/api/`.
-   **State Management**: On the frontend, use TanStack Query for server state and React state/context for UI state. Avoid introducing other state management libraries.
-   **Components**: Build reusable, well-defined components in the `frontend/src/components` directory. Use Tailwind CSS for styling.

## 7. Deployment

The `npm run deploy` script in the frontend's `package.json` handles the build process. It builds the React application and places the static assets in the `/frontend_dist` directory. The Hono backend is configured to serve these static files, creating a self-contained application.
