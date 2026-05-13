# Bakerversity

A custom online course platform built with Next.js, Clerk, Supabase, and Stripe. Supports rich lesson content with LaTeX math rendering, quizzes with per-option explanations, instructor grading, PDF/Google Slides embedding, and certificates.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 16 (App Router, TypeScript) |
| Auth | Clerk |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage |
| Payments | Stripe (not yet wired up) |
| Email | Resend (not yet wired up) |
| Rich text editor | TipTap |
| Math rendering | KaTeX |
| Code highlighting | Lowlight |

---

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your keys. See each section below.

---

### 3. Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → create an application
2. Copy **Publishable key** and **Secret key** into `.env.local`
3. Under **User & Authentication → SSO connections**, add Google with your own OAuth credentials
4. Set up a webhook:
   - **Developers → Webhooks → Add endpoint**
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET`

For local development, use ngrok to expose localhost:
```bash
ngrok http 3000
```
Use the ngrok HTTPS URL as your webhook endpoint. Add it to **Authorized JavaScript origins** in your Google Cloud OAuth client.

---

### 4. Supabase

1. Create a project at [supabase.com](https://supabase.com)
   - Uncheck **Automatically expose new tables** at project creation
   - Enable **Automatic RLS**
2. Run `supabase/schema.sql` in the SQL editor (Dashboard → SQL Editor → paste → Run)
3. Copy keys from **Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Create two storage buckets:

   **lesson-images** (public)
   - File size limit: 5MB
   - Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp`
   - Policies: SELECT for public · INSERT + DELETE for authenticated

   **lesson-slides** (public)
   - File size limit: 50MB
   - Allowed MIME types: `application/pdf`
   - Policies: SELECT for public · INSERT + DELETE for authenticated

5. Enable SSL: **Database → Settings → SSL Configuration**

---

### 5. Stripe (not yet active)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API Keys
2. Copy keys into `.env.local`
3. For local webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

### 6. Resend (not yet active)

