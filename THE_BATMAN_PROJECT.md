# THE BATMAN PROJECT — Full Product Requirements Document (PRD)

> **For use with Antigravity AI. Feed this entire file and run the command at the bottom to begin project generation.**

---

## Project Overview

**Project Name:** The Batman Project
**Type:** SaaS Web Application (Publicly Available)
**Repository:** Public GitHub (open for anyone to sign up and use)
**Theme:** Batman — Dark Knight aesthetic throughout. Dark backgrounds, gold/yellow accents, subtle bat-signal motifs, Gotham-style typography, and cinematic animations. No emojis — use SVG icons exclusively.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TypeScript |
| Styling | Tailwind CSS + custom Batman theme tokens |
| Backend | Supabase (Auth + PostgreSQL + Realtime) |
| AI Integration | OpenAI API (`gpt-4o-mini`) — free tier compatible, routed through Supabase Edge Functions only |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Custom SVG components (no emoji, no icon libraries) |
| Hosting | Vercel (frontend) + Supabase (backend) — both free tier |
| State Management | Zustand |
| Forms | React Hook Form + Zod validation |

---

## Design System — Batman Theme

### Color Palette
```
--bat-black:        #0A0A0F   (primary background)
--bat-dark:         #12121A   (card backgrounds)
--bat-surface:      #1C1C28   (elevated surfaces)
--bat-border:       #2A2A3A   (borders, dividers)
--bat-gold:         #F5C518   (primary accent — Batman yellow)
--bat-gold-dim:     #C49A10   (muted gold)
--bat-white:        #E8E8F0   (primary text)
--bat-gray:         #8888A0   (secondary text)
--bat-danger:       #E84040   (errors, missed tasks)
--bat-success:      #40C870   (completed tasks)
--bat-info:         #4080E8   (neutral info)
```

### Typography
- Headings: `Bebas Neue` or `Oswald` (bold, condensed — Gotham feel)
- Body: `Inter` or `Roboto` (clean legibility)
- Monospace/data: `JetBrains Mono`

### Animations (Framer Motion)
- Page transitions: fade + slide-up (300ms ease)
- Card hover: subtle gold border glow pulse
- Button press: scale(0.97) spring
- Bat signal: slow rotating radial gradient on dashboard background (very subtle, 60s loop)
- Loading screen: animated bat silhouette SVG drawing effect
- Modals: scale-in from center with blur backdrop
- Charts: animate-in on mount (draw effect)
- Sidebar: slide-in on mobile

---

## Application Structure

```
/
├── /auth
│   ├── /login
│   └── /signup
├── /dashboard          ← main hub after login
├── /daily-tasks        ← daily habit tracker
├── /side-quests        ← freeform daily log
├── /goals              ← goal setting + tracking
├── /sleep              ← sleep tracker + graph
├── /finance            ← income/expense tracker
├── /ai-mentor          ← free-form AI chat + analysis
├── /profile            ← user settings
└── /admin              ← hidden admin panel (no link in UI, credential-gated)
```

---

## Module 1 — Authentication

### User Signup
- Fields: Full Name, Username (unique), Email, Password, Confirm Password
- Terms & Conditions checkbox (required — cannot proceed without checking)
- Terms & Conditions modal content (write this verbatim in the app):

