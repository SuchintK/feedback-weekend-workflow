# Feedback weekend workflow

This workflow starts with product registration and traceable customer feedback. It stores
records in the data directory you choose; each product's feedback is retrieved only through
that product ID.

Send one JSON request on standard input for each command:

```sh
echo '{"action":"register-product","product":{"id":"atlas","name":"Atlas","ownerId":"owner-atlas"}}' \
  | npm run workflow -- --data-dir .data

echo '{"action":"submit-feedback","feedback":{"productId":"atlas","customerId":"customer-42","text":"Please let me export a CSV.","source":"intercom://conversation/987","receivedAt":"2026-10-04T10:00:00.000Z"}}' \
  | npm run workflow -- --data-dir .data

echo '{"action":"list-feedback","productId":"atlas","actorId":"owner-atlas"}' \
  | npm run workflow -- --data-dir .data

echo '{"action":"validate-build-configuration","productId":"atlas","actorId":"owner-atlas"}' \
  | npm run workflow -- --data-dir .data
```

Product configuration can be supplied during registration. Build readiness requires goals,
integration references, an approver, inventory, schedule, validation instructions,
restricted areas, runtime minutes, and a spending limit. Credentials are rejected from the
stored configuration; keep them in the runtime environment or an external secret manager.
The owner ID registers the product's inspection boundary, so only that owner ID can retrieve
feedback or validate build configuration through this interface.
