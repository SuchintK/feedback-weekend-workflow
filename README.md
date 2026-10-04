# Feedback weekend workflow

This is a persistent workflow service, intended to run behind an authenticated host rather
than as a one-request CLI. Its public HTTP interface registers product profiles, accepts
traceable feedback, and lets the registered owner inspect readiness and feedback.

The authenticated host supplies the owner identity in `X-Workflow-Owner-Id`; credentials are
never accepted in product profiles, feedback, or tickets. Product records retain repository
context, goals, inventory, workflow instructions, operational limits, and readiness status.

The service currently provides these JSON routes:

- `POST /products` registers a product profile.
- `POST /products/:id/feedback` records structured feedback.
- `GET /products/:id` returns the owner-scoped product, readiness, and feedback evidence.

`analysisReady` requires goals plus repository, documentation, and inventory evidence.
`buildReady` additionally requires the repository branch, ticket destination, approver,
validation and preview instructions, restrictions, schedule, limits, and integration references.
