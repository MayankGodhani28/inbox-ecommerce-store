/**
 * ─────────────────────────────────────────────────────
 *  Grafana k6 Load Test Runner Script
 *  File: load-tests/run-load-tests.ts
 *
 *  Usage:
 *    npx tsx load-tests/run-load-tests.ts            (runs normal load test)
 *    npx tsx load-tests/run-load-tests.ts --spike    (runs 500-VU flash sale spike)
 *    npx tsx load-tests/run-load-tests.ts --stress   (runs stress capacity test)
 *    npx tsx load-tests/run-load-tests.ts --soak     (runs soak endurance test)
 *    npx tsx load-tests/run-load-tests.ts --endpoints(runs individual endpoint benchmark)
 *    npx tsx load-tests/run-load-tests.ts --all      (runs all k6 test suites in sequence)
 * ─────────────────────────────────────────────────────
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const LOAD_TEST_DIR = path.resolve('./load-tests');

// Locate local k6 executable or system binary
function getK6Path(): string {
  const localWindowsK6 = path.resolve('./tools/k6.exe');
  if (process.platform === 'win32' && fs.existsSync(localWindowsK6)) {
    return localWindowsK6;
  }
  return 'k6';
}

const TESTS: Record<string, string> = {
  normal:    'k6-normal-load.js',
  spike:     'k6-spike-test.js',
  stress:    'k6-stress-test.js',
  endpoints: 'k6-endpoints.js',
  soak:      'k6-soak-test.js',
};

// ANSI colours for terminal output
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
};

function banner() {
  console.log(`
${c.cyan}${c.bold}╔══════════════════════════════════════════════════╗
║     inBox E-Commerce — Load Testing Suite        ║
║     Powered by Grafana k6 (High-Concurrency)     ║
╚══════════════════════════════════════════════════╝${c.reset}
`);
}

function separator(title: string) {
  console.log(`\n${c.blue}${c.bold}── ${title} ${'─'.repeat(50 - title.length)}${c.reset}\n`);
}

function checkServerRunning(): boolean {
  try {
    execSync('curl -s http://localhost:4000/api/health --max-time 3', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runTest(testFile: string): Promise<number> {
  return new Promise((resolve) => {
    const k6Bin = getK6Path();
    const scriptPath = path.join(LOAD_TEST_DIR, testFile);

    console.log(`${c.yellow}⏳ Running k6 test: ${testFile}${c.reset}`);
    console.log(`${c.yellow}   Using binary:    ${k6Bin}${c.reset}\n`);

    const child = spawn(k6Bin, ['run', scriptPath], {
      stdio: 'inherit',
      shell: false,
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${c.green}✅ PASSED: ${testFile}${c.reset}`);
      } else {
        console.log(`\n${c.red}❌ FAILED: ${testFile} (exit code: ${code})${c.reset}`);
      }
      resolve(code ?? 1);
    });
  });
}

async function main() {
  banner();

  // ── 1. Check server is running ──
  separator('Pre-flight Check');
  console.log('Checking if your backend server is running at http://localhost:4000 ...');

  if (!checkServerRunning()) {
    console.log(`
${c.red}${c.bold}❌ ERROR: Server is NOT running!${c.reset}

Before running load tests, you need to start your backend:

  ${c.cyan}npm run server:dev${c.reset}   ← in a separate terminal

Then re-run this script.
`);
    process.exit(1);
  }

  console.log(`${c.green}✅ Server is running at http://localhost:4000${c.reset}`);

  // ── 2. Parse arguments ──
  const args = process.argv.slice(2);
  const runAll    = args.includes('--all');
  const runStress = args.includes('--stress');
  const runSpike  = args.includes('--spike');
  const runSoak   = args.includes('--soak');
  const runEndpts = args.includes('--endpoints');

  const results: Record<string, number> = {};

  if (runAll) {
    separator('Running All k6 Load Tests');
    for (const [name, file] of Object.entries(TESTS)) {
      results[name] = await runTest(file);
    }
  } else if (runStress) {
    separator('k6 Stress Test (Capacity Limits)');
    results.stress = await runTest(TESTS.stress);
  } else if (runSpike) {
    separator('k6 Spike Test (500-VU Flash Sale)');
    results.spike = await runTest(TESTS.spike);
  } else if (runSoak) {
    separator('k6 Soak Test (Memory Leak & Endurance)');
    results.soak = await runTest(TESTS.soak);
  } else if (runEndpts) {
    separator('k6 Endpoints Benchmark');
    results.endpoints = await runTest(TESTS.endpoints);
  } else {
    separator('k6 Normal Load Test (Default)');
    results.normal = await runTest(TESTS.normal);
  }

  // ── 3. Summary ──
  separator('Results Summary');
  let allPassed = true;
  for (const [name, code] of Object.entries(results)) {
    const status = code === 0
      ? `${c.green}✅ PASSED${c.reset}`
      : `${c.red}❌ FAILED${c.reset}`;
    console.log(`  ${name.padEnd(15)} ${status}`);
    if (code !== 0) allPassed = false;
  }

  if (allPassed) {
    console.log(`\n${c.green}${c.bold}🎉 All k6 tests passed! Server meets enterprise performance standards.${c.reset}\n`);
  } else {
    console.log(`\n${c.red}${c.bold}⚠️  Some tests failed or exceeded thresholds.${c.reset}\n`);
    process.exit(1);
  }
}

main();
