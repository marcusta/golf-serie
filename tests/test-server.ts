import { Database } from "bun:sqlite";
import { createApp } from "../src/app";

// Map to track servers by database instance to avoid conflicts
const serverMap = new Map<
  Database,
  { server: any; port: number; refCount: number }
>();

// Helper to get a random available port
function getRandomTestPort(): number {
  return Math.floor(Math.random() * 4000) + 3200; // 3200 to 4199
}

// Check if port is available
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const server = Bun.serve({
      port,
      fetch: () => new Response("test"),
    });
    server.stop();
    return true;
  } catch {
    return false;
  }
}

// Get an available port
async function getAvailablePort(): Promise<number> {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const port = getRandomTestPort();
    if (await isPortAvailable(port)) {
      return port;
    }
    attempts++;
    // Small delay to avoid rapid port checking
    await new Promise((resolve) => setTimeout(resolve, 15));
  }

  throw new Error("Could not find available port after multiple attempts");
}

export async function startTestServer(db: Database): Promise<number> {
  // Check if server already exists for this database
  if (serverMap.has(db)) {
    const serverInfo = serverMap.get(db)!;
    serverInfo.refCount++;
    return serverInfo.port;
  }

  // Get available port
  const port = await getAvailablePort();

  // Create app and server
  const app = createApp(db);
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  // Store server info
  serverMap.set(db, { server, port, refCount: 1 });

  // Wait for server to be ready (much shorter delay)
  await new Promise((resolve) => setTimeout(resolve, 50));

  return port;
}

export async function stopTestServer(db: Database): Promise<void> {
  const serverInfo = serverMap.get(db);
  if (!serverInfo) return;

  serverInfo.refCount--;

  // Only stop server when no more references
  if (serverInfo.refCount <= 0) {
    serverInfo.server.stop();
    serverMap.delete(db);
    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export function getTestPort(db: Database): number {
  const serverInfo = serverMap.get(db);
  if (!serverInfo) {
    throw new Error("Test server not started for this database");
  }
  return serverInfo.port;
}
