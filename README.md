# AI-Powered Recruitment Assessment Platform (Enterprise SaaS)

A production-ready technical recruitment assessment SaaS platform built using **Next.js 15 (App Router)**, **TypeScript**, **PostgreSQL (Supabase)**, and **Prisma ORM**. 

The platform automates the developer hiring cycle: from parsing Job Descriptions asynchronously, generating custom questions, scheduling candidate assessments via slot booking, conducting secure online examinations under server-side time constraints, and applying AI-driven evaluation scorecards.

---

## 🚀 Key Engineering & Architecture Updates

We audited and enhanced the platform's security, asynchronous capabilities, scheduling mechanisms, and user experience:

1. **🔒 Custom JWT Security Layer (Local Auth)**
   - Replaced Supabase Auth with custom `bcryptjs` password hashing and cookie-stored, state-signed JWT tokens via the `jose` library.
   - Secured recruiter dashboards under `/dashboard/*` with middleware guards (`src/middleware.ts`).
   - Implemented cookie-based JWT routes at `/api/auth/login`, `/api/auth/signup`, and `/api/auth/logout`.

2. **🔗 Asynchronous Job Description Parsing Webhook Pattern**
   - **Upload Endpoint** (`/api/jobs/upload`): Creates the Job in a `PROCESSING` status and triggers an async, non-blocking webhook request to n8n (releasing Next.js execution threads immediately). Includes a dev fallback that simulates async completion in 2 seconds if n8n is offline.
   - **Callback Webhook** (`/api/webhooks/n8n/jd-complete`): An authorized callback endpoint. Secures data transfers via shared secrets (`x-webhook-secret`), parses payloads via Zod, checks idempotency keys to prevent duplicate database entries on retries, saves the parsed JD metadata, bulk-inserts questions into the `QuestionBank` table, and sets the Job status to `ACTIVE`.

3. **📅 Candidate Shortlisting & Slot Booking Pipeline**
   - **Candidate Shortlist** (`/api/candidates/[id]/shortlist`): Transitions candidate state to `SHORTLISTED` and dispatches a congratulations email offering them a booking link (`/candidate/book-slot/[token]`).
   - **Public Booking Portal** (`/candidate/book-slot/[token]`): A responsive dashboard showing available, active scheduled slots, excluding expired slots or those that have filled their capacity.
   - **Slot Reservation** (`/api/assessment/book-slot`): Reserves slots transactionally under database locks (`$transaction`) to prevent overbooking, increments booking counts, schedules the candidate (`SCHEDULED`), and sends a booking confirmation mail.

4. **⏳ Server-Side Slot Time Guards & Locked-In Questions**
   - **Portal Countdown Locks**: Blocks candidate test launches before their booked start time and marks links as expired once their slot closes.
   - **Server-Side Verification**: The `/api/assessment/generate` and `/api/assessment/submit` endpoints verify active server times. Generating questions locks a random sample of 20 questions from the job's `QuestionBank` into the `Assessment` table to prevent question re-rolling on page refresh.
   - **Single-Submission Lock**: Rejects duplicate submission attempts with a strict `400 Bad Request` payload (no multiple submissions are allowed).

5. **⏰ Secured Cron Job Triggers**
   - **Reminders Cron** (`/api/cron/reminders`): Triggered by scheduler networks with Bearer token authentication. Emails candidates whose assessment window starts in the next 24 hours.
   - **Expirations Cron** (`/api/cron/expirations`): Automatically transitions scheduled/started candidate records to `EXPIRED` status if they missed their slot window.

6. **📊 Reusable DataTable Component**
   - Designed a generic `<DataTable>` wrapper (`src/components/ui/data-table.tsx`) containing client-side search inputs, multi-column togglable sorting, pagination limits, and dedicated loading, empty, and query-fallback states.

7. **👥 HR Team & Recruiter Account Management (Admin Dashboard)**
   - Created a restricted HR Team portal (`/dashboard/team`) visible and accessible strictly to users with the `ADMIN` role.
   - Enables Admins to create new HR recruiter accounts (with temporary passwords, hashed safely in the database using `bcryptjs`).
   - Renders active recruiter directories in our paginated and sortable `<DataTable>` display.
   - Integrated action controls to instantly delete and revoke recruiter credentials (blocking dashboard access).
   - Enforced route protection policies directly inside the Next.js routing middleware (`src/middleware.ts`) and backend controllers (`/api/team`).

