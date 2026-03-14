# Day 7 – Hardening, QA, and Deployment Readiness

Date / Time:
Day 7 of 7

Sprint:
Sprint 4 – Production Readiness

Focus Area:
Integration validation, retry and DLQ completion, observability, security hardening, CI checks, and staging deployment preparation.

Tasks:
- execute integration tests for identity, ideas, AI request persistence, posts, scheduling, support, and selected publish pipeline flows
- fix only release-blocking defects discovered during integration validation and document deferred issues explicitly
- finalize retry policies for queue consumers, outbound provider calls, email/notification delivery, and scheduled publishing operations
- complete dead-letter queue handling with retained failure metadata and operator visibility
- enable API rate limiting for public and high-risk mutation endpoints
- add or finalize OpenTelemetry tracing, metrics, structured logging fields, and health probes for API plus worker processes
- verify standardized success/error envelopes and correlation ID propagation across key endpoints
- finalize OpenAPI documentation for all shipped endpoints and ensure auth requirements are represented correctly
- wire CI checks to run build, lint/static analysis if applicable, tests, and migration validation steps
- run load smoke tests on critical read/write paths such as dashboard overview, ideas list, post list, and schedule endpoint
- prepare staging deployment configuration, migration execution steps, environment variables, and rollback procedure
- complete release readiness review covering security checklist, secret handling, auth validation, workspace isolation, upload validation, and observability coverage

---

## Task: Execute integration tests for critical backend modules

### Purpose
This task validates that the shipped modules work together in realistic end-to-end flows before staging or production deployment. The goal is to verify the release candidate behavior for identity, ideas, AI persistence, posts, scheduling, support, and the publish pipeline.

### Implementation Steps

#### Step 1
Create or finalize an integration test matrix covering:
- authentication and workspace resolution
- ideas creation and retrieval
- AI request persistence and result retrieval
- posts create/list/detail flows
- scheduling create/reschedule/cancel flows
- support ticket create/list/detail flows
- selected publish pipeline paths such as publish-now and scheduled dispatch

#### Step 2
Prepare test data strategy:
- use isolated test database
- seed one or more workspaces
- seed users with valid auth context
- seed linked social accounts or mock publish providers
- seed minimal analytics/support fixtures if required by dependent flows

#### Step 3
Split tests into critical-path suites:
- identity and auth suite
- content and scheduling suite
- integrations and publish suite
- support and notifications suite

#### Step 4
Run tests against a local or CI-ready environment using real infrastructure dependencies where practical:
- PostgreSQL
- Redis
- RabbitMQ

#### Step 5
Record failures in two buckets:
- release-blocking defects
- explicitly deferred post-MVP issues

### Commands

Example:
```/dev/null/commands.txt#L1-12
cd be

dotnet restore
dotnet build

# run all tests
dotnet test

# run integration tests only
dotnet test tests/Syncra.IntegrationTests

# optional: collect trx output
dotnet test tests/Syncra.IntegrationTests --logger "trx;LogFileName=integration-tests.trx"
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-18
be
├── src
│   ├── Syncra.Api
│   ├── Syncra.Application
│   ├── Syncra.Domain
│   ├── Syncra.Infrastructure
│   ├── Syncra.Workers
│   └── Syncra.Contracts
├── tests
│   ├── Syncra.UnitTests
│   ├── Syncra.IntegrationTests
│   │   ├── Identity
│   │   ├── Ideas
│   │   ├── Ai
│   │   ├── Posts
│   │   ├── Scheduling
│   │   ├── Publishing
│   │   └── Support
│   └── Syncra.ArchitectureTests
└── deploy
```

### Code Example

```/dev/null/PostsIntegrationTests.cs#L1-28
public sealed class PostsIntegrationTests
{
    [Fact]
    public async Task Create_post_then_list_returns_created_post()
    {
        // arrange
        using HttpClient client = TestApplicationFactory.CreateAuthenticatedClient();

        // act
        HttpResponseMessage createResponse = await client.PostAsJsonAsync(
            "/api/v1/posts",
            new
            {
                title = "Launch update",
                caption = "Production readiness sprint completed"
            });

        createResponse.EnsureSuccessStatusCode();

        HttpResponseMessage listResponse = await client.GetAsync("/api/v1/posts");
        listResponse.EnsureSuccessStatusCode();

        string json = await listResponse.Content.ReadAsStringAsync();

        // assert
        Assert.Contains("Launch update", json);
    }
}
```

