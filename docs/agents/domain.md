# Domain Docs

## Layout

This project uses a single-context layout: `GLOSSARY.md` at the project root and architecture decision records under `docs/adr/`.

## Before exploring

- Read the root `GLOSSARY.md` when present.
- If a `GLOSSARY-MAP.md` is introduced later, follow it to the glossaries relevant to the work.
- Read ADRs under `docs/adr/` that concern the area being changed. If context-specific ADR directories are introduced later, read the relevant records there too.

When these documents are absent, proceed silently. Create them lazily through domain-modeling work when terms or architectural decisions are resolved.

## Vocabulary

Use glossary terms in specifications, issue titles, hypotheses, and tests. Reconsider unfamiliar terminology; surface genuine vocabulary gaps during domain-modeling work.

## Architectural decisions

Explicitly identify a conflicting ADR when proposing a change that contradicts it, and explain why reopening that decision is justified.