```
TERMS OF SERVICE — THE BATMAN PROJECT

Effective Date: [auto-fill current date]

Welcome to The Batman Project. Please read these Terms of Service ("Terms") carefully before
using our platform. By creating an account or using any part of our service, you confirm that
you are at least 13 years of age and agree to be legally bound by these Terms.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ABOUT THE SERVICE

The Batman Project is a personal productivity platform designed to help individuals build
habits, track progress toward goals, manage their time, monitor wellness, and gain insight
into their daily routines. We are committed to providing a focused, motivating environment
for your growth journey.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. YOUR ACCOUNT

You are responsible for maintaining the security of your login credentials. You agree not to
share your password or allow unauthorized access to your account. We reserve the right to
suspend or terminate accounts that engage in abuse, fraudulent activity, or behavior that
violates these Terms.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. INFORMATION WE COLLECT AND HOW WE USE IT

To deliver the features of this platform — including habit tracking, goal monitoring,
personalized AI insights, and usage history — we store the information you voluntarily
enter, such as task data, sleep logs, financial entries, and personal notes.

In addition to the content you create, we collect standard technical and usage information.
This includes how features are accessed, interaction patterns across the platform, and
general performance data. This information helps us understand how our service is being
used, identify areas for improvement, and ensure the platform operates effectively.

Usage data and patterns derived from your activity on the platform may be reviewed
internally as part of our ongoing efforts to develop, improve, and evaluate the service.
This review occurs at an aggregated or anonymized level wherever possible and is never used
to identify you personally or sold to third parties.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. DATA SECURITY

We implement industry-standard security measures to protect your data, including encrypted
connections, secure credential storage, and access controls. While no system can guarantee
absolute security, we take every reasonable precaution to safeguard the information
entrusted to us.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. ARTIFICIAL INTELLIGENCE FEATURES

This platform incorporates AI-powered tools to generate personalized suggestions,
motivation, and analysis based on your activity. These outputs are intended solely for
informational and motivational purposes. They do not constitute medical, financial,
psychological, or professional advice of any kind. You should consult qualified
professionals before making decisions based on AI-generated content.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. THIRD-PARTY SERVICES

Our platform relies on trusted third-party infrastructure providers to deliver core
functionality. By using this service, you acknowledge that your data may be processed by
these providers in accordance with their own privacy and security policies.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. YOUR RIGHTS

You may export your data or permanently delete your account at any time from your account
settings. Account deletion results in the complete and irreversible removal of all
associated data from our systems.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8. CHANGES TO THESE TERMS

We may update these Terms from time to time. When we do, we will revise the effective date
at the top of this document. Continued use of the platform following any update constitutes
your acceptance of the revised Terms.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9. CONTACT

If you have any questions about these Terms, please reach out through the contact information
provided on our GitHub repository.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

By checking the box below, you confirm that you have read and understood these Terms of
Service and agree to be bound by them.
```

- After signup: email verification via Supabase
- Redirect to onboarding after first login (set username, timezone, notification preferences)

### User Login
- Email + Password
- "Forgot Password" → Supabase magic link / reset email
- Remember me (session persistence)
- Animated bat-signal background on auth pages

### Admin Login — Credential-Gated, Hidden Panel

The admin panel has **no link, no button, and no mention anywhere in the public UI.**

- Admin access route: `/admin` — this route is not listed in navigation, not discoverable via the app
- On visiting `/admin`, the user sees a standalone, minimal login form (separate from the regular auth flow):
  - Fields: Username + Password (not email — username only)
  - No "Forgot Password", no "Sign Up" link, no social login — nothing else on this page
  - On submit, a Supabase Edge Function is called server-side that verifies:
    1. The username matches an account with `role = 'admin'` in the `profiles` table
    2. The password is validated via Supabase Auth (not client-side)
  - On success: a short-lived admin session token (JWT with `role: admin` claim, 2-hour expiry) is issued
  - On failure: generic error "Invalid credentials" — no hint about whether username or password was wrong
  - After 5 failed attempts from the same IP: lock out for 30 minutes (implemented in Edge Function)
- Admin accounts are **manually provisioned** by the app owner directly in Supabase — there is no self-registration path for admin
- The admin JWT is stored in memory only (not localStorage, not cookies) — session is lost on tab close
- All admin data queries go through Supabase Edge Functions using the service role key — the service role key **never touches the client bundle**
- The admin panel is a completely separate React subtree, lazy-loaded only after successful admin auth

---

## Module 2 — Dashboard

The central hub after login.

