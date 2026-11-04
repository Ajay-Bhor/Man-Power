const http = require('http');

async function login(usernameOrEmail, password) {
  const res = await fetch('http://localhost:8080/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail, password })
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${usernameOrEmail}: HTTP ${res.status}`);
  }
  const body = await res.json();
  return {
    token: body.data.accessToken || body.data.token,
    user: body.data
  };
}

async function testEndpoint(name, url, method, token, expectedStatus, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const isMatch = res.status === expectedStatus;
  let responseData = null;
  try {
    responseData = await res.json();
  } catch (e) {}

  console.log(`[${isMatch ? 'PASS' : 'FAIL'}] ${name}: Status ${res.status} (Expected: ${expectedStatus})`);
  return { isMatch, status: res.status, data: responseData };
}

async function runTests() {
  console.log('================================================================');
  console.log('URJA FOODS ATS - ROLE-BASED ACCESS CONTROL (RBAC) TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  // 1. IT ADMIN TESTS
  console.log('--- 1. IT ADMIN TESTS (admin@company.com) ---');
  const itAdmin = await login('admin@company.com', 'password');
  console.log(`Logged in as: ${itAdmin.user.name} (${itAdmin.user.roles.join(', ')})`);

  // Can access Backups
  total++;
  let res = await testEndpoint('IT Admin -> GET /api/v1/admin/backups', 'http://localhost:8080/api/v1/admin/backups', 'GET', itAdmin.token, 200);
  if (res.isMatch) passed++;

  // Can access Policies
  total++;
  res = await testEndpoint('IT Admin -> GET /api/v1/admin/policies', 'http://localhost:8080/api/v1/admin/policies', 'GET', itAdmin.token, 200);
  if (res.isMatch) passed++;

  // Can access System Settings
  total++;
  res = await testEndpoint('IT Admin -> GET /api/v1/admin/system-settings', 'http://localhost:8080/api/v1/admin/system-settings', 'GET', itAdmin.token, 200);
  if (res.isMatch) passed++;

  // Can access All Audit Logs
  total++;
  res = await testEndpoint('IT Admin -> GET /api/v1/admin/audit-logs', 'http://localhost:8080/api/v1/admin/audit-logs', 'GET', itAdmin.token, 200);
  if (res.isMatch) passed++;

  // BLOCKED: IT Admin CANNOT access confidential candidate interview feedback
  total++;
  res = await testEndpoint('IT Admin -> GET /api/v1/interviews/1/feedback (Confidential Protection)', 'http://localhost:8080/api/v1/interviews/1/feedback', 'GET', itAdmin.token, 403);
  if (res.isMatch) passed++;

  // BLOCKED: IT Admin CANNOT transition employee lifecycle status
  total++;
  res = await testEndpoint('IT Admin -> POST /api/v1/employees/1/transition-status (HR Lifecycle)', 'http://localhost:8080/api/v1/employees/1/transition-status', 'POST', itAdmin.token, 403, {
    targetStatus: 'CONFIRMED',
    changeReason: 'IT Admin attempt'
  });
  if (res.isMatch) passed++;

  // IT Admin viewing offers: compensation must be masked
  total++;
  res = await testEndpoint('IT Admin -> GET /api/v1/offers/1 (Compensation Masked)', 'http://localhost:8080/api/v1/offers/1', 'GET', itAdmin.token, 200);
  if (res.isMatch) {
    const offerData = res.data?.data;
    if (offerData && offerData.compensationMasked === true && offerData.ctcTotal === null) {
      console.log('   -> Verified: IT Admin sees compensationMasked=true, ctcTotal=null');
      passed++;
    } else {
      console.log('   -> FAILED: Compensation not masked for IT Admin!');
    }
  }

  // IT Admin viewing employees: compensation must be null
  total++;
  res = await testEndpoint('IT Admin -> GET /api/v1/employees/1 (Compensation Protection)', 'http://localhost:8080/api/v1/employees/1', 'GET', itAdmin.token, 200);
  if (res.isMatch) {
    const empData = res.data?.data;
    if (empData && empData.ctcTotal === null && empData.canTransitionStatus === false) {
      console.log('   -> Verified: IT Admin sees emp ctcTotal=null, canTransitionStatus=false');
      passed++;
    } else {
      console.log('   -> FAILED: Employee sensitive info not protected for IT Admin!');
    }
  }


  // 2. HR ADMIN TESTS
  console.log('\n--- 2. HR ADMIN TESTS (hradmin@company.com) ---');
  const hrAdmin = await login('hradmin@company.com', 'password');
  console.log(`Logged in as: ${hrAdmin.user.name} (${hrAdmin.user.roles.join(', ')})`);

  // BLOCKED: HR Admin CANNOT access Backups
  total++;
  res = await testEndpoint('HR Admin -> GET /api/v1/admin/backups (Disaster Recovery Blocked)', 'http://localhost:8080/api/v1/admin/backups', 'GET', hrAdmin.token, 403);
  if (res.isMatch) passed++;

  // BLOCKED: HR Admin CANNOT trigger Manual Backup
  total++;
  res = await testEndpoint('HR Admin -> POST /api/v1/admin/backups/manual (Trigger Backup Blocked)', 'http://localhost:8080/api/v1/admin/backups/manual', 'POST', hrAdmin.token, 403);
  if (res.isMatch) passed++;

  // BLOCKED: HR Admin CANNOT access Access Policies
  total++;
  res = await testEndpoint('HR Admin -> GET /api/v1/admin/policies (Security Policy Blocked)', 'http://localhost:8080/api/v1/admin/policies', 'GET', hrAdmin.token, 403);
  if (res.isMatch) passed++;

  // BLOCKED: HR Admin CANNOT update Access Policy
  total++;
  res = await testEndpoint('HR Admin -> PUT /api/v1/admin/policies/it_admin_candidate_access', 'http://localhost:8080/api/v1/admin/policies/it_admin_candidate_access', 'PUT', hrAdmin.token, 403, {
    policyValue: 'true'
  });
  if (res.isMatch) passed++;

  // HR Admin CAN access HR-scoped Audit Logs
  total++;
  res = await testEndpoint('HR Admin -> GET /api/v1/admin/audit-logs (Scoped HR logs)', 'http://localhost:8080/api/v1/admin/audit-logs', 'GET', hrAdmin.token, 200);
  if (res.isMatch) {
    const logs = res.data?.data?.content || [];
    const hrEntities = ['RECRUITMENT_TASK', 'CANDIDATE', 'INTERVIEW', 'OFFER', 'EMPLOYEE', 'REQUISITION', 'APPROVAL'];
    const nonHrLogs = logs.filter(l => !hrEntities.includes((l.entityType || '').toUpperCase()));
    if (nonHrLogs.length === 0) {
      console.log(`   -> Verified: All ${logs.length} returned logs are strictly HR entity types.`);
      passed++;
    } else {
      console.log(`   -> FAILED: Leak of system entity types to HR Admin: ${nonHrLogs.map(l => l.entityType).join(', ')}`);
    }
  }

  // HR Admin CAN view candidates
  total++;
  res = await testEndpoint('HR Admin -> GET /api/v1/candidates', 'http://localhost:8080/api/v1/candidates', 'GET', hrAdmin.token, 200);
  if (res.isMatch) passed++;

  // HR Admin CAN view offers with full compensation
  total++;
  res = await testEndpoint('HR Admin -> GET /api/v1/offers/1 (Full Compensation View)', 'http://localhost:8080/api/v1/offers/1', 'GET', hrAdmin.token, 200);
  if (res.isMatch) {
    const offerData = res.data?.data;
    if (offerData && offerData.compensationMasked === false && offerData.ctcTotal !== null) {
      console.log(`   -> Verified: HR Admin sees full compensation: ₹${offerData.ctcTotal}`);
      passed++;
    } else {
      console.log('   -> FAILED: HR Admin should have full compensation access');
    }
  }

  // HR Admin CAN view employees with sensitive info
  total++;
  res = await testEndpoint('HR Admin -> GET /api/v1/employees/1 (Full HR Employee Scope)', 'http://localhost:8080/api/v1/employees/1', 'GET', hrAdmin.token, 200);
  if (res.isMatch) {
    const empData = res.data?.data;
    if (empData && empData.canViewSensitiveInfo === true && empData.canTransitionStatus === true) {
      console.log('   -> Verified: HR Admin can view sensitive employee info & transition status');
      passed++;
    } else {
      console.log('   -> FAILED: HR Admin missing employee management rights');
    }
  }


  // 3. RECRUITER TESTS
  console.log('\n--- 3. RECRUITER TESTS (anita.recruiter@company.com) ---');
  const recruiter = await login('anita.recruiter@company.com', 'password');
  console.log(`Logged in as: ${recruiter.user.name} (${recruiter.user.roles.join(', ')})`);

  // BLOCKED: Recruiter CANNOT access backups
  total++;
  res = await testEndpoint('Recruiter -> GET /api/v1/admin/backups', 'http://localhost:8080/api/v1/admin/backups', 'GET', recruiter.token, 403);
  if (res.isMatch) passed++;

  // BLOCKED: Recruiter CANNOT access system audit logs
  total++;
  res = await testEndpoint('Recruiter -> GET /api/v1/admin/audit-logs', 'http://localhost:8080/api/v1/admin/audit-logs', 'GET', recruiter.token, 403);
  if (res.isMatch) passed++;

  // Recruiter CAN view assigned requisitions
  total++;
  res = await testEndpoint('Recruiter -> GET /api/v1/requisitions', 'http://localhost:8080/api/v1/requisitions', 'GET', recruiter.token, 200);
  if (res.isMatch) passed++;


  // 4. INTERVIEWER TESTS
  console.log('\n--- 4. INTERVIEWER TESTS (arjun.tech@company.com) ---');
  const interviewer = await login('arjun.tech@company.com', 'password');
  console.log(`Logged in as: ${interviewer.user.name} (${interviewer.user.roles.join(', ')})`);

  // BLOCKED: Interviewer CANNOT access admin backups
  total++;
  res = await testEndpoint('Interviewer -> GET /api/v1/admin/backups', 'http://localhost:8080/api/v1/admin/backups', 'GET', interviewer.token, 403);
  if (res.isMatch) passed++;

  // BLOCKED: Interviewer CANNOT access admin audit logs
  total++;
  res = await testEndpoint('Interviewer -> GET /api/v1/admin/audit-logs', 'http://localhost:8080/api/v1/admin/audit-logs', 'GET', interviewer.token, 403);
  if (res.isMatch) passed++;

  // Interviewer CAN view assigned interview
  total++;
  res = await testEndpoint('Interviewer -> GET /api/v1/interviews/1 (Assigned Round)', 'http://localhost:8080/api/v1/interviews/1', 'GET', interviewer.token, 200);
  if (res.isMatch) passed++;

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} / ${total} CHECKS PASSED`);
  console.log('================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
