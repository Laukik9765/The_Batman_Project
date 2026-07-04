# The Batman Project

The Batman Project is a premium, secure SaaS productivity web application styled around a dark, immersive "Batcave Terminal" aesthetic. It integrates multiple operational modules—including daily habits checklists, sleep quality logs, financial ledgers, and strategic goals trackers—together with a holistic AI Mentor styled as Alfred Pennyworth.

## 🦇 Tech Stack

*   **Frontend**: React 19 + TypeScript + Vite + Zustand (State Management)
*   **Styling**: Tailwind CSS v3 (Custom Gotham Dark palette) + Framer Motion (Transitions and Checkbox drawing effects)
*   **Charts**: Recharts (Custom themed charts with recommendations reference zones)
*   **Backend**: Supabase (Auth + PostgreSQL + Deno Edge Functions)
*   **AI Engine**: Google Gemini 2.5 Flash via server-side proxy
*   **Security Configuration**: Content Security Policy (CSP), anti-clickjacking headers, and memory-only Admin JWT tracking.

---

## ⚡ Setup & Installation

### Prerequisites

*   Node.js (v18 or higher)
*   Supabase CLI (optional, or run commands via Supabase Console SQL Editor)

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd batman-project
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root workspace directory matching the parameters of `.env.example`:

```env
# Client-side configuration (safe to expose, RLS enforces access)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database Schema setup

Run the SQL migration script located in `supabase/migrations/20260629000000_init.sql` directly inside your **Supabase Database > SQL Editor**. This script:
1.  Creates all 14 tables.
2.  Sets up foreign keys, cascades, indices, and constraints.
3.  Enables strict default `DENY ALL` Row Level Security (RLS) on every table.
4.  Creates policies for user ownership (`user_id = auth.uid()`).
5.  Sets up the PostgreSQL triggers to auto-create user profiles upon signup in `auth.users`.
6.  Adds the `delete_user_account()` RPC function for self identity purges.

### 4. Configure Supabase Edge Functions Secrets

The application requires three server-side secrets. Configure these inside your **Supabase Dashboard > Project Settings > Edge Functions > Secrets** (or via Supabase CLI command `supabase secrets set`):

```env
GEMINI_API_KEY=your-gemini-api-key             # To authorize Alfred's AI requests
SUPABASE_SERVICE_ROLE_KEY=your-service-key    # Bypasses RLS to compile user contexts and platform statistics
ADMIN_JWT_SECRET=your-custom-jwt-secret-key   # Used to sign short-lived memory-only Admin sessions
```

To deploy the functions, run:
```bash
supabase functions deploy ai-chat
supabase functions deploy admin-auth
supabase functions deploy admin-data
supabase functions deploy admin-report
```

### 5. Running the App locally

```bash
npm run dev
```
The terminal starts on `http://localhost:5173`.

---

## 🛡️ Security Architecture

*   **API Key Protection**: Neither `GEMINI_API_KEY` nor `SUPABASE_SERVICE_ROLE_KEY` is ever compiled into the client bundle or visible in browser traffic.
*   **Edge Gateway Routing**: AI chats and Admin dashboard queries are routed through Edge Functions which authenticate the caller's standard JWT first.
*   **Admin Panel Gating**: The `/admin` path is hidden with zero links in the regular UI. Admin login requests are validated by email matching and password sign-ins using the `admin-auth` Edge Function, returning a custom JWT with 2-hour expiry. This JWT is stored solely in-memory (lost on tab closure).
*   **IP Lockout**: 5 failed admin credential attempts from a single IP address locks out further requests for 30 minutes.
*   **CSP Headers**: Security headers (`X-Frame-Options: DENY`, `Content-Security-Policy`) are enforced on Vercel deployment via `vercel.json` rules.

---

## ⚙️ Keyboard Shortcuts

Pressing these keys outside of input fields triggers global overlays:
*   `T` — Open/close Quick Habit add modal
*   `S` — Open/close Quick Sleep log modal
*   `F` — Open/close Quick Transaction log modal

---

## 📜 License

This project is licensed under the MIT License.
