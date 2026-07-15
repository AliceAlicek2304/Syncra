# Validation Report

## Story

- ID: US-005
- Title: Instagram Platform Integration

## Environment

- OS: Windows 11
- Date: 2026-07-15
- Test Framework: Playwright v1.61.1
- Runtime: Node.js, .NET 8.0 SDK

## Execution

The integration was validated through the following phases:
1. **Compilation Validation**: Dotnet build was executed on the backend project (`be/src/Syncra.Api/Syncra.Api.csproj`) and npm run build was executed on the frontend client (`fe`), both completing successfully without errors.
2. **E2E Automation Validation**: A new E2E test suite `fe/tests/e2e/instagram-flows.spec.ts` was written. The test simulates:
   - Mocking the active workspaces, profiles, and social accounts api responses (specifically connecting an Instagram Business account `acc_instagram123`).
   - Logging in via localStorage and navigating to the Post composer.
   - Composer interactions: filling text, uploading an image (Instagram required media validation), selecting the Instagram profile, expanding advanced platforms settings accordion, setting `publishAs = reel`, `locationId = locations/123`, `altText = My Alt Text`, and `firstComment = My First Comment`.
   - Confirming and publishing the post.
   - Intercepting the outbound POST request and verifying the payload formats mapping to the backend contract structure.

## Proof

### Backend Build Output
```text
  Syncra.Domain -> D:\Code\Syncra\be\src\Syncra.Domain\bin\Debug\net8.0\Syncra.Domain.dll
  Syncra.Shared -> D:\Code\Syncra\be\src\Syncra.Shared\bin\Debug\net8.0\Syncra.Shared.dll
  Syncra.Application -> D:\Code\Syncra\be\src\Syncra.Application\bin\Debug\net8.0\Syncra.Application.dll
  Syncra.Infrastructure -> D:\Code\Syncra\be\src\Syncra.Infrastructure\bin\Debug\net8.0\Syncra.Infrastructure.dll
  Syncra.Api -> D:\Code\Syncra\be\src\Syncra.Api\bin\Debug\net8.0\Syncra.Api.dll

Build succeeded.
    0 Error(s)
```

### Frontend Build Output
```text
vite v7.3.1 building client environment for production...
✓ 3601 modules transformed.
dist/index.html                           0.47 kB │ gzip:   0.30 kB
dist/assets/index-q6v2-MqM.css          306.45 kB │ gzip:  51.94 kB
dist/assets/index-zqr_g5yc.js         2,224.17 kB │ gzip: 668.92 kB
✓ built in 8.47s
```

### Playwright E2E Output
```text
Running 3 tests using 3 workers
  3 passed (28.3s)
```
Passed on Desktop Chromium.
