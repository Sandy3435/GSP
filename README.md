# Eureka

A mobile-first college-admissions platform for students, mentors, and administrators. Eureka helps students discover and track scholarships, fly-in programs, and summer research opportunities, complete structured learning pathways, join accountability sprints, book mentor services, and ask questions in a community forum.

## Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** (design tokens in `src/index.css`)
- **React Router v7**
- **Supabase** (Auth + PostgREST) with a localStorage fallback for demos

## Brand

- Primary: Eureka blue `#5170FF`, with black and white neutrals.
- Font: Poppins.
- Logo: a lightbulb mark + "Eureka" wordmark (`src/components/Logo.tsx`, `public/favicon.svg`).

## Getting started

```bash
npm install
npm run dev
```

Create a `.env` file (copy `.env.example` if present) with your Supabase project keys:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If these are absent the app runs in mock mode using `localStorage`.

## Database setup

Run these in the Supabase SQL editor, in order:

1. `supabase/schema.sql` — base tables and RLS.
2. `supabase/fix_rls.sql` — profiles policies, signup backfill, access-code RPCs.
3. `supabase/v1_schema.sql` — Version 1.0 columns, platform tables, and policies.

All three are idempotent (safe to re-run).

## Roles & access codes

| Role | How to obtain |
| --- | --- |
| Student | Default on sign-up |
| Mentor | Sign up / redeem with `EUREKA-MENTOR-2026` |
| Admin | Sign up / redeem with `EUREKA-ADMIN-2026` |

Role is the source of truth on `profiles.role` and drives navigation and route guards.

## Feature map

- **Profile** — Common App-style academic institutions (up to 4), activities (up to 15, CSV import supported), background flags, interests, and a required bio.
- **Opportunities** — browse, filter, match score, save, and detailed eligibility/document guidance.
- **Courses** — browsable pathways with modules, lessons, and downloadable resources.
- **Community** — Reddit-style threads with tags, replies, polls, and mentor/admin badges.
- **Sprints** — administrator-created cohorts with capacity, milestones, mentors, and live sessions.
- **Services** — mentor service catalogue with booking requests and a booking calendar.
- **Mentor dashboard** — assigned sprints, bookings, and specialisation tracks.
- **Admin dashboard** — full CRUD for opportunities, courses, sprints, live sessions, mentors, services, bookings, and students.

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
npm run preview  # preview the production build
```
