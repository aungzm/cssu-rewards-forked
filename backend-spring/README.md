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
Activation and password reset use `POST /auth/resets` and
`POST /auth/resets/{resetToken}`. For compatibility with Express, the public
reset-request endpoint returns the token directly. **This allows account
takeover if someone knows a UTORid. Do not use this flow with real accounts.**
Replace it with email delivery before production deployment.

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
