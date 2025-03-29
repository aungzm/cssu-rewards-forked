import { execSync } from "child_process";

const dbUrl: string | undefined = process.env.DATABASE_URL;
const nodeEnv: string | undefined = process.env.NODE_ENV;
const expectedDbFile = "test.db";
const expectedNodeEnv = "test";

console.log("Starting test database setup...");

if (!dbUrl || !dbUrl.includes(expectedDbFile)) {
    console.error(
        `Error: DATABASE_URL environment variable is not set or does not point to '${expectedDbFile}'.`
    );
    console.error(`Current DATABASE_URL: ${dbUrl}`);
    console.error(
        "Ensure you run tests using 'npm run test' or similar script that sets DATABASE_URL via cross-env."
    );
    process.exit(1);
}

console.log(`Using database URL: ${dbUrl}`);

if (nodeEnv !== expectedNodeEnv) {
    console.error(
        `Error: NODE_ENV is not set to '${expectedNodeEnv}'. Current NODE_ENV: ${nodeEnv}`
    );
    console.error(
        "Ensure you run tests using 'npm run test' or similar script that sets NODE_ENV to 'test'."
    );
    process.exit(1);
}
console.log(`Using NODE_ENV: ${process.env.NODE_ENV}`);

try {
    console.log("Running: npx prisma generate");
    execSync("npx prisma generate", { stdio: "inherit" });

    console.log("Running: npx prisma db push --force-reset --skip-generate");
    execSync("npx prisma db push --force-reset --skip-generate", {
        stdio: "inherit",
    });

    console.log(" Test database setup complete.");
} catch (error: unknown) {
    console.error(" Failed to setup test database:", error);
    process.exit(1);
}
