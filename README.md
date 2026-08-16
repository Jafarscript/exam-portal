# Al-Huda Exam Portal

A complete online examination system for an Arabic & Islamic Studies teacher — parents/independent students register, the teacher assigns classes and builds exams, students sit timed/untimed exams with autosave and resume, auto- and manual grading, results, and moderate integrity logging.

Stack: **Next.js (JS, pages router) + Tailwind CSS + MongoDB Atlas/Mongoose**, all in one deployable app (frontend + API routes).

## 1. What's included

- Full auth: parent registration (needs teacher approval), independent-student registration, pre-provisioned teacher login, JWT session in an httpOnly cookie, password reset by email.
- Parent → children management; teacher → parents/students/classes/subjects management.
- Exam builder: draft/published/closed lifecycle, 6 question types, image/audio upload (Cloudinary), question & answer randomization with the resulting order persisted per attempt.
- Exam engine: one attempt per student (DB-enforced unique index, not just UI), autosave with debounce/retry, resume from any device, server-computed expiry, auto-submit on timeout (both client-triggered and a server-side fallback the next time the attempt is read).
- Grading: instant auto-grading for MCQ/multi-select/true-false/fill-in-the-blank (with basic Arabic normalization for fill-in-the-blank matching), manual grading queue for essay/short-answer, results only finalize once all manual grading is done.
- Results & statistics: student/parent see only their own result; teacher sees class-wide stats, per-question difficulty, and integrity flags.
- Full Arabic RTL + English LTR support handled per-element (not `text-align: right`) — see `lib/rtl.js` and `components/RTLText.js`.
- Exam integrity logging (tab switches, fullscreen exits) — logging only, never blocks or fails a student.
- Email notifications via SMTP (nodemailer) for every event in the spec, including an optional daily cron endpoint for deadline reminders.
- Responsive UI down to mobile, built for the actual exam-taking flow (question nav grid, timer, save status).

## 2. Prerequisites

- Node.js 18+
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- An SMTP provider (Gmail app password, [Brevo](https://www.brevo.com) free tier, or Mailtrap for testing)
- A free [Cloudinary](https://cloudinary.com) account (only needed for question images/audio)

## 3. Setup

```bash
cp .env.example .env.local
# fill in MONGODB_URI, JWT_SECRET, SMTP_*, CLOUDINARY_*, TEACHER_EMAIL, TEACHER_PASSWORD

npm install
npm run seed:teacher   # creates the one pre-provisioned teacher account
npm run dev            # http://localhost:3000
```

Log in as the teacher first, create at least one class and one subject, then either:
- approve parents as they self-register and let them add children, or
- add students directly under Teacher → Students (with or without their own login).

## 4. Environment variables

See `.env.example` for the full list with comments. The only ones required to run locally are `MONGODB_URI` and `JWT_SECRET`; without SMTP/Cloudinary configured, emails log to the console and uploads are disabled but everything else works.

## 5. Notable engineering decisions

- **Auth**: custom JWT-in-httpOnly-cookie rather than a full auth framework — the role model (teacher/parent/student with parent approval) is bespoke enough that a generic provider would add more complexity than it removes.
- **One attempt per exam**: enforced both by application logic and a unique `(examId, studentId)` index on `Attempt`, so it holds even under a race condition or a bug elsewhere in the code.
- **Randomization**: question/option order is computed once at `start` time (seeded off exam+student so it's reproducible) and persisted on the attempt — resuming or refreshing never reshuffles.
- **Autosave**: debounced per-question PATCH requests with retry/backoff on failure, so a flaky connection doesn't lose an answer — see `hooks/useAutosave.js`.
- **Timer**: the on-screen countdown is cosmetic. The backend independently stores `expiresAt` on the attempt and rejects further answer saves past it; reading an expired attempt auto-submits it server-side as a fallback for a student who simply closed the tab.
- **Timezone**: exam deadlines/times are stored as UTC `Date`s and displayed using `Europe/London` formatting throughout, since the teacher and students are UK-based.
- **RTL**: handled per-element via `dir="auto"`/`unicode-bidi: plain-text` plus a stored per-question/option direction, not a page-wide `text-align`.

## 6. Deployment (Vercel — free tier friendly)

1. Push this project to a GitHub repo.
2. Import it in [Vercel](https://vercel.com), framework preset "Next.js".
3. Add all variables from `.env.example` under Project Settings → Environment Variables.
4. Deploy, then run `npm run seed:teacher` once locally against the **production** `MONGODB_URI` (or temporarily add a one-off script) to create the teacher account.
5. Optional — daily deadline reminders: add a `vercel.json` with
   ```json
   { "crons": [{ "path": "/api/cron/deadline-reminders", "schedule": "0 8 * * *" }] }
   ```
   and set `CRON_SECRET`; Vercel Cron will call it automatically (Vercel signs cron requests, but the endpoint also checks `CRON_SECRET` as a backstop for any other trigger method, e.g. cron-job.org).

## 7. Project structure

```
lib/           server-only helpers (db, auth, mailer, upload, grading, rtl, examEngine)
models/        Mongoose schemas
pages/api/     all backend routes (see spec's API list — routes map 1:1)
pages/         frontend pages (public, parent/, student/, teacher/)
components/    shared UI (QuestionRenderer, QuestionEditor, Timer, RTLText, ...)
hooks/         useAuth, useToast, useAutosave
scripts/       seedTeacher.js
```

## 8. Known simplifications (by design, per spec)

- No PDF/CSV export, no SMS/WhatsApp, no webcam/proctoring, no AI grading — all explicitly excluded.
- Integrity events are logged only; they never affect grading, submission, or access.
- The deadline-reminder email is cron-triggered rather than fully "real-time", since Next.js API routes have no built-in scheduler — this is the standard free-tier-friendly approach (Vercel Cron).
