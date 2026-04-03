// Provider helpers so the same code can run against PostgreSQL in production
// and SQLite in the test suite. PRISMA_PROVIDER is set by the test scripts; the
// DATABASE_URL check is a fallback for ad-hoc SQLite runs.

export function isSqliteProvider(): boolean {
  return (
    process.env.PRISMA_PROVIDER === "sqlite" ||
    (process.env.DATABASE_URL ?? "").startsWith("file:")
  );
}

/**
 * Serializable isolation is meaningful on PostgreSQL but SQLite only supports
 * serializable transactions implicitly and rejects the option.
 */
export function serializableOptions(): { isolationLevel?: any } {
  return isSqliteProvider() ? {} : { isolationLevel: "Serializable" };
}
