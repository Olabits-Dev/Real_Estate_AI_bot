# Olabits Estate Bot

Multi-tenant real estate AI chatbot SaaS built with Next.js App Router, Prisma, Neon PostgreSQL, Paystack subscriptions, and a secure embeddable widget.

## What This App Does

- Provides a client dashboard for real estate companies.
- Provides a developer admin dashboard for full control.
- Embeds a chatbot on client websites through a script tag.
- Enforces plan-based feature access (Silver, Gold, Platinum).
- Handles subscription billing with Paystack and webhooks.
- Syncs client property data into Olabits via secure source API keys.

## Stack

- Next.js 16 (App Router, Server Actions)
- TypeScript
- Tailwind CSS v4
- Prisma ORM + Neon PostgreSQL
- Vercel deployment
- Paystack payments/subscriptions
- Google AI SDK (`ai`, `@ai-sdk/google`)

## Role Model

- `DEVELOPER`
- `SUBSCRIBER`

Developer-only areas:

- `/developer`
- `/developer/onboarding`
- Preview routes used for internal demos

Subscriber areas:

- `/dashboard/*` (plan-aware)

## Core Features

- Secure widget embed with `publicKey` + domain verification.
- Company-level tenant isolation.
- Plan-aware UI and backend guards.
- Paystack plan upgrades and webhook updates.
- Contact support page for client help.
- Client Data Source module for property sync.

## Project Structure

- `src/app` - routes, pages, server actions, API handlers
- `src/lib` - shared server/client utilities
- `src/components` - dashboard and chatbot UI components
- `prisma/schema.prisma` - database schema
- `public/widget.js` - embeddable widget runtime script

## Key Routes

- `/` - landing page with login/create account links
- `/login` - subscriber login
- `/register` - subscriber registration
- `/developer/login` - developer login
- `/dashboard` - subscriber dashboard
- `/dashboard/integration` - widget + data source controls
- `/dashboard/billing` - subscription management
- `/dashboard/support` - developer contact
- `/api/chat` - chatbot response endpoint
- `/api/widget/config` - widget bootstrap config + domain check
- `/api/webhooks/paystack` - Paystack webhook receiver
- `/api/sync/properties` - secure property sync ingest endpoint

## Environment Variables

Use `.env` (see `.env.example`):

- `DATABASE_URL` - Neon PostgreSQL connection
- `GEMINI_API_KEY` - AI model key
- `NEXT_PUBLIC_APP_URL` - public app URL
- `APP_BASE_URL` - server base URL
- `PAYSTACK_SECRET_KEY` - Paystack secret key
- `PAYSTACK_PLAN_SILVER_CODE` - Paystack Silver plan code
- `PAYSTACK_PLAN_GOLD_CODE` - Paystack Gold plan code
- `PAYSTACK_PLAN_PLATINUM_CODE` - Paystack Platinum plan code
- `DEVELOPER_EMAIL` - bootstrap developer email
- `DEVELOPER_PASSWORD` - bootstrap developer password
- `DEVELOPER_NAME` - bootstrap developer name
- `SMTP_*` - optional snippet email delivery

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure `.env`.

3. Sync schema:

```bash
npx prisma db push
```

4. Start app:

```bash
npm run dev
```

## Database Schema Highlights

- `Company` stores tenant config, plan, billing, widget keys, and sync metadata.
- `Property` stores inventory records and source metadata:
  - `sourceType`: `MANUAL` or `CLIENT_SYNC`
  - `sourceListingId`: unique per company for upserts
- `User`, `UserSession`, `CompanyMember` handle auth and membership.
- `ConversationAnalytics` stores chat metrics.

## Authentication and Sessions

- Sessions are stored in `UserSession`.
- Cookie name: `olabits_session`.
- Cookie is secure in production.
- Session lookup is decoupled from deep company relation loading to avoid login loops.

## Widget Integration

Use script generated on `/dashboard/integration`:

```html
<script
  src="https://your-domain/widget.js"
  data-public-key="pk_live_..."
  data-api-base="https://your-domain"
  defer
></script>
```

Widget flow:

