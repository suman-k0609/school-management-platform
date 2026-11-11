# Release Rollback Procedure
## School Management Platform – Emergency Reversion Guide

---

## 1. Rollback Objectives & Scope

This runbook defines the operational steps required to safely revert a failed application release or database schema migration to the previous known-good state with zero persistent data loss.

---

## 2. Fast Application Rollback (Image Pinning)

When a new code release introduces unhandled runtime exceptions, memory leaks, or regressions detected by post-deployment smoke tests:

### Step 1: Identify Previous Known-Good Artifact Tag
Inspect the commit history or CI build tags:
```bash
# View recent git release tags
git tag --sort=-creatordate | head -n 5

# View Docker image tags locally
docker images algions/school-management-api
```
Assume `v1.0.1` is faulty and `v1.0.0` is the target stable tag.

### Step 2: Update Application Image Reference
In `docker-compose.yml` (or via environment override):
```yaml
services:
  app:
    image: algions/school-management-api:v1.0.0 # Pin directly to target stable tag
```

Or execute rolling container update:
```bash
# Pull stable image
docker pull algions/school-management-api:v1.0.0

# Re-deploy app service
docker compose up -d --no-deps app
```

### Step 3: Verify Application Health
```bash
# Verify new container is running and healthy
docker compose ps app

# Query liveness and readiness
curl -k https://localhost/health
curl -k https://localhost/ready
```

---

## 3. Database Schema Rollback

If a release included a backward-incompatible database schema change:

### Step 1: Take an Immediate Snapshot of Current State
Before any destructive operation, create an emergency pre-rollback snapshot:
```bash
./scripts/backup.sh
# or on Windows:
.\scripts\backup.ps1
```

### Step 2: Restore from Known-Good Pre-Deployment Backup
Locate the pre-deployment backup archive created immediately before migration:
```bash
# Linux
./scripts/restore.sh ./backups/backup_school_management_pre_release.sql

# Windows PowerShell
.\scripts\restore.ps1 -BackupFile .\backups\backup_school_management_pre_release.sql
```

### Step 3: Run Database Sanity Verification
Verify row counts and foreign key integrity:
```bash
docker exec -t school-postgres psql -U school_admin -d school_management -c "
SELECT 
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM classes) as classes,
    (SELECT COUNT(*) FROM attendance) as attendance,
    (SELECT COUNT(*) FROM audit_logs) as audit_logs;
"
```

---

## 4. Rollback Verification Checklist

- [ ] Liveness probe returns `HTTP 200` (`status: UP`).
- [ ] Readiness probe returns `HTTP 200` (`status: READY`, database ping successful).
- [ ] Reverse proxy SSL termination is intact on port `443`.
- [ ] Attendance recording endpoint functions properly for authorized teachers (`usr-teacher-1`).
- [ ] Unauthorized teachers (`usr-teacher-3`) continue to be blocked with `403 Forbidden`.
- [ ] Audit logs reflect the rollback and test verification actions.
- [ ] Notify incident response team and document post-mortem.