### Verification

- Run the integration suite successfully
- Confirm all critical-path modules are covered
- Confirm tests use realistic auth and workspace scoping
- Confirm failed tests are triaged into release-blocking vs deferred issues

---

## Task: Fix only release-blocking defects and document deferred issues

### Purpose
This task prevents uncontrolled scope growth during stabilization. The team should fix only defects that block release readiness and explicitly document everything else for follow-up after MVP.

### Implementation Steps

#### Step 1
Define release-blocking criteria:
- security vulnerabilities affecting exposed features
- data corruption or incorrect workspace isolation
- broken critical-path endpoints
- migration failures
- publish pipeline failures that break core product promise
- staging deployment failure

#### Step 2
Review integration test failures and classify each defect:
- must-fix before release
- safe to defer
- non-issue / environment-only noise

#### Step 3
Fix only issues in the must-fix bucket.

#### Step 4
Create a deferred issues list with:
- title
- impact
- reproduction notes
- reason for deferral
- owner or target sprint if known

#### Step 5
Re-run impacted tests after each fix to confirm no regression.

### Commands

Example:
```/dev/null/commands.txt#L1-8
cd be

dotnet build
dotnet test tests/Syncra.IntegrationTests --filter "Category=Critical"

# rerun full suite before sign-off
dotnet test
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
be
├── docs
│   ├── qa
│   │   ├── release-blockers.md
│   │   └── deferred-issues.md
├── tests
│   └── Syncra.IntegrationTests
└── src
    ├── Syncra.Api
    ├── Syncra.Application
    └── Syncra.Infrastructure
```

### Code Example

```/dev/null/release-blocker-template.md#L1-10
# Release Blocker
- ID: RB-001
- Title: Cross-workspace support ticket access
- Severity: Critical
- Status: Fixed
- Root Cause: Missing workspace filter in ticket detail query
- Verification: Integration test SupportTicketSecurityTests passes
```

### Verification

- Confirm only release-blocking issues were fixed
- Confirm deferred issues are documented explicitly
- Confirm all impacted critical tests pass after fixes
- Confirm the team can explain why each deferred issue is safe

---

## Task: Finalize retry policies for queue consumers, outbound providers, notifications, and scheduled publishing

### Purpose
Transient failures are normal in distributed systems. This task ensures the system retries safely where appropriate without causing duplicate side effects or silent message loss.

### Implementation Steps

#### Step 1
List all retryable operations:
- RabbitMQ consumer processing
- outbound social provider calls
- email or notification channel delivery
- scheduled publish dispatch
- analytics/trend refresh jobs if applicable

#### Step 2
Define retry rules per operation:
- max attempts
- delay/backoff
- jitter
- retryable exception types
- terminal failure conditions

#### Step 3
Ensure operations are idempotent before retrying:
- publish attempts use deterministic idempotency key
- notification creation checks prior processing
- provider publish results do not create duplicate external records

#### Step 4
Implement policy wrappers around:
- HTTP clients
- background consumers
- worker job handlers

#### Step 5
Log every retry attempt with:
- correlation id
- attempt number
- entity id
- operation name
- failure reason

### Commands

Example:
```/dev/null/commands.txt#L1-7
cd be

dotnet add src/Syncra.Infrastructure package Polly
dotnet add src/Syncra.Infrastructure package Polly.Extensions.Http

dotnet build
dotnet test
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-15
src
├── Syncra.Application
│   └── Common
│       └── Resilience
│           ├── RetryPolicyOptions.cs
│           └── RetryPolicyNames.cs
├── Syncra.Infrastructure
│   ├── Resilience
│   │   ├── HttpRetryPolicyFactory.cs
│   │   ├── QueueRetryPolicyFactory.cs
│   │   └── NotificationRetryPolicyFactory.cs
│   └── Providers
└── Syncra.Workers
    └── Consumers
```

### Code Example

```/dev/null/HttpRetryPolicyFactory.cs#L1-29
public static class HttpRetryPolicyFactory
{
    public static IAsyncPolicy<HttpResponseMessage> CreateDefault()
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (outcome, delay, attempt, context) =>
                {
                    // add structured logging here
                });
    }
}
```

### Configuration Examples

```/dev/null/appsettings.json#L1-14
{
  "RetryPolicies": {
    "ProviderCalls": {
      "MaxAttempts": 3,
      "BaseDelaySeconds": 2
    },
    "Notifications": {
      "MaxAttempts": 5,
      "BaseDelaySeconds": 10
    }
  }
}
```

