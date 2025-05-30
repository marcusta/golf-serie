// test-server.ts
import { Database } from "bun:sqlite";
import { createApp } from "../src/app";

type ServerInfo = {
  server: ReturnType<typeof Bun.serve>;
  port: number;
  refCount: number;
};
const servers = new WeakMap<Database, ServerInfo>();

export async function startTestServer(db: Database): Promise<number> {
  // Re-use the same server if a test in the same file
  // calls setupTestDatabase() more than once.
  const existing = servers.get(db);
  if (existing) {
    existing.refCount++;
    return existing.port;
  }

  // 👇  0 → “please pick any free port for me”
  const server = Bun.serve({
    port: 0,
    fetch: createApp(db).fetch,
  });

  const info: ServerInfo = { server, port: server.port!, refCount: 1 };
  servers.set(db, info);

  // Give the listener a tick to bind.
  await new Promise((r) => setTimeout(r, 5));

  return info.port; // makeRequest() keeps using this
}

export async function stopTestServer(db: Database): Promise<void> {
  const info = servers.get(db);
  if (!info) return;

  info.refCount--;
  if (info.refCount === 0) {
    info.server.stop();
    servers.delete(db);
  }
}
