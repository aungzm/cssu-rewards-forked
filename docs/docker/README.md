# Docker image and GHCR builds

The root `Dockerfile` builds React and Spring into one image. Spring serves the
frontend at `/` and the API at `/api` on port 8080. SQLite data lives under `/data`
on a named volume. The container runs one Java process as UID/GID 10001, not root.
Express is not included. An image has not yet been published by this work.

The URL selects the database automatically. SQLite needs no database server:

```dotenv
# SQLite: jdbc:sqlite:/data/rewards.db
# PostgreSQL: jdbc:postgresql://your-db-host:5432/cssu_rewards
DATABASE_URL=jdbc:sqlite:/data/rewards.db
# PostgreSQL only. Ignored for SQLite.
DATABASE_USER=postgres
DATABASE_PASSWORD=
DEMO_MODE=true
```

See [SQLite storage limits](../../backend-spring/README.md#sqlite-demo). Run only
one application instance per SQLite file. PostgreSQL remains available in the
same image, but the sample Compose file does not start a PostgreSQL server.

## GitHub Actions

`.github/workflows/docker-image.yml` builds the image and tests it before pushing:

- Pull requests to `main` build and smoke-test `linux/amd64` without publishing.
- Pushes to `main` publish `demo`, `latest`, and a full commit SHA tag to GHCR.
- Version tags such as `v1.0.0` publish a version tag and commit SHA tag.
- Manual runs default to build-only. Check `publish` to push from `main` or a
  version tag. Other refs cannot publish from a manual run.
- Main/tag builds also build `linux/arm64` for ARM hosts.

The workflow uses `GITHUB_TOKEN` with `contents: read` and `packages: write`.
No personal access token or Docker Hub account is needed. Actions are pinned to
commit SHAs. Do not use `pull_request_target` to build untrusted pull-request code.

The Docker build runs both Spring test configurations and builds the frontend
using `npm ci`. Before publication, the workflow starts an amd64 container and
checks runtime demo configuration, frontend deep links, login, API authorization,
disabled reset requests, and SQLite persistence across container recreation.
Build-only/manual runs validate the image too. They do not change GHCR visibility.

### Make the package public

GHCR can host a public image even when this repository stays private. After the
first successful publication:

1. Open the `cssu-rewards-forked` container package under your GitHub account.
2. Open **Package settings**, then **Change visibility**, and choose **Public**.
3. Test a pull from a machine with no GHCR credentials:

```sh
docker pull ghcr.io/aungzm/cssu-rewards-forked:demo
```

The workflow does not make the source repository public or change package
visibility automatically. Anyone can download a public image and inspect its
compiled frontend and backend. Never include secrets or a populated database in
the image. `.dockerignore` excludes environment files, databases, Git data,
Express, dependencies, and local build outputs.

Private repository Actions usage may count against your GitHub plan. Check your
account's Actions usage and package policies before enabling regular publication.

## Build locally

Docker must be running. From the repository root:

```sh
docker build --tag cssu-rewards:local .
bash .github/scripts/smoke-image.sh cssu-rewards:local
```

The smoke script needs Bash, curl, jq, and OpenSSL. GitHub's Ubuntu runner has
these tools. It creates a disposable container and named volume, then removes
only those test resources. Its sample login is not a real account.

For deployment, copy this directory's `.env.example` to `.env`, set
`APP_IMAGE=cssu-rewards:local`, and fill in the JWT secret and bootstrap password.
From this directory use `docker compose up -d --pull never` to use the local tag.

## Deploy a published image

Copy `docker-compose.yml` and `.env.example` into your deployment directory.
Rename `.env.example` to `.env`, generate a JWT secret of at least 32 random bytes,
and choose the first administrator's bootstrap password. Keep `.env` private.

```sh
docker compose config --quiet
docker compose pull
docker compose up -d
```

Open `http://localhost:8080`. The published port defaults to local-only. For a
public demo, put a TLS reverse proxy in front and forward the original host and
scheme. The image enables Spring's forwarded-header handling; configure your
proxy to replace client-supplied forwarded headers. Alternatively, deliberately
change `BIND_ADDRESS` for direct network access.

No frontend/backend hostnames or build-time URLs are needed. `/app-config.js`
returns only `/api` and the runtime demo flag before React loads. It is not
cached and never contains database credentials or the JWT secret. Changing
`DEMO_MODE` requires recreating the container, not rebuilding the image.

Compose uses `.env` for substitutions and passes it into the app via `env_file`.
Explicit `environment` entries take precedence. The named volume retains data
when containers are recreated. Do not use `docker compose down -v` unless you
intend to delete the database. Use local storage, not a network filesystem.
Back up with the app stopped or a SQLite-aware backup tool, not by copying only
an open `.db` file and omitting its WAL.

## Demo limitations

Demo mode disables password resets and password changes. In this image it also
hides signup/password editing at runtime. It does not make the app read-only or
stop staff from modifying data. The bootstrap account has full administrative
access and is not a safe public guest login. No sample events or visitor accounts
are seeded yet. Use pre-created accounts; staff-created users cannot activate
while the activation/reset flow is disabled.

Do not use real accounts or personal data. With demo mode off, the current reset
endpoint returns usable reset tokens to callers. This account-takeover risk must
be fixed before a real deployment. Public visitor roles, abuse controls, demo
seed data, and any periodic data reset remain separate work.