### Verification

- Simulate transient provider failure and confirm retries occur
- Confirm retries stop at configured max attempts
- Confirm duplicate side effects are not created
- Confirm retry attempts are visible in logs

---

## Task: Complete dead-letter queue handling with retained failure metadata

### Purpose
Messages that cannot be processed successfully after retries must be retained safely with enough metadata for operators to investigate and recover.

### Implementation Steps

#### Step 1
Define queues that require DLQ behavior:
- publish requests
- notification delivery jobs
- analytics refresh jobs if queued
- support event consumers if queued

#### Step 2
Configure RabbitMQ dead-letter exchange and dead-letter queues for each relevant queue.

#### Step 3
Ensure failed messages preserve metadata:
- correlation id
- original routing key
- message type
- failure reason
- retry count
- timestamp
- relevant entity ids

#### Step 4
Persist failure details either:
- in message headers only
- or additionally in a `dead_letter_events` or operations table for operator visibility

#### Step 5
Expose operator visibility:
- logs
- admin query/report
- dashboard later if not in MVP

### Commands

Example:
```/dev/null/commands.txt#L1-6
cd be
dotnet build
dotnet run --project src/Syncra.Workers

# inspect RabbitMQ UI at http://localhost:15672
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-14
src
├── Syncra.Contracts
│   └── Messaging
│       └── DeadLetterMessageMetadata.cs
├── Syncra.Infrastructure
│   └── Messaging
│       ├── RabbitMqTopologyBuilder.cs
│       ├── DeadLetterPublisher.cs
│       └── DeadLetterStore.cs
└── Syncra.Workers
    └── Consumers
        ├── PublishRequestConsumer.cs
        └── NotificationConsumer.cs
```

### Code Example

```/dev/null/DeadLetterMessageMetadata.cs#L1-18
public sealed record DeadLetterMessageMetadata(
    string MessageType,
    string CorrelationId,
    string RoutingKey,
    int RetryCount,
    string FailureReason,
    DateTimeOffset FailedAtUtc,
    string PayloadJson);
```

### Configuration Examples

RabbitMQ connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "RabbitMq": "amqp://syncra:syncra@localhost:5672"
  }
}
```

Basic RabbitMQ test publisher:
```/dev/null/RabbitMqDlqSmokeTest.cs#L1-28
var factory = new ConnectionFactory
{
    Uri = new Uri("amqp://syncra:syncra@localhost:5672")
};

using IConnection connection = factory.CreateConnection();
using IModel channel = connection.CreateModel();

channel.ExchangeDeclare("publish.exchange", ExchangeType.Direct, durable: true);
channel.ExchangeDeclare("publish.dlx", ExchangeType.Direct, durable: true);
channel.QueueDeclare("publish.requests", durable: true, exclusive: false, autoDelete: false);
channel.QueueDeclare("publish.requests.dlq", durable: true, exclusive: false, autoDelete: false);

channel.QueueBind("publish.requests", "publish.exchange", "publish.request");
channel.QueueBind("publish.requests.dlq", "publish.dlx", "publish.request.dlq");
```

### Verification

- Force a consumer to exceed retries
- Confirm the message is moved to DLQ
- Confirm failure metadata is retained
- Confirm operators can identify failed message cause quickly

---

## Task: Enable API rate limiting for public and high-risk mutation endpoints

### Purpose
Rate limiting protects the system from abuse, accidental client floods, and brute-force behavior on sensitive endpoints.

### Implementation Steps

#### Step 1
Identify endpoints that need rate limiting:
- auth endpoints
- integration connect/callback endpoints
- publish-now endpoint
- support ticket creation
- AI generation endpoints
- any public or semi-public webhook-style endpoints

#### Step 2
Choose policy types:
- fixed window
- sliding window
- token bucket
Use simple and explainable policies for MVP.

#### Step 3
Define named policies such as:
- `auth-strict`
- `public-moderate`
- `mutation-sensitive`

#### Step 4
Apply policies selectively using endpoint mapping configuration.

#### Step 5
Return standardized limit responses including:
- HTTP `429`
- retry-after where possible
- consistent error envelope

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet run --project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-11
src
├── Syncra.Api
│   ├── Middleware
│   ├── Endpoints
│   └── RateLimiting
│       ├── RateLimitPolicies.cs
│       └── RateLimitExtensions.cs
└── Syncra.Application
    └── Common
```

