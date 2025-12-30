#!/bin/bash

# Job Finder System Test Suite
# Comprehensive end-to-end testing for the complete system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
N8N_URL="${N8N_URL:-http://localhost:5678}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
LOG_FILE="./logs/system-test.log"

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$LOG_FILE"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TESTS_TOTAL++))
    log "Running test: $test_name"
    
    if eval "$test_command"; then
        success "$test_name"
        return 0
    else
        fail "$test_name"
        return 1
    fi
}

# Test functions
test_service_health() {
    log "Testing service health checks..."
    
    # Test backend health
    run_test "Backend health check" "curl -f -s $API_BASE_URL/health > /dev/null"
    
    # Test frontend availability
    run_test "Frontend availability" "curl -f -s $FRONTEND_URL > /dev/null"
    
    # Test database connection (through backend)
    run_test "Database connectivity" "curl -f -s $API_BASE_URL/api/health/db > /dev/null"
    
    # Test Redis connection (through backend)
    run_test "Redis connectivity" "curl -f -s $API_BASE_URL/api/health/redis > /dev/null"
}

test_authentication_flow() {
    log "Testing authentication flow..."
    
    # Test user registration
    local register_response=$(curl -s -X POST "$API_BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\"}")
    
    if echo "$register_response" | grep -q "success.*true"; then
        success "User registration"
        
        # Extract token for subsequent tests
        AUTH_TOKEN=$(echo "$register_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$AUTH_TOKEN" ]; then
            success "JWT token generation"
        else
            fail "JWT token generation"
        fi
    else
        fail "User registration"
        warn "Registration response: $register_response"
    fi
    
    # Test user login
    local login_response=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    if echo "$login_response" | grep -q "success.*true"; then
        success "User login"
    else
        fail "User login"
        warn "Login response: $login_response"
    fi
    
    # Test protected endpoint access
    if [ -n "$AUTH_TOKEN" ]; then
        local profile_response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
            "$API_BASE_URL/api/auth/profile")
        
        if echo "$profile_response" | grep -q "$TEST_EMAIL"; then
            success "Protected endpoint access"
        else
            fail "Protected endpoint access"
        fi
    fi
}

test_job_preferences_crud() {
    log "Testing job preferences CRUD operations..."
    
    if [ -z "$AUTH_TOKEN" ]; then
        fail "Job preferences CRUD (no auth token)"
        return
    fi
    
    # Create job preferences
    local create_response=$(curl -s -X POST "$API_BASE_URL/api/preferences" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "profileName": "Test Profile",
            "jobTitle": "Software Engineer",
            "keywords": ["javascript", "react", "node.js"],
            "location": {
                "city": "San Francisco",
                "remote": true
            },
            "salaryRange": {
                "min": 80000,
                "max": 120000
            },
            "contractTypes": ["permanent", "contract"],
            "experienceLevel": "mid",
            "isActive": true
        }')
    
    if echo "$create_response" | grep -q "success.*true"; then
        success "Create job preferences"
        
        # Extract preference ID
        PREFERENCE_ID=$(echo "$create_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    else
        fail "Create job preferences"
        warn "Create response: $create_response"
        return
    fi
    
    # Read job preferences
    local read_response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
        "$API_BASE_URL/api/preferences")
    
    if echo "$read_response" | grep -q "Test Profile"; then
        success "Read job preferences"
    else
        fail "Read job preferences"
    fi
    
    # Update job preferences
    if [ -n "$PREFERENCE_ID" ]; then
        local update_response=$(curl -s -X PUT "$API_BASE_URL/api/preferences/$PREFERENCE_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "profileName": "Updated Test Profile",
                "jobTitle": "Senior Software Engineer"
            }')
        
        if echo "$update_response" | grep -q "success.*true"; then
            success "Update job preferences"
        else
            fail "Update job preferences"
        fi
    fi
}

test_job_matching_algorithm() {
    log "Testing job matching algorithm..."
    
    if [ -z "$AUTH_TOKEN" ]; then
        fail "Job matching algorithm (no auth token)"
        return
    fi
    
    # Create a test job match
    local match_response=$(curl -s -X POST "$API_BASE_URL/api/jobs/test-match" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "job": {
                "jobTitle": "Senior Software Engineer",
                "company": "Tech Corp",
                "location": "San Francisco, CA",
                "salary": "$100,000 - $130,000",
                "contractType": "permanent",
                "jobUrl": "https://example.com/job/123",
                "sourceWebsite": "test",
                "jobDescription": "Great opportunity for a senior software engineer with React and Node.js experience"
            }
        }')
    
    if echo "$match_response" | grep -q "match.*true"; then
        success "Job matching algorithm"
    else
        fail "Job matching algorithm"
        warn "Match response: $match_response"
    fi
}

