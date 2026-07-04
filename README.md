# MathThinkLink

MathThinkLink is a Vite + React AI math tutor app with Supabase authentication/database support, Vercel serverless API routes, Anthropic chat completion, and Stripe subscriptions.

The deployable pieces are:

- Frontend: Vite React app in `src/`
- API routes: Vercel-compatible serverless handlers in `api/`
- Database: Supabase SQL setup in `supabase/`
- Payments: Stripe Checkout and webhook handlers
- AI chat: Anthropic API route at `/api/chat`

## Local Development

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy the environment template:

```bash
cp .env.example .env.local
```

4. Fill in the Supabase client variables at minimum:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Start the frontend:

```bash
npm run dev
```

The frontend will run locally with Vite. API routes under `api/` are intended for Vercel or another host that supports Vercel-style serverless functions.

## Supabase Setup

Create a Supabase project, then run these files in the Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/schema_institutional.sql`

In Supabase Authentication settings, configure your app URL and redirect URLs for your deployed domain and local dev URL.

## Required Environment Variables

Frontend variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Server-only variables:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
STRIPE_ORG_PRICE_ID=
APP_URL=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, or Stripe secret keys in frontend code.

## Vercel Deployment

This repo includes `vercel.json` for Vite output and client-side routing.

1. Import the repository into Vercel.
2. Set the framework preset to Vite if Vercel does not detect it.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist`.
5. Add all required environment variables in Vercel Project Settings.
6. Deploy.

Stripe webhook endpoint:

```text
https://your-domain.com/api/stripe-webhook
```

Set `APP_URL` to your deployed app origin, for example:

```bash
APP_URL=https://your-domain.com
```

## Verification

Run these before deploying:

```bash
npm run build
npm run lint
```

The production build should complete without legacy platform packages or legacy environment variables.
