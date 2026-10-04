# Persist a product profile as the workflow contract

Status: accepted

Each product has one credential-free, durable profile that holds its repository context, goals, inventory, feedback intake, operating limits, and declared integration capabilities. Owner identity comes from verified server-side authentication, and owners complete the profile incrementally; the workflow exposes readiness from that evidence. We chose this persistent owner workflow over a one-request CLI because recurring feedback work and the SUC-7/SUC-11 handoff need stable context rather than rediscovery. Integration declarations describe configuration only; SUC-11 verifies and activates them before a build can run.
