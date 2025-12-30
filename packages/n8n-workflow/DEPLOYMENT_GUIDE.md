# Job Finder N8N Workflow - Deployment Guide

## Overview

This guide provides complete instructions for deploying the Job Finder N8N workflow in production. The workflow automates daily job searching across multiple job sites, intelligent matching to user preferences, and real-time notifications.

## Prerequisites

### System Requirements

- N8N instance (v1.0.0 or higher)
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Job Finder API backend running and accessible

### Required Services

- **Job Finder API**: Backend service providing preference and job management endpoints
- **Email Service**: Brevo/SendinBlue account for email notifications
- **SMS Service** (optional): Brevo SMS or Twilio for SMS alerts

## Installation Steps

### 1. Import Workflow

1. **Download the workflow file**:

   ```bash
   curl -O https://your-repo.com/packages/n8n-workflow/complete-workflow-export.json
   ```

2. **Import into N8N**:
   - Open N8N web interface
   - Go to "Workflows" → "Import from File"
   - Select `complete-workflow-export.json`
   - Click "Import workflow"

### 2. Configure Credentials

#### API Authentication Credential

1. Go to "Credentials" → "Add Credential"
2. Select "HTTP Header Auth"
3. Configure:
   - **Name**: `Job Finder API Auth`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_API_TOKEN`
4. Save credential

#### Generate API Token

```bash
# In your Job Finder API backend
curl -X POST http://localhost:3001/api/auth/generate-workflow-token \
  -H "Content-Type: application/json" \
  -d '{"name": "n8n-workflow", "permissions": ["read:preferences", "write:jobs", "write:matches"]}'
```

### 3. Set Environment Variables

Configure these variables in N8N:

```bash
# Core API Configuration
API_BASE_URL=https://your-job-finder-api.com
API_TOKEN=your-generated-api-token

# Scraping Configuration
MAX_JOBS_PER_SITE=50
SCRAPING_DELAY_MS=2000
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# Rate Limiting
REQUESTS_PER_MINUTE=30
CONCURRENT_REQUESTS=3

# Error Handling
MAX_RETRIES=3
RETRY_DELAY_MS=5000
ERROR_NOTIFICATION_EMAIL=admin@yourcompany.com

# Monitoring
ENABLE_DETAILED_LOGGING=true
LOG_LEVEL=info
METRICS_ENDPOINT=https://your-monitoring.com/metrics
```

### 4. Configure Job Websites

Update the website configurations in your API backend:

```sql
-- Example website configurations
INSERT INTO job_websites (name, base_url, search_url_template, scraping_config, is_active) VALUES
('indeed', 'https://indeed.com', 'https://indeed.com/jobs?q={{jobTitle}}&l={{location}}&radius=25',
 '{"jobSelector": ".job_seen_beacon", "titleSelector": "h2 a", "companySelector": ".companyName"}', true),
('linkedin', 'https://linkedin.com', 'https://linkedin.com/jobs/search/?keywords={{jobTitle}}&location={{location}}',
 '{"jobSelector": ".job-search-card", "titleSelector": "h3 a", "companySelector": "h4 a"}', true);
```

### 5. Test Workflow

#### Manual Test Execution

1. Open the imported workflow
2. Click "Execute Workflow" → "Manual"
3. Monitor execution in real-time
4. Check logs for any errors

#### Test Individual Nodes

```bash
# Test API connectivity
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api.com/api/n8n/preferences

# Test website scraping
curl -H "User-Agent: Mozilla/5.0..." \
  "https://indeed.com/jobs?q=software+engineer&l=remote"
```

## Production Configuration

### 1. Workflow Settings

Configure these settings in the workflow:

```json
{
  "settings": {
    "timezone": "America/New_York",
    "saveManualExecutions": true,
    "callerPolicy": "workflowsFromSameOwner",
    "errorWorkflow": "error-handler-workflow",
    "executionTimeout": 3600,
    "maxExecutionTimeout": 7200
  }
}
```

### 2. Cron Schedule

The workflow is configured to run daily at 7 AM:

```
0 7 * * *
```

To modify the schedule:

1. Edit the "Daily Job Search Trigger" node
2. Update the cron expression
3. Save the workflow

### 3. Error Handling

#### Create Error Handler Workflow

1. Create a new workflow named "error-handler-workflow"
2. Add nodes to:
   - Log errors to monitoring system
   - Send admin notifications
   - Attempt automatic recovery

#### Configure Monitoring

```javascript
// Add to your monitoring system
const errorMetrics = {
  workflow_errors: "counter",
  execution_duration: "histogram",
  jobs_processed: "counter",
  matches_found: "counter",
};
```

### 4. Performance Optimization

#### Rate Limiting Configuration

```javascript
// In Build Search URL node
const rateLimiter = {
  requestsPerMinute: 30,
  concurrentRequests: 3,
  delayBetweenRequests: 2000,
};
```

#### Caching Strategy

```javascript
// Cache website configurations
const websiteCache = {
  ttl: 3600, // 1 hour
  maxSize: 100,
};
```

## Monitoring and Maintenance

### 1. Key Metrics to Monitor

- **Execution Success Rate**: Should be > 95%
- **Job Processing Rate**: Jobs found per execution
- **Match Quality**: Percentage of matches that result in applications
- **API Response Times**: Should be < 2 seconds
- **Error Rates**: By error type and website

### 2. Log Analysis

#### Important Log Patterns

```bash
# Successful executions
grep "Workflow execution completed" /var/log/n8n/workflow.log

