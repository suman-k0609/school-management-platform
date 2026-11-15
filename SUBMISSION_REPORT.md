# ALGIONS AI LABS PRIVATE LIMITED
## Cloud Deployment & CI/CD – School Management Platform
### DevOps & Cloud Engineering | Advanced Individual Project Assessment Submission

---

## 1. Candidate Identification & Submission Metadata

| Field | Candidate Details |
| :--- | :--- |
| **Student Name** | Suman Kumari |
| **Registration Number** | *[Insert Your University Registration / Roll Number]* |
| **University Email** | sumankumari200603@gmail.com |
| **Internship Role** | DevOps & Cloud Engineering |
| **Assigned Project** | Cloud Deployment & CI/CD – School Management Platform |
| **Repository URL** | https://github.com/suman-k0609/school-management-platform |
| **Primary Branch** | `main` |
| **Final Commit ID** | `6e65cdb` (Branch: `main`) |
| **Demo Video Link (3–5 mins)**| *[Insert Loom / YouTube / Google Drive Video Link]* |
| **Deployment URL** | `https://school-mgmt-suman.loca.lt` (Public Tunnel) / `http://localhost:3000` (Local) |

---

## 2. Executive Summary

This submission delivers a complete, production-grade DevOps engineering package for the **School Management** domain (Student, Class, and Attendance API). The project focuses on deterministic build reproducibility, automated CI/CD testing, containerization, least-privilege networking, reverse proxy with TLS encryption, structured observability, and verifiable backup/restore disaster recovery procedures.

All five core acceptance criteria from the assignment brief have been implemented and validated with automated test suites and operational runbooks.

---

## 3. Evaluation Rubric Compliance & Evidence (100 Marks)

### Criterion 1: Containerization & Reproducibility (20 Marks)
- **Multi-Stage Dockerfile**:
  - `builder` stage installs build dependencies and production packages cleanly.
  - `runner` stage uses lean `node:20-alpine`, installs minimal runtime tools (`curl`), and runs as an unprivileged non-root user (`appuser`, UID 10001).
  - Proper `.dockerignore` prevents build context pollution.
  - Native `HEALTHCHECK` probe configured with interval and retries.
- **Docker Compose Orchestration**:
  - `school-postgres` (PostgreSQL 16 Alpine with `pg_isready` healthcheck and named volume `postgres_data`).
  - `school-api` (API container with dependency health checks `depends_on: postgres: service_healthy`).
  - `school-reverse-proxy` (Nginx 1.27 Alpine TLS reverse proxy).
  - Explicit resource limits (CPU: 1.0, Memory: 512M) and restart policies (`unless-stopped`).

### Criterion 2: CI/CD Automation (20 Marks)
- **Workflow File**: `.github/workflows/ci.yml`.
- **Pipeline Stages**:
  1. `quality-checks`: Prettier code style check, ESLint static analysis, and `npm audit --audit-level=high` for dependency vulnerability scanning.
  2. `test`: Spins up an ephemeral PostgreSQL 16 container, executes database migrations, seeds synthetic data, and runs 15 automated integration and acceptance tests.
  3. `build-and-scan`: Builds Docker image with immutable semantic version tags (`algions/school-management-api:<commit-sha>`, `algions/school-management-api:v1.0.<run_number>`), and executes Aqua Security Trivy container security scans for critical/high vulnerabilities.

