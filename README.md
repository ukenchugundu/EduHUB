# EduHub

EduHub is split into two deployable apps:

- `frontend/` → React + Vite app
- `backend/` → Express + PostgreSQL API

## Recommended deployment

- Frontend: Vercel
- Backend: Render / Railway / VPS / Docker host
- Database: Supabase Postgres
- Storage: Supabase Storage

## Separate deployment setup

### Frontend

- deploy from the `frontend/` directory
- use `frontend/vercel.json`
- set:
  - `VITE_API_URL`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Backend

- deploy from the `backend/` directory
- run `npm install && npm run build && npm start`
- keep backend env vars on the backend host

See `DEPLOYMENT.md` for details.