### Code Example

```/dev/null/Program.cs#L1-38
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("mutation-sensitive", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

var app = builder.Build();

app.UseRateLimiter();
```

### Configuration Examples

```/dev/null/appsettings.json#L1-12
{
  "RateLimiting": {
    "AuthStrictPerMinute": 5,
    "MutationSensitivePerMinute": 10,
    "PublicModeratePerMinute": 30
  }
}
```

### Verification

- Send repeated requests to a protected endpoint
- Confirm `429 Too Many Requests` is returned after threshold
- Confirm response envelope is standardized
- Confirm unaffected endpoints continue working normally

---

## Task: Add or finalize OpenTelemetry tracing, metrics, structured logging, and health probes

### Purpose
Observability must be complete enough for operators to diagnose failures in the API and worker processes after deployment.

### Implementation Steps

#### Step 1
Instrument API and worker processes with:
- distributed tracing
- request metrics
- queue/consumer metrics
- structured logs

#### Step 2
Add trace context propagation:
- HTTP request to MediatR handler
- API to outbound provider call
- API to queue message
- queue consumer to downstream operations

#### Step 3
Record useful attributes:
- workspace id
- user id where safe
- correlation id
- endpoint name
- message type
- provider
- operation status

#### Step 4
Configure exporters:
- OTLP exporter for traces/metrics if available
- console exporter locally if staging exporter is not yet available

#### Step 5
Ensure health probes exist for both API and worker processes.

### Commands

Example:
```/dev/null/commands.txt#L1-8
cd be

dotnet add src/Syncra.Api package OpenTelemetry.Extensions.Hosting
dotnet add src/Syncra.Api package OpenTelemetry.Exporter.Console
dotnet add src/Syncra.Api package OpenTelemetry.Exporter.OpenTelemetryProtocol

dotnet build
dotnet run --project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-16
src
├── Syncra.Api
│   ├── Observability
│   │   ├── TelemetryExtensions.cs
│   │   └── LoggingEnrichmentMiddleware.cs
├── Syncra.Workers
│   └── Observability
│       └── WorkerTelemetryExtensions.cs
├── Syncra.Infrastructure
│   └── Logging
│       └── StructuredLogContext.cs
└── Syncra.Contracts
```

### Code Example

```/dev/null/TelemetryExtensions.cs#L1-34
public static class TelemetryExtensions
{
    public static IServiceCollection AddSyncraTelemetry(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOpenTelemetry()
            .WithTracing(tracing =>
            {
                tracing
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddSource("Syncra.Api", "Syncra.Workers");
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();
            });

        return services;
    }
}
```

### Configuration Examples

```/dev/null/appsettings.json#L1-10
{
  "OpenTelemetry": {
    "ServiceName": "syncra-backend",
    "OtlpEndpoint": "http://localhost:4317"
  }
}
```

### Verification

- Confirm traces appear in the configured sink/exporter
- Confirm metrics are emitted for API and worker processes
- Confirm logs include structured fields like correlation id and workspace id
- Confirm health probes respond for both API and worker runtimes

---

## Task: Verify standardized success/error envelopes and correlation ID propagation

### Purpose
Consistent response envelopes and correlation IDs make debugging, client integration, and support operations much easier.

### Implementation Steps

#### Step 1
Identify the standard API response patterns:
- success envelope
- validation error envelope
- unauthorized/forbidden envelope
- not-found envelope
- conflict envelope
- rate-limit envelope

#### Step 2
Review representative endpoints from each major module:
- auth
- ideas
- posts
- support
- analytics
- publish-now

#### Step 3
Confirm correlation ID behavior:
- accepted from incoming request if allowed
- generated if absent
- attached to logs
- attached to responses or response headers
- propagated into queue message metadata

#### Step 4
Patch any outlier endpoints to match the standard.

### Commands

Example:
```/dev/null/commands.txt#L1-7
cd be
dotnet build
dotnet run --project src/Syncra.Api

curl -i http://localhost:5000/api/v1/analytics/overview
curl -i http://localhost:5000/api/v1/support/tickets
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
src
├── Syncra.Api
│   ├── Middleware
│   │   ├── CorrelationIdMiddleware.cs
│   │   └── ExceptionHandlingMiddleware.cs
│   └── Contracts
│       ├── ApiSuccessEnvelope.cs
│       └── ApiErrorEnvelope.cs
└── Syncra.Application
    └── Common
```

