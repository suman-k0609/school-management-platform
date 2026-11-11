# System Architecture & Technical Design Specification
## School Management Platform – Cloud Deployment & CI/CD

---

## 1. High-Level Architecture Overview

The School Management Platform is architected as an observable, highly reliable microservice adhering to 12-factor cloud-native principles, least-privilege security, and defense-in-depth networking.

```mermaid
flowchart TD
    Client(["External Client / Browser"])
    
    subgraph Host ["Deployment Host / VM"]
        subgraph DMZ ["Frontend Network (frontend-net)"]
            Proxy["Nginx Reverse Proxy\n(school-reverse-proxy:80/443)\nTLS Termination & Rate Limiting"]
        end
        
        subgraph AppTier ["Application Service"]
            App["Node.js 20 API Service\n(school-api:3000)\nNon-root (appuser: 10001)\nCorrelation Tracing"]
        end
        
        subgraph DataTier ["Backend Network (backend-net)"]
            DB[("PostgreSQL 16 Database\n(school-postgres:5432)\nPersistent Storage: postgres_data")]
        end
        
        subgraph Storage ["Persistent Host Storage"]
            VolDB[("postgres_data\nNamed Volume")]
            VolLogs[("app_logs\nNamed Volume")]
            VolBackups[("./backups\nHost Directory")]
        end
    end

    Client -- "HTTP :80 (Redirect 301)" --> Proxy
    Client -- "HTTPS :443 (TLS 1.2/1.3)" --> Proxy
    Proxy -- "Reverse Proxy (HTTP :3000)" --> App
    App -- "SQL Connection Pool (:5432)" --> DB
    
    DB -.-> VolDB
    App -.-> VolLogs
    DB -. "pg_dump / restore" .-> VolBackups
```

---

## 2. Component Design & Responsibilities

