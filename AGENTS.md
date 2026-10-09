## Agent skills

### Issue tracker

Issues and specs are tracked in Linear. Before reading, creating, or updating issues, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. Before applying a triage role, read `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout. Before exploring the codebase or specifying a change, read `docs/agents/domain.md` and follow its glossary and ADR pointers.

### Architecture decisions

When work resolves a hard-to-reverse architecture boundary, durable data contract, integration pattern, or policy trade-off, create or update the relevant record in `docs/adr/` and add an **ADR** section to the primary Linear issue before raising or updating its PR. Record the decision, why it was chosen, and the downstream contract. Keep reversible implementation details out of ADRs.

### Understanding documentation

Whenever work makes a decision, update the relevant documentation under `docs/understanding/` in the same change. Keep the explanation aligned with the decision, its rationale, and its implementation or planned status.