### Components
- **Welcome Banner:** "Good [morning/afternoon/evening], [username]. Gotham needs you." — time-based greeting
- **Daily Progress Ring:** SVG animated ring showing % of daily tasks completed today
- **Quick Stats Row:** Tasks completed today / Goals active / Sleep last night / Net finance today
- **AI Motivation Card:** Single AI-generated motivational message, personalized to the user's recent data. Refreshes daily. Styled as a "transmission from Alfred."
- **Bat Signal Ambient:** Subtle rotating bat-signal SVG watermark in background (opacity 4%, CSS animation)
- **Recent Activity Feed:** Last 5 actions across all modules
- **Streak Counter:** Current streak of days with 100% daily task completion — displayed with animated flame-like gold effect SVG

---

## Module 3 — Daily Tasks

### Purpose
User defines recurring tasks that must be completed every single day (habits). Each day, they check them off.

### Features

#### Task Management
- Add task: Name, category (Health / Mind / Work / Personal / Custom), estimated time
- Edit / delete tasks
- Reorder tasks via drag-and-drop
- Mark task as "active" or "paused" (paused tasks don't appear in daily checklist)

#### Daily Checklist
- Each active task appears with a custom SVG checkbox (animated checkmark draw on completion — gold color)
- Each task shows: name, category icon (SVG), estimated time, status
- Completion timestamp is saved per task per day
- "Complete All" shortcut button

#### Failure Reason Modal
- If a task is NOT completed by end of day (11:59 PM user timezone), the system prompts at next login:
  "You didn't complete [Task Name] yesterday. What happened?"
- Text input for reason (required, minimum 10 characters)
- This reason is saved and fed to AI analysis

#### Calendar View
- Monthly grid — each day shows a color-coded status:
  - Gold: 100% complete
  - Gray: Partial
  - Red: 0% complete
  - Empty future dates

#### Progress Chart
- Pie chart (Recharts): tasks completed vs missed for current day
- Bar chart: weekly completion rate per task

---

## Module 4 — Side Quests

### Purpose
Free-form daily log where the user writes what else they did during the day beyond daily tasks. Think of it as a brief journal or activity log.

### Features
- Date-stamped text entry (one or more entries per day)
- Entries can be tagged: Productive / Social / Health / Learning / Entertainment / Other
- Character count visible (no hard limit, but AI analysis works better with concise entries)
- Past entries viewable in a scrollable log with date headers
- AI analysis button per entry: "Analyze this" — sends entry to AI for insights

---

## Module 5 — Goals

### Purpose
User sets a specific goal and defines habits/tasks that will help achieve it. Progress is tracked and visualized.

### Features

#### Goal Creation
- Goal name (e.g., "Run a 5K", "Save $500", "Read 12 books this year")
- Target date
- Category: Fitness / Finance / Learning / Career / Personal / Other
- Motivation statement: "Why is this goal important to you?" (text field — used in AI personalization)
- Define sub-tasks for this goal (same interface as Daily Tasks but goal-linked)

#### Goal Progress
- Progress bar (animated, gold fill on dark track)
- Days remaining countdown
- % completion based on sub-task check-ins
- Linked sleep, finance, or habit data can be associated with a goal

#### Failure Reason on Goal Tasks
- Same modal as Daily Tasks: if a goal sub-task is missed, prompt the user for reason on next login
- Reason is saved and included in goal AI analysis

#### Goal Analysis Page (per goal)
- Line chart: sub-task completion over time
- Pie chart: completed vs missed
- AI-generated progress report: what's working, what needs adjustment, projected outcome at current pace
- Motivational message tied to the goal's "why" statement

---

## Module 6 — Sleep Tracker

### Purpose
User logs sleep data and receives analysis with AI-backed suggestions.

### Features

#### Sleep Logging
- Bedtime (time input)
- Wake time (time input)
- Auto-calculates total sleep duration
- Sleep quality rating: 1–5 (custom SVG star/bat icons)
- Optional notes field

#### Visualizations
- Line graph (Recharts): sleep duration per night over last 30 days
  - Reference lines: 7h (minimum recommended), 9h (maximum recommended)
  - Colored zones: red (under 6h), yellow (6–7h), green (7–9h), orange (over 9h)
- Bar chart: sleep quality ratings over time

#### AI Sleep Analysis
- Triggered automatically weekly and on demand
- Evaluates: average duration, consistency of bedtime/wake time, quality trends
- Outputs: "You should aim to sleep more / less / maintain" with specific reasoning
- Flags: irregular sleep schedules, chronic undersleeping, oversleeping

#### Failure / Deviation Reason
- If user logs sleep under 6h or over 10h: prompt "You slept [X] hours. What caused this?"
- Required text input, saved to database
- Included in weekly AI analysis

---

## Module 7 — Finance Tracker

### Purpose
User tracks income and expenses across custom categories to understand spending patterns.

### Features

#### Category Management
- User defines custom categories: e.g., Food, Rent, Salary, Freelance, Entertainment, etc.
- Each category has: name, type (Income / Expense), color (from preset Batman palette), custom SVG icon selector

#### Transaction Logging
- Amount, category, date, optional note
- Recurring transaction toggle (daily / weekly / monthly)
- Quick-add button on dashboard

#### Visualizations
- Pie chart (Recharts): expense breakdown by category for current month
  - Gold outline on largest slice, animated on load
- Bar chart: income vs expense per month (last 6 months)
- Net balance display: prominently shown as +/- with color coding

#### AI Finance Analysis
- Weekly summary: spending changes by category
- Pattern detection: unusual spikes in spending
- Savings suggestion: projected savings if specific categories are reduced
- Tone: constructive, not judgmental — Batman-mentor style

#### Failure Prompt
- If user logs zero income for 7 consecutive days: gentle check-in prompt links to AI Mentor

---

## Module 8 — AI Mentor

### Purpose
A free-form AI chat interface that analyzes all user data holistically and provides personalized suggestions, motivation, and coaching.

### AI Provider
- **Model:** OpenAI `gpt-4o-mini` — free tier compatible, low cost per token
- **API Key:** Stored exclusively as a server-side environment variable in Supabase Edge Functions
- **The OpenAI API key is NEVER sent to or accessible from the client/browser under any circumstances**
- All AI calls are proxied through a Supabase Edge Function (`/functions/v1/ai-chat`)
- The Edge Function validates the user's Supabase JWT before making any OpenAI call
- Rate limiting: maximum 20 AI requests per user per day (enforced in Edge Function)

### Features

#### Chat Interface
- Clean dark chat UI styled like a "secure Batcave terminal"
- User messages on right (gold), AI messages on left (dark surface, white text)
- Animated typing indicator (three dots with bat-style pulse)
- Chat history persisted per user in Supabase

#### System Context (injected automatically per session)
The AI is given:
- User's name and username
- Last 7 days of daily task completion data (% per day, which tasks missed)
- Last 7 days of side quest entries (summaries)
- Active goals and current progress
- Last 7 days of sleep data (avg duration, quality)
- Last 30 days of finance summary (income, top 3 expense categories)
- Any saved failure reasons from the past 7 days
- User's goal motivation statements

#### System Prompt for AI (hardcoded in Edge Function — never exposed to client)
```
You are Alfred — the user's personal AI mentor in The Batman Project, a self-improvement platform.
Your role is that of a wise, composed, deeply loyal mentor who believes unconditionally in the
user's potential. You speak with calm authority, subtle wit, and genuine warmth — like Alfred Pennyworth.

Your job is to:
1. Analyze the user's habit, sleep, finance, and goal data provided.
2. Identify patterns — positive and negative.
3. Offer specific, actionable suggestions (not generic advice).
4. Motivate the user in a personalized way — reference their actual data, their goals, their reasons
   for failures.
5. Never lecture. Never be harsh. Be honest but encouraging.
6. When the user is struggling, remind them why they started (use their goal motivation statements).
7. Keep responses concise unless the user asks for a detailed analysis.

You are not a general chatbot. Stay focused on the user's self-improvement journey. If asked something
outside this scope, briefly redirect.

Address the user by their name or username. Make every interaction feel personal, not templated.
```

#### Suggested Prompts (shown as quick-action chips)
- "How am I doing this week?"
- "What should I focus on today?"
- "Analyze my sleep patterns"
- "Give me a finance breakdown"
- "I feel like giving up — help"
- "What habits should I change?"

#### Automated Weekly Report
- Every Sunday at 8 AM (user timezone), AI generates a full weekly report
- Stored in Supabase, accessible in a "Reports" tab within AI Mentor
- Covers: task performance, sleep, finance, goal progress, top 3 improvement suggestions
- Styled as a "Weekly Transmission from Alfred"

---

## Module 9 — Admin Panel

Route: `/admin` — **completely hidden from the public UI. No link, no mention, no navigation entry anywhere in the app.**

### Access Model
- Visiting `/admin` shows a standalone credential form: Username + Password only
- Credentials are validated server-side via Supabase Edge Function
- The Edge Function checks: `role = 'admin'` in the `profiles` table + password verified via Supabase Auth
- On success: short-lived admin JWT (2-hour expiry, `role: admin` claim) stored in memory only
- On failure: generic "Invalid credentials" message — no field-specific hints
- 5 failed attempts from same IP → 30-minute lockout (enforced in Edge Function)
- Admin accounts are manually provisioned by the app owner in Supabase — no self-registration
- The admin panel React subtree is lazy-loaded only after successful admin auth

### Features

#### User Overview Table
- Columns: Username, Email, Signup Date, Last Active, Total Tasks Defined, Avg Daily Completion %, Current Streak, Active Goals, Sleep Avg (last 7 days)
- Sortable by any column
- Search/filter by username or email
- Pagination (25 per page)

#### Individual User Drill-Down
- Click any user → view their:
  - Task completion history (calendar heatmap)
  - Goal list and progress
  - Sleep chart (line graph)
  - Finance summary (pie chart)
  - AI Mentor conversation count (not content — privacy)
  - Account status (active / suspended)
  - Failure reasons submitted (count and categories — not full text)

#### Platform Stats Dashboard
- Total registered users
- Daily active users (last 30 days) — line chart
- Feature usage breakdown (which modules are most used) — bar chart
- Average task completion rate across all users
- New signups per day — bar chart

#### User Management
- Suspend / reactivate account
- Reset password (sends email)
- Delete account (with confirmation — hard delete with data wipe)
- Promote to admin (only existing admins can do this)

#### Admin cannot access:
- Full AI chat conversation content (privacy)
- Full side quest journal entry text (privacy)
- Full failure reason text (count and category only)

---

## Security Architecture

This section is critical. All of the following must be implemented:

### API Key Protection
- `OPENAI_API_KEY` lives exclusively in Supabase Edge Function environment variables
- `SUPABASE_SERVICE_ROLE_KEY` lives exclusively in Supabase Edge Function environment variables
- Neither key ever appears in the client bundle, `vite.config.ts`, or any `VITE_` prefixed variable
- The frontend only holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — both are safe to expose (Supabase anon key is designed to be public; RLS enforces data access)
- `.env` is in `.gitignore`; `.env.example` contains only placeholder values — never real keys

### Supabase Row Level Security (RLS)
- RLS is enabled on every single table — no exceptions
- Default policy: DENY ALL (no access without explicit policy)
- User data policy: `user_id = auth.uid()` on all SELECT / INSERT / UPDATE / DELETE
- Admin data access: only through service role via Edge Functions — never through client-side calls with service role key
- `ai_chat_messages`: readable ONLY by the owning user — even service role queries for admin stats exclude message content

### Edge Function Security
- Every Edge Function validates the caller's Supabase JWT before executing (`Authorization: Bearer <token>` header)
- Admin Edge Functions additionally verify `role = 'admin'` in the JWT claims
- All Edge Functions return CORS headers allowing only the app's own domain (not `*`)
- Input validation and sanitization on all Edge Function inputs (Zod schemas)

### Frontend Security
- No `dangerouslySetInnerHTML` anywhere in the codebase
- All user-generated content is escaped before rendering
- Content Security Policy (CSP) headers set via Vercel config — disallows inline scripts and unknown origins
- `X-Frame-Options: DENY` to prevent clickjacking
- `X-Content-Type-Options: nosniff`
- Referrer-Policy: `strict-origin-when-cross-origin`
- HTTPS enforced — Vercel provides this automatically

### Authentication Security
- Passwords hashed by Supabase Auth (bcrypt) — the app never handles raw passwords
- JWT tokens are short-lived (Supabase default: 1 hour) with refresh token rotation
- Admin session token stored in memory only — never in localStorage or cookies
- Email verification required before first login
- Rate limiting on auth endpoints (Supabase built-in)

### Input Validation
- All form inputs validated client-side with Zod and server-side in Edge Functions
- SQL injection: not possible — Supabase client uses parameterized queries only
- Max length enforced on all text fields (both client and database constraint level)

### Dependency Security
- `npm audit` run as part of CI/CD (GitHub Actions)
- Dependabot enabled on the GitHub repository
- No use of deprecated or known-vulnerable packages

### Vercel Security Config (`vercel.json`)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:; connect-src 'self' *.supabase.co api.openai.com;" }
      ]
    }
  ]
}
```

---

## Database Schema (Supabase / PostgreSQL)

### `profiles`
```sql
id              uuid (FK → auth.users)
username        text UNIQUE NOT NULL
full_name       text
email           text
role            text DEFAULT 'user'  -- 'user' | 'admin'
timezone        text DEFAULT 'UTC'
avatar_url      text
created_at      timestamptz
last_active_at  timestamptz
is_suspended    boolean DEFAULT false
onboarding_done boolean DEFAULT false
terms_accepted  boolean DEFAULT false
terms_accepted_at timestamptz
```

### `daily_tasks`
```sql
id          uuid PRIMARY KEY
user_id     uuid FK profiles
name        text
category    text
est_minutes int
is_active   boolean DEFAULT true
created_at  timestamptz
```

### `task_completions`
```sql
id          uuid PRIMARY KEY
user_id     uuid FK profiles
task_id     uuid FK daily_tasks
date        date
completed   boolean
completed_at timestamptz
```

### `failure_reasons`
```sql
id          uuid PRIMARY KEY
user_id     uuid FK profiles
source_type text  -- 'daily_task' | 'goal_task' | 'sleep'
source_id   uuid
date        date
reason_text text
analyzed    boolean DEFAULT false
created_at  timestamptz
```

### `side_quest_entries`
```sql
id          uuid PRIMARY KEY
user_id     uuid FK profiles
date        date
content     text
tags        text[]
created_at  timestamptz
```

### `goals`
```sql
id              uuid PRIMARY KEY
user_id         uuid FK profiles
name            text
category        text
target_date     date
motivation      text
status          text DEFAULT 'active'
created_at      timestamptz
```

### `goal_tasks`
```sql
id          uuid PRIMARY KEY
goal_id     uuid FK goals
user_id     uuid FK profiles
name        text
is_active   boolean DEFAULT true
created_at  timestamptz
```

### `goal_task_completions`
```sql
id          uuid PRIMARY KEY
user_id     uuid FK profiles
goal_task_id uuid FK goal_tasks
date        date
completed   boolean
completed_at timestamptz
```

### `sleep_logs`
```sql
id              uuid PRIMARY KEY
user_id         uuid FK profiles
date            date
bedtime         time
wake_time       time
duration_hours  decimal(4,2)
quality_rating  int
notes           text
created_at      timestamptz
```

### `finance_categories`
```sql
id          uuid PRIMARY KEY
user_id     uuid FK profiles
name        text
type        text  -- 'income' | 'expense'
color       text
icon_key    text
created_at  timestamptz
```

### `finance_transactions`
```sql
id              uuid PRIMARY KEY
user_id         uuid FK profiles
category_id     uuid FK finance_categories
amount          decimal(12,2)
transaction_date date
note            text
is_recurring    boolean DEFAULT false
recurrence_freq text
created_at      timestamptz
```

### `ai_chat_messages`
```sql
id          uuid PRIMARY KEY
user_id     uuid FK profiles
role        text  -- 'user' | 'assistant'
content     text
created_at  timestamptz
```

### `ai_weekly_reports`
```sql
id          uuid PRIMARY KEY
user_id     uuid FK profiles
week_start  date
content     text
created_at  timestamptz
```

### `admin_rate_limits`
```sql
id          uuid PRIMARY KEY
ip_address  text
attempt_count int DEFAULT 0
locked_until  timestamptz
last_attempt  timestamptz
```

---

## Key UX Flows

### New User First Visit
1. Signup form → Terms of Service modal → checkbox acceptance
2. Email verification
3. Onboarding wizard (3 steps):
   - Step 1: Set timezone, display name
   - Step 2: Create first 3 daily tasks
   - Step 3: (Optional) Set first goal
4. Land on Dashboard with animated welcome: "Welcome to the Batcave, [username]."

### Daily Return Visit
1. Login → Dashboard
2. If any tasks were missed yesterday → Failure Reason modal(s) appear in sequence before dashboard
3. Dashboard shows today's checklist, streak, AI tip
4. User works through the day, checking off tasks

### End of Day
- No active prompt — user logs sleep before bed
- If they forgot, they can back-fill (previous day sleep log allowed up to 48h back)

---

## Animations Specification

| Element | Animation |
|---|---|
| Page load | Bat logo draws itself (SVG stroke animation, 800ms) |
| Route transition | Fade out → black flash → fade in (200ms each) |
| Dashboard ring | Stroke draw animation on mount, ease-out |
| Checkbox complete | Gold checkmark SVG draws in + subtle glow pulse |
| Streak increase | Gold counter increments with bounce + particle burst (SVG) |
| AI message appear | Typewriter effect (character by character, 20ms/char) |
| Modal open | Scale from 0.9 → 1.0 + fade, 250ms spring |
| Chart mount | Recharts built-in animation (isAnimationActive=true) |
| Sidebar (mobile) | Slide in from left, 280ms ease |
| Bat signal (bg) | Slow radial rotation, 60s loop, 4% opacity |
| Loading spinner | Rotating bat silhouette SVG |
| Task completion confetti | Subtle gold particle burst (canvas, 1s) on 100% daily completion |

---

## Notifications (In-App)

- Toast notifications (bottom-right): task saved, goal created, sleep logged
- In-app notification bell: weekly AI report ready, goal deadline approaching (3 days)
- No email notifications beyond auth (keep it simple for free tier)

---

## Additional Features to Include

1. **Dark/Bat Mode only** — no light mode. This is intentional to the brand.
2. **Keyboard shortcuts** — `T` to quick-add task, `S` to log sleep, `F` to add finance entry
3. **Responsive design** — mobile-first. All pages must work on 375px width screens.
4. **PWA support** — `manifest.json` + service worker so users can install it on mobile
5. **Data export** — user can export all their data as JSON from Profile settings (GDPR friendly)
6. **Account deletion** — user can delete their account from Profile settings (wipes all data)
7. **404 page** — styled as "The signal went dark. Page not found." with bat-signal SVG
8. **Error boundary** — styled crash page with "Gotham needs you to reload" message
9. **Timezone handling** — all dates stored in UTC, displayed in user's timezone
10. **Streak freeze** — if user completes 75%+ of tasks, streak is maintained (not broken)

---

## Folder Structure (Recommended)

```
batman-project/
├── src/
│   ├── components/
│   │   ├── ui/              ← reusable: Button, Card, Modal, Input, Badge
│   │   ├── charts/          ← PieChart, LineChart, BarChart, RingChart wrappers
│   │   ├── layout/          ← Sidebar, Topbar, PageWrapper
│   │   └── animations/      ← BatSignal, LoadingBat, PageTransition
│   ├── pages/               ← one file per route
│   ├── modules/             ← feature logic: tasks, sleep, finance, goals, ai
│   ├── store/               ← Zustand stores
│   ├── lib/
│   │   ├── supabase.ts      ← Supabase client (anon key only)
│   │   └── utils.ts
│   ├── hooks/               ← custom React hooks
│   ├── types/               ← TypeScript interfaces
│   └── styles/
│       └── globals.css      ← Tailwind + custom CSS variables
├── supabase/
│   ├── migrations/          ← SQL migration files (schema + RLS)
│   └── functions/
│       ├── ai-chat/         ← OpenAI proxy (key never leaves here)
│       ├── admin-auth/      ← admin credential validation
│       ├── admin-data/      ← admin data queries (service role)
│       └── weekly-report/   ← cron-triggered weekly AI report
├── public/
│   ├── icons/               ← SVG icons
│   └── manifest.json
├── vercel.json              ← security headers
├── .env.example             ← placeholder values only, never real keys
├── .gitignore               ← includes .env, .env.local
├── README.md
└── package.json
```

---

## Environment Variables

### Client-side (safe to expose — Vercel environment variables, `VITE_` prefix)
```env
VITE_SUPABASE_URL=              # your Supabase project URL
VITE_SUPABASE_ANON_KEY=         # Supabase anon key (safe to expose, RLS enforces access)
```

### Server-side only (Supabase Edge Function secrets — NEVER in client code)
```env
OPENAI_API_KEY=                 # OpenAI API key — Edge Function only
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role — Edge Function only
```

### `.env.example` (committed to repo — placeholder values only)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
# OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY are set in Supabase Dashboard > Edge Functions > Secrets
# Never put them here or in any VITE_ variable
```

