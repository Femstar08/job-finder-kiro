#!/bin/sh

# Health check script for frontend container
curl -f http://localhost:80/health || exit 1