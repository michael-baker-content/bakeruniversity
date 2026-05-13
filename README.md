# Bakerversity

A custom online course platform built with Next.js, Clerk, Supabase, and Stripe. Designed for rich instructional content — lessons with LaTeX math rendering, syntax-highlighted code, images, and PDF/Google Slides embeds. Includes a full quiz engine with multiple choice, true/false, and text response questions, instructor grading, and a module system for organizing lesson sequences.

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

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

### 3. Clerk

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Copy **Publishable key** and **Secret key** into `.env.local`
3. Under **User & Authentication → SSO connections**, add Google with your own OAuth credentials
4. Add a webhook under **Developers → Webhooks**:
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET`

For local development, use [ngrok](https://ngrok.com) to expose localhost and use the HTTPS URL as your webhook endpoint.

### 4. Supabase

1. Create a project at [supabase.com](https://supabase.com)
   - Uncheck **Automatically expose new tables** at project creation
   - Enable **Automatic RLS**
2. Run the SQL files in order (Dashboard → SQL Editor):
   - `supabase/schema.sql`
   - `supabase/migration_002_modules_pages_videos.sql`
3. Copy keys from **Settings → API** into `.env.local`
4. Create two storage buckets:

   **lesson-images** (public) — images embedded in lesson content
   - File size limit: 5MB · MIME types: `image/jpeg, image/png, image/gif, image/webp`
   - Policies: SELECT for public · INSERT + DELETE for authenticated

   **lesson-slides** (public) — PDF slide decks
   - File size limit: 50MB · MIME types: `application/pdf`
   - Policies: SELECT for public · INSERT + DELETE for authenticated

5. Enable SSL: **Database → Settings → SSL Configuration**

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). After signing up, go to Supabase → Table Editor → `users` and set your `role` to `instructor`.

---

## Project structure

```
src/
├── app/
│   ├── admin/
│   │   ├── courses/[slug]/              # Course editor — lessons, modules, pages
│   │   └── grading/                     # Review and respond to student text responses
│   ├── api/
│   │   ├── admin/                       # Instructor CRUD — courses, lessons, modules, pages
│   │   ├── course-pages/               # Student read/unread toggle
│   │   ├── lessons/[lessonId]/quiz/     # Quiz submission and scoring
│   │   ├── students/quiz-feedback/      # Fetch instructor feedback
│   │   └── webhooks/clerk + stripe/     # User sync and enrollment
│   └── courses/
│       └── [slug]/
│           ├── page.tsx                 # Course detail + full contents list
│           ├── contents/                # Standalone table of contents
│           ├── lessons/[lessonSlug]/    # Lesson viewer
│           └── pages/[pageSlug]/        # Course page viewer
├── components/
│   ├── TipTapEditor.tsx                 # Rich text editor — configurable packs (math, code)
│   ├── LessonRenderer.tsx               # Read-only lesson content renderer
│   ├── LessonSidebar.tsx                # Responsive sidebar with modules and course pages
│   ├── LessonList.tsx                   # Reorderable lesson list with module assignment
│   ├── ModuleManager.tsx                # Module CRUD
│   ├── QuizEditor.tsx                   # Instructor quiz builder
│   ├── QuizTaker.tsx                    # Student quiz UI
│   ├── LatexModal.tsx                   # Algebra 1 LaTeX formula reference
│   ├── MarkdownImport.tsx               # Import .md/.mdx into the editor
│   ├── SlidesViewer.tsx                 # PDF and Google Slides embed
│   └── CoursePageReadToggle.tsx         # Student read progress tracking
└── lib/
    ├── supabase.ts                       # Browser, server, and service role clients
    ├── types.ts                          # TypeScript types
    └── markdownToTipTap.ts              # Markdown → TipTap JSON converter
```

---

## URL structure

| Route | Description |
|---|---|
| `/courses` | Course catalogue |
| `/courses/[slug]` | Course detail and contents |
| `/courses/[slug]/contents` | Table of contents |
| `/courses/[slug]/lessons/[lessonSlug]` | Lesson viewer |
| `/courses/[slug]/pages/[pageSlug]` | Course page viewer |
| `/admin/courses` | Instructor course list |
| `/admin/courses/[slug]` | Course editor |
| `/admin/grading` | Student response grading |
| `/dashboard` | Student and instructor dashboard |

---

## Roadmap

- Visual design polish
- Certificates on course completion
- Student onboarding and email notifications (Resend)
- Stripe payments for paid courses