### Code Example

```/dev/null/ApiErrorEnvelope.cs#L1-14
public sealed record ApiErrorEnvelope(
    string Error,
    string Message,
    string CorrelationId,
    IReadOnlyCollection<string>? Details);
```

### Verification

- Confirm representative success responses follow one structure
- Confirm representative errors follow one structure
- Confirm correlation ID appears in logs and headers consistently
- Confirm queue metadata preserves the same correlation ID

---

## Task: Finalize OpenAPI documentation for all shipped endpoints

### Purpose
The release candidate should have accurate, complete, and trustworthy API documentation for frontend, QA, and staging validation.

### Implementation Steps

#### Step 1
Review all modules shipped in Days 1–6:
- auth and identity
- ideas
- AI generation
- posts and media
- scheduling
- integrations
- publishing
- analytics
- trends
- support

#### Step 2
Ensure each endpoint documents:
- route
- request schema
- response schema
- auth requirement
- common errors
- example payloads
- rate limit behavior where relevant

#### Step 3
Fix missing or misleading endpoint docs.

#### Step 4
Ensure bearer auth/security schemes are represented correctly in Swagger.

### Commands

Example:
```/dev/null/commands.txt#L1-4
cd be
dotnet build
dotnet run --project src/Syncra.Api
# open /swagger
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-9
src
├── Syncra.Api
│   ├── Endpoints
│   ├── Swagger
│   │   ├── SwaggerExamples.cs
│   │   └── SwaggerSecurityConfiguration.cs
│   └── Program.cs
└── docs
```

### Code Example

```/dev/null/Program.cs#L1-28
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Syncra API",
        Version = "v1",
        Description = "Production readiness release candidate"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
});
```

### Verification

- Open Swagger UI and inspect all shipped modules
- Confirm auth requirements are visible
- Confirm schemas and examples match actual behavior
- Confirm no placeholder or stale docs remain

---

## Task: Wire CI checks for build, analysis, tests, and migration validation

### Purpose
CI must block obviously broken builds and verify that database migrations and tests are valid before deployment.

### Implementation Steps

#### Step 1
Define CI stages:
- restore
- build
- static analysis or lint where applicable
- unit tests
- integration tests or smoke subset
- migration validation

#### Step 2
Add migration validation step:
- build startup project
- verify migrations compile
- optionally run database update against ephemeral PostgreSQL

#### Step 3
Fail pipeline on:
- build errors
- failing tests
- invalid migrations
- analysis errors designated as blocking

#### Step 4
Publish artifacts if useful:
- test reports
- trx files
- coverage reports
- generated OpenAPI file if desired

### Commands

Example:
```/dev/null/commands.txt#L1-10
cd be

dotnet restore
dotnet build --configuration Release
dotnet test --configuration Release

dotnet ef migrations list \
  --project src/Syncra.Infrastructure \
  --startup-project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-11
be
├── .github
│   └── workflows
│       └── be-ci.yml
├── src
├── tests
└── docs
    └── deployment
```

### Code Example

```/dev/null/be-ci.yml#L1-34
name: be-ci

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'
      - name: Restore
        run: dotnet restore
        working-directory: be
      - name: Build
        run: dotnet build --configuration Release --no-restore
        working-directory: be
      - name: Test
        run: dotnet test --configuration Release --no-build
        working-directory: be
```

### Verification

- Run CI on a branch or pull request
- Confirm build and tests execute
- Confirm migration validation step runs
- Confirm pipeline fails on intentionally broken changes

---

## Task: Run load smoke tests on critical read and write paths

### Purpose
The goal is not full-scale performance certification. The goal is to identify obvious bottlenecks or failures on the most important endpoints before staging sign-off.

### Implementation Steps

#### Step 1
Select endpoints to smoke test:
- dashboard overview
- ideas list
- post list
- schedule create or update
- optionally support ticket creation

#### Step 2
Define modest local/staging thresholds:
- concurrent users
- requests per second
- latency budget
- acceptable error rate

#### Step 3
Run short tests against a realistic environment with seed data.

#### Step 4
Inspect:
- latency
- error rate
- rate limiting behavior
- DB/Redis/RabbitMQ saturation signs
- logs and traces during load

### Commands