---

## Deployment

- **Frontend:** Vercel (connect GitHub repo, auto-deploy on push to `main`)
- **Backend:** Supabase free tier (500MB DB, 50k MAU, 2GB storage)
- **AI:** OpenAI API (`gpt-4o-mini`) — key stored in Supabase Edge Function secrets only
- **Domain:** Optional custom domain on Vercel

---

## README.md Content (for GitHub)

The generated project should include a `README.md` with:
- Project description and Batman theme context
- Live demo link (placeholder)
- Features list
- Setup instructions (clone → `.env` setup → `npm install` → `supabase db push` → `npm run dev`)
- Supabase setup guide (create project, run migrations, set RLS, add Edge Function secrets)
- Security notes: explanation of why API keys are never in client code
- Contributing guidelines
- License: MIT

---

## Antigravity Command

Once you have fed this PRD to Antigravity, run the following prompt to begin project generation:

```
Build "The Batman Project" exactly as specified in the PRD above.

Start by:
1. Scaffolding the full project structure with Vite + React + TypeScript + Tailwind CSS
2. Setting up the Batman theme design system (CSS variables, Tailwind config, typography)
3. Creating the Supabase schema (all tables, RLS policies, and migrations) with RLS enabled on every table
4. Building all Supabase Edge Functions: ai-chat (OpenAI proxy), admin-auth, admin-data, weekly-report
5. Building the Auth module (signup with full Terms of Service modal, login)
6. Building the hidden Admin Panel at /admin with standalone credential form and memory-only session
7. Building the Dashboard with animated components
8. Building each module in order: Daily Tasks → Goals → Side Quests → Sleep → Finance → AI Mentor
9. Implementing all Framer Motion animations as specified
10. Implementing all security measures: CSP headers in vercel.json, no API keys in client bundle, input sanitization, rate limiting on admin login
11. Adding PWA support, keyboard shortcuts, data export, and error boundaries
12. Writing the README with setup and security instructions

CRITICAL SECURITY RULES:
- OPENAI_API_KEY must NEVER appear in any client-side file, VITE_ variable, or the browser bundle
- SUPABASE_SERVICE_ROLE_KEY must NEVER appear in any client-side file
- All AI calls must be proxied through the ai-chat Edge Function
- All admin data queries must go through the admin-data Edge Function
- RLS must be enabled and tested on every Supabase table
- The /admin route must have no link, button, or reference anywhere in the regular user UI

Use SVG icons exclusively — no emoji. Keep the Batman dark theme consistent across all pages. Ensure all components are mobile-responsive. Do not skip any module, feature, or security measure listed in the PRD.
```

---

*Document version: 2.0 | Project: The Batman Project | Classification: Public SaaS*
