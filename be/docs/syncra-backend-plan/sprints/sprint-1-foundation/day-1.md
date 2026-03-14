# Day 1 – Backend Project Setup and Infrastructure Baseline

Date / Time:
Day 1 of 7

Sprint:
Sprint 1 – Backend Foundation

Focus Area:
Backend architecture setup, solution scaffolding, infrastructure connectivity, middleware baseline, and operational visibility.

Tasks:
- review `be/syncra-backend-plan/backend-task.md` with the backend team and confirm the 7-day scope boundaries
- create the backend solution and project structure aligned to the roadmap: `api`, `application`, `domain`, `infrastructure`, `modules`, `workers`, `contracts`, `tests`, and `deploy`
- configure environment variable strategy for local, staging, and production-ready settings
- set up ASP.NET Core API conventions, routing base path, API versioning approach, and feature/module registration pattern
- wire PostgreSQL connection and verify database connectivity from the API project
- wire Redis connection and verify a basic cache operation succeeds
- wire RabbitMQ connection and verify broker connectivity with a test publisher setup
- implement base middleware for global exception handling, structured request logging, and correlation ID propagation
- add authentication skeleton and authorization registration without expanding into all auth flows yet
- enable Swagger/OpenAPI, including JWT bearer definition placeholder if token issuance is completed later
- create `/health` and dependency health check endpoints for API, PostgreSQL, Redis, and RabbitMQ
- define base entity conventions for `id`, timestamps, `deleted_at`, `version`, `workspace_id`, and `metadata`
- document configuration bootstrap steps for new developers in backend setup notes

---

## Task: Review `backend-task.md` and confirm Sprint 1 scope boundaries

### Purpose
This task ensures the backend team starts with a shared understanding of what Day 1 is responsible for and what must explicitly be deferred to later sprint days. The goal is to avoid scope creep while still establishing a production-oriented foundation.

### Implementation Steps

#### Step 1
Read `be/syncra-backend-plan/backend-task.md` as a team and extract only the Day 1 outcomes:
- solution and project structure
- infrastructure connectivity
- middleware baseline
- auth registration skeleton
- Swagger and health endpoints
- entity conventions
- developer bootstrap notes

#### Step 2
Create a short alignment note in your sprint planning discussion or meeting notes:
- what is included today
- what is intentionally deferred
- what package choices are approved for Day 1

#### Step 3
Agree on the initial backend technical choices for the foundation:
- `.NET 8`
- `ASP.NET Core Web API`
- `Entity Framework Core + Npgsql`
- `StackExchange.Redis`
- `RabbitMQ.Client`
- `Serilog`
- `Swashbuckle`
- `AspNetCore.HealthChecks`

#### Step 4
Explicitly mark these as out of scope for Day 1:
- full auth flows
- refresh tokens
- real user registration/login
- full module business logic
- background worker processing logic
- production deployment pipeline
- real event consumers

### Commands
No terminal commands are required for this planning task, but you should log the outcome into team notes or the sprint board.

### Expected Folder Structure

```Syncra/be/syncra-backend-plan/sprints/sprint-1-foundation/day-1.md#L1-16
be
├── src
├── tests
├── config
├── deploy
└── syncra-backend-plan
```

### Code Example
No code is required for this planning task.

### Verification
Confirm the team can answer all of the following without guessing:
- What must be finished today?
- What is intentionally not finished today?
- Which packages and infrastructure services are approved?
- Which project naming conventions will be used?

---

## Task: Create the backend solution and project structure aligned to the roadmap

### Purpose
This task creates the baseline repository layout so the backend can scale by layer and by feature without needing structural refactors after Day 1. It also gives developers a predictable location for API, domain, infrastructure, contracts, workers, and tests.

### Implementation Steps

#### Step 1
From `be/`, create the target folder layout that matches the roadmap:
- `src/api`
- `src/application`
- `src/domain`
- `src/infrastructure`
- `src/modules`
- `src/workers`
- `src/contracts`
- `tests`
- `deploy`

#### Step 2
Create one .NET project per core layer. Use clear names so project references remain obvious:
- `Syncra.Api`
- `Syncra.Application`
- `Syncra.Domain`
- `Syncra.Infrastructure`
- `Syncra.Contracts`
- optionally `Syncra.Workers` if the worker host is created now

#### Step 3
Add the projects to `Syncra.sln`.

#### Step 4
Reference projects in the correct dependency direction:
- `Syncra.Api` references `Syncra.Application`, `Syncra.Infrastructure`, and `Syncra.Contracts`
- `Syncra.Application` references `Syncra.Domain` and `Syncra.Contracts`
- `Syncra.Infrastructure` references `Syncra.Application` and `Syncra.Domain`
- `Syncra.Workers` references `Syncra.Application`, `Syncra.Infrastructure`, and `Syncra.Contracts`
- `Syncra.Domain` should remain as independent as possible

#### Step 5
Create placeholder directories inside `src/modules` for future feature slices, even if they are empty today:
- `auth`
- `workspaces`
- `ideas`
- `posts`
- `analytics`
- `support`

#### Step 6
Add a `.gitkeep` file or equivalent placeholder where needed so empty folders can be committed.

### Commands

