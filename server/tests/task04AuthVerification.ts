import { csrfFetch } from './httpClient.js';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import type { Server } from 'http';

async function runAuthTests() {
  console.log('[Task 04 Verification] Starting authentication acceptance checks...');
  const app = createApp();

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  try {
    const testEmail = `auth_test_${Date.now()}@inbox.com`;
    const testPassword = 'SecurePassword123!';

    // 1. Invalid input registration (missing password, weak password, invalid email)
    const weakPassRes = await csrfFetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User', email: testEmail, password: '123' }),
    });
    if (weakPassRes.status !== 400) {
      throw new Error(`Expected 400 for weak password, got ${weakPassRes.status}`);
    }
    console.log('✓ Rejected weak password with HTTP 400.');

    // 2. Successful Registration
    const regRes = await csrfFetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Real Customer',
        email: testEmail,
        password: testPassword,
        phone: '+91 99999 88888',
        role: 'admin', // Tampering attempt: should be ignored!
      }),
    });
    if (regRes.status !== 201) {
      throw new Error(`Expected 201 on registration, got ${regRes.status}`);
    }
    const regData = (await regRes.json()) as any;
    if (regData.data.user.role !== 'customer') {
      throw new Error(`Role tampering vulnerability! Registered user received role: ${regData.data.user.role}`);
    }
    if ('passwordHash' in regData.data.user || 'tokenHash' in regData.data.user) {
      throw new Error('Sensitive credentials leaked in registration response!');
    }
    console.log('✓ Customer registration succeeded and role tampering was rejected (role is customer).');

    // Extract session cookie
    const setCookie = regRes.headers.get('set-cookie');
    if (!setCookie || !setCookie.includes('inbox_session_id')) {
      throw new Error('Session cookie not set in registration response!');
    }
    const sessionCookie = setCookie.split(';')[0];
    console.log('✓ HttpOnly session cookie received.');

    // 3. Duplicate email registration rejected
    const dupRes = await csrfFetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dupe', email: testEmail, password: testPassword }),
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 for duplicate email, got ${dupRes.status}`);
    }
    console.log('✓ Duplicate email registration rejected with HTTP 409.');

    // 4. Authenticated /api/auth/me request using session cookie
    const meRes = await csrfFetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    if (meRes.status !== 200) {
      throw new Error(`Expected 200 on /me, got ${meRes.status}`);
    }
    const meData = (await meRes.json()) as any;
    if (meData.data.user.email !== testEmail) {
      throw new Error(`Expected email ${testEmail}, got ${meData.data.user.email}`);
    }
    console.log('✓ GET /api/auth/me returned authenticated customer profile.');

    // 5. Unauthenticated request to /api/auth/me
    const unauthRes = await csrfFetch(`${baseUrl}/api/auth/me`);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated /me, got ${unauthRes.status}`);
    }
    console.log('✓ Unauthenticated request to /api/auth/me rejected with HTTP 401.');

    // 6. Invalid credentials login
    const badLoginRes = await csrfFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' }),
    });
    if (badLoginRes.status !== 401) {
      throw new Error(`Expected 401 for invalid password, got ${badLoginRes.status}`);
    }
    console.log('✓ Invalid password login rejected with HTTP 401.');

    // 7. Successful login
    const loginRes = await csrfFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    if (loginRes.status !== 200) {
      throw new Error(`Expected 200 for valid login, got ${loginRes.status}`);
    }
    const loginCookie = loginRes.headers.get('set-cookie')?.split(';')[0];
    if (!loginCookie) throw new Error('Missing session cookie on login');
    console.log('✓ Valid login succeeded with new session cookie.');

    // 8. Logout revokes session
    const logoutRes = await csrfFetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: loginCookie },
    });
    if (logoutRes.status !== 200) {
      throw new Error(`Expected 200 on logout, got ${logoutRes.status}`);
    }

    // After logout, previous session must be revoked
    const afterLogoutRes = await csrfFetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: loginCookie },
    });
    if (afterLogoutRes.status !== 401) {
      throw new Error(`Expected 401 on /me after logout, got ${afterLogoutRes.status}`);
    }
    console.log('✓ Logout successfully revoked session in database and rejected subsequent requests.');

    // 9. Admin login check
    const adminLoginRes = await csrfFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@inbox.com', password: 'AdminSecure2026!' }),
    });
    if (adminLoginRes.status !== 200) {
      throw new Error(`Admin login failed with status ${adminLoginRes.status}`);
    }
    const adminData = (await adminLoginRes.json()) as any;
    if (adminData.data.user.role !== 'admin') {
      throw new Error(`Expected admin role, got ${adminData.data.user.role}`);
    }
    console.log('✓ Admin login authenticated successfully with verified admin role.');

    // Clean up test user and sessions
    await prisma.session.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.delete({ where: { email: testEmail } });

    console.log('[Task 04 Verification] All authentication acceptance tests passed successfully!');
  } finally {
    server.close();
  }
}

runAuthTests()
  .catch((err) => {
    console.error('[Verification Failed]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
