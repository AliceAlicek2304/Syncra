FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY be/src/Syncra.Api/Syncra.Api.csproj be/src/Syncra.Api/
COPY be/src/Syncra.Application/Syncra.Application.csproj be/src/Syncra.Application/
COPY be/src/Syncra.Domain/Syncra.Domain.csproj be/src/Syncra.Domain/
COPY be/src/Syncra.Infrastructure/Syncra.Infrastructure.csproj be/src/Syncra.Infrastructure/
COPY be/src/Syncra.Shared/Syncra.Shared.csproj be/src/Syncra.Shared/

RUN dotnet restore be/src/Syncra.Api/Syncra.Api.csproj

COPY be/src/ .
WORKDIR /src/Syncra.Api
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY --from=build /app/publish .

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:8080/health || exit 1

EXPOSE 8080

ENTRYPOINT ["dotnet", "Syncra.Api.dll"]
