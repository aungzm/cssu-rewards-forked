#!/usr/bin/env bash
set -euo pipefail

image="${1:-cssu-rewards:smoke}"
name="cssu-smoke-${GITHUB_RUN_ID:-local}-$(openssl rand -hex 6)"
volume="${name}-data"
secret="$(openssl rand -hex 32)"

cleanup() {
  docker logs "$name" || true
  docker rm -f "$name" || true
  docker volume rm "$volume" || true
}
trap cleanup EXIT

start_container() {
  docker run --detach --name "$name" --publish 127.0.0.1::8080 \
    --volume "$volume:/data" \
    --env "JWT_SECRET=$secret" \
    --env BOOTSTRAP_SUPERUSER_UTORID=Demo0001 \
    --env BOOTSTRAP_SUPERUSER_EMAIL=demo@mail.utoronto.ca \
    --env 'BOOTSTRAP_SUPERUSER_PASSWORD=SmokePassword123!' \
    "$image"
  port="$(docker port "$name" 8080/tcp | cut -d: -f2)"
  url="http://127.0.0.1:$port"
  for attempt in $(seq 1 60); do
    if curl --fail --silent "$url/app-config.js" > /dev/null; then return; fi
    if [ "$(docker inspect --format '{{.State.Running}}' "$name")" != true ]; then
      echo 'Container exited before becoming ready' >&2
      return 1
    fi
    sleep 2
  done
  echo 'Container did not become ready' >&2
  return 1
}

login() {
  # The HTTP server may start just before the bootstrap account is committed.
  for attempt in $(seq 1 15); do
    if token="$(curl --fail --silent "$url/api/auth/tokens" \
      --header 'Content-Type: application/json' \
      --data '{"utorid":"Demo0001","password":"SmokePassword123!"}' | jq -er '.token')"; then return; fi
    sleep 1
  done
  echo 'Bootstrap login did not become available' >&2
  return 1
}

start_container
test "$(docker inspect --format '{{.Config.User}}' "$name")" = '10001:10001'
config="$(curl --fail --silent --show-error "$url/app-config.js")"
[[ "$config" == *'"apiBaseUrl":"/api"'* ]]
[[ "$config" == *'"demoMode":true'* ]]
for path in / /login /events /promotions /edit/events/1; do
  curl --fail --silent --show-error "$url$path" | grep -q '<div id="root"></div>'
done
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "$url/api/users/me")" = 401
login
curl --fail --silent --show-error "$url/api/users/me" --header "Authorization: Bearer $token" \
  | jq -e '.utorid == "Demo0001"' > /dev/null
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "$url/api/auth/resets" \
  --header 'Content-Type: application/json' --data '{"utorid":"Demo0001"}')" = 404
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "$url/api/not-a-route" \
  --header "Authorization: Bearer $token")" = 404
curl --fail --silent --show-error --request PATCH "$url/api/users/me" \
  --header "Authorization: Bearer $token" --header 'Content-Type: application/json' \
  --data '{"name":"Container persistence"}' > /dev/null

# Recreate the container, not just the Java process, and reuse only its volume.
docker rm -f "$name"
start_container
login
curl --fail --silent --show-error "$url/api/users/me" --header "Authorization: Bearer $token" \
  | jq -e '.name == "Container persistence"' > /dev/null
echo 'Image smoke tests passed'
