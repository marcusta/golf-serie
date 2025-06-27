
# Backend Architecture

This document provides a detailed overview of the backend architecture for the Golf Series application.

## 1. Overview

The backend is a Node.js application built with [Bun](https://bun.sh/) as the runtime and [Hono](https://hono.dev/) as the web framework. It follows a **Hexagonal Architecture** (also known as Ports and Adapters) to separate the core application logic from external concerns like the database and API.

The primary goal of this architecture is to create a loosely coupled system where the business logic is independent of the delivery mechanism (API) and infrastructure (database).

## 2. Directory Structure

The backend source code is located in the `/src` directory and is organized as follows:

-   `/src/api`: Contains the API route definitions. This is the primary adapter that handles incoming HTTP requests.
-   `/src/services`: Contains the core business logic of the application. This is the "hexagon" in the hexagonal architecture.
-   `/src/database`: Contains the database access logic, including the schema definition and migrations. This is the secondary adapter.
-   `/src/types`: Contains shared TypeScript types and interfaces used throughout the application.
-   `/src/app.ts`: The main application file where the Hono app is created and configured.
-   `/src/server.ts`: The entry point for the backend server.
-   `/src/index.ts`: Imports the server to start the application.

## 3. Hexagonal Architecture in Detail

### 3.1. The Core: `src/services`

The `src/services` directory contains the application's core business logic. Each service is responsible for a specific domain, such as `CompetitionService`, `CourseService`, etc.

-   **Independence**: Services are independent of Hono and the database implementation. They should not contain any code related to HTTP requests or responses, nor should they directly execute SQL queries.
-   **Business Logic**: All business rules, data validation, and calculations are performed within the services.
-   **Database Interaction**: Services interact with the database through a repository pattern, which is implemented in the `src/database` directory.

### 3.2. Primary Adapter: `src/api`

The `src/api` directory is the primary adapter that exposes the application's functionality via a RESTful API.

-   **Hono Integration**: The API files use Hono to define the routes and handle HTTP requests and responses.
-   **Request Handling**: The API layer is responsible for:
    -   Parsing request bodies and parameters.
    -   Calling the appropriate service methods.
    -   Formatting the response and sending it back to the client.
-   **Error Handling**: The API layer catches errors from the services and translates them into appropriate HTTP error responses.

### 3.3. Secondary Adapter: `src/database`

The `src/database` directory is the secondary adapter that provides data persistence for the application.

-   **Database Abstraction**: This layer abstracts the database implementation from the rest of the application. Currently, it uses `bun:sqlite` for database access.
-   **Schema and Migrations**: The `src/database/migrations` directory contains the database schema and migration files. The application uses a simple migration runner to apply schema changes.
-   **Data Access**: The services use the database adapter to perform CRUD (Create, Read, Update, Delete) operations on the data.

## 4. Request Lifecycle

A typical request to the backend follows these steps:

1.  An HTTP request is received by the Hono server in `src/server.ts`.
2.  The request is passed to the Hono app in `src/app.ts`.
3.  The app's routing middleware matches the request to a route defined in one of the files in `src/api`.
4.  The API handler function parses the request and calls the appropriate method in a service from `src/services`.
5.  The service executes the business logic, potentially calling the database adapter in `src/database` to fetch or store data.
6.  The service returns the result to the API handler.
7.  The API handler formats the result into an HTTP response and sends it back to the client.

## 5. Database Schema and Migrations

The database schema is managed through a series of migration files located in `src/database/migrations`. Each migration file has an `up` method that applies the schema changes.

The `src/database/db.ts` file contains the logic for initializing the database and applying the migrations. It keeps track of the applied migrations in a `migrations` table in the database.

This approach ensures that the database schema is always in a consistent state and can be easily evolved over time.
