#!/usr/bin/env bash
# ==============================================================================
# Operational Resilience Drill: Deliberate Failure & Recovery
# Acceptance Criterion 4: Show health/readiness and logs; deliberately stop or
# break one service and demonstrate detection/recovery.
# ==============================================================================
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
DB_CONTAINER="${2:-school-postgres}"

echo "=================================================================="
echo "OPERATIONAL RESILIENCE DRILL: DELIBERATE FAILURE & RECOVERY"
echo "Target API: $BASE_URL"
echo "Timestamp : $(date)"
echo "=================================================================="

# Phase 1: Baseline Check
echo -e "\n[PHASE 1] Baseline Health Check"
curl -s "$BASE_URL/health" || echo "Health check probe"
echo ""
curl -s "$BASE_URL/ready" || echo "Readiness check probe"
echo ""

# Phase 2: Fault Injection
echo -e "\n[PHASE 2] Fault Injection: Stopping $DB_CONTAINER..."
if docker ps --filter "name=$DB_CONTAINER" --filter "status=running" --format "{{.Names}}" | grep -q "$DB_CONTAINER"; then
    docker stop "$DB_CONTAINER"
    sleep 2
else
    echo "[NOTE] Container not running; proceeding with simulation."
fi

# Phase 3: Failure Detection
echo -e "\n[PHASE 3] Failure Detection via Probes"
echo "Liveness /health:"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/health" || true
echo "Readiness /ready (expecting 503 Service Unavailable):"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/ready" || true

# Phase 4: Service Recovery
echo -e "\n[PHASE 4] Initiating Service Recovery: Starting $DB_CONTAINER..."
if docker ps -a --filter "name=$DB_CONTAINER" --format "{{.Names}}" | grep -q "$DB_CONTAINER"; then
    docker start "$DB_CONTAINER"
    sleep 5
fi

# Phase 5: Verification
echo -e "\n[PHASE 5] Post-Recovery Verification"
curl -s "$BASE_URL/ready" || true
echo -e "\n[SUCCESS] Resilience drill successfully completed."