```/dev/null/setup.sh#L1-18
cd be

mkdir -p src/application
mkdir -p src/domain
mkdir -p src/infrastructure
mkdir -p src/modules/auth
mkdir -p src/modules/workspaces
mkdir -p src/modules/ideas
mkdir -p src/modules/posts
mkdir -p src/modules/analytics
mkdir -p src/modules/support
mkdir -p src/workers
mkdir -p src/contracts
mkdir -p deploy

dotnet new classlib -n Syncra.Application -o src/application
dotnet new classlib -n Syncra.Domain -o src/domain
dotnet new classlib -n Syncra.Infrastructure -o src/infrastructure
dotnet new classlib -n Syncra.Contracts -o src/contracts
dotnet new worker -n Syncra.Workers -o src/workers
dotnet sln Syncra.sln add src/application/Syncra.Application.csproj src/domain/Syncra.Domain.csproj src/infrastructure/Syncra.Infrastructure.csproj src/contracts/Syncra.Contracts.csproj src/workers/Syncra.Workers.csproj
```

### Expected Folder Structure

```/dev/null/tree.txt#L1-20
be
├── src
│   ├── api
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   └── appsettings.Development.json
│   ├── application
│   ├── domain
│   ├── infrastructure
│   ├── contracts
│   ├── workers
│   └── modules
│       ├── auth
│       ├── workspaces
│       ├── ideas
│       ├── posts
│       ├── analytics
│       └── support
├── tests
├── config
├── deploy
└── Syncra.sln
```

### Code Example

```/dev/null/project-references.xml#L1-20
<ItemGroup>
  <ProjectReference Include="..\..\application\Syncra.Application.csproj" />
  <ProjectReference Include="..\..\infrastructure\Syncra.Infrastructure.csproj" />
  <ProjectReference Include="..\..\contracts\Syncra.Contracts.csproj" />
</ItemGroup>
```

### Verification
- Run `dotnet sln Syncra.sln list`
- Confirm every expected project appears
- Confirm folder names match the roadmap
- Confirm references compile without circular dependency errors

---

## Task: Configure environment variable strategy for local, staging, and production-ready settings

### Purpose
This task establishes a predictable and secure configuration strategy across environments. Developers should be able to run locally without hardcoded secrets, while the same config model must also work for staging and production.

### Implementation Steps

#### Step 1
Define configuration sections in `appsettings.json` for:
- `ConnectionStrings`
- `Redis`
- `RabbitMq`
- `Auth`
- `OpenApi`
- `Serilog`

#### Step 2
Keep `appsettings.json` safe for source control by storing only defaults and placeholders.

#### Step 3
Use `appsettings.Development.json` for local non-secret overrides.

#### Step 4
Use environment variables for anything secret or environment-specific:
- database passwords
- broker passwords
- JWT signing key
- external service credentials

#### Step 5
Adopt ASP.NET Core double underscore naming for nested configuration:
- `ConnectionStrings__Postgres`
- `Redis__Configuration`
- `RabbitMq__Host`
- `Auth__Jwt__Issuer`
- `Auth__Jwt__Audience`
- `Auth__Jwt__SigningKey`

#### Step 6
Create a checked-in example environment file such as `be/config/.env.example`.

#### Step 7
Document precedence for developers:
1. `appsettings.json`
2. `appsettings.{Environment}.json`
3. user secrets for local secret storage if used
4. environment variables
5. command line arguments

### Commands

```/dev/null/config-commands.sh#L1-8
cd be/src/api

dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Postgres" "Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres"
dotnet user-secrets set "Redis:Configuration" "localhost:6379"
dotnet user-secrets set "RabbitMq:Host" "localhost"
dotnet user-secrets set "RabbitMq:Username" "guest"
dotnet user-secrets set "RabbitMq:Password" "guest"
dotnet user-secrets set "Auth:Jwt:SigningKey" "replace-with-long-local-dev-key"
```

### Expected Folder Structure

```/dev/null/config-tree.txt#L1-9
be
├── config
│   └── .env.example
└── src
    └── api
        ├── appsettings.json
        ├── appsettings.Development.json
        └── Properties
```

### Code Example

```/dev/null/appsettings.json#L1-34
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres"
  },
  "Redis": {
    "Configuration": "localhost:6379",
    "InstanceName": "syncra:"
  },
  "RabbitMq": {
    "Host": "localhost",
    "Port": 5672,
    "VirtualHost": "/",
    "Username": "guest",
    "Password": "guest",
    "Exchange": "syncra.events"
  },
  "Auth": {
    "Jwt": {
      "Issuer": "Syncra",
      "Audience": "Syncra.Client",
      "SigningKey": "replace-me-in-development"
    }
  },
  "OpenApi": {
    "Title": "Syncra API",
    "Version": "v1"
  },
  "AllowedHosts": "*"
}
```

```/dev/null/env-example.env#L1-10
ASPNETCORE_ENVIRONMENT=Development
ConnectionStrings__Postgres=Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres
Redis__Configuration=localhost:6379
RabbitMq__Host=localhost
RabbitMq__Port=5672
RabbitMq__Username=guest
RabbitMq__Password=guest
Auth__Jwt__Issuer=Syncra
Auth__Jwt__Audience=Syncra.Client
Auth__Jwt__SigningKey=replace-with-real-key
```

