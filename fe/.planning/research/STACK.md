# Technology Stack: Syncra

**Project:** Syncra
**Researched:** 2026-05-02
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18+ | Frontend UI | Team expertise and component ecosystem. |
| TypeScript | 5+ | Type Safety | Crucial for complex data structures like "Atoms" and "Trends". |
| Vite | Latest | Build Tool | Fastest DX for React. |

### AI & NLP
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| LangChain / LangGraph | Latest | LLM Orchestration | Best for multi-step content atomization workflows. |
| OpenAI API | GPT-4o | Core LLM | High reliability and excellent structured output support. |
| Anthropic API | Claude 3.5 | Alternate LLM | Superior at long-form content reasoning and tone adaptation. |
| Zod | Latest | Schema Validation | Ensures AI responses match UI expectations. |

### Data Visualization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| D3.js | 7+ | Radar Engine | Required for custom polar coordinate math in Trend Radar. |
| Nivo | Latest | Dashboard Charts | Beautiful, accessible heatmaps and line charts out of the box. |

### Backend & Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js / Express | Latest | API Layer | Unified language with frontend; great for scraping. |
| PostgreSQL | 15+ | Main Database | Relational integrity for schedules and user accounts. |
| pgvector | Latest | Trend Similarity | Allows searching for "related trends" via embeddings. |
| BullMQ / Redis | Latest | Task Queue | Essential for scheduling posts and long-running AI tasks. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @automattic/social-previews | Latest | Post Previews | To simulate Facebook/Twitter feed cards accurately. |
| metascraper | Latest | Metadata Extraction | To fetch OG tags from pasted links. |
| Puppeteer | Latest | Headless Scraping | To extract content from JavaScript-heavy blogs/sites. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Visualization | D3.js | Chart.js | Chart.js lacks robust support for custom radial/radar interactions. |
| LLM Orchestration | LangChain | Pure Fetch | Managing state, retries, and multi-step chains is too complex manually. |
| CSS | TailwindCSS | CSS Modules | Syncra is already using CSS Modules (as seen in codebase). Stick to current convention. |

## Installation

```bash
# Frontend Core
npm install d3 nivo @automattic/social-previews metascraper-js

# AI & Orchestration
npm install langchain @langchain/openai zod

# Dev Dependencies
npm install -D @types/d3
```

## Sources
- [Context7: LangChain](https://docs.langchain.com/)
- [Nivo Documentation](https://nivo.rocks/)
- [D3.js Documentation](https://d3js.org/)
