# Syncra Backend

.NET 8 backend service for Syncra social media management platform.

## Project Structure

```
src/
├── Syncra.Api/          # ASP.NET Core Web API project
├── Syncra.Application/ # Application services, interfaces, DTOs
├── Syncra.Infrastructure/# EF Core, repositories, external services
├── Syncra.Domain/       # Domain entities, value objects
└── Syncra.Shared/      # Shared utilities, constants, extensions

tests/
└── Syncra.UnitTests/   # Unit tests (future)

docs/
└── credentials-checklist.md  # External service credentials
```

## Architecture

Clean Architecture with five projects:
- **Domain**: Core business entities
- **Shared**: Cross-cutting concerns
- **Infrastructure**: Data access, external services
- **Application**: Application services, DTOs
- **Api**: Web API entry point

Dependency direction: API → Application → Infrastructure → Domain

## Quick Start

### Prerequisites
- .NET 8 SDK
- PostgreSQL (local or Docker)

### Setup

1. Restore packages:
```bash
dotnet restore
```

2. Configure database connection in `src/Syncra.Api/appsettings.json`

3. Run migrations:
```bash
dotnet ef database update --project src/Syncra.Api
```

4. Run the API:
```bash
cd src/Syncra.Api
dotnet run
```

### Verify Installation

| Endpoint | Expected Result |
|----------|-----------------|
| `http://localhost:5000/health` | 200 OK |
| `http://localhost:5000/swagger` | Swagger UI |

## Configuration

See `.env.example` for environment variables.

## Development

### Building
```bash
dotnet build
```

### Running Tests (future)
```bash
dotnet test
```
