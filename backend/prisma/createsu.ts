/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.ts clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  if (args.length < 3) {
    console.error("Usage: node prisma/createsu.ts utorid email password");
    process.exit(1);
  }

  const [utorid, email, password] = args;

  // Check if a user with the provided email already exists.
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  const existingUtorid = await prisma.user.findUnique({ where: { utorid } });
  if (existingEmail || existingUtorid) {
    console.error("A user with this email or utorid already exists.");
    process.exit(1);
  }

  // Hash the password with bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the superuser. Note that superuser must be activated and verified.
  const user = await prisma.user.create({
    data: {
      email,
      utorid,
      password: hashedPassword,
      role: 'SUPERUSER',
      activated: true,
      verified: true,
    }
  });

  console.log(`Superuser created successfully for utorid "${utorid}" with email: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
