# Persist evidence-backed candidate analysis

Status: accepted

SUC-7 consumes a product's goals, credential-free repository and documentation references, inventory
verified by the authenticated owner, and owner-scoped feedback. It introduces durable candidates
keyed by their underlying need. Each candidate records its kind (feature or bug), linked original
feedback, and an owner-verified match to inventory or a checked existing ticket. An uncertain match
additionally retains the clarification question and suggested interpretations.

We chose persisted candidates over a transient analysis response so later demand evaluation can
reuse the same feature candidate and its evidence rather than create duplicates. The inventory
verification captures the repository, documentation references, and items that the owner reviewed;
analysis requires that record to match the current profile. Analysis does not change readiness and
customer feedback remains untrusted evidence rather than an instruction source. SUC-8 consumes only
feature candidates whose match remains unmet or an unmet extension and have no checked existing
ticket; a vendor-neutral server-side ticket finder supplies that check rather than trusting analysis
input. Bugs, fulfilled scope, checked existing tickets, and uncertain matches are not eligible for a
new proposal.