### Criterion 3: Deployment, Networking & Security (15 Marks)
- **Nginx Reverse Proxy & TLS**:
  - Listens on port `80` (redirects all non-probe traffic to `443` HTTPS via HTTP 301).
  - Listens on port `443` with TLS 1.2/1.3, modern cipher suites, and session caching.
  - Defense-in-depth headers: HSTS (`max-age=31536000`), CSP, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`).
  - Rate limiting enabled: 10 requests/second per client IP with burst allowance of 20.
- **Network Segmentation & Least Privilege**:
  - Isolated bridge networks: `frontend-net` (Proxy <-> App) and `backend-net` (App <-> Database).
  - PostgreSQL port 5432 is never exposed directly to the external network or host.
  - Zero hardcoded secrets: configured through `.env.example` and environment variables.

### Criterion 4: Observability & Troubleshooting (15 Marks)
- **Health & Readiness Checks**:
  - `GET /health` (Liveness probe): Reports 200 OK as long as the process is alive.
  - `GET /ready` (Readiness probe): Performs downstream ping against PostgreSQL connection pool; returns 200 OK when ready or 503 Service Unavailable when database is degraded.
  - `GET /metrics`: Reports request counts, status code distribution, average latency, and memory telemetry.
- **Structured JSON Logging**:
  - Single-line JSON access and error logs with correlation ID (`X-Request-ID`), timestamp, HTTP method, path, status, latency ms, and IP address.
- **Fault Detection & Recovery Drill**:
  - Scripted drill (`scripts/drill-failure-recovery.ps1` and `.sh`) proves failure detection (readiness probe fails, returning 503) and automatic self-healing/recovery upon container restart.

### Criterion 5: Backup, Restore & Rollback (15 Marks)
- **Automated Backup**:
  - Scripted via `scripts/backup.ps1` and `.sh`.
  - Generates compressed, timestamped PostgreSQL dumps (`backup_school_management_<timestamp>.sql`) with SHA256 integrity verification and automated 7-day retention rotation.
- **Automated Restore & Verification**:
  - Scripted via `scripts/restore.ps1` and `.sh`.
  - Re-applies SQL dump to database and runs verification query checking table row counts across `users`, `classes`, `attendance`, and `audit_logs`.
- **Documented Rollback Runbook**:
  - Complete operational SOP in `ROLLBACK.md` covering image tag rollbacks and database schema restoration.

### Criterion 6: Reliability & Documentation (10 Marks)
- Fully documented repository with:
  - `README.md` (Quickstart, port map, env vars, test steps).
  - `ARCHITECTURE.md` (Mermaid architecture diagram, sequence diagram, ER diagram, threat model).
  - `RUNBOOK.md` (Standard operating procedures, logging SOP, incident playbooks).
  - `ROLLBACK.md` (Rollback procedures).

### Criterion 7: Domain API Correctness (5 Marks)
- **Student, Class, and Attendance API**:
  - `GET /api/v1/classes` (Lists classes with assigned teachers and enrollment counts).
  - `GET /api/v1/classes/:id/students` (Lists enrolled students).
  - `POST /api/v1/attendance` (Records attendance with strict RBAC).
  - **Acceptance Rule 1**: Non-teacher or unassigned teacher write strictly blocked (`403 Forbidden`).
  - **Acceptance Rule 2**: Non-enrolled student write rejected (`422 Unprocessable Entity`).
  - **Acceptance Rule 3**: Duplicate attendance for same class, student, date, and session prevented (`409 Conflict`).
  - **Acceptance Rule 4**: Audit trail captures all operations (`GET /api/v1/audit-logs`).

---

## 4. Automated Acceptance Test Execution Evidence

All 15 automated test suites pass with 100% success rate:

```text
▶ Attendance API Acceptance Tests & Business Logic
  ▶ Acceptance Test 1: Role & Assignment Authorization
    ✔ RULE 1A: Non-teacher role (Student) must NOT write attendance for a class -> 403 Forbidden (57ms)
    ✔ RULE 1B: Unauthenticated user without credentials must NOT write attendance -> 401 Unauthorized (10ms)
    ✔ RULE 1C: UNASSIGNED teacher must NOT write attendance for a class -> 403 Forbidden (11ms)
  ✔ Acceptance Test 1: Role & Assignment Authorization (80ms)
  ▶ Acceptance Test 2: Student Membership Validation
    ✔ RULE 2: Attempting to record attendance for a student NOT enrolled in class -> 422 Unprocessable Entity (14ms)
  ✔ Acceptance Test 2: Student Membership Validation (14ms)
  ▶ Acceptance Test 3: Authorized Recording & Duplicate Prevention
    ✔ RULE 3A: Authorized assigned teacher recording attendance for enrolled student -> 201 Created (12ms)
    ✔ RULE 3B: Duplicate attendance for same class, student, date, session PREVENTED -> 409 Conflict (13ms)
  ✔ Acceptance Test 3: Authorized Recording & Duplicate Prevention (26ms)
  ▶ Acceptance Test 4: Audit Trail Verification
    ✔ RULE 4: System must capture audit log for write actions and security violations (16ms)
  ✔ Acceptance Test 4: Audit Trail Verification (16ms)
✔ Attendance API Acceptance Tests & Business Logic (132ms)

