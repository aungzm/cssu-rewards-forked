import fs from "fs";
import path from "path";

const dbFileName = "test.db";
// Assumes prisma/ is at the root level alongside scripts/
const dbPath = path.join(__dirname, "..", "prisma", dbFileName);
const journalPath = dbPath + "-journal";
const walPath = dbPath + "-wal";

console.log("Starting test database teardown...");

try {
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log(`Removed ${dbFileName}`);
    } else {
        console.log(`${dbFileName} not found, skipping removal.`);
    }

    // Clean up potential journal and WAL files
    if (fs.existsSync(journalPath)) {
        fs.unlinkSync(journalPath);
        console.log(`Removed ${dbFileName}-journal`);
    }
    if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
        console.log(`Removed ${dbFileName}-wal`);
    }

    // Run prisma db push to ensure the database is in sync with the schema
    console.log("Running: npx prisma db push --force-reset --skip-generate");
    

    console.log("Test database teardown complete.");
} catch (error: unknown) {
    console.error("Failed to tear down test database:", error);
}
