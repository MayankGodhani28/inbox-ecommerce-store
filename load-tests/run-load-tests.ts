/**
 * ─────────────────────────────────────────────────────
 *  Load Test Runner Script
 *  File: load-tests/run-load-tests.ts
 *
 *  Usage:
 *    npx tsx load-tests/run-load-tests.ts          (runs quick test)
 *    npx tsx load-tests/run-load-tests.ts --all    (runs all tests)
 *    npx tsx load-tests/run-load-tests.ts --stress (runs stress test)
 *    npx tsx load-tests/run-load-tests.ts --spike  (runs spike test)
 * ─────────────────────────────────────────────────────
 */

import { execSync, spawn } from 'child_process';
import path from 'path';

const LOAD_TEST_DIR = path.resolve('./load-tests');
const REPORTS_DIR  = path.resolve('./load-tests/reports');

const TESTS = {
  normal:    '01-normal-load.yml',
  stress:    '02-stress-test.yml',
  spike:     '03-spike-test.yml',
  soak:      '04-soak-test.yml',
  endpoints: '05-api-endpoints.yml',
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
║     Powered by Artillery                         ║
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

function runTest(testFile: string, reportName: string): Promise<number> {
  return new Promise((resolve) => {
    const reportPath = `${REPORTS_DIR}/${reportName}.json`;
    const htmlReport = `${REPORTS_DIR}/${reportName}.html`;

    // Ensure reports directory exists
    try { execSync(`mkdir -p "${REPORTS_DIR}"`); } catch { /* already exists */ }

    console.log(`${c.yellow}⏳ Running: ${testFile}${c.reset}`);
    console.log(`${c.yellow}   Report:  ${htmlReport}${c.reset}\n`);

    const child = spawn(
      'npx',
      ['artillery', 'run', '--output', reportPath, path.join(LOAD_TEST_DIR, testFile)],
      { stdio: 'inherit', shell: true }
    );

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${c.green}✅ PASSED: ${testFile}${c.reset}`);
        // Generate HTML report
        try {
          execSync(`npx artillery report --output "${htmlReport}" "${reportPath}"`, { stdio: 'ignore' });
          console.log(`${c.green}   📊 HTML Report: ${htmlReport}${c.reset}`);
        } catch { /* HTML report generation is optional */ }
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
    // Run every test in sequence
    separator('Running All Load Tests');
    for (const [name, file] of Object.entries(TESTS)) {
      results[name] = await runTest(file, name);
    }
  } else if (runStress) {
    separator('Stress Test');
    results.stress = await runTest(TESTS.stress, 'stress');
  } else if (runSpike) {
    separator('Spike Test (Flash Sale Simulation)');
    results.spike = await runTest(TESTS.spike, 'spike');
  } else if (runSoak) {
    separator('Soak Test (Memory Leak Detection — 10 min)');
    results.soak = await runTest(TESTS.soak, 'soak');
  } else if (runEndpts) {
    separator('API Endpoints Benchmark');
    results.endpoints = await runTest(TESTS.endpoints, 'endpoints');
  } else {
    // Default: run normal load test
    separator('Normal Load Test (Default)');
    results.normal = await runTest(TESTS.normal, 'normal');
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

  console.log(`\n${c.bold}Reports saved to: ${REPORTS_DIR}/${c.reset}\n`);

  if (allPassed) {
    console.log(`${c.green}${c.bold}🎉 All load tests passed! Your server can handle the load.${c.reset}\n`);
  } else {
    console.log(`${c.red}${c.bold}⚠️  Some tests failed. Check the reports for details.${c.reset}\n`);
    process.exit(1);
  }
}

main();
