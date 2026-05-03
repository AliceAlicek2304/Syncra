# Architecture Patterns: Syncra

**Domain:** Social Media Management & AI Content Orchestration
**Researched:** 2026-05-02

## Recommended Architecture

Syncra should follow a **Modular Monolith** approach on the backend with a **Feature-Sliced** frontend.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Content Processor** | Orchestrates LLM chains for atomization. | LLM APIs, Database |
| **Signal Ingestor** | Scrapes and normalizes social trend data. | Social APIs, pgvector |
| **Post Scheduler** | Manages the queue and state of scheduled posts. | BullMQ, Social APIs |
| **Preview Engine** | Generates platform-specific mockups. | Metadata Scraper |

### Data Flow

1. **Atomization Flow**: User Input -> Content Processor (LangGraph) -> Split into Atoms -> Adaptation per Platform -> Save to Drafts.
2. **Trend Flow**: External APIs -> Signal Ingestor -> Embedding Generation -> Vector DB -> Trend Radar Dashboard.

## Patterns to Follow

### Pattern 1: Adapter Pattern for Platforms
**What:** Each social platform (Twitter, LinkedIn, FB) has its own "Adapter" that handles unique constraints (char limits, media sizes).
**Example:**
```typescript
interface PlatformAdapter {
  platform: string;
  validate(post: Post): ValidationResult;
  formatForAPI(post: Post): any;
  getPreviewProps(post: Post): PreviewProps;
}
```

### Pattern 2: Map-Reduce Summarization
**What:** For long-form content, split text into chunks, summarize each, then synthesize into final "atoms". This prevents hitting LLM token limits and maintains context.

### Pattern 3: Force-Directed Labeling
**What:** Use D3.js force simulation to prevent trend labels on the Radar from overlapping while keeping them close to their data points.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Scraping
**What:** Attempting to fetch OpenGraph tags directly from the browser.
**Why bad:** Will fail due to CORS and doesn't handle JS-heavy sites well.
**Instead:** Always proxy scraping through a backend service using `metascraper` or Puppeteer.

### Anti-Pattern 2: Hard-Coded Platform Limits
**What:** Inlining platform character limits in UI components.
**Why bad:** Platforms change limits frequently (e.g., Twitter Blue).
**Instead:** Centralize platform constraints in a config service or DB-backed registry.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **AI Costs** | Minimal | Significant | High (Requires fine-tuned models or self-hosting) |
| **Post Scheduling** | Single node | Redis-backed Cluster | Distributed Worker Mesh |
| **Trend Data** | In-memory cache | PostgreSQL/pgvector | Dedicated Vector Search Engine (Pinecone/Milvus) |

## Sources
- [Building a trend radar dashboard technical challenges](https://www.google.com/search?q=building+a+trend+radar+dashboard+technical+challenges)
- [LangChain Design Patterns](https://docs.langchain.com/design-patterns)
