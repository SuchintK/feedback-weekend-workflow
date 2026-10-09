# Project understanding dashboard

This is a learning companion to the reusable customer-feedback-to-weekend-build workflow. It explains evidence, architecture, ticket handoffs, and decisions. Requirements remain in [SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow) and its child tickets; accepted decisions remain in [docs/adr/](../adr/). This folder does not implement features or supersede those sources.

Evidence baseline: **9 October 2026**, branch `feature/SUC-7-group-feedback`, commit `b80de3d0816df80869251b8550d1ccae07236eb4`. The checked-out branch contains setup/intake and candidate analysis. Live Linear: SUC-6 Done, SUC-7 In Progress, SUC-8–16 Backlog. Merge, deployment, and real pilot operation were not verified. All 11 child tickets were read in full, along with the parent, native relations, and comments (none returned). Two subagents inspected code/tests and local documentation/history.

The system currently has one HTTP server, one workflow module, and a JSON state file. Its planned lifecycle is:

`owned product profile → original feedback → interpreted candidates → demand-qualified proposal → version-specific approval → bounded build → review package → confirmed delivery → updated demand/inventory`

Only the first three stages have code on this branch. **Configuration, customer evidence, approval, and delivery are different facts.**

## Read and navigate

Open [01-product-overview.html](01-product-overview.html) in a browser for the HTML navigation. All pages link to one another; this Markdown file is the progress dashboard. Diagrams use Mermaid 11.12.0 loaded from jsDelivr as an optional enhancement. With network access or JavaScript unavailable, Mermaid source and plain-language captions remain readable. Diagram scripts send no project content to a rendering service; rendering runs in the browser after the library loads.

| Order     | Artifact                                           | What it helps you explain                                                             |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1         | [Product overview](01-product-overview.html)       | Users, problem, journeys, scope, source authority, existing versus planned capability |
| 2         | [System architecture](02-system-architecture.html) | Current modules, data contracts, readiness, integration seams, planned stages         |
| 3         | [Data flow](03-data-flow.html)                     | Triggers, transformations, persistence, responses, failures, sequence diagrams        |
| 4         | [Ticket dependencies](04-ticket-dependencies.html) | All 11 tickets, exact blocker graph, phases, handoffs, evidence-based status          |
| 5         | [Technical decisions](05-technical-decisions.html) | Documented rationale, observed choices, mentor alternatives, limits                   |
| 6         | [Learning roadmap](06-learning-roadmap.html)       | Concepts prioritized by ticket dependencies and explain-back outcomes                 |
| Reference | [Glossary](07-glossary.html)                       | Definitions, project meanings, examples, related modules/tickets                      |
| Reference | [Open questions](08-open-questions.html)           | Prioritized gaps, uncertainty, verification work, learner questions                   |

For a focused first session, read Product → Architecture's readiness section → the SUC-6 guide. Do not try to memorize the full future workflow first.

## Architecture learning progress

Creating a page does not demonstrate understanding. Progress changes only after an explanation or exercise shows what you can reason about.