1. [resend.com](https://resend.com) → API Keys → Create
2. Copy key → `RESEND_API_KEY`

---

### 7. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

### 8. Promote yourself to instructor

After signing up, go to Supabase → Table Editor → `users`, find your row, and set `role` to `instructor`.

---

### 9. Generate lesson slugs (existing installations only)

If you added the `slug` column to an existing database, run this in your browser console while signed in as an instructor to backfill slugs for all existing lessons:

```js
fetch('/api/admin/migrate-lesson-slugs', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

---

## Project structure

```
src/
├── app/
│   ├── admin/
│   │   ├── courses/
│   │   │   ├── page.tsx                 # Instructor course list
│   │   │   ├── new/page.tsx             # Create course
│   │   │   └── [slug]/
│   │   │       ├── page.tsx             # Course detail + lesson list
│   │   │       └── lessons/
│   │   │           ├── new/page.tsx     # Create lesson
│   │   │           └── [lessonId]/      # Edit lesson + quiz editor + slides
│   │   ├── grading/page.tsx             # Review student text responses
│   │   └── courses/[slug]/pages/        # Create + edit course pages
│   ├── api/
│   │   ├── admin/
│   │   │   ├── courses/                 # Course + lesson + module + page CRUD
│   │   │   ├── course-id-by-slug/       # Course slug → UUID resolver
│   │   │   ├── lesson-id-by-slug/       # Lesson slug → UUID resolver
│   │   │   ├── grading/                 # Fetch responses + save feedback
│   │   │   ├── migrate-lesson-slugs/    # One-time slug backfill endpoint
│   │   │   ├── parse-markdown/          # Markdown → TipTap JSON
│   │   │   ├── upload/                  # Image upload to Supabase Storage
│   │   │   └── upload-slides/           # PDF upload to Supabase Storage
│   │   ├── course-pages/               # Student read/unread toggle
│   │   ├── lessons/[lessonId]/quiz/     # Student quiz submission
│   │   ├── students/quiz-feedback/      # Fetch instructor feedback
│   │   └── webhooks/
│   │       ├── clerk/                   # Sync Clerk users → users table
│   │       └── stripe/                  # Create enrollments on payment
│   ├── courses/
│   │   ├── page.tsx                     # Public course catalogue
│   │   └── [slug]/
│   │       ├── page.tsx                 # Course detail + full contents list
│   │       ├── contents/page.tsx        # Standalone table of contents
│   │       ├── lessons/[lessonSlug]/    # Lesson viewer (slug or UUID)
│   │       └── pages/[pageSlug]/        # Course page viewer
│   ├── dashboard/page.tsx               # Student + instructor dashboard
│   └── sign-in / sign-up               # Clerk auth pages
├── components/
│   ├── TipTapEditor.tsx                 # Configurable rich text editor (packs: math, code)
│   ├── LessonRenderer.tsx               # Read-only lesson renderer
│   ├── LessonSidebar.tsx                # Responsive sidebar with modules + course pages
│   ├── LessonList.tsx                   # Reorderable lesson list with module assignment
│   ├── ModuleManager.tsx                # Create/rename/reorder modules
│   ├── QuizEditor.tsx                   # Admin quiz builder
│   ├── QuizTaker.tsx                    # Student quiz UI
│   ├── LatexModal.tsx                   # Algebra 1 LaTeX formula picker
│   ├── MarkdownImport.tsx               # Import .md/.mdx files into editor
│   ├── CoursePageReadToggle.tsx         # Student read/unread toggle for course pages
│   ├── SlidesSection.tsx                # Client boundary for slides viewer
│   └── SlidesViewer.tsx                 # PDF iframe + Google Slides embed
└── lib/
    ├── supabase.ts                       # Browser, server, service role clients
    ├── types.ts                          # TypeScript types matching DB schema
    └── markdownToTipTap.ts              # Markdown AST → TipTap JSON converter
```

---

## URL structure

| Route | Description |
|---|---|
| `/courses` | Public course catalogue |
| `/courses/[courseSlug]` | Course detail + full contents list |
| `/courses/[courseSlug]/contents` | Standalone table of contents |
| `/courses/[courseSlug]/lessons/[lessonSlug]` | Lesson viewer |
| `/courses/[courseSlug]/pages/[pageSlug]` | Course page viewer |
| `/admin/courses` | Instructor course list |
| `/admin/courses/[courseSlug]` | Course editor + lessons + modules + pages |
| `/admin/courses/[courseSlug]/lessons/new` | Create lesson |
| `/admin/courses/[courseSlug]/lessons/[lessonId]` | Edit lesson |
| `/admin/courses/[courseSlug]/pages/new` | Create course page |
| `/admin/courses/[courseSlug]/pages/[pageId]` | Edit course page |
| `/admin/grading` | Student response grading |
| `/dashboard` | Student + instructor dashboard |

---

## Feature status

| Feature | Status |
|---|---|
| Auth (Clerk + Google OAuth) | ✅ Complete |
| User sync (Clerk → Supabase) | ✅ Complete |
| Course + lesson CRUD | ✅ Complete |
| Slug-based URLs (courses + lessons) | ✅ Complete |
| Rich text editor with KaTeX | ✅ Complete |
| LaTeX formula modal (Algebra 1) | ✅ Complete |
| Image upload (Supabase Storage) | ✅ Complete |
| Markdown import (.md, .mdx) | ✅ Complete |
| PDF slideshow viewer | ✅ Complete |
| Google Slides embed | ✅ Complete |
| Lesson introduction text | ✅ Complete |
| Course catalogue + lesson viewer | ✅ Complete |
| Quiz engine (MC, T/F, text response) | ✅ Complete |
| Per-option explanations | ✅ Complete |
| Instructor grading view | ✅ Complete |
| Student feedback display | ✅ Complete |
| Modules (lesson grouping) | ✅ Complete |
| Course pages (overview, syllabus, etc.) | ✅ Complete |
| Table of contents | ✅ Complete |
| Student read/unread toggle | ✅ Complete |
| Configurable editor packs (math, code) | ✅ Complete |
| Responsive design (student-facing) | ✅ Complete |
| Video infrastructure (table + storage) | ✅ Schema only |
| Visual design polish | 🔲 Planned |
| Certificates | 🔲 Planned |
| Onboarding + email (Resend) | 🔲 Planned |
| Stripe payments | 🔲 Planned |

---

## PowerShell note

When deleting folders with brackets in the name (e.g. `[courseId]`), PowerShell's `-Path` flag treats brackets as wildcards and silently fails. Always use `-LiteralPath`:

```powershell
Remove-Item -Recurse -Force -LiteralPath "src\app\admin\courses\[courseId]"
```

---

## Schema migrations

The `supabase/schema.sql` file contains the full initial schema. Additional migrations are in separate files:

| File | Description |
|---|---|
| `supabase/schema.sql` | Initial schema — users, courses, lessons, quizzes, enrollments, certificates |
| `supabase/migration_002_modules_pages_videos.sql` | Adds `course_pages`, `course_page_views`, `videos` tables |

Run them in order when setting up a fresh installation. For existing installations, run only the migration files you haven't applied yet.
