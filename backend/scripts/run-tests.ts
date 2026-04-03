/**
 * Run the end-to-end suite against a disposable SQLite database.
 *
 * npm only runs `posttest` when `test` succeeds, which would leave the SQLite
 * client and database behind after a failing run. This wrapper always tears
 * down and restores the PostgreSQL client before exiting.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const sqliteEnv = {
  ...process.env,
  NODE_ENV: "test",
  PRISMA_PROVIDER: "sqlite",
  DATABASE_URL: "file:./test.db",
};

function run(command: string, env = sqliteEnv): void {
  execSync(command, { stdio: "inherit", env });
}

let exitCode = 0;

try {
  console.log("Preparing SQLite test database...");
  run("npx tsx scripts/generate-test-schema.ts");
  run(
    "npx prisma db push --force-reset --skip-generate --schema prisma/schema.test.prisma"
  );
  run("npx prisma generate --schema prisma/schema.test.prisma");

  run(
    "npx tsx prisma/createsu.ts clive123 clive.su@mail.utoronto.ca SuperUser123!"
  );

  run("npx jest --runInBand", {
    ...sqliteEnv,
    NODE_OPTIONS: "--experimental-vm-modules",
  });
} catch (error) {
  exitCode = 1;
} finally {
  console.log("Tearing down SQLite test database...");
  try {
    run("npx tsx scripts/teardown-test-db.ts");
  } catch (error) {
    console.error("Test teardown failed:", error);
    exitCode = 1;
  }
}

process.exit(exitCode);
