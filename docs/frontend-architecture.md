
# Frontend Architecture

This document provides a detailed overview of the frontend architecture for the Golf Series application.

## 1. Overview

The frontend is a modern single-page application (SPA) built with [React](https://react.dev/) and [Vite](https://vitejs.dev/). It uses [TypeScript](https://www.typescriptlang.org/) for type safety and [Tailwind CSS](https://tailwindcss.com/) for styling.

The application follows a component-based architecture and leverages the TanStack ecosystem for routing, data fetching, and state management.

## 2. Technology Stack

-   **Framework**: React
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Routing**: TanStack Router
-   **Data Fetching/State Management**: TanStack Query
-   **UI Components**: Radix UI and custom components

## 3. Directory Structure

The frontend source code is located in the `/frontend/src` directory and is organized as follows:

-   `/src/api`: Contains functions for making API calls to the backend. These functions use TanStack Query for data fetching and caching.
-   `/src/components`: Contains reusable React components used throughout the application.
-   `/src/hooks`: Contains custom React hooks that encapsulate reusable logic.
-   `/src/lib`: Contains utility functions and libraries.
-   `/src/utils`: Contains utility functions for various tasks.
-   `/src/views`: Contains the top-level page components for each route.
-   `/src/router.tsx`: Defines the application's routes using TanStack Router.
-   `/src/main.tsx`: The entry point for the React application.

## 4. Data Flow and State Management

The application uses a combination of TanStack Query and React state for managing state.

### 4.1. Server State: TanStack Query

[TanStack Query](https://tanstack.com/query/latest) is used to manage the server state. This includes fetching, caching, and updating data from the backend API.

-   **Data Fetching**: The functions in the `/src/api` directory use the `useQuery` and `useMutation` hooks from TanStack Query to fetch and update data.
-   **Caching**: TanStack Query automatically caches the data, which improves performance by reducing the number of API requests.
-   **State Synchronization**: TanStack Query keeps the client-side state in sync with the server-side state.

### 4.2. UI State: React State and Context

React's built-in state management features (`useState`, `useReducer`, `useContext`) are used to manage the UI state.

-   **Local Component State**: `useState` and `useReducer` are used to manage the state of individual components.
-   **Global UI State**: React Context is used to share global UI state, such as the current theme or user authentication status.

## 5. Routing

The application uses [TanStack Router](https://tanstack.com/router/latest) for routing.

-   **Route Definitions**: The routes are defined in the `/src/router.tsx` file.
-   **Route Hierarchy**: The routes are organized in a hierarchical structure, with nested routes for different sections of the application.
-   **Lazy Loading**: TanStack Router supports lazy loading of routes, which improves the initial load time of the application.

## 6. Component-Based Architecture

The application is built using a component-based architecture.

-   **Reusable Components**: The `/src/components` directory contains a library of reusable UI components.
-   **Component Composition**: Pages are built by composing these reusable components.
-   **Styling**: Components are styled using Tailwind CSS, which allows for rapid UI development.