8. **📥 Job Descriptions Bulk Import (CSV File Parser)**
   - Added bulk-import buttons to the Jobs dashboard header and its empty-state panel.
   - Supports selecting a CSV file containing job listings with headers for `title` and `jdText`.
   - Offers custom duplicate mitigation strategies: `Skip duplicates` or `Overwrite duplicates` (updating existing records and re-generating assessments).
   - Built a secure client-side CSV text parser handling quotes and commas.
   - Displays an interactive **Import Summary Card** displaying metrics (Total Processed, Newly Created, Updated, Skipped).

---

## 📦 Technical Architecture & Stack

- **Frontend**: Next.js 15 App Router, Tailwind CSS, Lucide Icons, React Hook Form, Zod.
- **Backend & APIs**: Next.js Server-Side Route Handlers.
- **Database**: PostgreSQL (hosted on Supabase) + Prisma ORM.
- **Auth**: State-signed JWT tokens using local Cryptography.
- **Emails**: Resend API Integration (simulated in console logs if API key is not provided).
- **Rate Limiting**: Custom in-memory IP request limiters configured on public booking/test endpoints.

---

## 🗄️ Database Schema & Relations

```mermaid
erDiagram
    User {
        String id PK
        String name
        String email
        String passwordHash
        Role role
        DateTime createdAt
    }
    Job {
        String id PK
        String title
        String department
        String location
        String experience
        JobStatus status
        String jdRawText
        Json parsedJDData
        String createdBy FK
    }
    QuestionBank {
        String id PK
        String jobId FK
        String question
        String topic
    }
    Candidate {
        String id PK
        String name
        String email
        String phone
        String jobId FK
        AssessmentStatus assessmentStatus
        String assessmentToken
    }
    Slot {
        String id PK
        DateTime startTime
        DateTime endTime
        Int capacity
        Int bookedCount
        String status
    }
    SlotBooking {
        String id PK
        String candidateId FK
        String slotId FK
        Boolean reminderSent
    }
    Assessment {
        String id PK
        String candidateId FK
        String jobId FK
        Json questions
        String[] assignedQuestionIds
        Json answers
        Float score
        Float percentage
        Json evaluationData
        DateTime completedAt
    }

    User ||--o{ Job : "creates"
    Job ||--o{ Candidate : "has"
    Job ||--o{ QuestionBank : "owns"
    Candidate ||--|| SlotBooking : "books"
    Slot ||--o{ SlotBooking : "allocates"
    Candidate ||--|| Assessment : "takes"
```

---

## 🔄 Candidate Life-Cycle Flow

```mermaid
flowchart TD
    A[Recruiter Invites Candidate] -->|Status: INVITED| B(Recruiter Shortlists Candidate)
    B -->|Status: SHORTLISTED - Email Dispatched| C[Candidate Books Assessment Slot]
    C -->|Status: SCHEDULED - Confirmation Sent| D{Is Slot Window Active?}
    D -->|No - Too Early| E[Lockout Screen - Countdown]
    D -->|No - Past End Time| F[Link Expired Screen]
    D -->|Yes| G[Candidate Enters Exam Portal]
    G -->|Timer Starts 45m| H[Questions Locked from QuestionBank]
    H -->|Candidate Submits Answers| I[Status: COMPLETED - Block Future Submissions]
    I -->|n8n Evaluates Responses| J[Status: EVALUATED - AI Scorecard Generated]
```

---

## 📋 n8n API Contracts

To integrate n8n workflows, configure your endpoints in your environment. The endpoints follow these schemas:

### 1. Job Description Parser Callback (`/api/webhooks/n8n/jd-complete`)
- **Headers**: `x-webhook-secret: [Your Shared Secret]`
- **Method**: `POST`
- **Body Schema**:
  ```json
  {
    "jobId": "uuid-string",
    "requestId": "uuid-string",
    "questions": [
      { "question": "Question text...", "topic": "System Architecture" }
    ],
    "parsedJDData": {
      "skills": ["React", "Prisma"],
      "mustHave": ["3+ years experience"],
      "goodToHave": ["Tailwind"],
      "experience": "3+ years",
      "seniority": "Mid-Level",
      "topics": ["System Architecture"],
      "weights": { "React": 60, "Prisma": 40 }
    }
  }
  ```

