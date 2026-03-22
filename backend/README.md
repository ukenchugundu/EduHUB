# EduHub Backend Auth Notes

## Deployment

Deploy the backend separately from the frontend.

- Backend host: Render / Railway / VPS / Docker host
- Frontend host: Vercel
- Frontend URL should be set in `FRONTEND_BASE_URL`

### Render

This repo now includes a root `render.yaml` that deploys the backend from `backend/`.

Important backend env vars:

- `DATABASE_URL`
- `DB_SSL`
- `JWT_SECRET`
- `FRONTEND_BASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`

Use `backend/.env.example` as the reference list.

## Frontend Deployment

Set `VITE_API_URL` in Vercel to the backend origin only.

- Correct: `https://your-render-service.onrender.com`
- Incorrect: `https://your-render-service.onrender.com/api`
- Incorrect: `https://your-render-service.onrender.com/api/v1`

The frontend now normalizes accidental `/api` or `/api/v1` suffixes, but keeping the env value clean makes the deployment easier to reason about.

## Email Delivery Modes

The auth service supports 3 email modes via environment variables:

- `EMAIL_PROVIDER=dev` (default): writes OTP/reset emails to `backend/tmp/dev-mailbox.log`
- `EMAIL_PROVIDER=sendgrid`: sends real emails using SendGrid API
- `EMAIL_PROVIDER=resend`: sends real emails using Resend API

Common vars:

- `EMAIL_FROM=no-reply@yourdomain.com`
- `FRONTEND_BASE_URL=http://localhost:8080` (used in reset links)

Provider-specific vars:

- SendGrid: `SENDGRID_API_KEY=...`
- Resend: `RESEND_API_KEY=...`

Optional debug vars:

- `EXPOSE_AUTH_DEBUG=true|false` (defaults to `true` outside production)

API note:

- `POST /api/auth/forgot-password` can include `frontendBaseUrl` (for example `window.location.origin`) so reset links match the current frontend host in local/dev environments.

## Security Controls Added

- Login request throttling per IP
- Account lockout after repeated invalid password attempts
- OTP verification throttling and temporary account OTP lockout
- OTP resend throttling
- Password reset request throttling
- Password reset submission throttling and lockout after repeated invalid token attempts

These controls are currently in-memory for local/project scope. In a multi-instance deployment, move them to a shared store.
