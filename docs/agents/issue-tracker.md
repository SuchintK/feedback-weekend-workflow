# Issue tracker: Linear

Issues and specs for this project live in Linear. Use the connected Linear integration to search, read, create, update, label, and comment on issues.

## Destination

- Workspace: Suchint Kaushik (`2f13a42e-a981-4ac8-90cd-fb0ad697797b`), https://linear.app/suchint.
- Team: Suchint Kaushik (`053ec34c-422d-4d00-aabf-8ce027b84b7d`). This is the only available team.
- Project: none. Publish to the team without a project unless the user selects one later.

Use the team ID above for issue and team-label operations. If the destination becomes ambiguous, ask the user rather than selecting another team or project.

## Conventions

- Publish each feature specification as a Linear issue with a descriptive title and the complete specification in its description.
- Apply `ready-for-agent` when publishing an approved specification via `to-spec`.
- Use `docs/agents/triage-labels.md` for triage label strings. These labels are separate from Linear workflow statuses.
- Before creating an issue, search the selected destination for an existing issue covering the same feature. Update the relevant issue when appropriate rather than creating a duplicate.
- Fetch a referenced issue by its Linear identifier or URL and read its description and relevant comments before acting.
- Store follow-up discussion as issue comments and substantive specification revisions in the issue description.
- Report the issue identifier and URL after successful publication. Keep the local draft when publication is unavailable or fails, and report publication as pending.

## Connection

The Linear integration must be connected before remote operations. Never record credentials in these configuration files.