# Rate limiting issues
grep "rate limit" /var/log/n8n/workflow.log

# Parsing errors
grep "Error parsing job data" /var/log/n8n/workflow.log
```

#### Set Up Log Rotation

```bash
# /etc/logrotate.d/n8n-workflow
/var/log/n8n/workflow.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 n8n n8n
}
```

### 3. Health Checks

Create automated health checks:

```bash
#!/bin/bash
# health-check.sh

# Check workflow is active
WORKFLOW_STATUS=$(curl -s -H "Authorization: Bearer $N8N_API_TOKEN" \
  "$N8N_BASE_URL/api/v1/workflows/job-finder-daily" | jq -r '.active')

if [ "$WORKFLOW_STATUS" != "true" ]; then
  echo "CRITICAL: Workflow is not active"
  exit 2
fi

# Check recent executions
RECENT_EXECUTIONS=$(curl -s -H "Authorization: Bearer $N8N_API_TOKEN" \
  "$N8N_BASE_URL/api/v1/executions?workflowId=job-finder-daily&limit=5")

FAILED_COUNT=$(echo $RECENT_EXECUTIONS | jq '[.data[] | select(.finished == false)] | length')

if [ "$FAILED_COUNT" -gt 2 ]; then
  echo "WARNING: Multiple recent execution failures"
  exit 1
fi

echo "OK: Workflow is healthy"
exit 0
```

### 4. Backup and Recovery

#### Backup Workflow Configuration

```bash
#!/bin/bash
# backup-workflow.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/n8n-workflows"

# Export workflow
curl -H "Authorization: Bearer $N8N_API_TOKEN" \
  "$N8N_BASE_URL/api/v1/workflows/job-finder-daily/export" \
  > "$BACKUP_DIR/job-finder-workflow-$DATE.json"

# Backup credentials (encrypted)
curl -H "Authorization: Bearer $N8N_API_TOKEN" \
  "$N8N_BASE_URL/api/v1/credentials" \
  > "$BACKUP_DIR/credentials-$DATE.json"
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

```
Error: 401 Unauthorized
```

**Solution**:

- Verify API token is valid
- Check token permissions
- Regenerate token if expired

#### 2. Rate Limiting

```
Error: 429 Too Many Requests
```

**Solution**:

- Increase delay between requests
- Reduce concurrent requests
- Implement exponential backoff

#### 3. Parsing Errors

```
Error: Cannot read property 'title' of undefined
```

**Solution**:

- Update website selectors
- Add error handling for missing elements
- Implement fallback parsing strategies

#### 4. Memory Issues

```
Error: JavaScript heap out of memory
```

**Solution**:

- Process jobs in smaller batches
- Implement pagination
- Clear variables between iterations

### Debug Mode

Enable debug mode for detailed logging:

```javascript
// Add to any Code node
console.log("Debug info:", {
  nodeId: $node.id,
  inputData: $input.all(),
  timestamp: new Date().toISOString(),
});
```

### Performance Tuning

#### Optimize for Large Job Volumes

```javascript
// In Parse Job Data node
const BATCH_SIZE = 10; // Process 10 jobs at a time
const jobs = extractedJobs.slice(0, BATCH_SIZE);
```

#### Memory Management

```javascript
// Clear large objects
delete htmlContent;
delete rawJobData;
```

## Security Considerations

### 1. API Security

- Use HTTPS for all API calls
- Rotate API tokens regularly
- Implement IP whitelisting
- Use least-privilege access

### 2. Data Protection

- Encrypt sensitive data in transit
- Sanitize scraped content
- Implement data retention policies
- Regular security audits

### 3. Rate Limiting Compliance

- Respect robots.txt files
- Implement proper delays
- Monitor for blocking
- Use rotating user agents responsibly

## Support and Updates

### Getting Help

- **Documentation**: Check the README.md files
- **Issues**: Create GitHub issues for bugs
- **Community**: Join the N8N community forum

### Update Process

1. Test updates in staging environment
2. Backup current workflow
3. Import updated workflow
4. Verify all connections work
5. Monitor for 24 hours after deployment

### Version History

- **v1.0.0**: Initial release
- **v2.0.0**: Enhanced matching algorithm, improved error handling
- **v2.1.0**: Added performance optimizations and monitoring

---

For additional support, contact: support@yourcompany.com