### Verification
- Launch the API with local settings
- Override one config value using an environment variable
- Confirm the API reads the override correctly
- Confirm no real secrets are committed to source control

---

## Task: Set up ASP.NET Core API conventions, routing base path, API versioning approach, and feature/module registration pattern

### Purpose
This task creates consistent API behavior from the beginning. Developers should know where endpoints belong, how versions are expressed, what the route base looks like, and how modules register themselves.

### Implementation Steps

#### Step 1
Adopt a route base path such as:
- `/api/v1`

#### Step 2
Use a versioning strategy even if only `v1` exists today. For Day 1, a simple route segment approach is enough:
- `/api/v1/health`
- `/api/v1/auth/login`

#### Step 3
Add controllers or minimal endpoints consistently. Recommended Day 1 approach:
- use minimal APIs for infra endpoints like health
- keep feature registration modular using extension methods

#### Step 4
Create a module registration abstraction so every feature can register:
- service dependencies
- endpoints

#### Step 5
Create a shared contract like:
- `IEndpointModule`
- or extension methods such as `AddApiModules()` and `MapApiModules()`

#### Step 6
Move all endpoint mapping into named methods or module classes instead of growing `Program.cs` into a monolith.

### Commands

```/dev/null/packages.sh#L1-6
cd be/src/api

dotnet add package Asp.Versioning.Http
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package FluentValidation.AspNetCore
```

### Expected Folder Structure

```/dev/null/api-structure.txt#L1-15
src/api
├── Program.cs
├── Extensions
│   ├── ServiceCollectionExtensions.cs
│   └── ApplicationBuilderExtensions.cs
├── Modules
│   ├── IEndpointModule.cs
│   ├── HealthModule.cs
│   └── AuthModule.cs
├── Middleware
└── Configuration
```

### Code Example

```/dev/null/IEndpointModule.cs#L1-9
namespace Syncra.Api.Modules;

public interface IEndpointModule
{
    static abstract IServiceCollection AddServices(IServiceCollection services, IConfiguration configuration);
    static abstract IEndpointRouteBuilder MapEndpoints(IEndpointRouteBuilder app);
}
```

```/dev/null/Program.cs#L1-56
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var signingKey = builder.Configuration["Auth:Jwt:SigningKey"] ?? "replace-me";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.MapGroup("/api/v1")
   .MapGet("/ping", () => Results.Ok(new { status = "ok" }));

app.Run();
```

### Verification
- Start the API
- Browse to `/api/v1/ping`
- Confirm the route structure matches the agreed convention
- Confirm future endpoints can be added without inflating `Program.cs`

---

## Task: Wire PostgreSQL connection and verify database connectivity from the API project

### Purpose
This task establishes the primary relational data store and verifies that the API can reach PostgreSQL using the approved configuration model.

### Implementation Steps

#### Step 1
Add PostgreSQL and EF Core packages to the API or infrastructure project:
- `Npgsql.EntityFrameworkCore.PostgreSQL`
- `Microsoft.EntityFrameworkCore.Design`
- `Microsoft.EntityFrameworkCore.Tools`
- `AspNetCore.HealthChecks.NpgSql`

#### Step 2
Create a dedicated `AppDbContext` in `src/infrastructure`.

#### Step 3
Register the DbContext in dependency injection using the `ConnectionStrings:Postgres` connection string.

#### Step 4
Add a lightweight startup probe that can test DB access without needing real business tables yet.
Recommended options:
- `Database.CanConnectAsync()`
- `SELECT 1`

#### Step 5
Expose a temporary internal verification endpoint or rely on health checks.

#### Step 6
Keep migrations setup ready even if the first domain migration is created later.

### Commands

```/dev/null/postgres-packages.sh#L1-8
cd be/src/infrastructure
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools

cd ../api
dotnet add package AspNetCore.HealthChecks.NpgSql
```

### Expected Folder Structure

```/dev/null/postgres-tree.txt#L1-11
src/infrastructure
├── Persistence
│   ├── AppDbContext.cs
│   └── DesignTimeDbContextFactory.cs
└── DependencyInjection
    └── InfrastructureServiceCollectionExtensions.cs
```

### Code Example

```/dev/null/AppDbContext.cs#L1-14
using Microsoft.EntityFrameworkCore;

namespace Syncra.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }
}
```

```/dev/null/InfrastructureServiceCollectionExtensions.cs#L1-23
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Infrastructure.DependencyInjection;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("Connection string 'Postgres' is not configured.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }
}
```

### Docker Compose Example

```/dev/null/docker-compose.yml#L1-47
version: "3.9"

services:
  postgres:
    image: postgres:16
    container_name: syncra-postgres
    environment:
      POSTGRES_DB: syncra
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - syncra-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d syncra"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: syncra-redis
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    container_name: syncra-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  syncra-postgres-data:
```

### Connection String Format

```/dev/null/postgres-connection.txt#L1-1
Host=localhost;Port=5432;Database=syncra;Username=postgres;Password=postgres
```

### Basic Test Operation

```/dev/null/postgres-test.sql#L1-1
SELECT 1;
```

