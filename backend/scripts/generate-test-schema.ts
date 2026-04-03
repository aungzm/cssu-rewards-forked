/**
 * Derive a SQLite-compatible schema for the test suite from the PostgreSQL
 * schema. SQLite does not support Prisma enums, so the two enum blocks are
 * dropped and their columns become String.
 *
 * The generated file is git-ignored and recreated on every test run.
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const source = path.join(root, "prisma", "schema.prisma");
const target = path.join(root, "prisma", "schema.test.prisma");

let schema = fs.readFileSync(source, "utf8");

schema = schema.replace(
  /provider\s*=\s*"postgresql"/,
  'provider = "sqlite"'
);
schema = schema.replace(/enum\s+TransactionType\s*\{[^}]*\}\s*/g, "");
schema = schema.replace(/enum\s+RoleType\s*\{[^}]*\}\s*/g, "");
schema = schema.replace(/type\s+TransactionType/g, "type String");
schema = schema.replace(/role\s+RoleType/g, "role String");

fs.writeFileSync(target, schema);
console.log(`Generated ${path.relative(root, target)}`);
