# MedLedger-AI — Project Description for Resume & Portfolio

Use the sections below on your resume, LinkedIn, or in interviews.

## One-liner

**MedLedger-AI** — Full-stack healthcare web app for patient-controlled medical records, provider verification, AI-powered PDF record ingestion (OpenAI/Gemini), and an interactive patient history timeline with an AI summary chatbot. Built with Next.js 14, Supabase, and TypeScript.

## Resume bullets (pick 2–4)

- **Designed and built a full-stack healthcare platform** with role-based access (Patient, Provider, Super Admin), JWT session auth (jose), bcrypt password hashing, and email verification/OTP and password reset via Resend.
- **Implemented AI-powered medical record ingestion**: doctors upload PDFs; the app extracts text (unpdf), then uses **OpenAI (gpt-4o-mini) or Google Gemini** via Vercel AI SDK to extract structured fields (patient demographics, medications, conditions, vitals, chief complaint, etc.) into a typed schema and auto-fill the record form with validation and confidence scoring.
- **Built a doctor-facing patient history experience**: normalized encounter data from PostgreSQL (Supabase) into a filterable timeline (date range, event type, "abnormal only," search), with a detail panel (labs, medications, notes) and an **AI Summary chat** that provides bullet-point summaries and answers follow-up questions using the same LLM with full history as context.
- **Delivered end-to-end flows**: Supabase (PostgreSQL) schema design and migrations for users, profiles, medical records (JSONB for FHIR-lite), and admin RBAC; Server Actions for all mutations; deployment on Vercel with GitHub integration and environment-based configuration.

## Tech stack (quick reference)

| Area | Technologies |
|------|----------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js Server Actions, Supabase (PostgreSQL) |
| Auth | Session cookie, JWT (jose), bcrypt |
| Email | Resend (OTP, password reset) |
| AI | Vercel AI SDK, OpenAI (gpt-4o-mini) / Google Gemini (gemini-2.0-flash) |
| PDF | unpdf (text extraction) + LLM (structured extraction) |
| Deployment | Vercel, GitHub integration |
