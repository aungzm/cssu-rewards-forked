# CSSU Rewards Spring backend

Placeholder for a Spring Boot REST API replacing the Express backend in `../backend`.
The React UI remains in `../frontend`. No routes, authentication, persistence,
or database migrations have been implemented yet.

## Layout

- `auth/`, `user/`, `transaction/`, `event/`, `promotion/`: feature folders.
- `security/`: future Spring Security configuration and authentication.
- `common/`: shared API error handling.
- `src/main/resources/db/migration/`: future SQL migrations; currently empty.

The class stubs are intentionally not annotated as controllers, services, or
entities yet. Implement one feature at a time, keeping business rules in services
and HTTP request handling in controllers. When ready for persistence, add Spring
Data JPA, the PostgreSQL driver, Flyway, entity mappings, and reviewed migrations.
Do not apply a new initial migration to an existing populated database without
planning how to baseline its current schema.

## Run

With Java 21 installed, from this directory run `./mvnw.cmd test` or
`./mvnw.cmd spring-boot:run` on Windows. On macOS/Linux use `sh ./mvnw`
(or `./mvnw` if the script has execute permission).
The wrapper downloads Maven 3.9.11 on first use, so it needs network access
then. The server defaults to port 3001 to match the React app's current fallback
URL. It has no working API endpoints yet.
