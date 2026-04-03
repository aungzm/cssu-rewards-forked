/**
 * Remove the SQLite test database and restore the PostgreSQL Prisma client so
 * development and builds continue to target the real database.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const dbPath = path.join(root, "prisma", "test.db");

console.log("Tearing down SQLite test database...");

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const file = dbPath + suffix;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Removed ${path.relative(root, file)}`);
  }
}

const generatedSchema = path.join(root, "prisma", "schema.test.prisma");
if (fs.existsSync(generatedSchema)) {
  fs.unlinkSync(generatedSchema);
}

// Restore the production client. Regenerating does not need a live database.
try {
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("Restored the PostgreSQL Prisma client.");
} catch (error) {
  console.error(
    "Could not regenerate the PostgreSQL client. Run `npx prisma generate` before building."
  );
}