### 2. AI Response Evaluation Trigger (`N8N_EVALUATE_ASSESSMENT_URL`)
- **Headers**: `x-webhook-secret: [Your Shared Secret]`
- **Method**: `POST`
- **Body Schema**:
  ```json
  {
    "jobId": "uuid-string",
    "candidateId": "uuid-string",
    "questions": [
      { "id": "q-1", "question": "Explain RSCs...", "topic": "System Architecture" }
    ],
    "answers": {
      "q-1": "Candidate explanation details..."
    }
  }
  ```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Environment Configurations
Rename `.env.example` to `.env` and fill in the values:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Secret Keys
JWT_SECRET="generate-a-secure-secret-key-string"
N8N_SHARED_SECRET="super-secret-key"
CRON_SECRET="super-cron-secret-key"

# Email Integration (Optional)
RESEND_API_KEY=""

# n8n Webhook URL (leave blank to run in simulated mode)
N8N_JD_WEBHOOK_URL=""
N8N_EVALUATE_ASSESSMENT_URL=""
```

### 2. Sync Schema and Populate Seed Data
Sync your tables and enums to Supabase:
```bash
npx prisma generate
npx prisma db push --force-reset
```
Seed the database with admin users, slots, question banks, and candidate profiles:
```bash
node prisma/seed.js
```

### 3. Clear Cache & Run Development Server
Wipe out stale compilation caches and start the Next.js development server:
```bash
# Deletes Next.js compiler cache
Remove-Item -Recurse -Force .next

# Run Server
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000)
- Sign in with pre-seeded credentials:
  - **Email**: `admin@gmail.com`
  - **Password**: `admin123`

---

## 🔐 Session Management & Inactivity Timeout (Local & Hostinger)

The platform includes an enterprise-grade session lifecycle and inactivity timeout architecture that behaves identically in local development and production on Hostinger.

### Key Architecture Features

1. **20-Minute Sliding Inactivity Timeout**:
   - Activity tracking listens to `mousemove`, `keydown`, `click`, `scroll`, and `touchstart` throttled to at most once per second.
   - Timestamps are persisted in `localStorage` (`session_last_activity`), enabling all open browser tabs to share the exact same timer.
   - Calculates remaining time using true system timestamps (`Date.now() - lastActivity`) instead of naive `setTimeout`, ensuring perfect accuracy even when a tab sleeps or laptop lid is closed.

2. **60-Second Warning Dialog**:
   - At 19 minutes (or `SESSION_WARNING_SECONDS` before expiry), an interactive modal displays:
     > *"Your session will expire in 60 seconds unless you stay signed in."*
   - Includes a live countdown timer and two buttons:
     - **Stay signed in**: Calls `POST /api/auth/refresh` to renew the sliding session cookie and resets the timer.
     - **Log out**: Instantly invokes the single logout routine.

3. **Absolute Maximum Session Cap (`SESSION_MAX_HOURS`)**:
   - Stores the original login timestamp (`auth_time`) in both the JWT claims and client storage.
   - Even if the user remains continuously active, the session is forcefully terminated after `SESSION_MAX_HOURS` (default: 8 hours) to prevent indefinite session hijacking.

4. **Long Upload / Batch Polling Immunity**:
   - During active candidate resume or job description batch processing (`useBatchPolling`), each polling cycle automatically touches the session activity.
   - The idle warning modal is suppressed while an upload is in progress, ensuring long bulk uploads are never interrupted by a timeout.

5. **Single Centralized Logout Routine**:
   - Invoked identically by the logout button, idle timeout, max session expiry, or 401 interceptors.
   - Issues `POST /api/auth/logout` which drops the HTTP-only cookie with `maxAge: 0` and `expires: new Date(0)`.
   - Cleans `localStorage` (`auth_token`, `auth_user`, `session_last_activity`, `session_auth_time`) and clears `sessionStorage`.
   - Leaves unrelated browser keys intact (e.g. custom n8n URLs, themes).
   - Aborts all in-flight fetch requests and cancels active polling.
   - Broadcasts the logout event to all other open tabs via `BroadcastChannel` with `storage` event fallback.
   - Redirects to `/login?reason=timeout` or `/login?reason=expired`.

