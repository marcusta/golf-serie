import { Database } from "bun:sqlite";
import { expect } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { startTestServer, stopTestServer, TEST_PORT } from "./test-server";

export async function setupTestDatabase(): Promise<Database> {
  const db = createTestDatabase();
  await startTestServer(db);
  return db;
}

export async function cleanupTestDatabase(db: Database): Promise<void> {
  await stopTestServer();
  db.close();
}

export async function makeRequest(
  path: string,
  method: string = "GET",
  body?: any
): Promise<Response> {
  const url = `http://localhost:${TEST_PORT}${path}`;
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
}

export function expectJsonResponse(response: Response): any {
  expect(response.headers.get("content-type")).toContain("application/json");
  return response.json();
}

export function expectErrorResponse(response: Response, status: number): void {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain("application/json");
}
