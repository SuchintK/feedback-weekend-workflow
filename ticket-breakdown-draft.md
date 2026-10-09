# Proposed tickets for SUC-5

Review draft only; these tickets have not been published.

## Proposed testing approach

Each slice includes tests of externally visible behavior at the workflow boundary, with controlled external integrations and a controllable clock where relevant. Approval of this breakdown includes approval of that testing approach for these tickets. No existing application code needs prefactoring.

## 1. Register a product and collect traceable feedback

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

An owner registers a product, submits structured feedback, and retrieves its original message and source. Analysis can start with partial configuration; build activation cannot.

### Acceptance criteria

- [ ] Provide a usable submission and inspection interface with durable feedback records containing product ID, stable customer ID, original text, source reference, and date.
- [ ] Keep records and access isolated by product, and keep credentials outside feedback and tickets.
- [ ] Store per-product goals, integrations, approver, inventory, schedule, validation instructions, restricted areas, runtime, and spending settings; report missing build settings before activation.
- [ ] Demonstrate submission, retrieval, configuration validation, and cross-product isolation through observable workflow tests.

### Blocked by

None (can start immediately).

### Source user stories

1, 2, 3, 4, 5, 6, 7, 39.

## 2. Group requests and filter existing functionality

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

An owner sees evidence-backed feature candidates rather than raw repeated messages, with existing functionality and existing tickets identified before proposals are created.

### Acceptance criteria

- [ ] Group differently worded requests by underlying need and preserve their original evidence; distinguish bugs from feature requests.
- [ ] Let the owner verify an initial inventory grounded in product documentation and repository evidence.
- [ ] Check candidates against existing functionality and tickets; reuse existing candidates rather than create duplicates.
- [ ] Distinguish fulfilled scope from unmet extensions and present uncertain matches with clarification questions and suggested interpretations.
- [ ] Customer feedback cannot change configuration, permissions, or authorize operations; verify this at the workflow boundary.

### Blocked by

- 1. Register a product and collect traceable feedback

### Source user stories

8, 9, 16, 17, 19, 20, 38.

## 3. Propose one feature from current-week demand

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

A weekly evaluation ranks qualifying current-week candidates and publishes one evidence-backed proposal to the product's configured ticket destination, with Linear as the first supported tracker.

### Acceptance criteria

- [ ] Use the product timezone and configurable threshold, defaulting to three distinct customers per feature.
- [ ] Count each customer once per candidate from eligible underlying evidence and explain the count.
- [ ] Rank by customer count, goal alignment, then smaller scope; show alternatives and support an owner override.
- [ ] Create or update one proposal containing scope, acceptance criteria, exclusions, supporting feedback, and assumptions; prevent duplicate tickets on repeated evaluation.
- [ ] When nothing qualifies, report that outcome without starting a build; verify scoring, ranking, publication, and skip behavior with controlled external integrations.

### Blocked by

- 2. Group requests and filter existing functionality

### Source user stories

10, 11, 13, 14, 21, 22, 23, 25.

## 4. Accumulate demand only when the current week is quiet

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

If no candidate qualifies in the current week, the same evaluation checks recent prior weeks and can propose a feature supported by accumulated demand.

### Acceptance criteria

- [ ] Trigger fallback only when no current-week candidate crosses the threshold, regardless of ticket approval state.
- [ ] Default to the current week plus the preceding three weeks; make the window configurable.
- [ ] Recalculate distinct customers across underlying eligible records instead of adding weekly totals; exclude evidence outside the window.
- [ ] Use the same proposal, ranking, and duplicate-prevention behavior as current-week selection.
- [ ] Verify current-week precedence, boundary dates, repeated customers across weeks, overlapping evaluations, and no-demand outcomes using a controllable clock.

### Blocked by

- 3. Propose one feature from current-week demand

### Source user stories

12, 13, 14, 15.

## 5. Clarify scope and approve a specific ticket version

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

The owner receives clarification questions with implementation options, settles the scope, and explicitly approves a particular ticket version for implementation.

### Acceptance criteria

- [ ] Present original evidence and concrete options when ambiguity materially affects implementation; keep unresolved proposals unapproved.
- [ ] Accept approval only from the configured approver and bind it to the approved scope and acceptance criteria.
- [ ] Invalidate approval on material scope or acceptance-criteria edits; ticket labels and workflow statuses alone do not authorize builds.
- [ ] Record assumptions, exclusions, decisions, and approval evidence without automatically contacting customers.
- [ ] Verify the full clarification-to-approval path, wrong-approver rejection, unresolved-scope rejection, and approval invalidation.

### Blocked by

- 3. Propose one feature from current-week demand

### Source user stories

24, 25, 26, 27, 38.

## 6. Run one approved build within enforced limits

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

An owner starts one approved build against the configured repository; the workflow performs bounded implementation work and preserves a draft pull request and progress report.

### Acceptance criteria

