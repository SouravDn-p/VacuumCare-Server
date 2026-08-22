# Central Care backend

NestJS + PostgreSQL backend for the customer app, technician app, and admin
dashboard. Features are organized under `src/features/` by domain.

## Included workflows

- Customer and pending-verification technician registration, profiles, addresses,
  notification preferences, onboarding, and password reset.
- Service request lifecycle, photo/video uploads, quote review/acceptance with
  terms consent, scheduling conflict checks, equipment/inlet counts, reports,
  customer confirmation, cancellation, and audit-style status history.
- Agora call sessions with start/refresh/history/end lifecycle. Tokens use an
  absolute Unix expiry timestamp and never expose the Agora certificate.
- Shop catalog search/product detail, persistent cart, hosted Stripe Checkout,
  inventory reservation/release, order tracking history, and returns.
- Stripe manual-capture PaymentIntents for accepted service quotes. A technician
  report must be submitted before an admin can request capture.
- Signature-verified, raw-body Stripe webhook processing with event-id
  deduplication. Webhooks—not browser redirects—mark orders paid/completed.
- Service-request chat, technician live-location updates, notifications, and an
  admin dashboard/broadcast endpoint.

## Customer frontend flows

Shop orders: [docs/customer-orders-flow.md](docs/customer-orders-flow.md)

Service requests and quotes:
[docs/customer-service-requests-flow.md](docs/customer-service-requests-flow.md)

```text
Catalog            GET  /api/service-requests/catalog
Address            GET  /api/users/me/addresses
                   POST /api/users/me/addresses
Submit request     POST /api/service-requests          multipart images[] / videos[]
List / detail      GET  /api/service-requests
                   GET  /api/service-requests/:id      opening QUOTE_SENT marks the quote VIEWED
Accept quote       POST /api/service-requests/:id/quotation/accept
Reject quote       POST /api/service-requests/:id/quotation/reject
Counteroffer       POST /api/service-requests/:id/quotation/counteroffers
Authorize hold     POST /api/payments/service-requests/:requestId/authorization
Confirm report     POST /api/service-requests/:id/report/customer-confirm
Cancel             POST /api/service-requests/:id/cancel
```

Statuses the customer UI should show: `NEW` → `UNDER_REVIEW` → `QUOTE_SENT` →
`ACCEPTED` → `SCHEDULED` → `IN_PROGRESS` → `REPORT_SUBMITTED` → `COMPLETED`
(or `CANCELLED`).

Submit a request (do not set `Content-Type`; curl adds the multipart boundary).
There is no `attachments` field — only file uploads.

```bash
curl -X POST 'http://localhost:5000/api/service-requests' \
  -H 'Authorization: Bearer <accessToken>' \
  -F 'categoryId=<category-id>' \
  -F 'issueId=<issue-id>' \
  -F 'addressId=<address-id>' \
  -F 'description=The central vacuum has low suction and makes a rattling sound.' \
  -F 'preferredDate=2026-09-02T09:00:00.000Z' \
  -F 'preferredTime=09:00-12:00' \
  -F 'images=@/path/to/inlet.jpg' \
  -F 'videos=@/path/to/noise.mp4'
```

`201` starts the request at `NEW`. `media[].url` is the Cloudinary URL.

Accept the quote after the office sends it (`status: QUOTE_SENT`):

```bash
curl -X POST 'http://localhost:5000/api/service-requests/<id>/quotation/accept' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"acceptTerms": true, "termsVersion": "2026-08-17"}'
```

Then create the Stripe card hold (empty body) and confirm `clientSecret` with the
Stripe SDK:

```bash
curl -X POST 'http://localhost:5000/api/payments/service-requests/<id>/authorization' \
  -H 'Authorization: Bearer <accessToken>'
```

Catalog, addresses, reject, counteroffer, cancel, and report-confirm request and
response bodies are in the flow doc.

## Start with Docker

Copy `.env.example` to `.env`, set strong local credentials, then run:

```bash
docker compose up --build
```

The app waits for PostgreSQL health checks, applies Prisma migrations, seeds the
admin/catalog, then listens on `http://localhost:3000/api`.

```text
Swagger UI:  http://localhost:3000/api/docs
OpenAPI JSON: http://localhost:3000/api/docs-json
DB health:    http://localhost:3000/api/health/db
```

To work on the API outside the app container:

```bash
docker compose up -d postgres
npm install
npm run prisma:generate
npm run start:dev
```

Do not use `docker compose down --volumes` unless the PostgreSQL data volume is
intentionally disposable.

## Stripe configuration

Set these server-only values in `.env` (never ship the secret key or webhook
secret to a mobile/web client):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=cad
TAX_RATE=0.14975
CLIENT_APP_URL=http://localhost:5173  # customer/admin frontend, never the API URL
CORS_ORIGIN=http://localhost:5173
```

For production password-reset emails, also configure a verified Resend sender:

```env
RESEND_API_KEY=re_...
RESET_EMAIL_FROM=support@example.com
PASSWORD_RESET_URL=https://app.example.com/reset-password
```

For local webhook testing, install the Stripe CLI, authenticate it, then run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the CLI-provided `whsec_...` value to `STRIPE_WEBHOOK_SECRET`. Use Stripe
test cards only in hosted Checkout or the Stripe client SDK. This API never
accepts raw card data, a client-supplied provider reference, or a client claim
that a payment succeeded.

Main payment endpoints:

```text
POST /api/checkout/orders
POST /api/checkout/cart
POST /api/payments/service-requests/:requestId/authorization
POST /api/payments/:id/capture                 # admin, after submitted report
GET  /api/payments/:id
POST /api/webhooks/stripe                      # Stripe signature required
```

## Agora configuration

Set `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, and a token TTL (60–86400 seconds):

```env
AGORA_TOKEN_TTL_SECONDS=3600
```

The customer, assigned technician, or an office administrator can obtain a call
token. The response returns a `callId` for token refresh and end operations.

## Verification

```bash
npx prisma validate
npm run prisma:generate
npm run build
npm test -- --runInBand
```

The OpenAPI contract test fails if any documented object schema is blank or an
endpoint lacks a typed 2xx response. Every feature endpoint has request and
response DTOs with examples in Swagger.
