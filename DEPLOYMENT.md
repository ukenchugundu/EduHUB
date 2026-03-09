# EduHub Deployment Guide

## Deployment Options

### 1. Docker Deployment (Recommended)

#### Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Production Deployment

```bash
# Create environment file
cp .env.example .env.prod
# Edit .env.prod with production values

# Deploy with production config
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. Render Deployment

Use the included root `render.yaml` to deploy the backend only.

1. Push code to GitHub
2. Connect repository to Render
3. Render will detect `render.yaml`
4. Set the required environment variables in Render

Service created:

- Backend: Node.js API

Recommended setup:

- Frontend: Vercel
- Backend: Render
- Database: Supabase Postgres

Minimum backend env vars on Render:

```bash
DATABASE_URL=postgresql://...
DB_SSL=true
JWT_SECRET=...
FRONTEND_BASE_URL=https://your-frontend-domain.vercel.app
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=...
EMAIL_PROVIDER=dev
EMAIL_FROM=no-reply@yourdomain.com
```

### 3. Vercel Deployment (Frontend Only)

Deploy the frontend and backend as separate services:

- Frontend: Vercel
- Backend: Render / Railway / VPS / Docker host
- Database: Supabase Postgres

#### Frontend on Vercel

1. Create a new Vercel project
2. Set the project root directory to `frontend`
3. Add these environment variables in Vercel:

```bash
VITE_API_URL=https://your-backend-url.example.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Deploy the frontend

The frontend now includes its own `frontend/vercel.json` with SPA routing support for React Router refreshes.

#### Backend separately

Deploy `backend/` to a normal Node host.

Do not deploy the current backend to Vercel as-is because it uses:

- `app.listen(...)`
- local `/uploads`
- `multer` temp files
- traditional long-running Node server behavior

### 4. Manual Deployment

#### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- PM2 (for process management)

#### Steps

1. **Setup Database**

```bash
# Create database
createdb eduhub

# Run migrations
psql -d eduhub -f database/migrations/001_initial_schema.sql
psql -d eduhub -f database/migrations/002_initial_data.sql
psql -d eduhub -f database/migrations/003_create_quizzes_table.sql
psql -d eduhub -f database/migrations/004_create_questions_table.sql
psql -d eduhub -f database/migrations/005_alter_quizzes_table.sql
```

2. **Deploy Backend**

```bash
cd backend
npm install
npm run build
pm2 start dist/index.js --name eduhub-backend
```

3. **Deploy Frontend**

```bash
cd frontend
npm install
npm run build
# Serve dist/ folder with nginx or any static server
```

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql://user:password@localhost:5432/eduhub
DB_SSL=false
PORT=3000
NODE_ENV=production
```

### Frontend (`frontend/.env` or Vercel env vars)

```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Health Checks

- Backend: `GET /api` - Should return API status
- Frontend: Access root URL - Should load application
- Database: Check connection via backend logs

## Monitoring

### Docker Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### PM2 Monitoring

```bash
pm2 status
pm2 logs eduhub-backend
pm2 monit
```

## Scaling

### Docker Scaling

```bash
# Scale backend instances
docker-compose up -d --scale backend=3
```

### Load Balancer Configuration

Add nginx reverse proxy for multiple backend instances.

## Backup

### Database Backup

```bash
# Docker
docker exec eduhub-db pg_dump -U postgres eduhub > backup.sql

# Manual
pg_dump -U postgres eduhub > backup.sql
```

### File Uploads Backup

```bash
# Backup uploads directory
tar -czf uploads-backup.tar.gz backend/uploads/
```

## SSL/HTTPS Setup

For production, configure SSL certificates:

1. **Using Let's Encrypt with Docker**

```bash
# Add certbot to docker-compose
# Update nginx config for SSL
```

2. **Using Cloudflare**

- Point domain to server IP
- Enable SSL in Cloudflare dashboard

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database is running
   - Check network connectivity

2. **Frontend API Calls Failing**
   - Verify VITE_API_URL is correct
   - Check CORS configuration
   - Ensure backend is accessible

3. **File Upload Issues**
   - Check uploads directory permissions
   - Verify disk space
   - Check file size limits

### Debug Commands

```bash
# Check container status
docker-compose ps

# Check container logs
docker-compose logs [service-name]

# Access container shell
docker-compose exec backend sh
docker-compose exec database psql -U postgres eduhub
```