1. Loads `public/widget.js`.
2. Calls `/api/widget/config?key=...`.
3. Backend verifies domain against `Company.authorizedDomain`.
4. Widget mounts with Shadow DOM and uses `/api/chat`.

## Subscription and Billing (Paystack)

Plans:

- `SILVER` - ₦15,000
- `GOLD` - ₦45,000
- `PLATINUM` - ₦100,000

Billing flow:

1. Client clicks subscribe in `/dashboard/billing`.
2. Server action initializes Paystack transaction.
3. Client is redirected to Paystack checkout.
4. Paystack webhook updates company subscription state.

Webhook URL:

- `https://olabitsaibot.vercel.app/api/webhooks/paystack`

Webhook events handled:

- `charge.success`
- `subscription.create`
- `invoice.payment_failed`

## Plan Enforcement

Plan config lives in `src/lib/plans.ts`.

Examples:

- Silver cannot manage inventory via API/UI.
- Gold and Platinum can use listings + WhatsApp routing.
- Only Platinum gets advanced analytics tracking/insights.
- Backend checks are enforced in route handlers, not just UI.

## Client Data Source Module

This module allows secure ingestion of client listings into Olabits.

### Controls in Dashboard

On `/dashboard/integration`, tenant can:

- View ingest endpoint
- View source API key
- Rotate source API key
- Set source feed URL
- Click `Sync Now`
- See sync status/time/count/message

### Ingest Endpoint

- `POST /api/sync/properties`

Auth options:

- Header: `x-client-source-key: <company data source key>`
- Or `Authorization: Bearer <company data source key>`

Accepted payload shapes:

- `{ properties: [...] }`
- `{ listings: [...] }`
- `{ data: [...] }`
- or direct array `[...]`

Optional:

- `replaceExisting: true|false` (default `true`)

Example payload:

```json
{
  "properties": [
    {
      "externalId": "prop-1001",
      "title": "4 Bedroom Duplex",
      "description": "Serviced estate, Lekki",
      "price": 185000000,
      "location": "Lekki",
      "propertyType": "Duplex",
      "isAvailable": true
    }
  ],
  "replaceExisting": true
}
```

Upsert behavior:

- Uses `(companyId, sourceListingId)` unique key.
- Updates existing listing if same external/source ID.
- Creates new listing if not found.
- When `replaceExisting=true`, missing prior `CLIENT_SYNC` listings are marked unavailable.

### Scheduler-Safe Sync

- Sync lock stored on `Company.dataSourceSyncInProgressAt`.
- Prevents overlapping sync runs.
- Lock has stale timeout recovery.

## Suggested Scheduler (Cron)

For each client, post their feed to Olabits on a schedule:

```bash
curl -X POST "https://olabitsaibot.vercel.app/api/sync/properties" \
  -H "Content-Type: application/json" \
  -H "x-client-source-key: ds_live_xxx" \
  -d '{"properties":[{"externalId":"123","title":"2 Bed","price":45000000,"location":"Yaba","propertyType":"Apartment","description":"Good road access","isAvailable":true}]}'
```

## Deployment (Vercel)

1. Push `main` branch to GitHub.
2. Configure Vercel environment variables.
3. Run schema sync against production DB:

```bash
npx prisma db push
```

4. Set Paystack webhook URL:

- `https://olabitsaibot.vercel.app/api/webhooks/paystack`

## Troubleshooting

Login returns to `/login`:

- Ensure latest build is deployed.
- Ensure production DB schema is in sync.
- Verify session cookie is set in browser.

Client cannot subscribe:

- Check `PAYSTACK_SECRET_KEY` and plan code env vars.
- Check `/dashboard/billing?status=...` message.

Widget not showing:

- Confirm script includes `data-public-key` and `data-api-base`.
- Confirm `authorizedDomain` matches client site domain.
- Check `/api/widget/config` response for 401/403/402.

Sync fails:

- Validate source endpoint returns JSON.
- Validate payload fields include title, price, location.
- Confirm source API key is correct for that company.

## Security Notes

- Never expose secret keys in frontend code.
- Rotate data source keys when integrating new client systems.
- Restrict DB/API credentials to server-side environment variables.

## Support

- Email: `atilolasamuel15@gmail.com`
- Phone: `08035208600`
