# ==============================================================================
# Multi-stage Dockerfile for Spring Boot HRMS Backend
# Stage 1: Build stage with Maven and Java 21
# Stage 2: Production runtime with lightweight Eclipse Temurin 21 JRE Alpine
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. BUILD STAGE
# ------------------------------------------------------------------------------
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy pom.xml first for Docker layer caching
COPY pom.xml .

# Download dependencies (cached in Docker layer unless pom.xml changes)
RUN mvn dependency:go-offline -B || true

# Copy source code and resource files
COPY src ./src

# Package production fat JAR
# Note: Unit tests are enabled (-DskipTests=false). Currently no test classes exist
# in src/test/java, so Maven executes compile and package cleanly.
RUN mvn clean package -DskipTests=false -B

# ------------------------------------------------------------------------------
# 2. RUNTIME STAGE
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

# Security: Create non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create upload directories for candidate resumes and employee documents
RUN mkdir -p /app/uploads/resumes /app/uploads/documents && \
    chown -R appuser:appgroup /app

# Copy executable jar from builder stage
COPY --from=builder /build/target/*.jar /app/app.jar
RUN chown appuser:appgroup /app/app.jar

# Switch to non-root user
USER appuser

# Render dynamically sets $PORT (defaults to 8080)
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

# Health check using wget (built into Alpine busybox)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/actuator/health || exit 1

# Launch Spring Boot with container-aware memory allocation and Render dynamic port binding
ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -Dserver.port=${PORT} -Djava.security.egd=file:/dev/./urandom -jar /app/app.jar"]

