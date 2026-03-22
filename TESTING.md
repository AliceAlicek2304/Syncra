# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

**vitest** (v4.x) + **@testing-library/react** (v16.x)

## Run Tests

```bash
cd fe
npm run test        # Run all tests once
npm run test:watch  # Watch mode for development
```

## Test Layers

| Layer | Where | What |
|-------|-------|------|
| Unit tests | `src/**/*.{test,spec}.{ts,tsx}` | Pure functions, hooks, components |
| Integration tests | `src/**/*.{test,spec}.{ts,tsx}` | API services with mocked HTTP |
| Component tests | `src/**/*.{test,spec}.{ts,tsx}` | UI rendering with @testing-library |

## Conventions

- Test files live next to the source files they test: `Component.tsx` → `Component.test.tsx`
- Use `@testing-library/react` for component rendering and user interactions
- Mock all external dependencies (API calls via `vi.mock`, modules via `vi.mock`)
- Prefer `screen.getByRole` and `screen.getByLabelText` over `screen.getByTestId`
- Async tests: use `waitFor` from `@testing-library/react` or `findBy*` queries

## Expectations

- 100% test coverage is the goal
- When writing new components, write a corresponding test
- When fixing a bug, write a regression test
- When adding error handling, write a test that triggers the error
- When adding a conditional (if/else, switch), write tests for BOTH paths
- Never commit code that makes existing tests fail
