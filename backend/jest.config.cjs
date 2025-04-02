// jest.config.js
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    // Optional: specify directories to look for tests
    testMatch: ['**/tests/**/*.test.ts'],
    // Optional: setup files to run before each test file (if needed beyond package.json)
    // setupFilesAfterEnv: ['./jest.setup.js'],
    // Important for Prisma/DB tests: prevent tests from running too long
    testTimeout: 15000, // Increase timeout to 15 seconds (adjust as needed)
  };
  