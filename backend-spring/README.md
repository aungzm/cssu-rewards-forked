# CSSU Rewards Spring backend

Spring Boot REST API replacing the Express backend in `../backend`.
The React UI remains in `../frontend`. Authentication, user management,
transfers, redemptions, purchases, adjustments, promotion management, event
management, guest registration, attendance awards, event transactions, and
current-user event lists have Spring endpoints. H2 tests cover these flows;
full response and error parity with Express has not been verified.

## Layout

- `auth/`, `user/`, `transaction/`, `event/`, `promotion/`: feature folders.
- `security/`: Spring Security and JWT authentication.
- `common/`: shared API error handling.
- `src/main/resources/db/migration/`: unchanged PostgreSQL migrations.
- `src/main/resources/db/sqlite/`: SQLite migrations, selected only by the `sqlite` profile.

Flyway's first migration creates a fresh `users` table; do not apply it to an
existing populated database. Authorized staff can create users with `POST /users`.
The first superuser can be created at startup by setting `BOOTSTRAP_SUPERUSER_UTORID`
(8 alphanumeric characters), `BOOTSTRAP_SUPERUSER_EMAIL`, and
`BOOTSTRAP_SUPERUSER_PASSWORD` (at least 8 characters). This happens only if
the database has no users; remove the bootstrap variables afterward.
Set `DEMO_MODE=true` in the Spring process environment to disable
`POST /auth/resets`, `POST /auth/resets/{resetToken}`, and
`PATCH /users/me/password`. Set `VITE_DEMO_MODE=true` in the frontend `.env`
and rebuild it to hide signup and password editing. Both flags default to
`false`, so normal instances retain the existing endpoints. Staff can still
create accounts in demo mode, but new accounts cannot activate. Use
pre-created demo accounts instead.

When demo mode is off, the public reset-request endpoint returns a usable token
to anyone who knows a UTORid. **This allows account takeover with real accounts.**
Do not deploy with real accounts until reset tokens are delivered out of band
and removed from responses. A `DEMO_MODE` flag alone does not fix this risk.

## Run

With Java 21 installed, from this directory run `./mvnw.cmd test` on Windows.
To run the API, set `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, and a
random `JWT_SECRET` of at least 32 UTF-8 bytes, then run
`./mvnw.cmd spring-boot:run`. `DATABASE_URL` selects SQLite or PostgreSQL from
its JDBC prefix. SQLite ignores the database username and password. When unset,
the URL defaults to `jdbc:postgresql://localhost:5432/cssu_rewards_spring`.
On macOS/Linux use `sh ./mvnw`
(or `./mvnw` if the script has execute permission).
The wrapper downloads Maven 3.9.11 on first use, so it needs network access
then. The server defaults to port 3001 to match the React app's current fallback
URL.

## SQLite demo

PostgreSQL remains the default. To use a local SQLite file instead, set
`DATABASE_URL=jdbc:sqlite:./rewards.db`. No profile, database type flag, database
server, or database password is required.

On Linux/macOS, from this directory:

```sh
DATABASE_URL=jdbc:sqlite:./rewards.db \
DEMO_MODE=true \
JWT_SECRET='replace-with-at-least-32-random-bytes' \
sh ./mvnw spring-boot:run
```

On PowerShell:

```powershell
$env:DATABASE_URL = 'jdbc:sqlite:./rewards.db'
$env:DEMO_MODE = 'true'
$env:JWT_SECRET = 'replace-with-at-least-32-random-bytes'
.\mvnw.cmd spring-boot:run
```

Generate your own random secret instead of using the placeholder. Spring does
not load a `.env` file automatically; export its variables or use Compose's
`env_file`. Export `DATABASE_URL` in the process environment or pass
`--DATABASE_URL=...` to the JAR, so the app can select the database before loading
its database-specific configuration. Relative SQLite paths use the process
working directory. Use `DATABASE_URL=jdbc:sqlite:/data/rewards.db` for another
file. Its parent directory must exist and be writable by the app.

For example, a Compose `.env` can document both choices:

```dotenv
# SQLite: jdbc:sqlite:/data/rewards.db
# PostgreSQL: jdbc:postgresql://your-db-host:5432/cssu_rewards
DATABASE_URL=jdbc:sqlite:/data/rewards.db
# PostgreSQL only. Ignored for SQLite.
DATABASE_USER=postgres
DATABASE_PASSWORD=
```

The URL already identifies the database type, so a separate `DATABASE_TYPE`
would duplicate it and could disagree with it. Spring still uses its SQLite
profile internally, but you do not need to configure that yourself.

Flyway creates the schema without resetting existing data. Bootstrap credentials
work the same as with PostgreSQL. This does not add sample events or other demo
seed data. Demo mode is separate from the database choice and still needs
`VITE_DEMO_MODE=true` in the frontend build until runtime UI configuration exists.

### Concurrency and storage limits

SQLite has no row-level `SELECT FOR UPDATE` locks. This profile uses one pooled
connection so complete service transactions, including reads before writes,
execute serially within one application instance. Startup rejects a pool size
other than one. Do not increase it or run multiple instances against the same
file. Choose PostgreSQL for multiple app replicas or heavier concurrent traffic.

Each SQLite connection enables foreign keys, WAL journaling, and a 10-second
busy timeout. Native SQL constraint errors map to Spring integrity exceptions.
WAL does not allow multiple simultaneous writers, and the timeout does not
guarantee success against another process writing to the file.

Persist the whole database directory on a local Docker volume, including SQLite's
WAL and shared-memory files. Do not use a network filesystem or copy only an open
database file as a backup. Stop the app before copying the directory, or use a
SQLite-aware backup tool. The database files are Git-ignored.

### Keeping PostgreSQL

To use PostgreSQL, set `DATABASE_URL=jdbc:postgresql://host:5432/database`, plus
`DATABASE_USER` and `DATABASE_PASSWORD`. Both drivers ship in the same JAR. The
PostgreSQL migrations, checksums, and locking behavior are unchanged.

Changing the URL selects a different database. It does not convert or copy
existing data between PostgreSQL and SQLite. For a demo, start with a fresh
SQLite file. Retaining existing PostgreSQL data would require a separate export
and import, including IDs, relationships, timestamps, and identity sequences.

### Existing configuration compatibility

The old `DB_URL`, `DB_USER`, and `DB_PASSWORD` settings remain fallbacks for
PostgreSQL. `SPRING_PROFILES_ACTIVE=sqlite` with `SQLITE_URL` still works too.
The new `DATABASE_*` settings take precedence. Remove an explicitly configured
`sqlite` profile when switching to PostgreSQL; a conflicting profile and URL
fail startup rather than silently connecting with the wrong settings.

## Tests

```sh
sh ./mvnw test
sh ./mvnw -Psqlite-tests test
```

Use `.\mvnw.cmd` on Windows. The default suite retains H2's PostgreSQL-compatible
test configuration. `sqlite-tests` runs the same API and concurrency suite on a
new SQLite file under `target/` for each Maven invocation. Neither command uses
your normal app database. Maven excludes database-selection environment variables
from the forked test process. Additional tests start and stop the real Spring app
against a temporary SQLite file to verify migrations, bootstrap idempotency,
restart persistence, timestamp filters, money values, connection settings,
foreign keys, unique constraints, and cascading deletes.

Concurrency tests cover point transfers, redemption reservation/processing, event
capacity and budgets, one-time promotions, and repeated suspicious flags.
PostgreSQL still needs integration testing against an actual PostgreSQL server.
