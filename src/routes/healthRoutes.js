/**
 * Health & Observability Routes
 * Serves /health, /ready, /metrics, and an interactive browser dashboard at /
 */
const express = require('express');
const { getHealth, getReadiness, getMetricsReport } = require('../controllers/healthController');
const config = require('../config/env');

const router = express.Router();

// Root route: provides interactive UI in browsers, JSON overview for API clients
router.get('/', (req, res) => {
  const acceptsHtml = req.accepts('html', 'json') === 'html';

  if (!acceptsHtml) {
    return res.status(200).json({
      name: 'School Management Platform API',
      description: 'DevOps & Cloud Engineering Platform for Student, Class, and Attendance Management',
      version: config.version,
      status: 'UP',
      endpoints: {
        health: '/health',
        readiness: '/ready',
        metrics: '/metrics',
        classes: `${config.apiPrefix}/classes`,
        attendance: `${config.apiPrefix}/attendance`,
        auditLogs: `${config.apiPrefix}/audit-logs`,
      },
      documentation: 'https://github.com/algions-candidate/school-management-platform',
    });
  }

  // Interactive HTML Dashboard for browsers
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>School Management Platform - DevOps Assessment Dashboard</title>
  <style>
    :root {
      --bg: #0b1120;
      --card-bg: #152238;
      --card-border: #233554;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #22c55e;
      --danger: #ef4444;
      --warning: #f59e0b;
      --radius: 10px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; line-height: 1.5; }
    .container { max-width: 1180px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 18px; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 700; color: var(--text); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: rgba(34, 197, 94, 0.18); color: var(--success); border: 1px solid rgba(34, 197, 94, 0.4); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 22px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
    .card-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--primary); display: flex; justify-content: space-between; align-items: center; }
    .btn { background: var(--primary); color: #0b1120; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; transition: all 0.2s; text-align: center; }
    .btn:hover { opacity: 0.92; transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn-scenario { background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 6px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; cursor: pointer; margin-right: 6px; margin-bottom: 6px; }
    .btn-scenario:hover { background: #293548; border-color: var(--primary); }
    .form-group { margin-bottom: 12px; }
    label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; }
    select, input { width: 100%; background: #0b1120; border: 1px solid var(--card-border); color: var(--text); padding: 9px 12px; border-radius: 6px; font-size: 13px; }
    pre { background: #060a14; border: 1px solid var(--card-border); border-radius: 6px; padding: 14px; font-size: 12px; overflow-x: auto; color: #38bdf8; max-height: 280px; font-family: Consolas, Monaco, monospace; }
    .pill-nav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .pill-nav a { background: var(--card-bg); border: 1px solid var(--card-border); color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-family: monospace; transition: all 0.2s; }
    .pill-nav a:hover { color: var(--text); border-color: var(--primary); background: #1a2842; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--card-border); }
    th { color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 11px; }
    .scenarios-container { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed var(--card-border); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>ALGIONS AI LABS – School Management Platform</h1>
        <p style="color: var(--text-muted); font-size: 13px;">Cloud Deployment & CI/CD | DevOps & Cloud Engineering</p>
      </div>
      <div>
        <span class="badge badge-success">● SYSTEM ONLINE (v1.0.0)</span>
      </div>
    </header>

    <div class="pill-nav">
      <a href="/health" target="_blank">GET /health</a>
      <a href="/ready" target="_blank">GET /ready</a>
      <a href="/metrics" target="_blank">GET /metrics</a>
      <a href="/api/v1/classes" target="_blank">GET /api/v1/classes</a>
      <a href="/api/v1/audit-logs" target="_blank">GET /api/v1/audit-logs</a>
    </div>

    <div class="grid">
      <!-- 1. Interactive Attendance Submission -->
      <div class="card">
        <div class="card-title">
          <span>Record Class Attendance</span>
          <span style="font-size: 11px; color: var(--text-muted);">POST /api/v1/attendance</span>
        </div>

        <!-- 1-Click Quick Scenario Presets -->
        <div class="scenarios-container">
          <label style="margin-bottom: 6px; display: block;">⚡ 1-Click Test Scenarios:</label>
          <button type="button" class="btn-scenario" onclick="runScenario('authorized')">✔ 1. Authorized Teacher (201)</button>
          <button type="button" class="btn-scenario" onclick="runScenario('duplicate')">⚠️ 2. Duplicate Attendance (409)</button>
          <button type="button" class="btn-scenario" onclick="runScenario('student')">🚫 3. Student Write (403)</button>
          <button type="button" class="btn-scenario" onclick="runScenario('unassigned')">🚫 4. Unassigned Teacher (403)</button>
          <button type="button" class="btn-scenario" onclick="runScenario('unenrolled')">❌ 5. Not Enrolled (422)</button>
        </div>

        <form id="attendanceForm" onsubmit="return false;">
          <div class="form-group">
            <label>Acting User (Header: x-user-id)</label>
            <select id="userId">
              <option value="usr-teacher-1">Prof. Alan Turing (Teacher - Assigned to Math 101) [AUTHORIZED]</option>
              <option value="usr-teacher-3">Prof. Grace Hopper (Teacher - Unassigned to Math 101) [WILL GET 403]</option>
              <option value="usr-student-1">Alice Smith (Role: Student) [WILL GET 403]</option>
              <option value="usr-admin-1">Principal Margaret Hamilton (Role: Admin) [AUTHORIZED]</option>
            </select>
          </div>
          <div class="form-group">
            <label>Target Class</label>
            <select id="classId">
              <option value="cls-math-101">cls-math-101 (Grade 10 Mathematics)</option>
              <option value="cls-sci-201">cls-sci-201 (Grade 10 Physical Science)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Target Student</label>
            <select id="studentId">
              <option value="usr-student-1">usr-student-1 (Alice Smith - Enrolled in Math & Science)</option>
              <option value="usr-student-2">usr-student-2 (Bob Jones - Enrolled in Math)</option>
              <option value="usr-student-3">usr-student-3 (Charlie Brown - Enrolled in Science ONLY) [WILL GET 422 in Math]</option>
              <option value="usr-student-4">usr-student-4 (Diana Prince - Enrolled in Math)</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="attDate" value="2026-11-12" required />
            </div>
            <div class="form-group">
              <label>Session</label>
              <select id="session">
                <option value="morning">morning</option>
                <option value="afternoon">afternoon</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Attendance Status</label>
            <select id="status">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
          <button type="button" id="submitBtn" class="btn" style="width: 100%; margin-top: 6px;" onclick="submitAttendance()">
            Execute Attendance Request
          </button>
        </form>
      </div>

      <!-- 2. Live API Response Viewer -->
      <div class="card">
        <div class="card-title">
          <span>Live API Execution Output</span>
          <span id="responseStatus" class="badge" style="display: none;"></span>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          HTTP response status, correlation ID, and payload returned by the service:
        </p>
        <pre id="apiOutput">// Ready. Click "Execute Attendance Request" or a 1-Click Scenario above...</pre>
      </div>
    </div>

    <!-- 3. Roster & Audit Logs Overview -->
    <div class="grid">
      <div class="card">
        <div class="card-title">Classes Roster</div>
        <div id="classesList">Loading classes...</div>
      </div>
      <div class="card">
        <div class="card-title">Recent Audit Logs</div>
        <div id="auditLogsList">Loading audit logs...</div>
      </div>
    </div>
  </div>

  <script>
    async function loadData() {
      try {
        const classesRes = await fetch('/api/v1/classes');
        const classesData = await classesRes.json();
        let classesHtml = '<table><tr><th>Code</th><th>Name</th><th>Assigned Teacher</th><th>Students</th></tr>';
        classesData.data.forEach(c => {
          const teachers = c.assignedTeachers.map(t => t.name).join(', ') || 'None';
          classesHtml += '<tr><td><strong>' + c.code + '</strong></td><td>' + c.name + '</td><td>' + teachers + '</td><td>' + c.enrolledStudentsCount + '</td></tr>';
        });
        classesHtml += '</table>';
        document.getElementById('classesList').innerHTML = classesHtml;

        const auditRes = await fetch('/api/v1/audit-logs?limit=6', {
          headers: { 'x-user-id': 'usr-admin-1' }
        });
        const auditData = await auditRes.json();
        let auditHtml = '<table><tr><th>Action</th><th>User</th><th>Status</th><th>Time</th></tr>';
        auditData.data.forEach(a => {
          const color = a.status === 'SUCCESS' ? 'color: var(--success)' : (a.status === 'FORBIDDEN' ? 'color: var(--danger)' : 'color: var(--warning)');
          auditHtml += '<tr><td><code>' + a.action + '</code></td><td>' + a.user_id + '</td><td style="' + color + '">' + a.status + '</td><td>' + new Date(a.created_at).toLocaleTimeString() + '</td></tr>';
        });
        auditHtml += '</table>';
        document.getElementById('auditLogsList').innerHTML = auditHtml;
      } catch (e) {
        console.error('Error loading data:', e);
      }
    }

    function runScenario(type) {
      if (type === 'authorized') {
        document.getElementById('userId').value = 'usr-teacher-1';
        document.getElementById('classId').value = 'cls-math-101';
        document.getElementById('studentId').value = 'usr-student-4';
        document.getElementById('attDate').value = '2026-11-12';
        document.getElementById('session').value = 'morning';
        document.getElementById('status').value = 'present';
      } else if (type === 'duplicate') {
        // Same as seeded record
        document.getElementById('userId').value = 'usr-teacher-1';
        document.getElementById('classId').value = 'cls-math-101';
        document.getElementById('studentId').value = 'usr-student-1';
        document.getElementById('attDate').value = '2026-11-10';
        document.getElementById('session').value = 'morning';
        document.getElementById('status').value = 'present';
      } else if (type === 'student') {
        document.getElementById('userId').value = 'usr-student-1';
        document.getElementById('classId').value = 'cls-math-101';
        document.getElementById('studentId').value = 'usr-student-2';
        document.getElementById('attDate').value = '2026-11-12';
      } else if (type === 'unassigned') {
        document.getElementById('userId').value = 'usr-teacher-3';
        document.getElementById('classId').value = 'cls-math-101';
        document.getElementById('studentId').value = 'usr-student-1';
        document.getElementById('attDate').value = '2026-11-12';
      } else if (type === 'unenrolled') {
        document.getElementById('userId').value = 'usr-teacher-1';
        document.getElementById('classId').value = 'cls-math-101';
        document.getElementById('studentId').value = 'usr-student-3'; // enrolled in Science only
        document.getElementById('attDate').value = '2026-11-12';
      }
      submitAttendance();
    }

    async function submitAttendance() {
      const btn = document.getElementById('submitBtn');
      const userId = document.getElementById('userId').value;
      const classId = document.getElementById('classId').value;
      const studentId = document.getElementById('studentId').value;
      let date = document.getElementById('attDate').value;
      if (!date) date = '2026-11-12';
      const session = document.getElementById('session').value;
      const status = document.getElementById('status').value;

      const output = document.getElementById('apiOutput');
      const statusBadge = document.getElementById('responseStatus');

      btn.innerText = 'Executing Request...';
      btn.style.opacity = '0.7';
      output.innerText = 'Sending POST /api/v1/attendance request...';

      try {
        const res = await fetch('/api/v1/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({ classId, studentId, date, session, status, notes: 'Recorded via UI' })
        });

        const json = await res.json();
        output.innerText = JSON.stringify(json, null, 2);

        statusBadge.style.display = 'inline-flex';
        if (res.status >= 200 && res.status < 300) {
          statusBadge.className = 'badge badge-success';
          statusBadge.style.background = 'rgba(34, 197, 94, 0.2)';
          statusBadge.style.color = '#22c55e';
          statusBadge.innerText = 'HTTP ' + res.status + ' SUCCESS (CREATED)';
        } else if (res.status === 403 || res.status === 401) {
          statusBadge.className = 'badge';
          statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
          statusBadge.style.color = '#ef4444';
          statusBadge.innerText = 'HTTP ' + res.status + ' FORBIDDEN (' + (json.error?.code || 'BLOCKED') + ')';
        } else if (res.status === 409) {
          statusBadge.className = 'badge';
          statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
          statusBadge.style.color = '#f59e0b';
          statusBadge.innerText = 'HTTP 409 CONFLICT (DUPLICATE)';
        } else if (res.status === 422) {
          statusBadge.className = 'badge';
          statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
          statusBadge.style.color = '#f59e0b';
          statusBadge.innerText = 'HTTP 422 UNPROCESSABLE (NOT ENROLLED)';
        } else {
          statusBadge.className = 'badge';
          statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
          statusBadge.style.color = '#ef4444';
          statusBadge.innerText = 'HTTP ' + res.status + ' ' + (json.error?.code || 'ERROR');
        }

        // Refresh audit logs and classes
        await loadData();
      } catch (err) {
        output.innerText = 'Network Error: ' + err.message;
      } finally {
        btn.innerText = 'Execute Attendance Request';
        btn.style.opacity = '1';
      }
    }

    // Initial load on page ready
    loadData();
  </script>
</body>
</html>`);
});

router.get('/health', getHealth);
router.get('/ready', getReadiness);
router.get('/metrics', getMetricsReport);

module.exports = router;
