# Job Finder System

An automated job search and alerting platform that monitors multiple job websites and sends targeted alerts when jobs match your exact criteria.

## Features

- 🔍 **Smart Job Matching** - Only alerts when jobs match ALL your specified criteria
- 🌐 **Multi-Website Monitoring** - Monitors multiple job boards simultaneously
- ⏰ **Automated Daily Searches** - Runs automatically at 7 AM daily via N8N workflow
- 📱 **Multi-Channel Alerts** - Email, SMS, and push notifications
- 📊 **Job History Tracking** - Track applications and avoid duplicates
- 🎯 **Multiple Search Profiles** - Create different searches for different job types

## Architecture

- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Node.js + Express + PostgreSQL + Redis
- **Automation**: N8N workflow for job scraping and matching
- **Notifications**: Brevo (email & SMS)

## Quick Start

1. **Start Infrastructure**

   ```bash
   npm run docker:up
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set up Environment**

   ```bash
   cp packages/backend/.env.example packages/backend/.env
   # Edit .env with your configuration
   ```

4. **Start Development**

   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Project Structure

```
job-finder-system/
├── packages/
│   ├── frontend/          # React TypeScript frontend
│   ├── backend/           # Node.js Express API
│   └── n8n-workflow/      # N8N workflow configuration
├── docker-compose.yml     # PostgreSQL + Redis
└── package.json          # Monorepo configuration
```

## Development Workflow

1. Create job search preferences in the UI
2. N8N workflow runs daily at 7 AM
3. Workflow scrapes configured job websites
4. Jobs are matched against your criteria
5. Alerts sent only for matching jobs
6. Track application status in job history

## N8N Workflow Setup

The complete N8N workflow JSON will be generated in `packages/n8n-workflow/workflow.json` after running the build tasks. Import this file into your N8N instance to set up automated job monitoring.

## Environment Variables

See `packages/backend/.env.example` for all required environment variables including:

- Database connection
- Redis configuration
- JWT secrets
- Notification service API keys (Brevo)

## Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test --workspace=packages/backend

# Run frontend tests only
npm run test --workspace=packages/frontend
```

## License

MIT
