# Environment Variables for N8N Job Finder Workflow

## Required Environment Variables

### API Configuration

```bash
# Base URL of your Job Finder API
API_BASE_URL=https://your-job-finder-api.com

# API authentication token (generate from backend)
API_TOKEN=your_jwt_token_here

# Admin email for error notifications
NOTIFICATION_EMAIL=admin@your-domain.com
```

### N8N Configuration

```bash
# Logging level for debugging
N8N_LOG_LEVEL=info

# Timezone for cron scheduling
WORKFLOW_TIMEZONE=America/New_York

# Webhook security token
N8N_WEBHOOK_TOKEN=your_webhook_security_token
```

### Notification Service Configuration

```bash
# Brevo API key for email notifications
BREVO_API_KEY=your_brevo_api_key

# Brevo SMS API key (if different from email)
BREVO_SMS_API_KEY=your_brevo_sms_api_key

# Default sender email
DEFAULT_SENDER_EMAIL=noreply@your-domain.com

# Default sender name
DEFAULT_SENDER_NAME="Job Finder Alert System"
```

### Database Configuration (if direct access needed)

```bash
# PostgreSQL connection (usually handled by API)
DATABASE_URL=postgresql://username:password@localhost:5432/job_finder

# Redis connection (for caching)
REDIS_URL=redis://localhost:6379
```

### Scraping Configuration

```bash
# Default rate limiting between requests (milliseconds)
DEFAULT_RATE_LIMIT_MS=3000

# Request timeout (milliseconds)
REQUEST_TIMEOUT_MS=30000

# Maximum retry attempts for failed requests
MAX_RETRY_ATTEMPTS=3

# Delay between retry attempts (milliseconds)
RETRY_DELAY_MS=5000
```

### Security Configuration

```bash
# User agent for web scraping
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

# Proxy configuration (if needed)
HTTP_PROXY=http://proxy-server:port
HTTPS_PROXY=https://proxy-server:port

# IP rotation service (if using)
PROXY_ROTATION_API_KEY=your_proxy_service_key
```

## Setting Environment Variables in N8N

### Method 1: N8N Environment File

Create a `.env` file in your N8N installation directory:

```bash
# Copy the variables above into .env file
cp environment-variables.template .env
# Edit with your actual values
nano .env
```

### Method 2: Docker Compose

If running N8N with Docker Compose:

```yaml
version: "3.8"
services:
  n8n:
    image: n8nio/n8n
    environment:
      - API_BASE_URL=https://your-job-finder-api.com
      - API_TOKEN=your_jwt_token_here
      - NOTIFICATION_EMAIL=admin@your-domain.com
      - N8N_LOG_LEVEL=info
      - WORKFLOW_TIMEZONE=America/New_York
      # Add other variables as needed
```

### Method 3: System Environment Variables

Set system-wide environment variables:

```bash
# Linux/Mac
export API_BASE_URL="https://your-job-finder-api.com"
export API_TOKEN="your_jwt_token_here"

# Windows
set API_BASE_URL=https://your-job-finder-api.com
set API_TOKEN=your_jwt_token_here
```

### Method 4: N8N Settings UI

1. Open N8N web interface
2. Go to Settings > Environment Variables
3. Add each variable with its value

## Variable Validation

The workflow includes validation for required environment variables. If any required variable is missing, the workflow will:

1. Log an error message
2. Send an admin notification
3. Stop execution gracefully

## Security Best Practices

### API Tokens

- Generate long-lived tokens specifically for N8N
- Use tokens with minimal required permissions
- Rotate tokens regularly (recommended: every 6 months)
- Store tokens securely (never in code repositories)

### Notification Credentials

- Use separate API keys for different services
- Monitor API usage and set up alerts for unusual activity
- Keep backup credentials in case primary ones fail

### Scraping Ethics

- Respect robots.txt files
- Implement appropriate rate limiting
- Use realistic User-Agent strings
- Monitor for IP blocking and implement rotation if needed

## Troubleshooting

### Common Issues

1. **API Connection Errors**

   ```bash
   # Test API connectivity
   curl -H "Authorization: Bearer $API_TOKEN" $API_BASE_URL/api/health
   ```

2. **Missing Environment Variables**

   ```bash
   # Check if variables are set
   echo $API_BASE_URL
   echo $API_TOKEN
   ```

3. **Timezone Issues**

   ```bash
   # Verify timezone setting
   timedatectl status  # Linux
   date  # Check current time
   ```

4. **Rate Limiting Problems**
   - Increase `DEFAULT_RATE_LIMIT_MS` value
   - Check website-specific rate limits
   - Monitor for 429 (Too Many Requests) errors

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
N8N_LOG_LEVEL=debug
```

This will provide detailed logs for:

- HTTP requests and responses
- Variable substitution
- Error stack traces
- Execution timing

### Health Checks

The workflow includes health check endpoints:

```bash
# Check workflow status
GET /webhook/job-finder/health

# Test environment configuration
GET /webhook/job-finder/config-test
```

## Production Deployment

### Recommended Settings

```bash
# Production environment variables
NODE_ENV=production
N8N_LOG_LEVEL=warn
REQUEST_TIMEOUT_MS=60000
MAX_RETRY_ATTEMPTS=5
DEFAULT_RATE_LIMIT_MS=5000
```

### Monitoring

Set up monitoring for:

- Workflow execution success/failure rates
- API response times
- Rate limiting violations
- Error notification delivery

### Backup Configuration

- Export workflow configuration regularly
- Backup environment variable configurations
- Document any custom modifications
