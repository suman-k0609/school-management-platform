# Algions AI Labs: School Management Platform
## Cloud Deployment & CI/CD – DevOps & Cloud Engineering Assessment

[![CI/CD Pipeline](https://github.com/suman-k0609/school-management-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/suman-k0609/school-management-platform/actions)
[![Docker](https://img.shields.io/badge/docker-multi--stage-blue.svg)](Dockerfile)
[![Node.js](https://img.shields.io/badge/node.js-v20%2B-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)](https://www.postgresql.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](package.json)

---

## 1. Executive Summary & Mission

This repository implements a production-style, reproducibly buildable, deployable, observable, and recoverable **Student, Class, and Attendance API** for the **School Management** domain, adhering strictly to the specifications of the **Algions AI Labs DevOps & Cloud Engineering Individual Assessment**.

### Domain API Scope
- **Student & Class Roster**: Exposes health/readiness endpoints and endpoints to list classes and assigned students.
- **Role-Restricted Attendance**: Authorized teacher roles record attendance for assigned classes; unassigned teachers or non-teachers are strictly prohibited (`403 Forbidden`).
- **Data Integrity & Duplicate Prevention**: Validates student membership (`422 Unprocessable`) and prevents duplicate attendance entries for the same student, class, date, and session (`409 Conflict`).
- **Comprehensive Audit Trail**: Automatically captures audit logs for all write actions and security violations.
- **Synthetic Seed Data & Automated Tests**: Out-of-the-box pre-seeded records with 100% automated test coverage.

---

## 2. Architecture & Port Mapping

```
+-------------------------------------------------------------------------+
|                              Client Traffic                             |
+-------------------------------------------------------------------------+
                                     |
               HTTP :80 (Redirect)   |   HTTPS :443 (TLS Termination)
                                     v
+-------------------------------------------------------------------------+
|                  Nginx Reverse Proxy (school-reverse-proxy)             |
|  - Rate Limiting (10 req/s, burst 20)  - SSL/TLS Offloading             |
|  - Security Headers (HSTS, CSP, etc.)  - Upstream Load Balancing        |
+-------------------------------------------------------------------------+
                                     | (frontend-net)
                                     v
+-------------------------------------------------------------------------+
|                 API Service Container (school-api :3000)                |
|  - Node.js 20 Non-root execution       - Correlation ID Tracing         |
|  - Liveness & Readiness Probes         - Structured JSON Logging        |
+-------------------------------------------------------------------------+
                                     | (backend-net)
                                     v
+-------------------------------------------------------------------------+
|               PostgreSQL 16 Database (school-postgres :5432)            |
|  - Persistent Named Volume Storage     - Healthcheck pg_isready         |
|  - Internal Network Isolation          - Automated Backups              |
+-------------------------------------------------------------------------+
```

### Port Map
| Service | Container Internal Port | Host Published Port | Protocol / Exposure |
| :--- | :--- | :--- | :--- |
| **Nginx Reverse Proxy** | `80` | `80` | HTTP (Redirects to HTTPS :443) |
| **Nginx Reverse Proxy** | `443` | `443` | HTTPS (TLS v1.2/1.3, Rate-limited) |
| **School API** | `3000` | None (Internal) | Isolated to `frontend-net` & `backend-net` |
| **PostgreSQL 16** | `5432` | None (Internal) | Isolated to `backend-net` (Least Privilege) |

---

## 3. Quickstart & Deployment

### Prerequisites
- Docker Engine 24+ & Docker Compose v2+
- Node.js 20+ (for local development/testing)
- OpenSSL (for generating self-signed TLS certificates)

### Step 1: Clone & Configure Environment
```bash
# Clone the repository
git clone <repository_url>
cd "SchoolManagement Platform"

# Initialize local environment variables from template
cp .env.example .env
```

### Step 2: Generate TLS/SSL Certificates
```bash
# Linux / macOS
chmod +x scripts/*.sh
./scripts/generate-ssl.sh

# Windows PowerShell
.\scripts\generate-ssl.ps1
```

### Step 3: Launch with Docker Compose
```bash
docker compose up -d --build
```

### Step 4: Verify Deployment Health
```bash
# Verify running containers and health status
docker compose ps

# Check liveness probe
curl -k https://localhost/health

# Check readiness probe (verifies database connectivity)
curl -k https://localhost/ready

# Check telemetry metrics
curl -k https://localhost/metrics
```

---

## 4. Environment Variables Reference

| Variable | Description | Default | Environment |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Application runtime environment | `production` | All |
| `PORT` | Node.js internal HTTP listening port | `3000` | Container |
| `API_PREFIX` | Base URI routing prefix | `/api/v1` | All |
| `LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`) | `info` | All |
| `DB_HOST` | PostgreSQL hostname | `postgres` | Compose |
| `DB_PORT` | PostgreSQL listening port | `5432` | Compose |
| `DB_NAME` | Database catalog name | `school_management` | Compose |
| `DB_USER` | Least-privileged database user | `school_admin` | Compose |
| `DB_PASSWORD` | Database user password | `school_secure_pass_2026` | Compose |
| `DB_IN_MEMORY` | Fallback mode for zero-dependency test runs | `false` | Development/Test |

---

## 5. Automated Testing & Verification

The test suite exercises all 5 Algions AI Labs acceptance tests, RBAC access policies, and domain integrity rules.

```bash
# Run unit and integration tests
npm test

# Run code style formatting check (Prettier)
npm run format

# Run static analysis linting (ESLint)
npm run lint

# Run dependency vulnerability audit
npm audit --audit-level=high
```

### Verified Test Matrix
1. **Rule 1A**: Non-teacher role (`usr-student-1`) attempting attendance write receives `403 Forbidden`.
2. **Rule 1B**: Unauthenticated request receives `401 Unauthorized`.
3. **Rule 1C**: Unassigned teacher (`usr-teacher-3`) attempting attendance write for Math 101 receives `403 Forbidden`.
4. **Rule 2**: Attempting attendance write for non-enrolled student receives `422 Unprocessable Entity`.
5. **Rule 3A**: Authorized assigned teacher (`usr-teacher-1`) recording valid attendance receives `201 Created`.
6. **Rule 3B**: Duplicate attendance for same class, student, date, and session receives `409 Conflict`.
7. **Rule 4**: Audit trail captures all write actions and security violations.
8. **Rule 5**: Liveness, readiness, and metrics endpoints return valid telemetry.

---

## 6. Disaster Recovery & Backup Operations

### Creating an Automated Database Backup
```bash
# Linux
./scripts/backup.sh

# Windows PowerShell
.\scripts\backup.ps1
```
Backups are archived into `./backups/backup_school_management_<timestamp>.sql` with automatic SHA256 verification and 7-day retention rotation.

### Restoring from a Backup
```bash
# Linux
./scripts/restore.sh ./backups/backup_school_management_20261111_220000.sql

# Windows PowerShell
.\scripts\restore.ps1 -BackupFile .\backups\backup_school_management_20261111_220000.sql
```

### Running the Failure & Recovery Drill
```bash
# Linux
./scripts/drill-failure-recovery.sh

# Windows PowerShell
.\scripts\drill-failure-recovery.ps1
```

---

## 7. Rollback Procedure

See [ROLLBACK.md](ROLLBACK.md) for the complete operational rollback runbook covering:
1. Fast image tag rollback using immutable version tags.
2. Database schema rollback.
3. Verification checklist.

---

## 8. Documentation Index
- [Architecture & Design](ARCHITECTURE.md)
- [Operations Runbook (SOPs)](RUNBOOK.md)
- [Rollback Runbook](ROLLBACK.md)
- [Algions Submission Report](SUBMISSION_REPORT.md)

