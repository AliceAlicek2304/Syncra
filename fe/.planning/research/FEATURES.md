# Feature Landscape

**Domain:** Social Media Dashboards & Scheduling
**Researched:** 2025-05-02

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Multi-Account Connection** | A user manages a brand across multiple networks (Twitter, LinkedIn, Instagram). | Medium | Requires robust OAuth token management and refresh strategies. |
| **Visual Calendar** | Users need to see their content strategy over time to identify gaps. | High | Drag-and-drop rescheduling must feel instant and handle timezone shifts. |
| **Media Uploads** | Social media is visual; text-only is insufficient. | High | Must handle varied aspect ratios, file limits, and potentially video transcoding. |
| **Basic Analytics** | Users need to know if their posts are performing well. | Medium | Fetching engagement data (likes, shares, clicks) is standard. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI Idea Generation** | Cures "writer's block" by turning keywords/links into actionable drafts. | Low-Med | Syncra's core value. Prompt engineering is key to quality. |
| **AI Coaching** | Suggests optimal times to post, better hashtags, or edits to tone based on real-time trends. | High | Requires integrating with an LLM and providing context of past performance. |
| **One-Click Repurposing** | Takes a long-form post (LinkedIn) and splits it into a thread (Twitter) or script (TikTok). | Medium | Massively saves time for creators. Requires the Multi-Platform Adapter pattern. |
| **Command Palette** | Allows power users to navigate and trigger actions without lifting their hands off the keyboard. | Medium | Differentiates the UX from clunky traditional dashboards. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Follower Bots / Auto-DMs** | High risk of violating platform Terms of Service, leading to user accounts being banned. | Focus on *content quality* (AI Coach) rather than artificial engagement. |
| **Bulk Spamming** | Damages brand reputation and trips spam filters. | Emphasize tailored, multi-platform publishing. |
| **Full CRM/Inbox Management** | Replying to every DM and comment is a separate domain (Customer Support) from Content Creation. | Integrate with specialized tools or defer to a much later phase. |

## Feature Dependencies

```
Multi-Account Connection → Multi-Platform Publishing (Needs accounts to publish to)
Visual Calendar → Multi-Platform Publishing (Needs posts to schedule)
AI Repurposing → Multi-Platform Publishing (Needs the adapter structure)
Basic Analytics → Multi-Account Connection (Needs access to platform insights)
```

## MVP Recommendation

Prioritize:
1. **Multi-Account Connection** (Table stakes)
2. **Multi-Platform Composer** (Table stakes + Core logic)
3. **AI Idea Generation** (Differentiator)
4. **Visual Calendar** (Table stakes)

Defer:
- AI Coaching (Phase 2)
- Command Palette (Phase 2/3)
- Deep Analytics (Phase 3)

## Sources

- [Competitor Analysis: Hootsuite vs Buffer vs Sprout Social]
- [Syncra Requirements Document (v1 Requirements)]
