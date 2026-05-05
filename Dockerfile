# ══════════════════════════════════════
# Stage 1: Build
# ══════════════════════════════════════
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore (cached layer)
COPY QuizHub.csproj ./
RUN dotnet restore

# Copy everything and publish
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# ══════════════════════════════════════
# Stage 2: Runtime
# ══════════════════════════════════════
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Security: run as non-root
RUN adduser --disabled-password --gecos "" appuser && \
    mkdir -p /app/logs /app/uploads/images && \
    chown -R appuser:appuser /app/logs /app/uploads
USER appuser

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

VOLUME ["/app/logs"]

ENTRYPOINT ["dotnet", "QuizHub.dll"]
