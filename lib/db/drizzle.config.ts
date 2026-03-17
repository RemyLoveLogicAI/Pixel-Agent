import { defineConfig } from "drizzle-kit";
import path from "path";

// NOTE: We keep `drizzle-kit generate` usable without a live DB.
// `drizzle-kit push` still requires a real DATABASE_URL at runtime.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/pixel_agent";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
