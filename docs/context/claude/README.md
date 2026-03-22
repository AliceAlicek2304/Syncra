# Claude Context Pack

Purpose: make new-chat sessions reliable when prior chat context is gone.

## How to use
1. Start every new Claude chat by pasting the prompt in `session-start-prompt.md`.
2. Tell Claude to implement exactly one slice from `slice-plan.md`.
3. Require Claude to follow `restrictions.md`.
4. Require Claude to produce a handoff note using `handoff-template.md`.
5. Append the handoff note to `session-log.md`.

## Core documents
- `requirements-spec.md`: product requirements in implementation language
- `restrictions.md`: guardrails to reduce hallucination and regressions
- `slice-plan.md`: step-by-step plan across multiple chats
- `session-start-prompt.md`: first message for each new chat
- `handoff-template.md`: end-of-chat report format
- `session-log.md`: living timeline across all chats
- `file-scope-cheatsheet.md`: file scopes so non-developers can constrain edits

## Rule of thumb
- One chat = one slice only.
- No new scope inside a slice.
- No coding before Claude summarizes docs and scope.