### Verification
- Start Docker Compose
- Confirm PostgreSQL is listening on port `5432`
- Run a DB connection check from the API
- Confirm `/health` reports PostgreSQL as healthy
- Execute `SELECT 1` manually if needed using any PostgreSQL client

---

## Task: Wire Redis connection and verify a basic cache operation succeeds

### Purpose
This task establishes the cache layer used later for throttling, short-lived state, idempotency, and performance optimization.

### Implementation Steps

#### Step 1
Add the Redis packages:
- `StackExchange.Redis`
- `AspNetCore.HealthChecks.Redis`

#### Step 2
Create a small abstraction for cache operations rather than injecting raw Redis everywhere.
Recommended:
- `ICacheService`
- `RedisCacheService`

#### Step 3
Register a singleton `IConnectionMultiplexer` using `Redis:Configuration`.

#### Step 4
Implement a simple set/get verification method:
- set key `syncra:health:test`
- read it back
- confirm the returned value matches

#### Step 5
Surface this verification through a diagnostic endpoint or a local startup test routine if appropriate.

### Commands

```/dev/null/redis-packages.sh#L1-5
cd be/src/infrastructure
dotnet add package StackExchange.Redis

cd ../api
dotnet add package AspNetCore.HealthChecks.Redis
```

### Expected Folder Structure

```/dev/null/redis-tree.txt#L1-10
src/infrastructure
├── Caching
│   ├── ICacheService.cs
│   └── RedisCacheService.cs
└── DependencyInjection
    └── InfrastructureServiceCollectionExtensions.cs
```

### Code Example

```/dev/null/ICacheService.cs#L1-9
namespace Syncra.Infrastructure.Caching;

public interface ICacheService
{
    Task SetStringAsync(string key, string value, TimeSpan? expiry = null, CancellationToken cancellationToken = default);
    Task<string?> GetStringAsync(string key, CancellationToken cancellationToken = default);
}
```

```/dev/null/RedisCacheService.cs#L1-29
using StackExchange.Redis;

namespace Syncra.Infrastructure.Caching;

public sealed class RedisCacheService : ICacheService
{
    private readonly IConnectionMultiplexer _connectionMultiplexer;

    public RedisCacheService(IConnectionMultiplexer connectionMultiplexer)
    {
        _connectionMultiplexer = connectionMultiplexer;
    }

    public async Task SetStringAsync(string key, string value, TimeSpan? expiry = null, CancellationToken cancellationToken = default)
    {
        var db = _connectionMultiplexer.GetDatabase();
        await db.StringSetAsync(key, value, expiry);
    }

    public async Task<string?> GetStringAsync(string key, CancellationToken cancellationToken = default)
    {
        var db = _connectionMultiplexer.GetDatabase();
        var value = await db.StringGetAsync(key);
        return value.HasValue ? value.ToString() : null;
    }
}
```

### Docker Compose Example
Use the same compose file from the infrastructure task. Redis service section:

```/dev/null/docker-compose.redis.yml#L1-6
redis:
  image: redis:7-alpine
  container_name: syncra-redis
  ports:
    - "6379:6379"
```

### Connection String Format

```/dev/null/redis-connection.txt#L1-1
localhost:6379
```

### Basic Test Operation

```/dev/null/redis-test.txt#L1-2
SET syncra:health:test ok
GET syncra:health:test
```

### Verification
- Start Docker Compose
- Confirm Redis is listening on port `6379`
- Run the API
- Execute a set/get through the Redis service
- Confirm `/health` reports Redis as healthy

---

## Task: Wire RabbitMQ connection and verify broker connectivity with a test publisher setup

### Purpose
This task establishes the event backbone for async workflows such as scheduling, notifications, analytics ingestion, and orchestration.

### Implementation Steps

#### Step 1
Add the `RabbitMQ.Client` package.

#### Step 2
Create strongly typed settings for RabbitMQ:
- host
- port
- username
- password
- virtual host
- exchange name

#### Step 3
Create a reusable connection factory registration in infrastructure.

#### Step 4
Implement a lightweight publisher service for Day 1. It only needs to:
- open a connection
- create a channel
- declare an exchange
- publish a small test message

#### Step 5
Optionally map a temporary diagnostics endpoint that publishes a health/test event. Keep it internal-only and remove or lock down later.

#### Step 6
Add RabbitMQ health checks using available health check integration or a custom connectivity probe.

### Commands

```/dev/null/rabbitmq-packages.sh#L1-4
cd be/src/infrastructure
dotnet add package RabbitMQ.Client
```

### Expected Folder Structure

```/dev/null/rabbitmq-tree.txt#L1-11
src/infrastructure
├── Messaging
│   ├── RabbitMqOptions.cs
│   ├── IMessagePublisher.cs
│   └── RabbitMqMessagePublisher.cs
└── DependencyInjection
    └── InfrastructureServiceCollectionExtensions.cs
```

### Code Example

```/dev/null/RabbitMqOptions.cs#L1-12
namespace Syncra.Infrastructure.Messaging;

public sealed class RabbitMqOptions
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string Username { get; set; } = "guest";
    public string Password { get; set; } = "guest";
    public string VirtualHost { get; set; } = "/";
    public string Exchange { get; set; } = "syncra.events";
}
```

