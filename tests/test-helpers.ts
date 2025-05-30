import { Database } from "bun:sqlite";
import { expect } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { startTestServer, stopTestServer } from "./test-server";

// Type for the makeRequest function that gets returned
export type MakeRequestFunction = (
  path: string,
  method?: string,
  body?: any
) => Promise<Response>;

export async function setupTestDatabase(): Promise<{
  db: Database;
  makeRequest: MakeRequestFunction;
}> {
  const db = await createTestDatabase();
  const port = await startTestServer(db);

  // Create closure that captures the port
  const makeRequest: MakeRequestFunction = async (
    path: string,
    method: string = "GET",
    body?: any
  ): Promise<Response> => {
    const url = `http://localhost:${port}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  };

  return { db, makeRequest };
}

export async function cleanupTestDatabase(db: Database): Promise<void> {
  await stopTestServer(db);
  // Reduced cleanup delay
  await new Promise((resolve) => setTimeout(resolve, 10));
  db.close();
}

export async function expectJsonResponse(response: Response): Promise<any> {
  expect(response.headers.get("content-type")).toContain("application/json");
  return await response.json();
}

export function expectErrorResponse(response: Response, status: number): void {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain("application/json");
}
