import type { Config } from "drizzle-kit";

export default {
  schema: "./src/infrastructure/database/schema/*",
  out: "./src/infrastructure/database/migrations",
  driver: "libsql",
  dbCredentials: {
    url: "file:./data/golf-series.db",
  },
  verbose: true,
  strict: true,
} satisfies Config;
