# Domain Pitfalls: Syncra

**Domain:** Social Media Management & AI Content Orchestration
**Researched:** 2026-05-02

## Critical Pitfalls

### Pitfall 1: Over-Reliance on AI Accuracy
**What goes wrong:** AI summarizes content but hallucinates facts or includes "forbidden" content for specific platforms.
**Prevention:** Always require a "Human-in-the-loop" step before scheduling. Use Zod schemas to flag unexpected output types.

### Pitfall 2: Platform API Rate Limits
**What goes wrong:** Sending 10+ posts simultaneously or scraping trends too frequently triggers rate limits or temporary bans.
**Prevention:** Implement exponential backoff in the task queue (BullMQ). Use a proxy service for scraping if necessary.

### Pitfall 3: Stale Previews
**What goes wrong:** LinkedIn or X changes their CSS/Layout, and the Syncra preview looks completely different from reality.
**Prevention:** Implement visual regression tests for previews. Use third-party libraries like `@automattic/social-previews` which are maintained by teams focused on this.

## Moderate Pitfalls

### Pitfall 1: Coordinate Math in D3
**What goes wrong:** Radar chart becomes unreadable when trends cluster at similar maturity levels.
**Prevention:** Use jittering (small random offsets) and force-directed label placement to ensure readability.

### Pitfall 2: Media Optimization
**What goes wrong:** Uploading a high-res video that is rejected by Twitter but accepted by LinkedIn.
**Prevention:** Implement client-side and server-side media validation based on platform-specific adapters.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **AI Atomization** | Token limit errors on long-form content. | Use Map-Reduce or Recursive Character Splitting. |
| **Trend Radar** | Performance lag with >100 SVG elements. | Optimize D3 rendering; consider Canvas for extremely high density. |
| **Multi-Posting** | Failed OAuth token refresh mid-post. | Robust token management and retry logic in background workers. |

## Sources
- [Post-mortem: Why our social media tool got banned](Community Wisdom)
- [D3.js Force Simulation Best Practices](https://d3js.org/)
