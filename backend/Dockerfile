# ---- Stage 1: Build ----
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# Copy Maven wrapper + pom first so dependency layer is cached separately from source
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Now copy source and build
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# ---- Stage 2: Run ----
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Render sets $PORT at runtime; app already reads it via server.port: ${PORT:8080}
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]