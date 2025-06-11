/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from "@playwright/test";
import { exec } from "child_process";

// Define the shape of our new fixture
export type TestFixtures = {
  server: {
    port: number;
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to find a free port
async function findFreePort(): Promise<number> {
  const { createServer } = await import("net");
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        server.close(() => resolve(address.port));
      } else {
        reject(new Error("Unable to get port"));
      }
    });
  });
}

export const test = base.extend<TestFixtures>({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  server: async ({}, use, testInfo) => {
    const port = await findFreePort();

    console.log(
      `[Test Worker] Starting isolated backend server on port ${port}`
    );

    // Start the backend server in test mode with in-memory database
    const serverCommand = `cd .. && PORT=${port} DATABASE_PATH=":memory:" bun run src/server.ts`;
    const serverProcess = exec(serverCommand);

    // Wait for server to start
    await sleep(3000);

    try {
      // Verify server is running by making a health check
      const response = await fetch(`http://localhost:${port}/api/courses`);
      if (!response.ok) {
        throw new Error(`Server health check failed: ${response.status}`);
      }

      console.log(`[Test Worker] Server ready on port ${port}`);
      await use({ port });
    } finally {
      console.log(`[Test Worker] Stopping server on port ${port}`);
      if (serverProcess.pid) {
        process.kill(serverProcess.pid, "SIGTERM");
      }
    }
  },
});

export { expect } from "@playwright/test";
