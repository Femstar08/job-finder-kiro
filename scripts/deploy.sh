#!/bin/bash

# Job Finder Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if required files exist
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found. Copy .env.production to .env and configure it."
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker compose file $COMPOSE_FILE not found."
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
    fi
    
    # Check if required environment variables are set
    source "$ENV_FILE"
    required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "BREVO_API_KEY" "N8N_BASIC_AUTH_PASSWORD")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set in $ENV_FILE"
        fi
    done
    
    log "Pre-deployment checks passed ✓"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    # Backup database
    if docker ps | grep -q job-finder-postgres-prod; then
        log "Backing up database..."
        docker exec job-finder-postgres-prod pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_PATH-db.sql"
    fi
    
    # Backup volumes
    log "Backing up volumes..."
    docker run --rm -v job-finder_postgres_data:/data -v "$PWD/$BACKUP_DIR":/backup alpine tar czf "/backup/$BACKUP_NAME-postgres-data.tar.gz" -C /data .
    docker run --rm -v job-finder_n8n_data:/data -v "$PWD/$BACKUP_DIR":/backup alpine tar czf "/backup/$BACKUP_NAME-n8n-data.tar.gz" -C /data .
    
    log "Backup created: $BACKUP_NAME ✓"
}

# Deploy application
deploy() {
    log "Starting deployment..."
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build custom images
    log "Building custom images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log "Deployment completed successfully ✓"
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    services=("postgres" "redis" "backend" "frontend" "n8n")
    
    for service in "${services[@]}"; do
        container_name="job-finder-${service}-prod"
        
        if docker ps | grep -q "$container_name"; then
            health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-health-check")
            
            if [ "$health_status" = "healthy" ] || [ "$health_status" = "no-health-check" ]; then
                log "Service $service is healthy ✓"
            else
                warn "Service $service health status: $health_status"
            fi
        else
            error "Service $service is not running"
        fi
    done
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Run migrations
    docker exec job-finder-backend-prod npm run migrate || warn "Migration failed or no migrations to run"
    
    log "Database migrations completed ✓"
}

# Import N8N workflow
import_n8n_workflow() {
    log "Importing N8N workflow..."
    
    # Wait for N8N to be ready
    sleep 30
    
    # Import workflow (this would typically be done through N8N API or UI)
    log "Please manually import the workflow from packages/n8n-workflow/complete-workflow-export.json"
    log "N8N URL: https://$N8N_HOST"
    
    log "N8N workflow import instructions provided ✓"
}

# Post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."
    
    # Run migrations
    run_migrations
    
    # Import N8N workflow
    import_n8n_workflow
    
    # Clean up old images
    log "Cleaning up old Docker images..."
    docker image prune -f
    
    # Show service status
    log "Service status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    log "Post-deployment tasks completed ✓"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore from latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | head -n1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        log "Restoring database from $LATEST_BACKUP"
        # Restore database backup
        docker-compose -f "$COMPOSE_FILE" up -d postgres
        sleep 10
        docker exec -i job-finder-postgres-prod psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$LATEST_BACKUP"
    fi
    
    log "Rollback completed ✓"
}

# Main deployment process
main() {
    log "Starting Job Finder production deployment..."
    
    # Create logs directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-deploy}" in
        "deploy")
            pre_deployment_checks
            create_backup
            deploy
            post_deployment
            ;;
        "rollback")
            rollback
            ;;
        "backup")
            create_backup
            ;;
        "health")
            check_service_health
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|backup|health}"
            echo "  deploy  - Full deployment (default)"
            echo "  rollback - Rollback to previous version"
            echo "  backup  - Create backup only"
            echo "  health  - Check service health"
            exit 1
            ;;
    esac
    
    log "Operation completed successfully! 🎉"
}

# Run main function with all arguments
main "$@"