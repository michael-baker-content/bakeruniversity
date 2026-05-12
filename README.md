# Course Platform

Next.js course platform with Clerk auth, Supabase, and Stripe payments.

---

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your keys (see each section below).

---

### 3. Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and create an application.
2. Copy **Publishable key** and **Secret key** into `.env.local`.
3. Set up a webhook:
   - Clerk Dashboard → Webhooks → Add endpoint
   - For local dev, use [ngrok](https://ngrok.com) or Clerk's built-in tunnel:
     `npx clerk dev --tunnel` (beta) — or run `ngrok http 3000` and use the HTTPS URL
   - Endpoint URL: `https://your-tunnel-url/api/webhooks/clerk`
   - Subscribe to events: **user.created**, **user.updated**, **user.deleted**
   - Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET` in `.env.local`

---

### 4. Supabase

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → your project → Settings → API.
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — never expose to browser)

The database schema should already be applied (you ran `schema.sql` in the SQL editor).

---

### 5. Stripe

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API Keys.
2. Copy **Publishable key** and **Secret key** into `.env.local`.
3. Set up a webhook (for local dev, use the Stripe CLI):
   ```bash
   npm install -g stripe
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the webhook signing secret it prints → `STRIPE_WEBHOOK_SECRET`
4. For production: Stripe Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: **payment_intent.succeeded**, **payment_intent.payment_failed**

---

### 6. Resend

1. Go to [resend.com](https://resend.com) → API Keys → Create API Key.
2. Copy the key → `RESEND_API_KEY`

---

### 7. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Promoting yourself to instructor

After signing up through the app, your account is created as a `student` by default.
To promote yourself to `instructor`:

1. Go to your Supabase dashboard → Table Editor → `users`
2. Find your row (match by email)
3. Edit the `role` column → set to `instructor`
4. Save

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       ├── clerk/route.ts    # Syncs Clerk users → users table
│   │       └── stripe/route.ts  # Creates enrollments on payment success
│   ├── dashboard/page.tsx        # Student dashboard
│   ├── sign-in/[[...sign-in]]/   # Clerk sign-in UI
│   ├── sign-up/[[...sign-up]]/   # Clerk sign-up UI
│   ├── courses/                  # Course catalogue + lesson pages (next step)
│   ├── globals.css
│   ├── layout.tsx                # Root layout with ClerkProvider
│   └── page.tsx                  # Homepage
├── lib/
│   ├── supabase.ts               # Browser, server, and service role clients
│   └── types.ts                  # TypeScript types matching the DB schema
└── middleware.ts                  # Clerk auth middleware (route protection)
```

---

## Next steps (in order)

1. **Course catalogue** — `/courses` page listing published courses
2. **Lesson viewer** — `/courses/[slug]/lessons/[lessonId]` with TipTap renderer + KaTeX
3. **Stripe Checkout** — API route to create a PaymentIntent and redirect to Stripe
4. **Quiz engine** — question display, answer submission, score calculation
5. **Certificate generation** — PDF generation on course completion
6. **Admin / instructor UI** — course + lesson editor with TipTap + KaTeX