```/dev/null/IMessagePublisher.cs#L1-8
namespace Syncra.Infrastructure.Messaging;

public interface IMessagePublisher
{
    Task PublishAsync(string routingKey, string payload, CancellationToken cancellationToken = default);
}
```

```/dev/null/RabbitMqMessagePublisher.cs#L1-43
using System.Text;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace Syncra.Infrastructure.Messaging;

public sealed class RabbitMqMessagePublisher : IMessagePublisher
{
    private readonly RabbitMqOptions _options;

    public RabbitMqMessagePublisher(IOptions<RabbitMqOptions> options)
    {
        _options = options.Value;
    }

    public Task PublishAsync(string routingKey, string payload, CancellationToken cancellationToken = default)
    {
        var factory = new ConnectionFactory
        {
            HostName = _options.Host,
            Port = _options.Port,
            UserName = _options.Username,
            Password = _options.Password,
            VirtualHost = _options.VirtualHost
        };

        using var connection = factory.CreateConnection();
        using var channel = connection.CreateModel();

        channel.ExchangeDeclare(_options.Exchange, ExchangeType.Topic, durable: true);
        var body = Encoding.UTF8.GetBytes(payload);

        channel.BasicPublish(
            exchange: _options.Exchange,
            routingKey: routingKey,
            basicProperties: null,
            body: body);

        return Task.CompletedTask;
    }
}
```

### Docker Compose Example
Use the shared compose file. RabbitMQ service section:

```/dev/null/docker-compose.rabbitmq.yml#L1-8
rabbitmq:
  image: rabbitmq:3-management
  container_name: syncra-rabbitmq
  ports:
    - "5672:5672"
    - "15672:15672"
```

### Connection String Format
RabbitMQ typically uses discrete settings, but an AMQP URI is also acceptable:

```/dev/null/rabbitmq-connection.txt#L1-1
amqp://guest:guest@localhost:5672/
```

### Basic Test Operation
Publish a test event:
- exchange: `syncra.events`
- routing key: `health.test`
- payload: `{"source":"api","status":"ok"}`

### Verification
- Start Docker Compose
- Open RabbitMQ management UI at `http://localhost:15672`
- Login with `guest/guest`
- Run the API publisher test
- Confirm the exchange is declared and the publish call succeeds

---

## Task: Implement base middleware for global exception handling, structured request logging, and correlation ID propagation

### Purpose
This task establishes the cross-cutting operational baseline. Errors must be handled consistently, logs must be structured, and every request must be traceable through a correlation ID.

### Implementation Steps

#### Step 1
Add logging packages:
- `Serilog.AspNetCore`
- `Serilog.Sinks.Console`
- optionally `Serilog.Enrichers.Environment`

#### Step 2
Replace default logging bootstrap with Serilog in `Program.cs`.

#### Step 3
Create a correlation ID middleware:
- read `X-Correlation-ID` if provided
- otherwise generate one
- add it to `HttpContext.Items`
- write it back to the response header

#### Step 4
Create global exception middleware:
- wrap downstream pipeline
- log exception with correlation ID
- return RFC-friendly JSON error response
- do not expose stack traces in production

#### Step 5
Enable structured request logging using Serilog request logging middleware.

#### Step 6
Ensure logs include:
- request path
- status code
- elapsed time
- correlation ID

### Commands

```/dev/null/logging-packages.sh#L1-5
cd be/src/api
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Enrichers.Environment
```

### Expected Folder Structure

```/dev/null/middleware-tree.txt#L1-11
src/api
├── Middleware
│   ├── CorrelationIdMiddleware.cs
│   └── GlobalExceptionMiddleware.cs
├── Extensions
│   └── LoggingExtensions.cs
└── Program.cs
```

### Code Example

```/dev/null/CorrelationIdMiddleware.cs#L1-31
namespace Syncra.Api.Middleware;

public sealed class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Correlation-ID";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var existingValue)
            && !string.IsNullOrWhiteSpace(existingValue)
                ? existingValue.ToString()
                : Guid.NewGuid().ToString("N");

        context.Items[HeaderName] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        await _next(context);
    }
}
```

```/dev/null/GlobalExceptionMiddleware.cs#L1-42
using System.Text.Json;

namespace Syncra.Api.Middleware;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            var correlationId = context.Items[CorrelationIdMiddleware.HeaderName]?.ToString();

            _logger.LogError(exception,
                "Unhandled exception. CorrelationId: {CorrelationId}, Path: {Path}",
                correlationId,
                context.Request.Path);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            var payload = new
            {
                error = "An unexpected error occurred.",
                correlationId
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
    }
}
```

```/dev/null/serilog-bootstrap.cs#L1-28
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "Syncra.Api")
        .WriteTo.Console();
});

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging();
app.UseMiddleware<GlobalExceptionMiddleware>();
```

### Verification
- Start the API
- Call any endpoint with and without `X-Correlation-ID`
- Confirm the response includes the header
- Trigger an exception intentionally
- Confirm the API returns JSON and logs include the correlation ID

---

## Task: Add authentication skeleton and authorization registration without expanding into all auth flows yet

### Purpose
This task prepares the application for protected endpoints without implementing the complete authentication feature set on Day 1.

### Implementation Steps

#### Step 1
Add JWT bearer authentication.

#### Step 2
Create strongly typed auth settings:
- issuer
- audience
- signing key