### 2.1 Ingress Reverse Proxy (`school-reverse-proxy`)
- **Technology**: Nginx 1.27 Alpine.
- **TLS Termination**: Offloads TLS processing using modern cipher suites (`TLSv1.2`, `TLSv1.3`).
- **HTTP to HTTPS Redirection**: Enforces encrypted transport across all application endpoints.
- **Rate Limiting**: Protects against denial-of-service with `limit_req_zone` (10 requests/second with burst allowance of 20).
- **Security Headers**: Injects HTTP defense-in-depth headers:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy: default-src 'self'`
  - `Referrer-Policy: strict-origin-when-cross-origin`

### 2.2 Application Service (`school-api`)
- **Runtime**: Node.js 20 LTS on Alpine Linux.
- **Execution Security**: Runs under an unprivileged non-root user (`appuser`, UID 10001, GID 10001).
- **Telemetry & Observability**:
  - `GET /health`: Liveness probe measuring event-loop responsive uptime.
  - `GET /ready`: Readiness probe verifying downstream PostgreSQL connectivity and pool status.
  - `GET /metrics`: Telemetry endpoint exposing latency stats, request counts, and memory usage.
- **Request Tracing**: Assigns or propagates a unique correlation ID (`X-Request-ID`) across every incoming HTTP request.
- **Graceful Shutdown**: Traps `SIGTERM` and `SIGINT` to drain existing connections, terminate HTTP listeners, and close database connection pools without packet drop.

### 2.3 Persistence Layer (`school-postgres`)
- **Engine**: PostgreSQL 16 Alpine.
- **Network Isolation**: Attached exclusively to `backend-net`; unreachable from the external host network or untrusted containers.
- **Data Persistence**: Uses a named Docker volume (`postgres_data`) surviving container rebuilds, restarts, or crashes.
- **Healthcheck**: Uses native `pg_isready -U school_admin -d school_management`.

---

## 3. Relational Data Model & ER Diagram

```mermaid
erDiagram
    USERS ||--o{ CLASS_TEACHERS : "assigned to"
    USERS ||--o{ CLASS_STUDENTS : "enrolled in"
    CLASSES ||--o{ CLASS_TEACHERS : "has"
    CLASSES ||--o{ CLASS_STUDENTS : "enrolls"
    CLASSES ||--o{ ATTENDANCE : "recorded for"
    USERS ||--o{ ATTENDANCE : "student record"
    USERS ||--o{ ATTENDANCE : "recorded by"
    USERS ||--o{ AUDIT_LOGS : "acted by"

    USERS {
        varchar(50) id PK
        varchar(100) name
        varchar(150) email UK
        varchar(20) role "admin | teacher | student"
        boolean is_active
        timestamp created_at
    }

    CLASSES {
        varchar(50) id PK
        varchar(100) name
        varchar(20) code UK
        varchar(50) room
        varchar(20) academic_year
        timestamp created_at
    }

    CLASS_TEACHERS {
        varchar(50) class_id PK,FK
        varchar(50) teacher_id PK,FK
        timestamp assigned_at
    }

    CLASS_STUDENTS {
        varchar(50) class_id PK,FK
        varchar(50) student_id PK,FK
        timestamp enrolled_at
    }

    ATTENDANCE {
        varchar(50) id PK
        varchar(50) class_id FK
        varchar(50) student_id FK
        varchar(50) recorded_by FK
        date date
        varchar(20) session
        varchar(20) status "present | absent | late | excused"
        text notes
        timestamp created_at
    }

    AUDIT_LOGS {
        varchar(50) id PK
        varchar(50) action
        varchar(50) user_id
        varchar(20) user_role
        varchar(50) resource_type
        varchar(100) resource_id
        varchar(20) status "SUCCESS | FORBIDDEN | FAILED"
        varchar(50) ip_address
        jsonb details
        timestamp created_at
    }
```

---

## 4. Attendance Write Request Flow & Security Enforcement

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Authorized Teacher
    participant Proxy as Nginx Proxy (:443)
    participant App as API Service (:3000)
    participant Auth as RBAC Middleware
    participant Service as Attendance Service
    participant DB as PostgreSQL DB (:5432)

    Teacher->>Proxy: POST /api/v1/attendance (Headers: X-User-ID, Payload)
    Proxy->>App: Forward request with X-Request-ID & X-Forwarded-*
    App->>Auth: Verify user role in ('teacher', 'admin')
    alt Role is not teacher/admin
        Auth-->>App: 403 Forbidden
        App->>DB: Log Audit Event (status: FORBIDDEN)
        App-->>Teacher: HTTP 403 (FORBIDDEN_ROLE)
    end

    Auth->>Service: Execute recordAttendance()
    Service->>DB: Check if teacher is assigned to class
    alt Teacher is unassigned
        Service->>DB: Log Audit Event (status: FORBIDDEN)
        Service-->>Teacher: HTTP 403 (UNASSIGNED_TEACHER)
    end

    Service->>DB: Check if student is enrolled in class
    alt Student not enrolled
        Service->>DB: Log Audit Event (status: FAILED)
        Service-->>Teacher: HTTP 422 (STUDENT_NOT_ENROLLED)
    end

    Service->>DB: Check for duplicate (class_id, student_id, date, session)
    alt Record exists
        Service->>DB: Log Audit Event (status: FAILED)
        Service-->>Teacher: HTTP 409 (DUPLICATE_ATTENDANCE)
    end

    Service->>DB: INSERT INTO attendance (...)
    Service->>DB: INSERT INTO audit_logs (status: SUCCESS)
    Service-->>Teacher: HTTP 201 Created (Attendance Record)
```

---

## 5. Security Architecture & Threat Model

| Threat / Risk | Mitigating Security Control |
| :--- | :--- |
| **Direct Database Probing** | PostgreSQL is attached exclusively to internal bridge network `backend-net`. No external ports published on host. |
| **Container Privilege Escalation** | Multi-stage Dockerfile drops root privileges; runs exclusively as unprivileged `appuser` (UID 10001). |
| **Eavesdropping / MITM** | Nginx terminates TLS 1.2/1.3 with modern cipher suites and enforces HSTS for browser trust. |
| **Denial of Service (DoS)** | Nginx rate limiting (10 req/s, burst 20); Express JSON body parser strictly capped at 1MB. |
| **Tampering / Unauthorized Access** | Strict RBAC; only assigned teachers can write attendance; full audit trail for all events. |
| **Vulnerable Dependencies / Base Image** | Automated `npm audit --audit-level=high` and Aqua Trivy container security scans in GitHub Actions CI. |
| **Secret Leakage** | All credentials injected via environment variables; `.gitignore` prevents committing secrets or `.env` files. |
