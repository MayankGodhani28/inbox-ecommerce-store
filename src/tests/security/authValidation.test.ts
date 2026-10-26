/**
 * ─────────────────────────────────────────────────────
 *  LAYER 4: SECURITY & VALIDATION TESTS
 *  File: src/tests/security/authValidation.test.ts
 *
 *  What companies test here:
 *   ✅ Rate limiting logic
 *   ✅ Input sanitization / injection prevention
 *   ✅ Password policy enforcement
 *   ✅ Authorization: can User A access User B's data?
 *   ✅ Privilege escalation prevention
 * ─────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── Extracted pure validation/sanitization logic from auth module ──
// These are the same functions that run inside authRoutes.ts

function validateEmail(email: unknown): { valid: boolean; clean?: string; error?: string } {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!clean || !emailRegex.test(clean)) {
    return { valid: false, error: 'A valid email address is required' };
  }
  return { valid: true, clean };
}

function validatePassword(password: unknown): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
}

function validateName(name: unknown): { valid: boolean; clean?: string; error?: string } {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  return { valid: true, clean: name.trim() };
}

// Rate limiter (replicates server logic)
interface AttemptRecord { count: number; resetAt: number }
class RateLimiter {
  private store = new Map<string, AttemptRecord>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; remainingSec: number } {
    const now = Date.now();
    const record = this.store.get(key);
    if (!record || now > record.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remainingSec: 0 };
    }
    if (record.count >= this.maxAttempts) {
      return { allowed: false, remainingSec: Math.ceil((record.resetAt - now) / 1000) };
    }
    record.count += 1;
    return { allowed: true, remainingSec: 0 };
  }

  clear(key: string) { this.store.delete(key); }
  reset() { this.store.clear(); }
}

// ═══════════════════════════════════════════════════════
//  TEST SUITE 1: Email Validation Security
// ═══════════════════════════════════════════════════════
describe('validateEmail — Security & Input Tests', () => {
  it('should accept a valid email address', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
  });

  it('should lowercase and trim the email before validating', () => {
    const result = validateEmail('  USER@EXAMPLE.COM  ');
    expect(result.valid).toBe(true);
    expect(result.clean).toBe('user@example.com');
  });

  it('should reject email without @ symbol (injection attempt)', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
    expect(validateEmail('notanemail').error).toBeTruthy();
  });

  it('should reject SQL injection strings that contain spaces / invalid chars', () => {
    // "admin' OR '1'='1" — contains spaces and no valid domain, fails email format
    expect(validateEmail("admin' OR '1'='1").valid).toBe(false);
    // Semicolon-based injection attempt — missing @ and domain
    expect(validateEmail("'; DROP TABLE users; --").valid).toBe(false);
  });

  it('should reject XSS attempts passed as email', () => {
    // Script tags — clearly not a valid email address
    expect(validateEmail('<script>alert(1)</script>').valid).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validateEmail('').valid).toBe(false);
  });

  it('should reject non-string types (e.g., object or array sent from API)', () => {
    expect(validateEmail(null).valid).toBe(false);
    expect(validateEmail(undefined).valid).toBe(false);
    expect(validateEmail(12345).valid).toBe(false);
    expect(validateEmail({ email: 'test@test.com' }).valid).toBe(false);
  });

  it('should reject email missing domain extension', () => {
    expect(validateEmail('user@domain').valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 2: Password Policy Enforcement
// ═══════════════════════════════════════════════════════
describe('validatePassword — Security Tests', () => {
  it('should accept a password of 8 or more characters', () => {
    expect(validatePassword('SecureP@ss1').valid).toBe(true);
    expect(validatePassword('12345678').valid).toBe(true);
  });

  it('should reject a 7-character password (1 below minimum)', () => {
    const result = validatePassword('1234567');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('8 characters');
  });

  it('should reject an empty password', () => {
    expect(validatePassword('').valid).toBe(false);
  });

  it('should reject non-string password types from malformed API bodies', () => {
    expect(validatePassword(123456).valid).toBe(false);
    expect(validatePassword(null).valid).toBe(false);
    expect(validatePassword(['password']).valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 3: Name Input Validation
// ═══════════════════════════════════════════════════════
describe('validateName — Security Tests', () => {
  it('should accept a normal name', () => {
    const result = validateName('Mayank Godhani');
    expect(result.valid).toBe(true);
    expect(result.clean).toBe('Mayank Godhani');
  });

  it('should trim whitespace from names', () => {
    const result = validateName('  Arti  ');
    expect(result.valid).toBe(true);
    expect(result.clean).toBe('Arti');
  });

  it('should reject empty or whitespace-only name', () => {
    expect(validateName('').valid).toBe(false);
    expect(validateName('   ').valid).toBe(false);
    expect(validateName(null).valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 4: Login Rate Limiter
//  (Brute Force Protection)
// ═══════════════════════════════════════════════════════
describe('RateLimiter — Security Tests (Brute Force Prevention)', () => {
  let limiter: RateLimiter;
  const testKey = '192.168.1.1:attacker@evil.com';

  beforeEach(() => {
    limiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 min
  });

  it('should allow the first attempt', () => {
    expect(limiter.check(testKey).allowed).toBe(true);
  });

  it('should allow attempts 1 through 5', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(limiter.check(testKey).allowed).toBe(true);
    }
  });

  it('should BLOCK the 6th attempt (over limit)', () => {
    for (let i = 0; i < 5; i += 1) limiter.check(testKey);
    const result = limiter.check(testKey);
    expect(result.allowed).toBe(false);
    expect(result.remainingSec).toBeGreaterThan(0);
  });

  it('should provide remaining seconds before unlock', () => {
    for (let i = 0; i < 5; i += 1) limiter.check(testKey);
    const result = limiter.check(testKey);
    // Should be close to 15 minutes (900 seconds)
    expect(result.remainingSec).toBeGreaterThan(800);
    expect(result.remainingSec).toBeLessThanOrEqual(900);
  });

  it('should reset the limit for a different key (different user/IP)', () => {
    const differentUser = '192.168.1.1:legit@inbox.com';
    // Exhaust the attacker key
    for (let i = 0; i < 5; i += 1) limiter.check(testKey);
    limiter.check(testKey); // blocked

    // Different user must NOT be affected
    expect(limiter.check(differentUser).allowed).toBe(true);
  });

  it('should clear the rate limit after a successful login', () => {
    for (let i = 0; i < 4; i += 1) limiter.check(testKey); // 4 failed attempts
    limiter.clear(testKey); // successful login clears record

    // First attempt after clearing should be allowed
    expect(limiter.check(testKey).allowed).toBe(true);
  });
});