#### Step 3
Register authentication and authorization in DI.

#### Step 4
Add one protected placeholder endpoint and one anonymous endpoint to verify middleware registration.

#### Step 5
Do not implement login, refresh token, user persistence, or OAuth flows yet. Only prepare the foundation.

### Commands

```/dev/null/auth-packages.sh#L1-3
cd be/src/api
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

### Expected Folder Structure

```/dev/null/auth-tree.txt#L1-10
src/api
├── Authentication
│   └── JwtOptions.cs
├── Modules
│   └── AuthModule.cs
└── Program.cs
```

### Code Example

```/dev/null/JwtOptions.cs#L1-10
namespace Syncra.Api.Authentication;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "Syncra";
    public string Audience { get; set; } = "Syncra.Client";
    public string SigningKey { get; set; } = string.Empty;
}
```

```/dev/null/AuthModule.cs#L1-20
namespace Syncra.Api.Modules;

public static class AuthModule
{
    public static IEndpointRouteBuilder MapAuthModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapGet("/anonymous", () => Results.Ok(new { access = "anonymous" }));

        group.MapGet("/protected", () => Results.Ok(new { access = "authorized" }))
            .RequireAuthorization();

        return app;
    }
}
```

### Configuration Example

```/dev/null/auth-config.json#L1-9
"Auth": {
  "Jwt": {
    "Issuer": "Syncra",
    "Audience": "Syncra.Client",
    "SigningKey": "replace-this-with-a-long-random-key"
  }
}
```

### Verification
- Start the API
- Call `/api/v1/auth/anonymous` and confirm success
- Call `/api/v1/auth/protected` without a token and confirm `401 Unauthorized`
- Confirm Swagger shows the endpoint as protected when security is applied

---

## Task: Enable Swagger/OpenAPI, including JWT bearer definition placeholder

### Purpose
This task makes the API self-describing for developers and frontend integration while also preparing Swagger for authenticated endpoints.

### Implementation Steps

#### Step 1
Add Swagger/OpenAPI support.

#### Step 2
Configure document title and version from configuration.

#### Step 3
Add a JWT bearer security definition so protected endpoints can be tested later from Swagger UI.

#### Step 4
Enable Swagger in development by default.
If the team wants it available in all environments except production, make that explicit.

#### Step 5
Group endpoints with tags where helpful.

### Commands

```/dev/null/swagger-packages.sh#L1-3
cd be/src/api
dotnet add package Swashbuckle.AspNetCore
```

### Expected Folder Structure

```/dev/null/swagger-tree.txt#L1-7
src/api
├── Swagger
│   └── SwaggerServiceCollectionExtensions.cs
└── Program.cs
```

### Code Example

```/dev/null/swagger-config.cs#L1-40
using Microsoft.OpenApi.Models;

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Syncra API",
        Version = "v1",
        Description = "Backend foundation endpoints for Syncra"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a valid JWT bearer token."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
