/**
 * Vitest configuration for inBox E-commerce Testing Suite
 *
 * This configures all four test layers:
 *  - Unit tests (pure logic)
 *  - Integration tests (service + mock API)
 *  - Component tests (React rendering)
 *  - Security tests (validation & rate limiting)
 *  - Regression tests (bug prevention)
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  test: {
    // Use jsdom to simulate browser environment for React components
    environment: 'jsdom',

    // Automatically imports common matchers
    globals: true,

    // Run this file before all tests (adds jest-dom matchers)
    setupFiles: ['./src/tests/setup.ts'],

    // Test file patterns — covers all our layers
    include: [
      'src/tests/**/*.test.ts',
      'src/tests/**/*.test.tsx',
    ],

    // Coverage settings (what gets reported)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/services/**', 'src/context/**'],
      exclude: ['node_modules', 'src/tests'],
      thresholds: {
        // Company standard: at least 70% lines covered
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },

    // Friendly reporter so test output is easy to read
    reporter: 'verbose',
  },
});