Example:
```/dev/null/commands.txt#L1-14
cd be

# example with k6 if available
k6 run scripts/load/dashboard-overview.js
k6 run scripts/load/post-list.js
k6 run scripts/load/schedule-create.js
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
be
├── scripts
│   └── load
│       ├── dashboard-overview.js
│       ├── ideas-list.js
│       ├── post-list.js
│       └── schedule-create.js
├── docs
│   └── qa
│       └── load-smoke-results.md
└── src
```

### Code Example

```/dev/null/dashboard-overview.js#L1-19
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s'
};

export default function () {
  const response = http.get('http://localhost:5000/api/v1/analytics/overview');
  check(response, {
    'status is 200': r => r.status === 200 || r.status === 401
  });
  sleep(1);
}
```

### Verification

- Confirm tested endpoints stay within acceptable latency
- Confirm no unexpected 5xx spikes occur
- Confirm logs and traces remain usable during load
- Confirm load results are documented for the team

---

## Task: Prepare staging deployment configuration, migrations, environment variables, and rollback procedure

### Purpose
The team must be able to deploy the release candidate to staging in a repeatable way without improvising operational steps.

### Implementation Steps

#### Step 1
Create a staging deployment checklist:
- required environment variables
- secrets location
- migration execution order
- API deployment steps
- worker deployment steps
- smoke validation steps

#### Step 2
List required environment variables:
- database connection string
- Redis connection string
- RabbitMQ connection string
- JWT settings
- provider client IDs and secrets
- storage credentials
- telemetry exporter settings
- rate limit settings
- feature flags if any

#### Step 3
Document migration process:
- backup strategy if applicable
- run migrations
- verify schema version
- verify app startup after migration

#### Step 4
Document rollback:
- app rollback
- worker rollback
- migration rollback or restore strategy
- message queue safety considerations

### Commands

Example:
```/dev/null/commands.txt#L1-10
cd be

dotnet ef database update \
  --project src/Syncra.Infrastructure \
  --startup-project src/Syncra.Api

dotnet run --project src/Syncra.Api
dotnet run --project src/Syncra.Workers
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-12
be
├── deploy
│   ├── staging
│   │   ├── appsettings.Staging.json.example
│   │   ├── deploy-checklist.md
│   │   └── rollback-plan.md
│   └── docker
├── docs
│   └── deployment
│       └── staging-runbook.md
└── src
```

### Code Example

```/dev/null/appsettings.Staging.json.example#L1-16
{
  "ConnectionStrings": {
    "Postgres": "Host=staging-db;Port=5432;Database=syncra;Username=syncra;Password=from-secret-store",
    "Redis": "staging-redis:6379,abortConnect=false",
    "RabbitMq": "amqp://syncra:from-secret-store@staging-rabbitmq:5672"
  },
  "Jwt": {
    "Issuer": "syncra-staging",
    "Audience": "syncra-staging-clients",
    "SigningKey": "load-from-secret-store"
  }
}
```

### Verification

- Confirm staging runbook can be followed step by step
- Confirm all required environment variables are documented
- Confirm migration and rollback steps are explicit
- Confirm API and worker startup verification steps are present

---

## Task: Complete release readiness review for security, secrets, auth, isolation, validation, and observability

### Purpose
This final review ensures the backend is safe and operable enough for release. It acts as the engineering sign-off gate.

### Implementation Steps

#### Step 1
Review security checklist:
- secrets not committed
- no plaintext provider tokens in logs
- JWT validation configured
- upload validation enforced
- rate limiting enabled where required

#### Step 2
Review data isolation:
- workspace scoping on all sensitive endpoints
- cross-workspace access tests pass
- audit logs for sensitive mutations exist

#### Step 3
Review operational readiness:
- traces and metrics visible
- health checks working
- retry and DLQ behavior verified
- staging deployment guide prepared

#### Step 4
Record readiness decision:
- ready
- ready with accepted risks
- not ready

#### Step 5
Capture any accepted risks explicitly with owner and remediation plan.

### Commands

Example:
```/dev/null/commands.txt#L1-6
cd be
dotnet build
dotnet test
dotnet run --project src/Syncra.Api
dotnet run --project src/Syncra.Workers
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-10
docs
├── qa
│   ├── release-readiness-review.md
│   ├── accepted-risks.md
│   └── security-checklist.md
└── deployment
    └── staging-runbook.md
```

### Code Example

```/dev/null/release-readiness-review.md#L1-14
# Release Readiness Review
- Status: Ready with accepted risks
- Date: 2025-01-01
- Reviewed Areas:
  - Security
  - Workspace isolation
  - Observability
  - Retry and DLQ
  - CI validation
- Accepted Risks:
  - Trend ingestion remains seeded for MVP
```

