## Agent skills

### Issue tracker

Issues and specs are tracked in Linear. Before reading, creating, or updating issues, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. Before applying a triage role, read `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout. Before exploring the codebase or specifying a change, read `docs/agents/domain.md` and follow its glossary and ADR pointers.

### Architecture decisions

When work resolves a hard-to-reverse architecture boundary, durable data contract, integration pattern, or policy trade-off, create or update the relevant record in `docs/adr/` and add an **ADR** section to the primary Linear issue before raising or updating its PR. Record the decision, why it was chosen, and the downstream contract. Keep reversible implementation details out of ADRs.

### Formatting

Before formatting, inspect the project scripts, formatter and linter configuration, editor settings, and nearby file conventions. Use the existing formatter and its project scripts when available. Limit formatting to maintained source, tests, and configuration; preserve generated, minified, and exported documentation files. Review the diff for semantic changes, then run the available typecheck and tests.
