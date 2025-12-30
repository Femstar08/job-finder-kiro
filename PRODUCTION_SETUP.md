# Job Finder - Production Setup Guide

## Overview

This guide provides step-by-step instructions for deploying the Job Finder system to production. The system includes a React frontend, Express.js backend, PostgreSQL database, Redis cache, N8N workflow engine, and comprehensive monitoring.

## Architecture

```
Internet → Nginx → Frontend (React)
              ↓
              → Backend (Express.js) → PostgreSQL
              ↓                    → Redis
              → N8N Workflow Engine
              ↓
              → Monitoring (Prometheus + Grafana)
```

## Prerequisites

### System Requirements

- **Server**: Linux server with 4+ GB RAM, 2+ CPU cores, 50+ GB storage
- **Docker**: Docker 20.10+ and Docker Compose 2.0+
- **Domain**: Registered domain with DNS access
- **SSL Certificate**: Valid SSL certificate for HTTPS

### External Services

- **Email Service**: Brevo (SendinBlue) account for notifications
- **Monitoring** (optional): External monitoring service
- **Backup Storage** (optional): AWS S3 or similar for backups

## Installation Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply Docker group changes
```

### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/your-org/job-finder.git
cd job-finder

# Copy production environment file
cp .env.production .env

# Edit environment variables
nano .env
```

### 3. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com -d n8n.your-domain.com -d monitoring.your-domain.com

# Copy certificates
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl
```

#### Option B: Custom Certificate

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificate files
cp your-certificate.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem
```

### 4. Environment Configuration

Edit `.env` file with your production values:

```bash
# Database Configuration
POSTGRES_DB=job_finder_prod
POSTGRES_USER=job_finder
POSTGRES_PASSWORD=your-secure-database-password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long

# Email Configuration
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@your-domain.com

# Domain Configuration
BACKEND_URL=https://api.your-domain.com
FRONTEND_URL=https://your-domain.com
N8N_HOST=n8n.your-domain.com

# Update all other variables as needed
```

### 5. DNS Configuration

Configure your DNS records:

```
A     your-domain.com          → your-server-ip
A     api.your-domain.com      → your-server-ip
A     n8n.your-domain.com      → your-server-ip
A     monitoring.your-domain.com → your-server-ip
```

### 6. Deploy Application

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh deploy
```

The deployment script will:

- Run pre-deployment checks
- Create a backup of existing data
- Build and start all services
- Run database migrations
- Verify service health

### 7. N8N Workflow Setup

1. **Access N8N**:

   ```
   URL: https://n8n.your-domain.com
   Username: admin (or your configured username)
   Password: your-n8n-password
   ```

2. **Import Workflow**:

   - Go to "Workflows" → "Import from File"
   - Select `packages/n8n-workflow/complete-workflow-export.json`
   - Configure credentials as described in the deployment guide

3. **Configure API Token**:
   ```bash
   # Generate API token for N8N
   curl -X POST https://api.your-domain.com/api/auth/generate-workflow-token \
     -H "Content-Type: application/json" \
     -d '{"name": "n8n-workflow", "permissions": ["read:preferences", "write:jobs", "write:matches"]}'
   ```

### 8. Monitoring Setup

1. **Access Grafana**:

   ```
   URL: https://monitoring.your-domain.com
   Username: admin
   Password: your-grafana-password
   ```

2. **Import Dashboards**:
   - Import pre-configured dashboards from `monitoring/grafana/dashboards/`
   - Configure alerts for critical metrics

### 9. Backup Configuration

```bash
# Create backup script
cat > /etc/cron.daily/job-finder-backup << 'EOF'
#!/bin/bash
cd /path/to/job-finder
./scripts/deploy.sh backup
EOF

chmod +x /etc/cron.daily/job-finder-backup
```

## Post-Deployment Verification

### 1. Service Health Checks

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Check service health
./scripts/deploy.sh health

# Test endpoints
curl -f https://your-domain.com/health
curl -f https://api.your-domain.com/health
curl -f https://n8n.your-domain.com/healthz
```

### 2. Application Testing

1. **Frontend**: Visit https://your-domain.com

   - Register a new account
   - Create job preferences
   - Verify UI functionality

2. **Backend API**: Test key endpoints

   ```bash
   # Test authentication
   curl -X POST https://api.your-domain.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'
   ```

3. **N8N Workflow**:
   - Manually execute the workflow
   - Verify job scraping and matching
   - Check notification delivery

### 3. Performance Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API performance
ab -n 100 -c 10 https://api.your-domain.com/health

# Test frontend performance
ab -n 100 -c 10 https://your-domain.com/
```

## Maintenance

### Regular Tasks

1. **Daily**:

   - Monitor service health
   - Check error logs
   - Verify backup completion

2. **Weekly**:

   - Review performance metrics
   - Update SSL certificates if needed
   - Clean up old Docker images

3. **Monthly**:
   - Update dependencies
   - Review and rotate secrets
   - Performance optimization

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f n8n

# Set up log rotation
sudo nano /etc/logrotate.d/job-finder
```

### Updates and Patches

```bash
# Update application
git pull origin main
./scripts/deploy.sh deploy

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Security Considerations

### 1. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Security Headers

The Nginx configuration includes security headers:

- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Strict-Transport-Security
- Content-Security-Policy

### 3. Regular Security Updates

```bash
# Set up automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**:

   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs service-name

   # Check resource usage
   docker stats
   ```

2. **Database Connection Issues**:

   ```bash
   # Test database connection
   docker exec -it job-finder-postgres-prod psql -U job_finder -d job_finder_prod
   ```

3. **SSL Certificate Issues**:

   ```bash
   # Test SSL certificate
   openssl s_client -connect your-domain.com:443 -servername your-domain.com
   ```

4. **N8N Workflow Failures**:
   - Check N8N execution logs
   - Verify API credentials
   - Test individual workflow nodes

### Performance Issues

1. **High Memory Usage**:

   - Increase server resources
   - Optimize database queries
   - Implement caching

2. **Slow Response Times**:
   - Enable Nginx caching
   - Optimize database indexes
   - Scale horizontally

### Recovery Procedures

1. **Service Recovery**:

   ```bash
   # Restart specific service
   docker-compose -f docker-compose.prod.yml restart service-name

   # Full system restart
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Data Recovery**:
   ```bash
   # Restore from backup
   ./scripts/deploy.sh rollback
   ```

## Support

### Getting Help

- **Documentation**: Check README files and inline comments
- **Logs**: Always check application and system logs first
- **Community**: Join relevant community forums
- **Professional Support**: Contact your development team

### Monitoring and Alerts

Set up alerts for:

- Service downtime
- High error rates
- Database connection issues
- Disk space usage
- Memory usage
- SSL certificate expiration

---

**Production deployment completed!** 🎉

Your Job Finder system is now running in production with:

- ✅ Secure HTTPS configuration
- ✅ Automated job searching and matching
- ✅ Real-time notifications
- ✅ Comprehensive monitoring
- ✅ Automated backups
- ✅ Production-grade security
