/**
 * @fileoverview TestResultsParser
 * @description Parses test results from Node.js and Playwright test runs,
 * assigns stable IDs, and normalizes them for the Test Dashboard UI.
 * @license GPL-3.0-or-later
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const CATEGORY_PREFIXES = {
  'unit-tests': 'UT',
  'integration-tests': 'IT',
  'contract-tests': 'CT',
  'ui-tests': 'UI',
};

const CATEGORY_PATTERNS = {
  'test/lib/': 'unit-tests',
  'test/integration/': 'integration-tests',
  'test/contracts/': 'contract-tests',
  'ui-tests/': 'ui-tests',
};

/**
 * Service for parsing and normalizing test results from various sources.
 */
class TestResultsParser {
  /**
   * @param {Object} deps
   * @param {import('../logger')} deps.logger
   * @param {string} [deps.resultsDir] - Directory containing test result JSON files
   * @param {string} [deps.registryPath] - Path to test ID registry file
   */
  constructor({ logger, resultsDir = null, registryPath = null }) {
    this.logger = logger || require('../logger');
    this.resultsDir =
      resultsDir || path.join(process.cwd(), 'data', 'test-results');
    this.registryPath =
      registryPath || path.join(process.cwd(), 'data', 'test-registry.json');
    this.registry = null;
  }

  /**
   * Parse all available test results and return normalized test entries.
   * @returns {Promise<Array<Object>>}
   */
  async parse() {
    try {
      await this.#loadRegistry();
      const results = [];

      // Parse Node.js test results
      const nodeTests = await this.#parseNodeTests();
      results.push(...nodeTests);

      // Parse Playwright test results
      const playwrightTests = await this.#parsePlaywrightTests();
      results.push(...playwrightTests);

      // Save registry if it was modified
      await this.#saveRegistry();

      this.logger.debug('[TestResultsParser] Parsed test results', {
        total: results.length,
        node: nodeTests.length,
        playwright: playwrightTests.length,
      });

      return results;
    } catch (error) {
      this.logger.warn('[TestResultsParser] Failed to parse test results', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Load the test ID registry from disk.
   * @private
   */
  async #loadRegistry() {
    try {
      const content = await fs.readFile(this.registryPath, 'utf8');
      this.registry = JSON.parse(content);
      this.logger.debug('[TestResultsParser] Loaded test registry', {
        entries: Object.keys(this.registry.tests || {}).length,
      });
    } catch {
      // Registry doesn't exist yet, create empty one
      this.logger.debug('[TestResultsParser] Creating new test registry');
      this.registry = {
        version: 1,
        tests: {},
        counters: {
          'unit-tests': 0,
          'integration-tests': 0,
          'contract-tests': 0,
          'ui-tests': 0,
        },
      };
    }
  }

  /**
   * Save the test ID registry to disk.
   * @private
   */
  async #saveRegistry() {
    try {
      const dir = path.dirname(this.registryPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this.registryPath,
        JSON.stringify(this.registry, null, 2),
        'utf8'
      );
      this.logger.debug('[TestResultsParser] Saved test registry');
    } catch (error) {
      this.logger.warn('[TestResultsParser] Failed to save test registry', {
        error: error.message,
      });
    }
  }

  /**
   * Get or create a stable test ID for a given test.
   * @private
   * @param {string} filePath - Test file path
   * @param {string} testName - Test name/title
   * @param {string} category - Test category
   * @returns {string} Test ID (e.g., "UT-42")
   */
  #getTestId(filePath, testName, category) {
    // Create a stable hash from file path and test name
    const hash = crypto
      .createHash('sha256')
      .update(`${filePath}::${testName}`)
      .digest('hex')
      .substring(0, 16);

    // Check if we already have an ID for this test
    if (this.registry.tests[hash]) {
      return this.registry.tests[hash];
    }

    // Generate new ID
    const prefix = CATEGORY_PREFIXES[category] || 'UT';
    this.registry.counters[category] =
      (this.registry.counters[category] || 0) + 1;
    const id = `${prefix}-${this.registry.counters[category]}`;

    // Store in registry
    this.registry.tests[hash] = id;

    return id;
  }

