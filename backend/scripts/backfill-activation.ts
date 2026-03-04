/**
 * One-off backfill for accounts that already set a password but were created
 * before login started requiring `activated = true` (and before completing a
 * reset set the flag). Run once per existing database:
 *
 *   npm run backfill:activation
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const result = await prisma.user.updateMany({
    where: { password: { not: null }, activated: false },
    data: { activated: true },
  });

  console.log(
    `Activated ${result.count} existing account(s) that already had a password.`
  );
}

main()
  .catch((error) => {
    console.error("Activation backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