- [ ] Recheck ticket-version approval, complete build configuration, product-scoped access, and restricted-area review before execution.
- [ ] Use a controlled implementation runner for the configured repository; preserve changes as a draft pull request and summarize progress.
- [ ] Enforce configured runtime, spending cap, and allowed build window; check remaining budget before further metered work.
- [ ] Only activate integrations capable of measuring and enforcing their limits; stop and save progress when a limit is reached.
- [ ] Prevent duplicate attempts for the same approved run; preserve failures without deploying or merging.
- [ ] Verify an approved run and denied, duplicate, exhausted-budget, and exhausted-runtime runs through observable results and controlled runner/usage integrations.

### Blocked by

- 5. Clarify scope and approve a specific ticket version

### Source user stories

3, 27, 30, 31, 33, 35, 38, 39.

## 7. Turn build output into a tested review package

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

After implementation, the reviewer receives validation results, acceptance-criterion evidence, a change summary, and a preview where applicable.

### Acceptance criteria

- [ ] Run the product's configured checks and report evidence for every acceptance criterion.
- [ ] Keep the pull request in draft state when required checks fail or required acceptance evidence is missing; explicitly report unverifiable criteria.
- [ ] Produce a preview where applicable using configured instructions and attach its reference to the review package.
- [ ] Present unresolved questions and failures alongside completed work without implying deployment.
- [ ] Verify successful and failed review packages at the same workflow boundary using controlled validation and preview integrations.

### Blocked by

- 6. Run one approved build within enforced limits

### Source user stories

32, 33.

## 8. Schedule the approved weekend build reliably

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

The product automatically evaluates feedback and starts at most one approved ticket during its configured weekend, skipping missed approval deadlines and out-of-window starts.

### Acceptance criteria

- [ ] Use configured proposal time, approval deadline, build window, and timezone rather than hard-coded dates.
- [ ] Retain unapproved proposals for reconsideration, but skip implementation if the deadline is missed.
- [ ] Recheck approval and ticket version at execution; process only one small approved ticket per product per weekend.
- [ ] Repeated scheduler events and restarts cannot start duplicate attempts; schedule reporting makes skipped or started work visible.
- [ ] Verify the scheduled approval-to-build path with a controllable clock, including timezone boundaries, late approval, invalidated approval, and repeated events.

### Blocked by

- 6. Run one approved build within enforced limits

### Source user stories

28, 29, 31.

## 9. Report stopped work and resume only with fresh approval

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

When an attempt fails, hits limits, or discovers a scope blocker, the owner gets a reviewable draft and can authorize a bounded continuation.

### Acceptance criteria

- [ ] Preserve draft work and report completed changes, failed checks, blockers, remaining work, and resource usage.
- [ ] Stop on scope expansion or requirements that materially change implementation, with concrete decisions requested from the owner.
- [ ] Require fresh approval before continuation; material scope changes require approval of the revised ticket version.
- [ ] Assign a distinct continuation attempt, validate applicable execution limits, and prevent duplicate resumptions.
- [ ] Verify stop-to-report-to-reapproval-to-resume behavior, including failed checks, exhausted limits, scope expansion, and attempted unapproved continuation.

### Blocked by

- 7. Turn build output into a tested review package

### Source user stories

33, 34.

## 10. Confirm delivery and retire only satisfied demand

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

A release signal or owner confirmation records delivered scope, updates the feature inventory, and prevents satisfied feedback from qualifying again in future evaluations.

### Acceptance criteria

- [ ] Require a verified configured release signal or explicit owner delivery confirmation; a pull request or merge alone does not fulfill demand.
- [ ] Link delivered scope to the evidence it satisfies, retain original records, and exclude only that satisfied evidence from later demand calculations.
- [ ] Update the inventory after delivery; retain unmet extensions and escalate ambiguous fulfillment matches with suggested interpretations.
- [ ] Process repeated delivery signals idempotently and keep pending or unfinished builds from retiring demand.
- [ ] Verify a full proposal-to-build-to-delivery-to-next-evaluation path, including partial fulfillment and new extension requests.

### Blocked by

- 3. Propose one feature from current-week demand
- 7. Turn build output into a tested review package

### Source user stories

18, 19, 20, 36, 37.

## 11. Activate and verify the workflow for a second product

### Parent

[SUC-5](https://linear.app/suchint/issue/SUC-5/reusable-customer-feedback-to-weekend-build-workflow)

### What to build

The owner configures a second product and demonstrates that the same workflow operates across both products without code changes or cross-product data and authority leakage.

### Acceptance criteria

- [ ] Activate two distinct product profiles through the established interface, supplying explicit schedules, limits, validation instructions, and scoped integrations.
- [ ] Verify feedback-to-proposal-to-approval-to-review-to-delivery for both profiles, including rolling fallback and a stopped attempt.
- [ ] Demonstrate that one product's feedback, approver, ticket destination, inventory, usage, and scheduled attempts cannot affect the other.
- [ ] Use controlled external integrations for repeatable tests and a documented, authorized pilot for real integrations; no production deployment is implied.
- [ ] Document product setup and visible operating outcomes so another owner can configure the workflow without changing its shared logic.

### Blocked by

- 4. Accumulate demand only when the current week is quiet
- 8. Schedule the approved weekend build reliably
- 9. Report stopped work and resume only with fresh approval
- 10. Confirm delivery and retire only satisfied demand

### Source user stories

1, 2, 3, 39.
