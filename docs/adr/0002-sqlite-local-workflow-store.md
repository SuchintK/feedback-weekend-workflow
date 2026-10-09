# SQLite for local workflow persistence

Status: accepted

The workflow stores its durable Product and Feedback records in a local SQLite database, using Node's built-in driver. This selects transactional local persistence for the supported deployment model of one Node.js workflow process on one host-local disk, without introducing a database server. The `Workflow` module remains the storage seam: HTTP callers continue to use product registration, profile updates, feedback submission, and inspection rather than tables or SQL. Deployments that need coordinated distributed writers must select a server database in a later ADR.
