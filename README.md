<p align="center">
  <img src="frontend/src/assets/cssu.png" alt="CSSU Rewards logo" width="88">
</p>

<h1 align="center">CSSU Rewards</h1>

<p align="center">A points and rewards system for the Computer Science Student Union at the University of Toronto.</p>

<p align="center">
  <a href="https://cssu-rewards.aungzm.com">Live demo</a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white">
  <img alt="Spring Boot" src="https://img.shields.io/badge/Spring_Boot-3.5-6db33f?logo=springboot&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169e1?logo=postgresql&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-003b57?logo=sqlite&logoColor=white">
</p>

CSSU Rewards runs the point system for the CS student union. Students earn points from purchases recorded by staff, event attendance and promotions. They can send points to each other and redeem them for rewards at the counter. Staff use the same app to manage accounts, events, promotions and redemption requests.

The project started as a CSC309 (Software Design) course project in Winter 2025 and was entered in a competition to design the CSSU points system.

![Dashboard](docs/screenshots/dashboard.png)

*Dashboard with available points, a personal QR code, upcoming events and active promotions.*

## Screenshots

| | |
| --- | --- |
| ![Events](docs/screenshots/events.png) <br> *Browse events and RSVP* | ![Promotions](docs/screenshots/promotions.png) <br> *Automatic and one-time promotions* |
| ![Transaction history](docs/screenshots/transaction-history.png) <br> *Point summary, filters and history* | ![Create transaction](docs/screenshots/create-transaction.png) <br> *Record purchases, adjustments and other transactions* |
| ![Event management](docs/screenshots/event-management.png) <br> *Manage attendees and award points* | ![User management](docs/screenshots/user-management.png) <br> *Roles, verification and account status* |

## Features

- Point ledger for purchases, adjustments, transfers, event awards and redemptions.
- Promotions with a minimum spend, bonus rate, fixed points, one-time use and QR codes.
- Events with organizers, guest lists, capacity limits, point budgets and attendance awards.
- Role-based access for regular students, cashiers, managers and superusers.
- Account lifecycle with activation tokens, password resets, avatar uploads, verification and suspicious flags.
- Redemption flow where a student requests points and staff scan the QR code to confirm.

## Roles

| Role | Can do |
| --- | --- |
| Regular | Browse published events, RSVP, send and redeem points, edit their profile, view their own history |
| Cashier | Everything a regular student can do, plus look up users, create accounts, record purchases and process redemptions |
| Manager | Everything a cashier can do, plus manage events and promotions, adjust points, verify users, flag transactions and assign roles up to cashier |
| Superuser | Full access, including promoting users to manager |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 3, React Router 7 |
| Backend | Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA, Flyway, JSON Web Tokens, bcrypt |
| Database | PostgreSQL by default, or SQLite for a single-instance demo |
| Tests | JUnit and MockMvc on H2 and SQLite, plus container smoke tests |

## Repository layout

```
backend-spring/  Spring Boot API and database migrations
frontend/        React single-page app
docs/            Screenshots and Docker deployment instructions
.github/         Image build workflow and container smoke tests
Dockerfile       Combined Spring and React image
```

## Running the app

### Docker deployment

The public image includes the frontend and backend, with amd64 and arm64 variants:

```sh
docker pull ghcr.io/aungzm/cssu-rewards-forked:demo
```

Copy [`docs/docker/docker-compose.yml`](docs/docker/docker-compose.yml) and
[`docs/docker/.env.example`](docs/docker/.env.example) into a deployment directory.
Rename `.env.example` to `.env`, fill in the JWT secret and bootstrap password,
then run:

```sh
docker compose up -d
```

Open http://localhost:8080. SQLite data persists on the named volume mounted at
`/data`. The browser uses `/api` on the same origin, so no frontend/backend URL
settings are needed. `DEMO_MODE=true` configures both the API and UI at runtime.
For reverse proxies, set `CORS_ORIGINS` to the public site origin without a
trailing slash. See the [Docker and GHCR guide](docs/docker/README.md) for the
full setup, persistence limits, and security warnings.

### Local development prerequisites

- Java 21 for the backend. The included Maven wrapper downloads Maven as needed.
- Node.js 22 for the frontend.
- PostgreSQL for the default database mode, or SQLite with no database server.

### Backend

```bash
cd backend-spring
```

Set `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD` and a `JWT_SECRET` of at least 32 bytes, then run:

```bash
sh ./mvnw spring-boot:run
```

On Windows use `./mvnw.cmd`. The Spring API listens on http://localhost:3001, which is the frontend's default when `VITE_BACKEND_URL` is unset. For a demo instance, set `DEMO_MODE=true` in Spring's process environment and `VITE_DEMO_MODE=true` in the frontend `.env` before building. This disables password reset and password changes and hides their UI. Both default to `false`; do not use the existing reset flow with real accounts (see [the Spring backend warning](backend-spring/README.md)).

Flyway creates the schema on first start, so use an empty database. To create the first superuser, start the app with `BOOTSTRAP_SUPERUSER_UTORID`, `BOOTSTRAP_SUPERUSER_EMAIL` and `BOOTSTRAP_SUPERUSER_PASSWORD` set, and remove all three once the account exists. More detail is in [backend-spring/README.md](backend-spring/README.md).

The URL selects the database automatically: `jdbc:sqlite:./rewards.db` for a
single-instance SQLite demo, or `jdbc:postgresql://host:5432/database` for
PostgreSQL. Set `DEMO_MODE=true` for the demo. SQLite needs no database username
or password. PostgreSQL remains the default when no URL is set, and switching
databases does not migrate existing data. See the
[SQLite setup and storage limits](backend-spring/README.md#sqlite-demo).

### Frontend

```sh
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Open http://localhost:5173. The example environment file points the frontend at
the standalone Spring API on http://localhost:3001. Local frontend environment
changes require restarting Vite, or rebuilding a separately hosted frontend.

## Tests

```bash
cd backend-spring
sh ./mvnw test
sh ./mvnw -Psqlite-tests test

cd ../frontend
npm run lint
npm run build
```

Use `.\mvnw.cmd` on Windows. The backend tests use H2 by default;
`-Psqlite-tests` runs the same API and concurrency suite against a temporary
SQLite database. Additional tests cover SQLite restart persistence. Neither
configuration uses the development database. The Docker workflow also tests the
combined container before publishing it.

## API

All routes require a bearer token except login and password reset. The API is grouped by resource:

These paths apply to the standalone API. In the Docker image they are prefixed
with `/api`, for example `/api/auth/tokens` and `/api/users/me`. Demo mode
disables password reset and password changes.

| Prefix | Contents |
| --- | --- |
| `/auth` | Login, password reset and account activation |
| `/users` | Profiles, avatars, staff user management, transfers, redemptions, personal transaction and event lists |
| `/transactions` | Purchases, adjustments, transaction search and redemption processing |
| `/events` | Events, organizers, guests and attendance awards |
| `/promotions` | Promotions and their QR codes |

## Demo

A hosted version runs at https://cssu-rewards.aungzm.com. Use an account supplied
by the demo operator. The image does not seed a default public visitor account;
the optional bootstrap credentials create a full administrator and should not
be shared as a public demo login.

## Project status

Spring Boot is the only backend. API and concurrency tests run on H2 and SQLite;
integration testing against an actual PostgreSQL server remains outstanding.
The password-reset flow is unsafe for real accounts when demo mode is off.
See [backend-spring/README.md](backend-spring/README.md) for coverage, database
configuration, and security limitations.

## License

MIT. See [LICENSE](LICENSE).