```

### Verification
- Start the API
- Open Swagger UI
- Confirm the `v1` document loads
- Confirm the authorize button is visible
- Confirm baseline endpoints appear in Swagger

---

## Task: Create `/health` and dependency health check endpoints for API, PostgreSQL, Redis, and RabbitMQ

### Purpose
This task provides operational visibility for both local development and future deployment environments. Health checks should distinguish between app liveness and dependency readiness.

### Implementation Steps

#### Step 1
Add health check packages:
- `Microsoft.Extensions.Diagnostics.HealthChecks`
- `AspNetCore.HealthChecks.NpgSql`
- `AspNetCore.HealthChecks.Redis`
- `AspNetCore.HealthChecks.Rabbitmq`

#### Step 2
Register health checks for:
- self/liveness
- PostgreSQL
- Redis
- RabbitMQ

#### Step 3
Use tags to separate liveness and readiness:
- `live`
- `ready`

#### Step 4
Expose three endpoints:
- `/health`
- `/health/live`
- `/health/ready`

#### Step 5
Set endpoint semantics:
- `/health/live`: only app process is alive
- `/health/ready`: app + required dependencies
- `/health`: full aggregated overview

#### Step 6
Return JSON if the team wants a machine-readable response body. This is recommended.

### Commands

```/dev/null/health-packages.sh#L1-6
cd be/src/api
dotnet add package Microsoft.Extensions.Diagnostics.HealthChecks
dotnet add package AspNetCore.HealthChecks.NpgSql
dotnet add package AspNetCore.HealthChecks.Redis
dotnet add package AspNetCore.HealthChecks.Rabbitmq
```

### Expected Folder Structure

```/dev/null/health-tree.txt#L1-8
src/api
├── Health
│   └── HealthCheckResponseWriter.cs
└── Program.cs
```

### Code Example

```/dev/null/health-registration.cs#L1-47
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy("API is running"), tags: new[] { "live" })
    .AddNpgSql(
        connectionString: builder.Configuration.GetConnectionString("Postgres")!,
        name: "postgres",
        tags: new[] { "ready" })
    .AddRedis(
        redisConnectionString: builder.Configuration["Redis:Configuration"]!,
        name: "redis",
        tags: new[] { "ready" })
    .AddRabbitMQ(
        rabbitConnectionString: "amqp://guest:guest@localhost:5672/",
        name: "rabbitmq",
        tags: new[] { "ready" });

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live")
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready"),
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";

        var payload = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(entry => new
            {
                name = entry.Key,
                status = entry.Value.Status.ToString(),
                description = entry.Value.Description
            })
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
});
```

### Verification
- Start the API and infrastructure containers
- Open `/health/live` and confirm success even if a dependency is down
- Open `/health/ready` and confirm it fails if a dependency is unavailable
- Open `/health` and confirm the aggregate status is returned
- Confirm PostgreSQL, Redis, and RabbitMQ each appear by name

---

## Task: Define base entity conventions for `id`, timestamps, `deleted_at`, `version`, `workspace_id`, and `metadata`

### Purpose
This task establishes consistent persistence conventions before the first business entities are implemented. This reduces schema drift and keeps module teams aligned.

### Implementation Steps

#### Step 1
Define a shared base entity model in `domain` or a shared kernel area.

#### Step 2
Standardize field meanings:
- `id`: immutable primary key
- `created_at`: insert timestamp in UTC
- `updated_at`: last modification timestamp in UTC
- `deleted_at`: nullable soft-delete timestamp
- `version`: concurrency token/version number
- `workspace_id`: tenant/workspace boundary
- `metadata`: JSONB for extensible attributes

#### Step 3
Document naming conventions in both C# and PostgreSQL:
- C# properties: `Id`, `CreatedAtUtc`, `UpdatedAtUtc`, `DeletedAtUtc`, `Version`, `WorkspaceId`, `Metadata`
- PostgreSQL columns: `id`, `created_at`, `updated_at`, `deleted_at`, `version`, `workspace_id`, `metadata`

#### Step 4
Define EF Core conventions:
- `metadata` should map to `jsonb`
- `version` should be configured as a concurrency field
- timestamps should default to UTC handling
- soft delete should be considered in future global query filters

#### Step 5
Create one example aggregate root to demonstrate the convention, even if it is only a placeholder.

### Commands
No required commands, but you may add domain/infrastructure files as part of the Day 1 implementation.

### Expected Folder Structure

```/dev/null/domain-tree.txt#L1-11
src/domain
├── Common
│   ├── Entity.cs
│   ├── AuditableEntity.cs
│   └── WorkspaceEntity.cs
└── Example
    └── WorkspaceOwnedExampleEntity.cs

src/infrastructure
└── Persistence
    └── Configurations
```

### Code Example

```/dev/null/Entity.cs#L1-28
namespace Syncra.Domain.Common;

public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
}

public abstract class AuditableEntity : Entity
{
    public DateTime CreatedAtUtc { get; protected set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; protected set; }
    public DateTime? DeletedAtUtc { get; protected set; }
    public long Version { get; protected set; }
}

public abstract class WorkspaceEntity : AuditableEntity
{
    public Guid WorkspaceId { get; protected set; }
    public Dictionary<string, object?> Metadata { get; protected set; } = new();
}
```

```/dev/null/WorkspaceOwnedExampleEntity.cs#L1-17
using Syncra.Domain.Common;

namespace Syncra.Domain.Example;

public sealed class WorkspaceOwnedExampleEntity : WorkspaceEntity
{
    public string Name { get; private set; }

    public WorkspaceOwnedExampleEntity(Guid workspaceId, string name)
    {
        WorkspaceId = workspaceId;
        Name = name;
    }
}
```

### Configuration Example

```/dev/null/WorkspaceOwnedExampleConfiguration.cs#L1-28
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Syncra.Domain.Example;

namespace Syncra.Infrastructure.Persistence.Configurations;