### Verification

- Confirm the review document exists
- Confirm all checklist areas have explicit outcomes
- Confirm accepted risks are documented and owned
- Confirm the team can explain why the build is release-ready

---

## Task: Infrastructure baseline for PostgreSQL, Redis, and RabbitMQ

### Purpose
The release candidate must be validated against the same core infrastructure used by the backend. PostgreSQL supports persistence, Redis supports caching and short-lived coordination, and RabbitMQ supports queueing and DLQ behavior.

### Implementation Steps

#### Step 1
Create or reuse a Docker Compose stack for:
- PostgreSQL
- Redis
- RabbitMQ with management UI

#### Step 2
Wire connection strings into API, worker, and test configuration.

#### Step 3
Verify each service independently before full-system validation:
- PostgreSQL query
- Redis set/get
- RabbitMQ test publish

#### Step 4
Use this same infrastructure stack for integration testing and staging-like smoke validation.

### Commands

Docker Compose example:
```/dev/null/docker-compose.yml#L1-31
version: '3.9'
services:
  postgres:
    image: postgres:16
    container_name: syncra-postgres
    environment:
      POSTGRES_DB: syncra
      POSTGRES_USER: syncra
      POSTGRES_PASSWORD: syncra
    ports:
      - "5432:5432"
    volumes:
      - syncra-postgres:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: syncra-redis
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    container_name: syncra-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: syncra
      RABBITMQ_DEFAULT_PASS: syncra
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  syncra-postgres:
```

Start services:
```/dev/null/commands.txt#L1-5
cd be
docker compose up -d
docker ps
```

PostgreSQL connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=syncra;Username=syncra;Password=syncra"
  }
}
```

Redis connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "Redis": "localhost:6379,abortConnect=false"
  }
}
```

RabbitMQ connection string format:
```/dev/null/appsettings.json#L1-5
{
  "ConnectionStrings": {
    "RabbitMq": "amqp://syncra:syncra@localhost:5672"
  }
}
```

Basic PostgreSQL test operation:
```/dev/null/postgres-test.sql#L1-2
SELECT NOW();
SELECT 1;
```

Basic Redis test operation:
```/dev/null/redis-test.txt#L1-4
redis-cli -p 6379
SET day7:ready ok
GET day7:ready
```

Basic RabbitMQ test publisher:
```/dev/null/RabbitMqSmokeTest.cs#L1-24
var factory = new ConnectionFactory
{
    Uri = new Uri("amqp://syncra:syncra@localhost:5672")
};

using IConnection connection = factory.CreateConnection();
using IModel channel = connection.CreateModel();

channel.QueueDeclare("day7-smoke", durable: true, exclusive: false, autoDelete: false);

byte[] body = Encoding.UTF8.GetBytes("{\"message\":\"day7-smoke\"}");

channel.BasicPublish(
    exchange: "",
    routingKey: "day7-smoke",
    basicProperties: null,
    body: body);
```

### Verification

- Confirm PostgreSQL accepts connections
- Confirm Redis set/get works
- Confirm RabbitMQ UI opens at `http://localhost:15672`
- Confirm test queue messages can be published

---

## Task: ASP.NET Core setup for production readiness hardening

### Purpose
The API and worker applications must register the services required for rate limiting, telemetry, health checks, middleware, retry policies, and Swagger so Day 7 hardening is operationally complete.

### Implementation Steps

#### Step 1
Register:
- DbContext
- MediatR/application handlers
- retry/resilience services
- rate limiting
- OpenTelemetry
- Swagger
- authentication and authorization
- health checks
- correlation id middleware
- exception handling middleware

#### Step 2
Map endpoint groups and health endpoints.

#### Step 3
Ensure worker startup also registers:
- consumers
- retry handling
- DLQ topology
- telemetry
- health reporting if supported

#### Step 4
Verify configuration is environment-driven and secrets are externalized.

### Commands

Example:
```/dev/null/commands.txt#L1-9
cd be

dotnet add src/Syncra.Api package AspNetCore.HealthChecks.NpgSql
dotnet add src/Syncra.Api package AspNetCore.HealthChecks.Redis
dotnet add src/Syncra.Api package AspNetCore.HealthChecks.Rabbitmq
dotnet add src/Syncra.Api package OpenTelemetry.Extensions.Hosting

dotnet build
dotnet run --project src/Syncra.Api
```