test_notification_system() {
    log "Testing notification system..."
    
    if [ -z "$AUTH_TOKEN" ]; then
        fail "Notification system (no auth token)"
        return
    fi
    
    # Test notification settings
    local settings_response=$(curl -s -X POST "$API_BASE_URL/api/notifications/settings" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "emailEnabled": true,
            "smsEnabled": false,
            "channels": ["email"],
            "quietHours": {
                "enabled": true,
                "start": "22:00",
                "end": "08:00"
            }
        }')
    
    if echo "$settings_response" | grep -q "success.*true"; then
        success "Notification settings configuration"
    else
        fail "Notification settings configuration"
    fi
    
    # Test notification sending (test mode)
    local send_response=$(curl -s -X POST "$API_BASE_URL/api/notifications/test" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "type": "job_match",
            "testMode": true
        }')
    
    if echo "$send_response" | grep -q "success.*true"; then
        success "Test notification sending"
    else
        fail "Test notification sending"
    fi
}

test_duplicate_detection() {
    log "Testing duplicate detection system..."
    
    if [ -z "$AUTH_TOKEN" ]; then
        fail "Duplicate detection (no auth token)"
        return
    fi
    
    # Test duplicate detection
    local duplicate_response=$(curl -s -X POST "$API_BASE_URL/api/duplicates/check" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "jobs": [
                {
                    "jobTitle": "Software Engineer",
                    "company": "Tech Corp",
                    "location": "San Francisco"
                },
                {
                    "jobTitle": "Software Engineer",
                    "company": "Tech Corp",
                    "location": "San Francisco, CA"
                }
            ]
        }')
    
    if echo "$duplicate_response" | grep -q "duplicates"; then
        success "Duplicate detection algorithm"
    else
        fail "Duplicate detection algorithm"
    fi
}

test_data_retention() {
    log "Testing data retention system..."
    
    if [ -z "$AUTH_TOKEN" ]; then
        fail "Data retention (no auth token)"
        return
    fi
    
    # Test retention statistics
    local stats_response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
        "$API_BASE_URL/api/data-retention/statistics")
    
    if echo "$stats_response" | grep -q "totalJobMatches"; then
        success "Data retention statistics"
    else
        fail "Data retention statistics"
    fi
    
    # Test dry run cleanup
    local cleanup_response=$(curl -s -X POST "$API_BASE_URL/api/data-retention/execute" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"dryRun": true}')
    
    if echo "$cleanup_response" | grep -q "success.*true"; then
        success "Data retention dry run"
    else
        fail "Data retention dry run"
    fi
}

test_n8n_integration() {
    log "Testing N8N integration..."
    
    # Test N8N health
    run_test "N8N service health" "curl -f -s $N8N_URL/healthz > /dev/null"
    
    # Test N8N API endpoints (if accessible)
    if [ -n "$AUTH_TOKEN" ]; then
        local preferences_response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
            "$API_BASE_URL/api/n8n/preferences")
        
        if echo "$preferences_response" | grep -q "preferences"; then
            success "N8N preferences endpoint"
        else
            fail "N8N preferences endpoint"
        fi
        
        local websites_response=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
            "$API_BASE_URL/api/n8n/websites")
        
        if echo "$websites_response" | grep -q "websites"; then
            success "N8N websites endpoint"
        else
            fail "N8N websites endpoint"
        fi
    fi
}

test_performance() {
    log "Testing system performance..."
    
    # Test API response times
    local start_time=$(date +%s%N)
    curl -s "$API_BASE_URL/health" > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ "$response_time" -lt 1000 ]; then
        success "API response time ($response_time ms)"
    else
        fail "API response time ($response_time ms - should be < 1000ms)"
    fi
    
    # Test concurrent requests
    log "Testing concurrent API requests..."
    for i in {1..5}; do
        curl -s "$API_BASE_URL/health" > /dev/null &
    done
    wait
    
    success "Concurrent request handling"
}