  /**
   * Determine test category from file path.
   * @private
   * @param {string} filePath
   * @returns {string}
   */
  #getCategoryFromPath(filePath) {
    for (const [pattern, category] of Object.entries(CATEGORY_PATTERNS)) {
      if (filePath.includes(pattern)) {
        return category;
      }
    }
    return 'unit-tests'; // Default
  }

  /**
   * Parse Node.js test results from TAP/spec JSON output.
   * @private
   * @returns {Promise<Array<Object>>}
   */
  async #parseNodeTests() {
    const resultsPath = path.join(this.resultsDir, 'node-tests.json');

    try {
      const content = await fs.readFile(resultsPath, 'utf8');
      const data = JSON.parse(content);

      if (!data || !Array.isArray(data.tests)) {
        this.logger.debug('[TestResultsParser] No Node.js test results found');
        return [];
      }

      return data.tests.map((test) => {
        const category = this.#getCategoryFromPath(test.file || '');
        const testId = this.#getTestId(
          test.file || '',
          test.name || '',
          category
        );

        return {
          id: testId,
          name: test.name || 'Unnamed test',
          description: this.#formatNodeDescription(test),
          category,
          type: 'automated',
          runnable: false,
          latest: {
            status: this.#normalizeStatus(test.status),
            message: test.error
              ? `Failed: ${test.error.message || 'Unknown error'}`
              : `Passed in ${test.duration || 0}ms`,
            details: {
              filePath: test.file || '',
              ancestorTitles: test.suite ? [test.suite] : [],
              error: test.error || null,
            },
            durationMs: test.duration || 0,
            lastRun: data.timestamp || new Date().toISOString(),
          },
        };
      });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.warn(
          '[TestResultsParser] Failed to parse Node.js results',
          {
            error: error.message,
          }
        );
      }
      return [];
    }
  }

  /**
   * Parse Playwright test results from JSON reporter output.
   * @private
   * @returns {Promise<Array<Object>>}
   */
  async #parsePlaywrightTests() {
    const resultsPath = path.join(this.resultsDir, 'playwright-tests.json');

    try {
      const content = await fs.readFile(resultsPath, 'utf8');
      const data = JSON.parse(content);

      if (!data || !Array.isArray(data.suites)) {
        this.logger.debug(
          '[TestResultsParser] No Playwright test results found'
        );
        return [];
      }

      const tests = [];
      this.#extractPlaywrightTests(data.suites, tests);

      return tests.map((test) => {
        const category = 'ui-tests';
        const testId = this.#getTestId(
          test.file || '',
          test.title || '',
          category
        );

        return {
          id: testId,
          name: test.title || 'Unnamed test',
          description: this.#formatPlaywrightDescription(test),
          category,
          type: 'automated',
          runnable: false,
          latest: {
            status: this.#normalizePlaywrightStatus(test.status),
            message: test.error
              ? `Failed: ${test.error}`
              : `Passed in ${test.duration || 0}ms`,
            details: {
              filePath: test.file || '',
              ancestorTitles: test.ancestorTitles || [],
              error: test.error || null,
            },
            durationMs: test.duration || 0,
            lastRun: new Date().toISOString(),
          },
        };
      });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.warn(
          '[TestResultsParser] Failed to parse Playwright results',
          {
            error: error.message,
          }
        );
      }
      return [];
    }
  }

  /**
   * Recursively extract tests from Playwright suite structure.
   * @private
   * @param {Array} suites
   * @param {Array} tests
   * @param {Array} ancestorTitles
   */
  #extractPlaywrightTests(suites, tests, ancestorTitles = []) {
    for (const suite of suites) {
      const titles = [...ancestorTitles];
      if (suite.title) {
        titles.push(suite.title);
      }

      if (Array.isArray(suite.specs)) {
        for (const spec of suite.specs) {
          if (Array.isArray(spec.tests)) {
            for (const test of spec.tests) {
              tests.push({
                title: spec.title,
                file: suite.file || '',
                ancestorTitles: titles,
                status: test.status,
                duration: test.results?.[0]?.duration || 0,
                error: test.results?.[0]?.error?.message || null,
              });
            }
          }
        }
      }

      if (Array.isArray(suite.suites)) {
        this.#extractPlaywrightTests(suite.suites, tests, titles);
      }
    }
  }

  /**
   * Normalize test status to green/yellow/red.
   * @private
   * @param {string} status
   * @returns {string}
   */
  #normalizeStatus(status) {
    const normalized = (status || '').toLowerCase();
    if (
      normalized === 'pass' ||
      normalized === 'passed' ||
      normalized === 'ok'
    ) {
      return 'green';
    }
    if (
      normalized === 'skip' ||
      normalized === 'skipped' ||
      normalized === 'pending'
    ) {
      return 'yellow';
    }
    return 'red';
  }

  /**
   * Normalize Playwright status to green/yellow/red.
   * @private
   * @param {string} status
   * @returns {string}
   */
  #normalizePlaywrightStatus(status) {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'passed' || normalized === 'expected') {
      return 'green';
    }
    if (normalized === 'skipped') {
      return 'yellow';
    }
    return 'red';
  }

  /**
   * Format Node.js test description with file path and suite.
   * @private
   * @param {Object} test
   * @returns {string}
   */
  #formatNodeDescription(test) {
    const parts = [];
    if (test.suite) {
      parts.push(test.suite);
    }
    if (test.file) {
      const relativePath = test.file.replace(process.cwd() + '/', '');
      parts.push(relativePath);
    }
    return parts.join(' › ') || 'Automated test';
  }

  /**
   * Format Playwright test description with file path and suite hierarchy.
   * @private
   * @param {Object} test
   * @returns {string}
   */
  #formatPlaywrightDescription(test) {
    const parts = [];
    if (test.ancestorTitles && test.ancestorTitles.length > 0) {
      parts.push(test.ancestorTitles.join(' › '));
    }
    if (test.file) {
      const relativePath = test.file.replace(process.cwd() + '/', '');
      parts.push(relativePath);
    }
    return parts.join(' • ') || 'Automated test';
  }
}

module.exports = TestResultsParser;
