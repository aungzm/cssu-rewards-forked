# Single-image demo deployment proposal

The sample `docker-compose.yml` describes a target deployment, not something the
current checkout can run yet. SQLite support is implemented in Spring, but no
combined frontend/backend image has been built or published.

Use one custom image containing the React build and Spring Boot backend. Spring
serves both on port 8080 in one Java process. SQLite stores data under `/data` on
a named volume. This means one image and one container, with no database service,
nginx container, or frontend development server.

The sample selects `SPRING_PROFILES_ACTIVE=sqlite`. PostgreSQL remains available
in the same Spring app without that profile. See the
[database setup and SQLite limits](../../backend-spring/README.md#sqlite-demo).

## Avoid frontend and backend URL settings

Use `/api` as the frontend API base URL. The browser then sends requests to the
same origin that served the page, whether that is localhost, an IP, or a domain.
No deployment-specific `VITE_BACKEND_URL`, public backend URL, or CORS allowlist
is needed for this same-origin deployment. A different origin would still need
explicit CORS configuration.

The existing UI and API both use `/events` and `/promotions`. Simply serving the
frontend beside today's API would break page refreshes on those paths. Prefix the
API routes with `/api`, including authentication and security matchers, while
keeping the UI routes at the root. Do not set the whole application's servlet
context path to `/api`, since that would move the frontend too.

Vite replaces `import.meta.env.VITE_*` values during the build. Passing
`VITE_DEMO_MODE=true` through Compose does not change an already-built frontend.
Instead, add a public runtime configuration endpoint such as `/app-config` that
returns only `{ "demoMode": true }` from Spring's `app.demo-mode` property. Load
it before rendering React and use it instead of the current build-time flag.
Do not cache this configuration across deployments. Never return JWT or database
secrets. Backend checks must continue to enforce demo restrictions independently.

This makes `DEMO_MODE=true` in `.env` the single setting for both sides. Changing
it requires recreating the app container, not rebuilding the image.

## Work required

- Add a multi-stage Dockerfile: build React with Node, copy `frontend/dist` into
  Spring's classpath `static` directory, package with Java 21 and Maven, then copy
  only the executable JAR into a non-root Java 21 runtime image. Make `/data`
  writable by that user, including when Docker initializes a fresh named volume.
- Add a `.dockerignore` that excludes `.env` files, Git data, dependencies and
  build outputs. Add a frontend dependency lockfile and use `npm ci` in builds.
- Add the `/api` prefix and update Spring Security, JWT-filter path handling,
  frontend API calls, and tests consistently. Check avatar URL handling too.
- Permit unauthenticated access to frontend assets and `/app-config`. Forward
  known React page routes to `index.html` so direct navigation works. Unknown API
  routes must return API errors rather than the frontend HTML.
- Replace the frontend's hardcoded localhost fallback and build-time demo flag
  in `frontend/src/utils/auth.ts` with the same-origin/runtime configuration.
  Keep local development working through a Vite `/api` proxy.
- Add a demo seed for Spring. It currently creates the schema and can bootstrap
  one superuser, but does not load the Express sample users, events or promotions.
  Make seeding repeatable without deleting existing data. Decide whether a public
  demo should reset periodically, and keep any reset operation explicitly opt-in.
- Add container integration tests using SQLite. Check login, UI deep links,
  demo restrictions, uploads, and volume persistence. Spring's SQLite API,
  concurrency and application-restart tests already run outside Docker.
- Add a GitHub Actions workflow to build and push to GHCR using `GITHUB_TOKEN`
  with `contents: read` and `packages: write`. Publish commit/version tags plus a
  demo tag. Build `linux/amd64` and `linux/arm64` for Intel/AMD and ARM hosts.

The repository is currently private. A GHCR package can be public independently
of its source repository. After the initial publish, set the package visibility
to public and verify an anonymous pull works. Do not change repository visibility
or include secrets in image layers. Publishing and package visibility changes
have not been performed as part of this assessment.

## Using the sample after implementation and publication

Copy this directory's `docker-compose.yml` and `.env.example` to your deployment
directory, rename `.env.example` to `.env`, and fill in the random JWT secret and
the bootstrap password. The example bootstrap account is an administrator, not
a safe public guest login. Use a separately seeded regular account for visitors.

From that directory:

```sh
docker compose config --quiet
docker compose pull
docker compose up -d
```

Open `http://localhost:8080`. The default binding is local-only. Put a TLS reverse
proxy in front for a public demo, or deliberately change `BIND_ADDRESS` for direct
network access. SQLite has no database port.

Compose reads `.env` for `${...}` substitutions. `env_file: .env` also injects its
values into the app process. Explicit `environment` entries take precedence.
The SQLite profile uses `SQLITE_URL`, not PostgreSQL's `DB_URL` or credentials.

The named volume retains database state when containers are recreated. Do not
run `docker compose down -v` unless you intend to delete the database. Run one
app instance per SQLite file and keep the volume on local storage. Back up with
the app stopped or a SQLite-aware backup tool, not by copying only an open `.db`
file and omitting its WAL.

## Demo limitations and security

Spring's current `DEMO_MODE=true` disables password reset and password changes.
The frontend flag hides signup and password editing. It does not make the app
read-only or stop staff from modifying data. Staff can still create accounts,
but those accounts cannot use the disabled activation flow.

Do not use real accounts or personal data. With demo mode off, the current reset
endpoint returns usable reset tokens to callers. The Spring README documents
this account-takeover risk. Turning off the demo flag is not safe for a real
deployment until that flow is fixed. Public demo accounts also need a decision
about role limits, profile editing, abuse controls and data cleanup.