6. **Browser Back-Button & Cache Protection**:
   - All authenticated pages (`/dashboard/*`) and API endpoints emit strict security headers:
     `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
   - Next.js middleware (`src/middleware.ts`) verifies the session cookie on every request. If a user logs out and presses the browser Back button, the browser is forced to revalidate and is immediately redirected to `/login`.

---

## ⚙️ Environment Variables Reference

| Variable | Local (`.env`) | Production (`Hostinger`) | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://your-domain.com` | App base URL |
| `COOKIE_SECURE` | `false` | `true` | **Critical**: Must be `false` on HTTP localhost, `true` on HTTPS Hostinger |
| `COOKIE_NAME` | `auth_token` | `auth_token` | Name of the authentication cookie |
| `COOKIE_SAMESITE` | `lax` | `lax` | SameSite cookie policy |
| `COOKIE_DOMAIN` | *(leave empty)* | *(empty or .yourdomain.com)* | Cookie scope domain |
| `SESSION_IDLE_TIMEOUT_MINUTES` | `20` | `20` | Server-enforced sliding idle timeout (minutes) |
| `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES`| `20` | `20` | Client idle timeout trigger (minutes) |
| `SESSION_WARNING_SECONDS` | `60` | `60` | Warning countdown duration (seconds) |
| `NEXT_PUBLIC_SESSION_WARNING_SECONDS` | `60` | `60` | Client countdown duration (seconds) |
| `SESSION_MAX_HOURS` | `8` | `8` | Absolute maximum session lifespan |
| `JWT_SECRET` | *(secret string)* | *(secret string)* | Server-only JWT signing key (min 32 chars) |

> ⚠️ **How to change the timeout without touching code**:  
> Simply update `SESSION_IDLE_TIMEOUT_MINUTES` and `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES` in your environment variables and restart the server.

---

## 🧪 Verification & Testing Guide

To test the session timeout without waiting 20 minutes:

### 1. Fast Timeout & Warning Verification (2 Minutes / 20 Seconds)
1. Open `.env` (or Hostinger Environment variables) and set:
   ```env
   SESSION_IDLE_TIMEOUT_MINUTES=2
   NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES=2
   SESSION_WARNING_SECONDS=20
   NEXT_PUBLIC_SESSION_WARNING_SECONDS=20
   ```
2. Restart the application (`npm run dev` or redeploy on Hostinger).
3. Log in to the dashboard at [http://localhost:3000/login](http://localhost:3000/login).
4. Leave the browser untouched for **1 minute and 40 seconds**:
   - The warning dialog will appear: *"Your session will expire in 20 seconds"*.
   - The live counter will tick down: `20s`, `19s`, `18s`...
5. Click **"Stay signed in"**:
   - The modal closes, `/api/auth/refresh` renews the cookie, and the timer resets to full duration.
6. Leave it untouched again until the counter reaches `0s`:
   - You will be automatically signed out and redirected to `/login?reason=timeout`.
   - The login page will display: **"You were logged out because of inactivity."**
7. Check DevTools:
   - **Application > Cookies**: `auth_token` is cleared (`maxAge: 0`).
   - **Application > Local Storage**: `auth_token`, `auth_user`, and `session_last_activity` are removed.

### 2. Multi-Tab Synchronization
1. Open two tabs at [http://localhost:3000/dashboard](http://localhost:3000/dashboard).
2. In Tab 1, click **"Sign Out"** in the sidebar.
3. Observe Tab 2:
   - Tab 2 will immediately detect the `BroadcastChannel` event and redirect to `/login?reason=logout` simultaneously.

### 3. Back-Button Cache Protection
1. Log in to the dashboard.
2. Click **"Sign Out"** (you land on `/login`).
3. Press the browser **Back** button.
4. Verify that you are immediately redirected back to `/login?reason=expired` and cannot view any cached dashboard data.

### 4. Long Upload Processing Immunity
1. Navigate to `/dashboard/candidates/upload` or `/dashboard/jobs/upload`.
2. Start an upload batch.
3. While the progress bar / polling is active, verify that the warning modal does not appear, as active polling automatically marks the session as active.

### 5. Production Build Verification
Verify everything runs cleanly in production mode:
```bash
npm run build
npm run start
```