### Expected Folder Structure

```/dev/null/structure.txt#L1-15
src
├── Syncra.Api
│   ├── Program.cs
│   ├── Middleware
│   ├── Observability
│   └── RateLimiting
├── Syncra.Workers
│   ├── Program.cs
│   ├── Consumers
│   └── Observability
├── Syncra.Infrastructure
│   ├── Messaging
│   ├── Resilience
│   └── Logging
└── Syncra.Application
```

### Code Example

```/dev/null/Program.cs#L1-67
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("mutation-sensitive", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
    });
});

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Postgres")!)
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!)
    .AddRabbitMQ(rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMq"));

builder.Services.AddSyncraTelemetry(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready");
app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));

app.Run();
```

### Verification

- Start API successfully
- Confirm Swagger loads
- Confirm rate limiter middleware is active
- Confirm health endpoints respond
- Confirm telemetry and auth services resolve at startup

---

## Task: Add health checks for API and worker liveness/readiness

### Purpose
Production readiness requires health signals that can be used by local smoke tests, staging probes, and deployment orchestration.

### Implementation Steps

#### Step 1
Register dependency-backed readiness checks for:
- PostgreSQL
- Redis
- RabbitMQ

#### Step 2
Expose:
- `/health`
- `/health/ready`
- `/health/live`

#### Step 3
Use tags so readiness includes dependencies while liveness remains lightweight.

#### Step 4
Add equivalent worker health reporting if the hosting model supports it, or document worker validation via logs and startup checks.

### Commands

Example:
```/dev/null/commands.txt#L1-6
cd be
dotnet build
dotnet run --project src/Syncra.Api

curl http://localhost:5000/health
curl http://localhost:5000/health/ready
curl http://localhost:5000/health/live
```

### Code Example

```/dev/null/Program.cs#L1-44
builder.Services.AddHealthChecks()
    .AddNpgSql(
        connectionString: builder.Configuration.GetConnectionString("Postgres")!,
        name: "postgres",
        tags: new[] { "ready" })
    .AddRedis(
        redisConnectionString: builder.Configuration.GetConnectionString("Redis")!,
        name: "redis",
        tags: new[] { "ready" })
    .AddRabbitMQ(
        rabbitConnectionString: builder.Configuration.GetConnectionString("RabbitMq"),
        name: "rabbitmq",
        tags: new[] { "ready" });

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});
```

### Verification

- `/health/live` returns healthy while process is running
- `/health/ready` fails if PostgreSQL, Redis, or RabbitMQ is unavailable
- `/health` returns aggregate health result
- Stop one dependency and confirm readiness changes accordingly

---

Deliverables:
- validated release candidate backend
- completed retry and DLQ handling baseline
- observability and rate limiting enabled
- reviewed OpenAPI documentation
- CI pipeline verification steps and staging deployment guide
- release and rollback checklist for the engineering team

Dependencies:
- all functional modules from Days 1–6 available in a deployable state
- CI environment and staging target reachable
- metrics/tracing exporters or local substitutes available for validation
- test data or seed fixtures available for critical-path validation

Blocker Check:
- verify no unresolved schema migration issues remain before staging deploy
- verify CI secrets and deployment variables are configured outside source control
- verify integration failures are triaged into must-fix vs post-MVP backlog clearly
- verify observability signals are actually emitted and not only configured in code

Test Criteria:
- critical integration test suite passes for shipped modules
- retry policies behave correctly for transient failure scenarios
- failed messages/jobs are routed to DLQ with actionable metadata
- rate limiting returns expected responses when thresholds are exceeded
- traces, metrics, and structured logs are visible in the chosen sink/exporter
- staging deployment starts successfully and migrations execute without manual correction
- documented rollback path can be followed if deployment validation fails

End-of-Day Checklist:
- [ ] integration tests executed
- [ ] release-blocking defects fixed or documented
- [ ] retry policies finalized
- [ ] DLQ handling enabled
- [ ] rate limiting enabled
- [ ] metrics and tracing verified
- [ ] success/error envelopes validated
- [ ] correlation ID propagation validated
- [ ] OpenAPI docs finalized
- [ ] CI checks verified
- [ ] load smoke tests completed
- [ ] staging deployment guide prepared
- [ ] rollback plan documented
- [ ] health endpoints `/health`, `/health/ready`, and `/health/live` working
- [ ] release readiness review completed