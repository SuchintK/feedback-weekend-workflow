# Feedback weekend workflow

This is a persistent workflow service rather than a one-request CLI. Its public HTTP interface registers product profiles, accepts
traceable feedback, and lets the registered owner inspect readiness and feedback.

The service verifies the caller's bearer token against the server-side
`WORKFLOW_AUTH_TOKENS` mapping before it derives an owner identity. Start it with a non-empty JSON
token-to-owner mapping, for example `WORKFLOW_AUTH_TOKENS='{"opaque-token":"owner-atlas"}' npm start`.
Credentials are never accepted in product profiles, feedback, or tickets. Product records retain
repository context, goals, inventory, workflow instructions, operational limits, and readiness status.

The service currently provides these JSON routes:

- `POST /products` registers a product profile.
- `POST /products/:id/feedback` records structured feedback.
- `POST /products/:id/analysis` records owner-reviewed request groups and returns their evidence-backed feature candidates and bugs.
- `PATCH /products/:id` lets the registered owner complete its partial profile over time.
- `GET /products/:id` returns the owner-scoped product, readiness, and feedback evidence.

`analysisReady` requires goals plus repository, documentation, and inventory evidence.
`buildReady` requires analysis readiness and additionally requires the repository branch, ticket destination, approver,
validation and preview instructions, restrictions, schedule, limits, and integrations that declare
credential-free endpoints plus runtime-limit and spending-limit capabilities. A later integration
activation step verifies those declared capabilities before it runs a build.

Analysis accepts explicit, vendor-neutral interpretations of underlying needs. Each input candidate
links one or more submitted feedback IDs, has a `feature` or `bug` kind, and can be matched against
the verified inventory or a supplied list of checked existing tickets. It preserves the original
feedback as evidence, reuses an existing candidate with the same key, and requires a clarification
question plus suggested interpretations when a fulfillment match is uncertain. Customer feedback
cannot modify product configuration or authorize any workflow operation.
