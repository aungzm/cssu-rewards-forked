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
- `src/main/resources/db/migration/`: Flyway SQL migrations for a new database.

Flyway's first migration creates a fresh `users` table; do not apply it to an
existing populated database. Authorized staff can create users with `POST /users`.
The first superuser can be created at startup by setting `BOOTSTRAP_SUPERUSER_UTORID`
(8 alphanumeric characters), `BOOTSTRAP_SUPERUSER_EMAIL`, and
`BOOTSTRAP_SUPERUSER_PASSWORD` (at least 8 characters). This happens only if
the database has no users; remove the bootstrap variables afterward.
Password updates are disabled by default for the demo. `POST /auth/resets`,
`POST /auth/resets/{resetToken}`, and `PATCH /users/me/password` cannot change
passwords. Configure the frontend with `VITE_PASSWORD_UPDATES_ENABLED=false`
to hide signup and password editing. Staff can still create accounts, but new
accounts cannot activate while password updates are disabled. Use pre-created
demo accounts instead.

Setting `PASSWORD_UPDATES_ENABLED=true` re-enables these endpoints, but the
reset-request endpoint returns a usable token to anyone who knows a UTORid.
**Do not enable it with real accounts.** Implement out-of-band token delivery
and remove tokens from responses before enabling password reset in production.

## Run

With Java 21 installed, from this directory run `./mvnw.cmd test` on Windows.
To run the API, set `DB_URL`, `DB_USER`, `DB_PASSWORD`, and a random `JWT_SECRET`
of at least 32 UTF-8 bytes, then run `./mvnw.cmd spring-boot:run`. The database
URL defaults to `jdbc:postgresql://localhost:5432/cssu_rewards_spring`.
On macOS/Linux use `sh ./mvnw`
(or `./mvnw` if the script has execute permission).
The wrapper downloads Maven 3.9.11 on first use, so it needs network access
then. The server defaults to port 3001 to match the React app's current fallback
URL. Tests use an in-memory H2 database; PostgreSQL still needs integration testing.