| Concept                                              | Artifact                                                     | Learner evidence                | Progress     |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------- | ------------ |
| Workflow product versus customer product             | [Product](01-product-overview.html)                          | No answer yet                   | Not assessed |
| Configuration, evidence, authority, and delivery     | [Architecture](02-system-architecture.html#readiness)        | First explain-back queued below | Not assessed |
| Authentication versus customer attribution           | [SUC-6](tickets/SUC-6.html)                                  | No answer yet                   | Not assessed |
| HTTP adapter and workflow responsibilities           | [Architecture](02-system-architecture.html#current)          | No trace exercise yet           | Not assessed |
| Persistence and inventory verification               | [Flows](03-data-flow.html#analysis)                          | No answer yet                   | Not assessed |
| Candidates, fulfillment comparisons, and eligibility | [SUC-7](tickets/SUC-7.html)                                  | No answer yet                   | Not assessed |
| Unique-customer windows and ranking                  | [SUC-8](tickets/SUC-8.html), [SUC-9](tickets/SUC-9.html)     | No answer yet                   | Not assessed |
| Version-bound approval and attempt identity          | [Decisions](05-technical-decisions.html#approval)            | No answer yet                   | Not assessed |
| Runtime/spending enforcement and recovery            | [SUC-11](tickets/SUC-11.html), [SUC-14](tickets/SUC-14.html) | No answer yet                   | Not assessed |
| Review versus confirmed fulfillment                  | [SUC-12](tickets/SUC-12.html), [SUC-15](tickets/SUC-15.html) | No answer yet                   | Not assessed |

## Ticket understanding progress

| Ticket guide                  | Exact title                                             | Tracker status at review | Understanding progress              |
| ----------------------------- | ------------------------------------------------------- | ------------------------ | ----------------------------------- |
| [SUC-6](tickets/SUC-6.html)   | Register a product and collect traceable feedback       | Done                     | Initial guide created; not assessed |
| [SUC-7](tickets/SUC-7.html)   | Group requests and filter existing functionality        | In Progress              | Initial guide created; not assessed |
| [SUC-8](tickets/SUC-8.html)   | Propose one feature from current-week demand            | Backlog                  | Initial guide created; not assessed |
| [SUC-9](tickets/SUC-9.html)   | Accumulate demand only when the current week is quiet   | Backlog                  | Initial guide created; not assessed |
| [SUC-10](tickets/SUC-10.html) | Clarify scope and approve a specific ticket version     | Backlog                  | Initial guide created; not assessed |
| [SUC-11](tickets/SUC-11.html) | Run one approved build within enforced limits           | Backlog                  | Initial guide created; not assessed |
| [SUC-12](tickets/SUC-12.html) | Turn build output into a tested review package          | Backlog                  | Initial guide created; not assessed |
| [SUC-13](tickets/SUC-13.html) | Schedule the approved weekend build reliably            | Backlog                  | Initial guide created; not assessed |
| [SUC-14](tickets/SUC-14.html) | Report stopped work and resume only with fresh approval | Backlog                  | Initial guide created; not assessed |
| [SUC-15](tickets/SUC-15.html) | Confirm delivery and retire only satisfied demand       | Backlog                  | Initial guide created; not assessed |
| [SUC-16](tickets/SUC-16.html) | Activate and verify the workflow for a second product   | Backlog                  | Initial guide created; not assessed |

## Source map

| Source                                                                                                             | Authority / limitation                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| [SUC-5 specification](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow) | Product requirements and constraints. Older “no code / not started / testing pending” statements conflict with later evidence. |
| Live child issues linked in each guide                                                                             | Requirements, amendments, status, direct blockers. A tracker status is not proof of merge or deployment.                       |
| [Published ticket index](../../published-tickets.md)                                                               | Approved 11-ticket breakdown/dependencies; records approval of included testing approach.                                      |
| [Breakdown draft](../../ticket-breakdown-draft.md)                                                                 | Historical planning; use live amendments and ADRs for updated contracts.                                                       |
| [Project README](../../README.md)                                                                                  | Existing interface overview.                                                                                                   |
| [ADR 0001](../adr/0001-persistent-product-profile.md)                                                              | Accepted persistent profile and authenticated owner workflow decision.                                                         |
| [ADR 0002](../adr/0002-persist-evidence-backed-candidate-analysis.md)                                              | Accepted persistent candidate, inventory verification, eligibility, ticket lookup contract.                                    |
| [Workflow source](../../src/workflow.ts), [HTTP adapter](../../src/server.ts), [startup](../../src/start.ts)       | Implementation evidence for the checked-out commit.                                                                            |
| [Tests](../../test/server.test.ts), [package config](../../package.json), [TypeScript config](../../tsconfig.json) | Observable checks and runtime/type configuration. Seven existing tests and typecheck passed on the evidence date.              |

## Important unresolved questions

| Priority                     | Question                                                                                                | Why it matters                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Before SUC-8                 | How does ticket checking distinguish verified absence from an unavailable or unconfigured adapter?      | Standard startup returns `undefined` without contacting a tracker. New proposals require checked eligibility. |
| Before SUC-8/9               | What defines a calendar week, threshold/window fields, tie-breaking, and goal/scope scoring?            | Reproducible demand evaluation needs explicit rules.                                                          |
| Before trusting old analysis | What invalidates inventory/candidate comparisons when repository contents change at the same reference? | Current verification compares strings, not commits/content.                                                   |
| Before SUC-10/11             | How are material ticket versions, approval evidence, and execution-time races represented?              | Approval must refer to the scope actually executed.                                                           |
| Before SUC-11/13             | What durable coordination and runner capabilities enforce limits and prevent duplicate attempts?        | A JSON file rename and declared capabilities do not establish those guarantees.                               |
| Before SUC-15                | How are verified delivery, partial fulfillment, and idempotent inventory updates represented?           | Review artifacts cannot safely retire demand.                                                                 |
| Learning                     | Can you explain configuration versus evidence versus authority?                                         | Understanding this prevents several architecture misconceptions.                                              |

See [Open questions](08-open-questions.html) for the full categorized register, including ownership/intake, storage, scheduling, integration, and learner gaps.

## Suggested next learning activity

Spend 10–15 minutes on [readiness and execution gates](02-system-architecture.html#readiness) and [the setup flow](03-data-flow.html#setup).

Explain in your own words:

> Atlas has goals, repository/docs, inventory, and all build settings. Its `buildReady` flag is true. Customers have requested spreadsheet export. Does this authorize an implementation? Which additional facts must the planned workflow establish?

Next session procedure:

1. Record your answer and date in the relevant page's learner section.
2. Compare it with the code and requirements; identify the specific misconception, if any.
3. Add the corrected explanation or concrete example to that page without rewriting requirements.
4. Update this dashboard's evidence and progress for that concept only.
5. Move to original feedback versus interpreted candidates; revisit gaps instead of assuming mastery.

## Maintaining this knowledge base

Update these files as part of future architecture, implementation, or mentoring work. This task establishes a baseline; it does not install a background monitor.

| Changed source or event                               | Understanding artifacts to review                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Requirements, user journeys, scope                    | 01, 04, 06, 08, affected ticket guides, this dashboard                    |
| Product profile, access, readiness                    | 02, 03, 05, 07, 08, SUC-6/7/10/11/16 guides                               |
| Candidate/evidence/verification/eligibility contracts | 02, 03, 05, 07, 08, SUC-7/8/9/15 guides                                   |
| Ticket relationships/status                           | 04, 06, relevant guides, this dashboard                                   |
| Approval, runner, scheduler, usage, continuation      | 02, 03, 05, 06, 07, 08, SUC-10–14/16 guides                               |
| Validation, delivery, inventory/fulfillment           | 01, 02, 03, 05, 07, 08, SUC-12/15/16 guides                               |
| Explain-back or exercise                              | Relevant learner notes, 06, learner questions in 08, progress tables here |

For each update: inspect authoritative changes; record date and commit; keep implemented/planned/proposed/unresolved labels accurate; update relevant diagrams and links; preserve accepted decision history through linked ADRs; state conflicts explicitly; do not turn mentor suggestions into accepted choices. Do not silently mark a ticket complete from a feature branch.

HTML pages share [style.css](assets/style.css) and [diagrams.js](assets/diagrams.js). Add navigation links when adding a new page. Validate local links and anchor targets, HTML structure, diagram rendering or source fallback, and readable mobile/print layout after material layout changes. Re-run application checks only when new evidence requires it; documentation changes alone do not expand test coverage.

## Session history

| Date       | Established evidence / change                                                                                                                                                                                                                                             | Learner understanding                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 2026-10-09 | Initial discovery of README, agent docs, ADRs, local planning, all 11 live child tickets and parent, source/configuration/tests; created learning pages. Existing tests: 7/7; typecheck passed. No application code, existing docs, ADRs, tickets, or deployment changed. | Not yet assessed; first concept introduced, awaiting explain-back. |
| 2026-10-09 | Verified 19 HTML pages, relative links and anchors; browser-checked all 21 Mermaid diagrams. Corrected sequence-label punctuation found during rendering. Diagrams include readable source/caption fallback.                                                              | No additional learner evidence; progress remains not assessed.     |
