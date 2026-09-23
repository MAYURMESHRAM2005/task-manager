# ─── Stage 1: Build the Spring Boot jar ─────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package

# ─── Stage 2: Runtime ───────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre

WORKDIR /app

RUN mkdir -p /app/uploads

COPY --from=build /app/target/taskflow-backend-1.0.0.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
