import fs from "fs";
import path from "path";
import { fileURLToPath } from "url"; 

const dbFileName = "test.db";
const __filename = fileURLToPath(import.meta.url); // Get the full path of the current file
const __dirname = path.dirname(__filename); // Get the directory of the current file (scripts/)
// Go one level up from the script's directory (__dirname) to the project root
const projectRoot = path.join(__dirname, "..");
const dbPath = path.join(projectRoot, "prisma", dbFileName); 
const journalPath = dbPath + "-journal";
const walPath = dbPath + "-wal";

console.log("Starting test database teardown...");
console.log(`Targeting database file at: ${dbPath}`); // Optional: Log the path for debugging

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

  console.log("Test database teardown complete.");
} catch (error: unknown) {
  console.error("Failed to tear down test database:", error);
  process.exit(1); // Exit with error code if teardown fails
}
