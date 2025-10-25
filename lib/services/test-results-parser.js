'use strict';

const fs = require('node:fs');
const path = require('node:path');

class TestResultsParser {
  constructor({
    logger,
    resultsPath = path.join(process.cwd(), 'coverage', 'test-results.json'),
  } = {}) {
    this.logger = logger || require('../logger');
    this.resultsPath = resultsPath;
  }

  async parse() {
    const exists = await this.#fileExists(this.resultsPath);
    if (!exists) {
      return [];
    }

    try {
      const data = await fs.promises.readFile(this.resultsPath, 'utf8');
      if (!data) {
        return [];
      }

      const json = JSON.parse(data);
      const timestamp = json?.startTime
        ? new Date(json.startTime).toISOString()
        : new Date().toISOString();

      const tests = json?.testResults?.flatMap((suite) => {
        if (!suite?.assertionResults) {
          return [];
        }

        return suite.assertionResults.map((assertion, index) =>
          this.#formatTest(assertion, suite, index, timestamp)
        );
      });

      return Array.isArray(tests) ? tests : [];
    } catch (error) {
      this.logger?.warn?.('[TEST_RESULTS] Failed to parse Jest results', {
        error: error?.message,
      });
      return [];
    }
  }

  async #fileExists(filePath) {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  #formatTest(assertion, suite, index, timestamp) {
    const status =
      assertion?.status === 'passed'
        ? 'green'
        : assertion?.status === 'pending'
          ? 'yellow'
          : 'red';
    const filePath = suite?.name || assertion?.location?.file;
    const category = this.#deriveCategory(filePath);

    return {
      id: this.#buildTestId(category, index, assertion?.title),
      name: assertion?.title || 'Unnamed test',
      description: this.#buildDescription(assertion, suite, filePath),
      category,
      type: 'automated',
      runnable: false,
      latest: {
        status,
        message: assertion?.failureMessages?.[0]
          ? this.#extractFailureSummary(assertion.failureMessages[0])
          : assertion?.status === 'pending'
            ? 'Pending'
            : 'Passed',
        details: {
          ancestorTitles: assertion?.ancestorTitles || [],
          failureMessages: assertion?.failureMessages || [],
          filePath,
        },
        lastRun: timestamp,
        durationMs: assertion?.duration ?? suite?.perfStats?.runtime ?? null,
      },
    };
  }

  #buildTestId(category, index, title) {
    const prefix = (category || 'unit').slice(0, 3).toUpperCase();
    const hash = this.#hashString(title || `${category}-${index}`);
    return `${prefix}-${hash.slice(0, 6)}`;
  }

  #hashString(input) {
    if (!input) {
      return '00000000';
    }

    let hash = 0;
    const str = String(input);
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    return `0000000${(hash >>> 0).toString(16)}`.slice(-8);
  }

  #buildDescription(assertion, suite, filePath) {
    const parts = [];
    if (
      Array.isArray(assertion?.ancestorTitles) &&
      assertion.ancestorTitles.length > 0
    ) {
      parts.push(assertion.ancestorTitles.join(' › '));
    }
    if (filePath) {
      parts.push(`File: ${path.relative(process.cwd(), filePath)}`);
    }
    return parts.join(' • ') || 'Automated test';
  }

  #deriveCategory(filePath = '') {
    const normalised = filePath.replace(/\\/g, '/');

    if (normalised.includes('/test/integration/')) {
      return 'integration-tests';
    }
    if (normalised.includes('/test/contracts/')) {
      return 'contract-tests';
    }
    return 'unit-tests';
  }

  #extractFailureSummary(message) {
    if (typeof message !== 'string') {
      return 'Test failed';
    }

    const clean = this.#stripAnsiSequences(message).split('\n');
    return (
      clean.find((line) => line && !line.startsWith('at ')) || 'Test failed'
    );
  }

  #stripAnsiSequences(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return text;
    }

    let result = '';
    let index = 0;

    const isAnsiParameter = (char) =>
      (char >= '0' && char <= '9') || char === ';';

    while (index < text.length) {
      const char = text[index];

      if (char === '\u001B' && text[index + 1] === '[') {
        let cursor = index + 2;

        while (cursor < text.length && isAnsiParameter(text[cursor])) {
          cursor += 1;
        }

        if (cursor < text.length && text[cursor] === 'm') {
          index = cursor + 1;
          continue;
        }
      }

      result += char;
      index += 1;
    }

    return result;
  }
}

module.exports = TestResultsParser;
