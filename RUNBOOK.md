# Operations Runbook: Standard Operating Procedures (SOP)
## School Management Platform – Site Reliability & Cloud Engineering

---

## 1. Service Catalog & Topology
- **Primary Service**: `school-api` (Port 3000 internal, Node.js 20)
- **Ingress Proxy**: `school-reverse-proxy` (Ports 80 HTTP, 443 HTTPS, Nginx 1.27)
- **Database**: `school-postgres` (Port 5432 internal, PostgreSQL 16)
- **Log Store**: `app_logs` volume and stdout/stderr stream in JSON format

---

## 2. SOP 1: Deployment & Bootstrap

### Clean First-Time Deployment
```bash
# 1. Enter the project root directory
cd "SchoolManagement Platform"

# 2. Generate configuration from template
cp .env.example .env

# 3. Generate TLS certificates (Linux/macOS or PowerShell)
./scripts/generate-ssl.sh
# or on Windows:
.\scripts\generate-ssl.ps1

# 4. Build and start containers in detached mode
docker compose up -d --build

# 5. Verify all services report healthy
docker compose ps
```

### Expected Output
```text
NAME                   IMAGE                         COMMAND                  SERVICE         STATUS                    PORTS
school-api             schoolmanagementplatform-app  "docker-entrypoint.s…"   app             Up (healthy)              3000/tcp
school-postgres        postgres:16-alpine            "docker-entrypoint.s…"   postgres        Up (healthy)              5432/tcp
school-reverse-proxy   nginx:1.27-alpine             "/docker-entrypoint.…"   reverse-proxy   Up (healthy)              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

---

## 3. SOP 2: Service Health Inspection & Probing

### Checking Liveness (`/health`)
Verifies that the Node.js event loop is operational.
```bash
curl -k https://localhost/health
```
**Expected Response (HTTP 200)**:
```json
{
  "status": "UP",
  "service": "school-management-api",
  "version": "1.0.0",
  "uptimeSeconds": 142,
  "timestamp": "2026-11-11T16:50:00.000Z",
  "environment": "production"
}
```

### Checking Readiness (`/ready`)
Verifies active connection pool to PostgreSQL.
```bash
curl -k https://localhost/ready
```
**Expected Response (HTTP 200)**:
```json
{
  "status": "READY",
  "service": "school-management-api",
  "database": {
    "healthy": true,
    "mode": "postgresql",
    "totalCount": 5,
    "idleCount": 5,
    "waitingCount": 0
  },
  "timestamp": "2026-11-11T16:50:01.000Z"
}
```

### Telemetry & Metrics (`/metrics`)
```bash
curl -k https://localhost/metrics
```

---

## 4. SOP 3: Structured Log Tailing & Inspection

Logs are output in single-line JSON format containing `timestamp`, `level`, `requestId`, `statusCode`, and `durationMs`.

### View Live API Logs
```bash
docker compose logs -f app
```

### Filter Logs by Severity (Errors Only)
```bash
# Using grep or jq
docker compose logs app | grep '"level":"ERROR"'
# or on Windows PowerShell:
docker compose logs app | Select-String '"level":"ERROR"'
```

### Trace a Specific Request by Correlation ID
```bash
docker compose logs app | grep "b3252f77-8225-4049-878f-03fbd5104570"
```

---

## 5. SOP 4: Graceful Restart & Rolling Recovery

To restart services without losing persistent database state:

### Restart Application Service Only
```bash
docker compose restart app
```
The application handles `SIGTERM` by draining active requests and closing database pools.

### Full Stack Graceful Restart
```bash
docker compose down
docker compose up -d
```
Named volume `postgres_data` ensures zero data loss across restarts.

---

## 6. SOP 5: Backup & Disaster Recovery

### Step 1: Initiate Database Backup
```bash
# Linux
./scripts/backup.sh

# Windows PowerShell
.\scripts\backup.ps1
```
Backups are placed in `./backups/backup_school_management_<timestamp>.sql`.

### Step 2: Disaster Recovery Restore
In the event of accidental data corruption or hardware migration:
```bash
# Linux
./scripts/restore.sh ./backups/backup_school_management_<timestamp>.sql

# Windows PowerShell
.\scripts\restore.ps1 -BackupFile .\backups\backup_school_management_<timestamp>.sql
```

---

## 7. SOP 6: Incident Response & Troubleshooting Playbook

### Incident A: Readiness Probe Returns 503 (`NOT_READY`)
1. **Symptom**: Load balancer removes `school-api` from traffic routing; `/ready` returns HTTP 503.
2. **Diagnosis**:
   ```bash
   # Check PostgreSQL container status
   docker ps -a --filter "name=school-postgres"
   # View PostgreSQL error logs
   docker compose logs postgres
   ```
3. **Remediation**:
   - If PostgreSQL container stopped: `docker compose start postgres`.
   - If connection credentials invalid: verify `DB_USER` and `DB_PASSWORD` in `.env`.
   - Run readiness check again: `curl -k https://localhost/ready`.

### Incident B: Teacher Attendance Submission Returns 403
1. **Symptom**: Teacher reports inability to submit attendance.
2. **Diagnosis**:
   - Check API response `code` field:
     - `UNASSIGNED_TEACHER`: Teacher ID is valid, but the teacher has not been mapped to the class in `class_teachers`.
     - `FORBIDDEN_ROLE`: Header `X-User-ID` or `X-Role` belongs to a non-teacher (e.g. Student).
   - Inspect audit log:
     ```bash
     curl -k -H "x-user-id: usr-admin-1" https://localhost/api/v1/audit-logs?status=FORBIDDEN
     ```

### Incident C: Duplicate Attendance Error (409 Conflict)
1. **Symptom**: POST `/api/v1/attendance` returns 409 Conflict.
2. **Diagnosis**: Attendance for the specified `(class_id, student_id, date, session)` was already recorded.
3. **Remediation**: Check existing record via `GET /api/v1/classes/:id/attendance?date=YYYY-MM-DD&session=morning`.
