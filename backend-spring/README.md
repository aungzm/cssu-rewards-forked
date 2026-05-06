# CSSU Rewards Spring backend

Spring Boot REST API replacing the Express backend in `../backend`.
The React UI remains in `../frontend`. Login and current-user profile reads
are implemented; other API features are still placeholders. The profile's
`promotions` array is empty until promotions are ported.

## Layout

- `auth/`, `user/`, `transaction/`, `event/`, `promotion/`: feature folders.
- `security/`: future Spring Security configuration and authentication.
- `common/`: shared API error handling.
- `src/main/resources/db/migration/`: Flyway SQL migrations for a new database.

Most class stubs remain unimplemented. Implement one feature at a time, keeping
business rules in services and HTTP handling in controllers. Flyway's first
migration creates a fresh `users` table; do not apply it to an existing populated
database. The API has no user-creation endpoint yet, so login requires an
activated user with a BCrypt password hash already inserted into the new database.

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
