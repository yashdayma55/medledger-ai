# MedLedger-AI

**Intelligence-driven healthcare ecosystem**: patient-controlled medical records, provider verification, AI-powered PDF parsing, and a doctor-friendly patient history timeline with an AI summary chatbot.

---

## Features

### For patients
- **Register / login** with email; OTP verification and password reset via Resend.
- **Patient dashboard**: view profile and **medical history** (records added by providers).

### For doctors (providers)
- **Register / login** as provider; email verification and optional NPI; **pending admin approval** before full access.
- **Create medical record**: link to an existing patient (by email) or create a new patient; fill a structured form (demographics, admission, clinical summary, medications, conditions, vitals, treatment plan).
- **Parse from PDF**: upload a medical record PDF; **OpenAI** (or Gemini) extracts patient name, DOB, summary, medications, conditions, vitals, chief complaint, etc., and **auto-fills the form**. Edit and save.
- **Patient history**: select a patient and view a **timeline of encounters** (expandable), with filters (date range, event type, “only abnormal,” search). Detail panel shows encounter overview, labs table, medications/conditions, notes, documents, and a “Prototype output” AI summary.
- **AI Summary chat**: on the Patient history page, open **“AI Summary chat”** to get a **quick bullet-point summary** of the current patient’s history, or ask follow-up questions (e.g. “What are the current medications?”). Uses the same AI (OpenAI or Gemini) with the loaded history as context.

### For admins
- **Super admin** can log in, see stats (patients, providers, pending), **verify or reject** pending providers, and manage the provider list.

---

## Tech stack

| Layer        | Technology |
|-------------|------------|
| Frontend    | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend     | Next.js Server Actions, Supabase (PostgreSQL) |
| Auth        | Session cookie (JWT via `jose`), bcrypt for passwords |
| Email       | Resend (OTP, password reset) |
| AI          | Vercel AI SDK with **OpenAI** (`gpt-4o-mini`) or **Google Gemini** (`gemini-2.0-flash`) for PDF extraction and history summary/chat |
| PDF parsing | `unpdf` for text extraction; AI for structured extraction into the record form |

---

## Project structure (high level)

```
app/
  dashboard/
    admin/          # Super admin: verify providers, stats
    doctor/         # Provider dashboard, create record, patient history + AI chat
    patient/        # Patient dashboard, view history
  auth/             # Login, register (patient + doctor), OTP, password reset
lib/
  auth/             # Session, password hashing
  doctor-history/   # Normalize records → encounters/timeline
  pdf-ingestion/    # PDF text extraction, AI extraction (OpenAI/Gemini), schema, prefill mapping
  supabase/         # Server Supabase client
  types/            # Medical record, doctor-history types
supabase/migrations # SQL migrations (users, patient_medical_records, admin, etc.)
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/medledger-ai.git
cd medledger-ai
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql` (users, auth, patient/provider profiles)
   - `supabase/migrations/002_patient_medical_records.sql` (medical records table)
   - `supabase/migrations/003_super_admin_schema.sql` (admin profile, RBAC, audit)
   - `supabase/migrations/004_record_source_file.sql` (source_file, extracted_at, confidence_score on records)
3. If the table `patient_medical_records` is missing (e.g. new project), you can run `supabase/migrations/RUN_ME_create_patient_medical_records.sql` in the SQL Editor.
4. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Resend (email)

1. Sign up at [resend.com](https://resend.com) and create an API key.
2. Set `RESEND_API_KEY` and optionally `RESEND_FROM_EMAIL`.
3. For local testing with unverified domains, set `RESEND_DEV_OVERRIDE_TO` to your email so all test emails go to your inbox.

### 4. AI (PDF parsing & history chatbot)

At least one of the following is required for **Parse from PDF** and **AI Summary chat**:

- **OpenAI** (recommended): [platform.openai.com](https://platform.openai.com) → API key → `OPENAI_API_KEY`
- **Gemini**: [Google AI Studio](https://aistudio.google.com/app/apikey) → `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`)

The app uses **OpenAI first** if `OPENAI_API_KEY` is set; otherwise it falls back to **Gemini**. Gemini free tier has strict rate limits (e.g. few requests per minute).

### 5. Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at least:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `RESEND_API_KEY` | Resend API key for email |
| `SESSION_SECRET` | Long random string for JWT session cookie (e.g. 32+ chars) |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. `http://localhost:3000` or production URL) |
| `OPENAI_API_KEY` or `GEMINI_API_KEY` | For PDF parsing and AI Summary chat (optional but recommended) |

See `.env.example` for optional Resend senders and Azure OpenAI.

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:pdf` | Test PDF parse (script) |

---

## User flows

### Patient
- **Register** → email + password → receive OTP → verify email → sign in.
- **Login** → email + password; **Forgot password?** sends reset link.
- **Dashboard** → view profile and medical history (read-only).

### Doctor
- **Register** → email, password, NPI (optional), etc. → verify email → account **pending** until admin approves.
- **Login** → after approval, access provider dashboard.
- **Create medical record** → choose existing patient (by email) or new patient; optionally **upload PDF** and click **Parse PDF** to auto-fill; edit and **Save record**.
- **Patient history** → select patient → see timeline (date range, event type, “only abnormal,” search) → expand encounters → select for detail panel. Click **AI Summary chat** for a quick summary or to ask questions about the patient.

### Super admin
- **Login** as admin (first admin can self-create).
- **Dashboard** → view counts, **verify/reject** pending providers.

---

## Database (summary)

- **users** – email, role (patient/provider/admin/superuser), password hash, status.
- **patient_profile** / **provider_profile** – profile data linked to `users`.
- **patient_medical_records** – per-encounter records: `patient_user_id`, `provider_user_id`, `title`, `record_date`, `summary`, `fhir_lite_json` (JSONB), `source_file`, `extracted_at`, `confidence_score`.
- Admin and RBAC tables (see `003_super_admin_schema.sql`).

---

## Deployment

- Set all required env vars in your host (Vercel, etc.).
- Ensure Supabase migrations are applied to your production database.
- Use a strong `SESSION_SECRET` and a proper `NEXT_PUBLIC_APP_URL` for production.
- Do not commit `.env.local` or any real API keys.

---

## License

Private / as per your repository settings.
