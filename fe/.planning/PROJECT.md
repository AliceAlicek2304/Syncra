# Syncra

## What This Is

Syncra is an AI-powered social media management platform designed to help users generate ideas, create content for multiple platforms, and schedule posts efficiently. It targets creators and marketing teams looking to streamline their social media workflow with AI assistance.

## Core Value

Streamline social media content creation and management through intelligent AI assistance and multi-platform orchestration.

## Requirements

### Validated

- âœ“ AI-powered idea generation for social media posts â€” existing
- âœ“ Multi-platform post editor with platform-specific previews â€” existing
- âœ“ Visual content calendar for scheduling and management â€” existing
- âœ“ Analytics dashboard for tracking post performance â€” existing
- âœ“ Trend radar for monitoring social media trends â€” existing
- âœ“ Billing and subscription management system â€” existing

### Active

- [ ] Support for Buffer and Hootsuite-like scheduling and management â€” hypothesis
- [ ] AI Coaching for content optimization â€” hypothesis
- [ ] Command Palette for fast navigation and actions â€” hypothesis

### Out of Scope

- [Exclusion 1] â€” [why]

## Context

The project is a React-based web application (Syncra) built with Vite and TypeScript. It already has a significant codebase with UI components for AI coaching, idea generation, and scheduling.

## Constraints

- **Tech Stack**: React, TypeScript, Vite, TailwindCSS (inferred)
- **State Management**: React Context (inferred from /context folder)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React + Vite | Modern, fast development experience | âœ“ Good |
| AI Integration | Core differentiator for content generation | âœ“ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via \/gsd-transition\):
1. Requirements invalidated? â†’ Move to Out of Scope with reason
2. Requirements validated? â†’ Move to Validated with phase reference
3. New requirements emerged? â†’ Add to Active
4. Decisions to log? â†’ Add to Key Decisions
5. "What This Is" still accurate? â†’ Update if drifted

**After each milestone** (via \/gsd-complete-milestone\):
1. Full review of all sections
2. Core Value check â€” still the right priority?
3. Audit Out of Scope â€” reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after initialization*
