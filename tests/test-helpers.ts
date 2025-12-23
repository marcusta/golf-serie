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

  // Cookie jar to store cookies across requests
  let cookieJar: string[] = [];

  // Create closure that captures the port and cookie jar
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
        ...(cookieJar.length > 0 ? { Cookie: cookieJar.join("; ") } : {}),
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Store cookies from response
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      // Parse and store the cookie
      const cookie = setCookie.split(";")[0];
      const cookieName = cookie.split("=")[0];
      
      // Remove old cookie with same name
      cookieJar = cookieJar.filter(c => !c.startsWith(cookieName + "="));
      
      // Add new cookie
      if (cookie.includes("=")) {
        cookieJar.push(cookie);
      }
    }

    return response;
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
