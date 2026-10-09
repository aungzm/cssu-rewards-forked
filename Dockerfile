# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
RUN npm run build

FROM --platform=$BUILDPLATFORM maven:3.9.11-eclipse-temurin-21 AS backend
WORKDIR /build/backend
COPY backend-spring/pom.xml ./
RUN --mount=type=cache,target=/root/.m2 mvn --batch-mode --no-transfer-progress dependency:go-offline
COPY backend-spring/src/ ./src/
COPY --from=frontend /build/frontend/dist/ ./src/main/resources/static/
RUN --mount=type=cache,target=/root/.m2 \
    mvn --batch-mode --no-transfer-progress test \
    && mvn --batch-mode --no-transfer-progress -Psqlite-tests package

FROM eclipse-temurin:21-jre-jammy AS runtime
RUN groupadd --system --gid 10001 cssu \
    && useradd --system --uid 10001 --gid cssu --home-dir /app --no-create-home cssu \
    && mkdir -p /app /data \
    && chown cssu:cssu /app /data
WORKDIR /app
COPY --from=backend --chown=cssu:cssu /build/backend/target/backend-spring-0.0.1-SNAPSHOT.jar ./app.jar
ENV SERVER_PORT=8080 \
    SERVER_FORWARD_HEADERS_STRATEGY=framework \
    SERVE_FRONTEND=true \
    DEMO_MODE=true \
    DATABASE_URL=jdbc:sqlite:/data/rewards.db
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