public sealed class WorkspaceOwnedExampleConfiguration : IEntityTypeConfiguration<WorkspaceOwnedExampleEntity>
{
    public void Configure(EntityTypeBuilder<WorkspaceOwnedExampleEntity> builder)
    {
        builder.ToTable("workspace_owned_examples");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at");
        builder.Property(x => x.DeletedAtUtc).HasColumnName("deleted_at");
        builder.Property(x => x.Version).HasColumnName("version").IsConcurrencyToken();
        builder.Property(x => x.WorkspaceId).HasColumnName("workspace_id");
        builder.Property(x => x.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(200);
    }
}
```

### Verification
- Review the base classes as a team
- Confirm naming consistency between C# and SQL
- Confirm EF Core configuration can support `jsonb` and concurrency
- Confirm future entities can inherit these conventions without redefining them

---

## Task: Document configuration bootstrap steps for new developers in backend setup notes

### Purpose
This task reduces onboarding friction and makes Day 1 reproducible for every backend developer on the team.

### Implementation Steps

#### Step 1
Create a short backend setup note such as:
- `be/syncra-backend-plan/backend-setup-notes.md`
- or `be/README.md` if the team prefers a root backend guide

#### Step 2
Document required tools:
- `.NET SDK 8`
- Docker Desktop or equivalent
- PostgreSQL/Redis/RabbitMQ via Docker Compose
- IDE/editor recommendation

#### Step 3
Document startup order:
1. start infrastructure containers
2. restore packages
3. apply config
4. run API
5. check Swagger
6. check health endpoints

#### Step 4
Include example local commands and troubleshooting notes:
- port conflicts
- Docker container health
- missing SDK version
- missing secrets

#### Step 5
List expected URLs:
- API base URL
- Swagger URL
- health endpoints
- RabbitMQ management UI

### Commands

```/dev/null/bootstrap-commands.sh#L1-9
cd be

docker compose up -d
dotnet restore Syncra.sln
dotnet build Syncra.sln
dotnet run --project src/api/Syncra.Api.csproj

# verify
# http://localhost:5000/swagger
# http://localhost:5000/health
```

### Expected Folder Structure

```/dev/null/docs-tree.txt#L1-6
be
├── deploy
│   └── docker-compose.yml
├── config
│   └── .env.example
└── syncra-backend-plan
```

### Code Example

```/dev/null/backend-setup-notes.md#L1-20
# Backend Setup Notes

## Prerequisites
- .NET SDK 8
- Docker Desktop
- Access to local ports 5432, 6379, 5672, 15672

## Run Locally
1. Start infrastructure with Docker Compose
2. Restore and build the solution
3. Configure secrets or environment variables
4. Run the API project
5. Open Swagger and health endpoints
```

### Verification
- Ask a different developer to follow the notes from scratch
- Confirm they can start infrastructure and run the API without extra verbal instructions
- Confirm all required variables and URLs are documented

---

## Recommended Day 1 package baseline

### Purpose
This section gives the team one approved baseline package list so everyone installs the same foundation.

### Commands

```/dev/null/package-baseline.sh#L1-19
cd be/src/api
dotnet add package Swashbuckle.AspNetCore
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Asp.Versioning.Http
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Enrichers.Environment
dotnet add package Microsoft.Extensions.Diagnostics.HealthChecks
dotnet add package AspNetCore.HealthChecks.NpgSql
dotnet add package AspNetCore.HealthChecks.Redis
dotnet add package AspNetCore.HealthChecks.Rabbitmq

cd ../infrastructure
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package StackExchange.Redis
dotnet add package RabbitMQ.Client
```

### Verification
- Run `dotnet restore Syncra.sln`
- Run `dotnet build Syncra.sln`
- Confirm package restore succeeds for all projects

---

## Suggested `Program.cs` Day 1 baseline

### Purpose
This section provides one consolidated application bootstrap example that developers can follow while implementing the Day 1 tasks.

### Code Example

```/dev/null/Program.cs#L1-118
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "Syncra.Api")
        .WriteTo.Console();
});

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var signingKey = builder.Configuration["Auth:Jwt:SigningKey"] ?? "replace-me";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Syncra API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddHealthChecks()
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy(), tags: new[] { "live" });

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup("/api/v1");

api.MapGet("/ping", () => Results.Ok(new { status = "ok" }))
   .WithTags("Diagnostics");

api.MapGet("/auth/protected", () => Results.Ok(new { message = "authorized" }))
   .RequireAuthorization()
   .WithTags("Auth");

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live")
});
app.MapHealthChecks("/health/ready");

app.Run();
```

### Verification
- Run the API successfully
- Confirm Swagger loads
- Confirm `/api/v1/ping` returns `200`
- Confirm `/health`, `/health/live`, and `/health/ready` are mapped
- Confirm protected endpoints require authorization

---

Deliverables:
- runnable backend API skeleton
- backend solution structure committed and consistent with roadmap modules
- infrastructure configuration templates checked in
- working connections to PostgreSQL, Redis, and RabbitMQ
- middleware baseline for errors, logging, and correlation IDs
- Swagger UI and health endpoints available locally
- documented database entity conventions for the team

Dependencies:
- approved roadmap in `backend-task.md`
- access to local Docker or equivalent infrastructure runtime
- agreed package/library choices for EF Core, Redis client, RabbitMQ client, logging, and Swagger

Blocker Check:
- verify all developers can start PostgreSQL, Redis, and RabbitMQ locally
- verify no port conflicts exist for API and infrastructure services
- verify environment variables are documented and not machine-specific
- verify package restore and SDK versions are stable on every developer machine

Test Criteria:
- API starts successfully with no startup exceptions
- `/health` returns success for application readiness
- database connection check succeeds
- Redis ping/read-write test succeeds
- RabbitMQ connection test succeeds
- Swagger loads and lists baseline endpoints
- correlation ID is present in logs for incoming requests

### Day 1 execution verification checklist
Use this before closing the sprint day:
- `dotnet restore Syncra.sln` succeeds
- `dotnet build Syncra.sln` succeeds
- infrastructure containers are running
- API starts without startup exceptions
- `/api/v1/ping` returns success
- `/health/live` returns success
- `/health/ready` shows PostgreSQL, Redis, and RabbitMQ checks
- Swagger UI loads locally
- a Redis set/get round trip succeeds
- a RabbitMQ test publish succeeds
- logs contain correlation IDs
- global exception middleware returns consistent JSON

End-of-Day Checklist:
- [ ] solution structure created
- [ ] API boots locally
- [ ] PostgreSQL connection verified
- [ ] Redis connection verified
- [ ] RabbitMQ connection verified
- [ ] Swagger enabled
- [ ] health checks working
- [ ] global exception handling middleware added
- [ ] correlation ID middleware added
- [ ] setup notes updated