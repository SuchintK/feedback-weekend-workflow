# Persist evidence-backed candidate analysis

Status: accepted

SUC-7 consumes a product's goals, credential-free repository and documentation references, verified
inventory, and owner-scoped feedback. It introduces durable candidates keyed by their underlying need.
Each candidate records its kind (feature or bug), linked original feedback, and an owner-verified
match to inventory or a checked existing ticket. An uncertain match additionally retains the
clarification question and suggested interpretations.

We chose persisted candidates over a transient analysis response so later demand evaluation can
reuse the same feature candidate and its evidence rather than create duplicates. Analysis is only
available to an analysis-ready product; it does not change readiness and customer feedback remains
untrusted evidence rather than an instruction source. SUC-8 consumes only feature candidates whose
match remains unmet or an unmet extension; bugs, fulfilled scope, checked existing tickets, and
uncertain matches are not eligible for a new proposal.
