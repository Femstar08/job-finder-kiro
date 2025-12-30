# Job Finder N8N Workflow

This directory contains the N8N workflow configuration for the automated job search and alerting system.

## Overview

The N8N workflow runs daily at 7:00 AM and performs the following operations:

1. **Fetch Active Preferences** - Retrieves all active job search profiles from the API
2. **Fetch Job Websites** - Gets the list of configured job websites to monitor
3. **Parallel Processing** - Processes each preference against each website in parallel
4. **Job Scraping** - Scrapes job listings from configured websites
5. **Job Matching** - Applies intelligent matching logic to filter relevant jobs
6. **Duplicate Detection** - Prevents duplicate job alerts
7. **Alert Generation** - Sends notifications for matching jobs
8. **Execution Logging** - Logs results and errors for monitoring

## Workflow Architecture

```
Cron Trigger (7 AM)
    ↓
Fetch Active Preferences
    ↓
Split Preferences (Parallel Processing)
    ↓
Fetch Job Websites
    ↓
Split Websites (Parallel Processing)
    ↓
Build Search URL → Scrape Website → Parse Job Data
    ↓
Match Jobs to Preferences
    ↓
Store Found Jobs → Check If Jobs Found
    ↓                    ↓
Prepare Alert Data    Log Results
    ↓
Send Job Match Alert
    ↓
Log Execution Results
```

## Configuration Files

- `workflow-config.json` - Complete N8N workflow definition
- `website-configs.json` - Job website scraping configurations
- `credentials-template.json` - Template for required credentials
- `environment-variables.md` - Required environment variables

## Installation

1. Import the workflow into your N8N instance:

   ```bash
   # Copy the workflow-config.json content
   # In N8N UI: Settings > Import from JSON
   ```

2. Set up credentials:

   - Create "Job Finder API Auth" HTTP Header Auth credential
   - Add your API authentication token

3. Configure environment variables:

   - `API_BASE_URL` - Base URL of your Job Finder API
   - `NOTIFICATION_EMAIL` - Admin email for error notifications

4. Configure job websites in the database using the API

## Error Handling

The workflow includes comprehensive error handling:

- **Website Failures**: Individual website failures don't stop the entire workflow
- **Rate Limiting**: Respects website rate limits with configurable delays
- **Retry Logic**: Automatic retries for transient failures
- **Error Logging**: Detailed error logging for debugging
- **Admin Alerts**: Critical errors trigger admin notifications

## Monitoring

Monitor workflow execution through:

- N8N execution logs
- API endpoint logs (`/api/n8n/logs`)
- Database execution history
- Email notifications for critical errors

## Customization

### Adding New Job Websites

1. Add website configuration to the database via API:

   ```json
   {
     "name": "Example Jobs",
     "baseUrl": "https://example-jobs.com",
     "searchUrlTemplate": "https://example-jobs.com/search?q={{jobTitle}}&location={{location}}",
     "scrapingConfig": {
       "jobSelector": ".job-listing",
       "titleSelector": ".job-title",
       "companySelector": ".company-name",
       "locationSelector": ".job-location",
       "salarySelector": ".salary-info"
     },
     "rateLimitMs": 2000
   }
   ```

2. The workflow will automatically include the new website in future executions

### Modifying Matching Logic

The job matching algorithm is in the "Match Jobs to Preferences" node. Key matching criteria:

- **Job Title**: Fuzzy matching against user's job title and keywords
- **Location**: Geographic matching with remote work support
- **Salary**: Range validation with overlap detection
- **Contract Type**: Exact matching against user preferences

### Notification Customization

Alert formatting and delivery is handled by the backend API. The workflow sends structured data to the `/api/n8n/jobs/matches` endpoint, which handles:

- Notification channel selection (email, SMS)
- Message formatting and templating
- Delivery tracking and retries
- Quiet hours enforcement

## Testing

### Manual Testing

Use the webhook endpoints for manual testing:

```bash
# Test preference fetching
curl -X GET "${API_BASE_URL}/api/n8n/preferences" \
  -H "Authorization: Bearer ${API_TOKEN}"

# Test job posting
curl -X POST "${API_BASE_URL}/api/n8n/jobs/found" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"job": {...}, "preference": {...}}'
```

### Workflow Testing

1. **Test Execution**: Use N8N's manual execution feature
2. **Test Data**: Create test preferences and websites for validation
3. **Error Scenarios**: Test with invalid URLs and malformed data
4. **Performance**: Monitor execution time with large datasets

## Troubleshooting

### Common Issues

1. **Authentication Errors**

   - Verify API credentials are correctly configured
   - Check API token expiration

2. **Website Scraping Failures**

   - Verify website URLs are accessible
   - Check if website structure has changed
   - Review rate limiting settings

3. **No Jobs Found**

   - Verify user preferences are active
   - Check website configurations
   - Review matching criteria logic

4. **Alert Delivery Issues**
   - Check notification service credentials
   - Verify user notification settings
   - Review quiet hours configuration

### Debug Mode

Enable debug logging by setting environment variable:

```
N8N_LOG_LEVEL=debug
```

This provides detailed execution logs for troubleshooting.
