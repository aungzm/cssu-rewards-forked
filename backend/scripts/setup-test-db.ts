/**
 * Prepare an isolated SQLite database for the test suite and generate a Prisma
 * client that targets it. The PostgreSQL client is restored by the teardown
 * script after the tests finish.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const env = {
  ...process.env,
  NODE_ENV: "test",
  PRISMA_PROVIDER: "sqlite",
  DATABASE_URL: "file:./test.db",
};

console.log("Preparing SQLite test database...");

execSync("npx tsx scripts/generate-test-schema.ts", {
  stdio: "inherit",
  env,
});

execSync(
  "npx prisma db push --force-reset --skip-generate --schema prisma/schema.test.prisma",
  { stdio: "inherit", env }
);

execSync("npx prisma generate --schema prisma/schema.test.prisma", {
  stdio: "inherit",
  env,
});

console.log("SQLite test database ready.");
