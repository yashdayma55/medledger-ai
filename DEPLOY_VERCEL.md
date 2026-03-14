# Deploy MedLedger-AI on Vercel (linked to GitHub)

## 1. Link GitHub and import project

1. Go to **[vercel.com](https://vercel.com)** and sign in (or create an account).
2. Click **“Add New…”** → **“Project”**.
3. **Import Git Repository**: connect your GitHub account if needed, then select **`yashdayma55/medledger-ai`** (or your fork).
4. Click **Import**.

## 2. Configure project

- **Framework Preset:** Vercel should detect **Next.js**.
- **Root Directory:** leave as `.` (repository root).
- **Build Command:** `npm run build` (default).
- **Output Directory:** leave default (Next.js).
- **Install Command:** `npm install` (default).

Do **not** change these unless you have a custom setup.

## 3. Add environment variables

Before deploying, add your env vars so the app can talk to Supabase, Resend, and (optionally) OpenAI/Gemini.

In the import screen (or **Project → Settings → Environment Variables**), add these. Use **Production**, and optionally **Preview** if you want them on PR previews.

| Name | Value | Notes |
|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key | **Secret** – from Supabase → Settings → API |
| `RESEND_API_KEY` | Your Resend API key | From resend.com |
| `SESSION_SECRET` | A long random string (e.g. 32+ chars) | Generate one; e.g. `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL | After first deploy: `https://your-project.vercel.app` (then you can change to a custom domain if you add one) |
| `OPENAI_API_KEY` | Your OpenAI API key | Optional but recommended for PDF parsing and AI Summary chat |
| `GEMINI_API_KEY` | Your Gemini API key | Optional; used if `OPENAI_API_KEY` is not set |

Optional (for more Resend senders):  
`RESEND_FROM_EMAIL`, `RESEND_DEV_OVERRIDE_TO`, and any of the secondary/tertiary Resend keys if you use them (see `.env.example`).

**Important:**  
- Do **not** commit real keys to GitHub.  
- For the **first** deploy, you can set `NEXT_PUBLIC_APP_URL` to `https://medledger-ai.vercel.app` (or whatever Vercel assigns). After the first deploy, copy the actual URL and update this variable if needed (e.g. for password-reset links).

## 4. Deploy

1. Click **Deploy**.
2. Wait for the build to finish. If the build fails, check the build logs (often a missing env var or a TypeScript/ESLint error).
3. When it’s done, Vercel gives you a URL like **`https://medledger-ai-xxx.vercel.app`**.

## 5. GitHub link and auto-deploys

- The project is **linked to your GitHub repo**. Every push to the branch you deployed (usually `main`) will trigger a new **production** deployment.
- Pull requests get **Preview** deployments if you enabled them.

## 6. After first deploy

1. **Update `NEXT_PUBLIC_APP_URL`** in Vercel (Settings → Environment Variables) to your real app URL (e.g. `https://your-app.vercel.app` or your custom domain). Redeploy if needed so password-reset and other links use the correct base URL.
2. **Supabase:** Ensure your production Supabase project has all migrations applied (same as in the README).
3. **Custom domain (optional):** In Vercel, go to Project → Settings → Domains and add your domain.

## Troubleshooting

- **Build fails:** Check the build log. Common issues: missing env var, or a TypeScript/lint error. Run `npm run build` locally to reproduce.
- **“Server configuration error” or DB errors:** Ensure `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly for the project you use in production.
- **Email / OTP not working:** Check `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; for production you usually need a verified domain in Resend.