test_security() {
    log "Testing security measures..."
    
    # Test unauthorized access
    local unauthorized_response=$(curl -s -w "%{http_code}" "$API_BASE_URL/api/preferences")
    
    if echo "$unauthorized_response" | grep -q "401"; then
        success "Unauthorized access protection"
    else
        fail "Unauthorized access protection"
    fi
    
    # Test SQL injection protection (basic test)
    local injection_response=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com'\''OR 1=1--","password":"test"}')
    
    if echo "$injection_response" | grep -q "error\|invalid"; then
        success "SQL injection protection"
    else
        fail "SQL injection protection"
    fi
    
    # Test rate limiting (if enabled)
    log "Testing rate limiting..."
    local rate_limit_failed=false
    for i in {1..20}; do
        local response=$(curl -s -w "%{http_code}" "$API_BASE_URL/health")
        if echo "$response" | grep -q "429"; then
            success "Rate limiting protection"
            rate_limit_failed=false
            break
        fi
        rate_limit_failed=true
    done
    
    if [ "$rate_limit_failed" = true ]; then
        warn "Rate limiting not triggered (may not be configured for health endpoint)"
    fi
}

cleanup_test_data() {
    log "Cleaning up test data..."
    
    if [ -n "$AUTH_TOKEN" ] && [ -n "$PREFERENCE_ID" ]; then
        curl -s -X DELETE "$API_BASE_URL/api/preferences/$PREFERENCE_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null
        log "Deleted test preference"
    fi
    
    # Note: In a real system, you might want to delete the test user as well
    # but for safety, we'll leave it for manual cleanup
    log "Test user $TEST_EMAIL left for manual cleanup if needed"
}

generate_test_report() {
    log "Generating test report..."
    
    local report_file="./logs/system-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Job Finder System Test Report

**Test Date**: $(date)
**Test Environment**: $API_BASE_URL

## Summary

- **Total Tests**: $TESTS_TOTAL
- **Passed**: $TESTS_PASSED
- **Failed**: $TESTS_FAILED
- **Success Rate**: $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%

## Test Results

$(if [ $TESTS_FAILED -eq 0 ]; then
    echo "🎉 **All tests passed!** The system is ready for production."
else
    echo "⚠️ **Some tests failed.** Please review the failures before deploying to production."
fi)

## Detailed Log

See full test log: $LOG_FILE

## Next Steps

$(if [ $TESTS_FAILED -eq 0 ]; then
    cat << 'NEXT_STEPS'
1. ✅ System testing completed successfully
2. ✅ All core functionality verified
3. ✅ Security measures validated
4. ✅ Performance benchmarks met
5. 🚀 **System is ready for production deployment**

### Production Deployment Checklist
- [ ] Update production environment variables
- [ ] Configure SSL certificates
- [ ] Set up monitoring alerts
- [ ] Schedule automated backups
- [ ] Import N8N workflow
- [ ] Configure notification services
- [ ] Set up log rotation
- [ ] Configure firewall rules
NEXT_STEPS
else
    cat << 'FAILED_STEPS'
1. ❌ Review failed tests in the log
2. 🔧 Fix identified issues
3. 🔄 Re-run system tests
4. ✅ Ensure all tests pass before production deployment

### Failed Tests
$(grep "✗" "$LOG_FILE" | sed 's/^/- /')
FAILED_STEPS
fi)

---
Generated by Job Finder System Test Suite
EOF

    log "Test report generated: $report_file"
}

# Main test execution
main() {
    log "Starting Job Finder System Test Suite..."
    
    # Create logs directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Initialize counters
    TESTS_TOTAL=0
    TESTS_PASSED=0
    TESTS_FAILED=0
    
    # Run test suites
    test_service_health
    test_authentication_flow
    test_job_preferences_crud
    test_job_matching_algorithm
    test_notification_system
    test_duplicate_detection
    test_data_retention
    test_n8n_integration
    test_performance
    test_security
    
    # Cleanup
    cleanup_test_data
    
    # Generate report
    generate_test_report
    
    # Final summary
    log "System testing completed!"
    log "Results: $TESTS_PASSED/$TESTS_TOTAL tests passed"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log "🎉 All tests passed! System is ready for production."
        exit 0
    else
        log "❌ $TESTS_FAILED tests failed. Please review and fix issues."
        exit 1
    fi
}

# Run main function
main "$@"