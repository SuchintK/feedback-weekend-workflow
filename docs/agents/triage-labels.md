# Triage Labels

Map the five canonical triage roles to these Linear label strings.

| Canonical role | Linear label | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate the issue |
| `needs-info` | `needs-info` | Waiting for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified and ready for an agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

When a skill mentions a triage role, use the corresponding label string. Resolve labels within the selected workspace/team scope before applying them. These are triage labels, not build approvals or Linear workflow statuses.