▶ Classes API Endpoints
  ✔ GET /api/v1/classes should return all synthetic classes with assigned teachers and enrollment counts (56ms)
  ✔ GET /api/v1/classes/:id should return single class details (13ms)
  ✔ GET /api/v1/classes/:id with non-existent ID should return 404 (9ms)
  ✔ GET /api/v1/classes/:id/students should return list of enrolled students (9ms)
  ✔ GET /api/v1/classes/:id/students with invalid class ID should return 404 (8ms)
✔ Classes API Endpoints (98ms)

▶ Health and Observability Endpoints
  ✔ GET /health should return 200 and status UP with version metadata (55ms)
  ✔ GET /ready should return 200 and status READY when database is healthy (11ms)
  ✔ GET /metrics should return operational metrics with memory and request telemetry (8ms)
✔ Health and Observability Endpoints (77ms)

ℹ tests 15
ℹ suites 7
ℹ pass 15
ℹ fail 0
```

---

## 5. 3–5 Minute Video Demonstration Script & Walkthrough

When recording the required demonstration video, follow this exact step-by-step script:

### Minute 0:00 – 0:45 | Introduction & Architecture
1. State your name, registration number, and the assigned project (**Cloud Deployment & CI/CD – School Management Platform**).
2. Show the `ARCHITECTURE.md` diagram and explain:
   - Nginx reverse proxy with TLS on port 443.
   - Isolated `frontend-net` and `backend-net` networks.
   - Node.js API container running non-root with health probes.
   - PostgreSQL 16 container with persistent volume storage.

### Minute 0:45 – 1:45 | CI/CD Pipeline & Build Artifacts
1. Open GitHub Actions tab (or `.github/workflows/ci.yml`).
2. Highlight the three jobs:
   - **Quality checks**: Prettier format, ESLint, npm audit.
   - **Automated tests**: Runs the 15 acceptance tests against a live PostgreSQL service.
   - **Docker build & scan**: Multi-stage build, immutable image tagging (`:v1.0.X`, `:<sha>`), and Trivy security scanning.

### Minute 1:45 – 2:45 | Live Service Deployment & Acceptance Tests
1. Run `docker compose ps` to show all three containers running and healthy.
2. In terminal or browser, show:
   - `curl -k https://localhost/health` -> HTTP 200 `status: UP`.
   - `curl -k https://localhost/ready` -> HTTP 200 `status: READY`.
3. Demonstrate Acceptance Test #1 (Business Rule):
   - Make an unauthorized request with header `x-user-id: usr-student-1`:
     `POST /api/v1/attendance` -> Show `403 Forbidden` (`FORBIDDEN_ROLE`).
   - Make an unassigned teacher request with `x-user-id: usr-teacher-3`:
     `POST /api/v1/attendance` -> Show `403 Forbidden` (`UNASSIGNED_TEACHER`).
   - Make an authorized request with `x-user-id: usr-teacher-1`:
     `POST /api/v1/attendance` -> Show `201 Created` (`Attendance recorded successfully`).
   - Repeat the exact same request -> Show `409 Conflict` (`DUPLICATE_ATTENDANCE`).

### Minute 2:45 – 4:00 | Observability, Failure Drill & Backup/Restore
1. Show live structured JSON logs:
   - `docker compose logs --tail=20 app` -> Highlight correlation ID (`X-Request-ID`) and status codes.
2. Run the failure injection drill:
   - Run `.\scripts\drill-failure-recovery.ps1` (or `.sh`).
   - Show how `/ready` returns `503 Service Unavailable` when PostgreSQL is stopped.
   - Show automatic recovery back to `200 READY` once restarted.
3. Show database backup and restore:
   - Run `.\scripts\backup.ps1` -> Highlight generated `.sql` file and SHA256 hash.
   - Run `.\scripts\restore.ps1` -> Highlight verified row counts for users, classes, and attendance.

### Minute 4:00 – 4:30 | Conclusion
1. Summarize how all 5 acceptance criteria are fulfilled.
2. Direct the reviewer to `README.md`, `ARCHITECTURE.md`, `RUNBOOK.md`, and `ROLLBACK.md`.

---

## 6. Declarations & Attributions
- **Originality**: All configuration files, Dockerfiles, orchestration manifests, and test suites are authored specifically for this assessment.
- **Credentials & Privacy**: No production secrets, personal credentials, or sensitive data have been committed. All secrets use placeholders via `.env.example`.
- **Reproducibility**: The setup is deterministically reproducible on any clean machine equipped with Docker Engine and Docker Compose.

