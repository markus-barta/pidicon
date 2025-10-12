#!/usr/bin/env node
/**
 * @fileoverview Scene Logging Audit Tool
 * @description Scans all scene files and reports their logging usage
 */

const fs = require('fs');
const path = require('path');

const scenesDir = path.join(__dirname, '../scenes');
const reportPath = path.join(__dirname, '../docs/SCENE_LOGGING_AUDIT.md');

// Logging levels to check for
const LOG_LEVELS = ['debug', 'info', 'warning', 'error'];

// Helper to recursively find all .js files
function findSceneFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && item !== 'node_modules' && item !== 'media') {
      findSceneFiles(fullPath, files);
    } else if (stat.isFile() && item.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Analyze a single scene file
function analyzeScene(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);

  const result = {
    path: relativePath,
    usesContextLog: false,
    usesLegacyLogger: false,
    logLevels: new Set(),
    logCalls: [],
  };

  // Check for context.log usage
  const contextLogRegex =
    /(?:context\.)?log\?\??\(['"`]([^'"`]+)['"`]\s*,\s*['"`](\w+)['"`]/g;
  let match;

  while ((match = contextLogRegex.exec(content)) !== null) {
    result.usesContextLog = true;
    const level = match[2];
    if (LOG_LEVELS.includes(level)) {
      result.logLevels.add(level);
    }
    result.logCalls.push({
      message: match[1].substring(0, 50) + (match[1].length > 50 ? '...' : ''),
      level: match[2],
    });
  }

  // Check for legacy logger usage
  const legacyLogRegex = /logger\.(debug|info|ok|warn|error)\(/g;
  while ((match = legacyLogRegex.exec(content)) !== null) {
    result.usesLegacyLogger = true;
  }

  return result;
}

// Generate markdown report
function generateReport(results) {
  let report = `# Scene Logging Audit Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Total Scenes:** ${results.length}\n\n`;

  report += `## Summary\n\n`;

  const withContextLog = results.filter((r) => r.usesContextLog).length;
  const withLegacyLogger = results.filter((r) => r.usesLegacyLogger).length;
  const compliant = results.filter(
    (r) => r.usesContextLog && !r.usesLegacyLogger,
  ).length;

  report += `- ✅ **Compliant scenes** (using context.log): ${compliant}/${results.length}\n`;
  report += `- ⚠️  **Scenes with legacy logger**: ${withLegacyLogger}\n`;
  report += `- 📊 **Scenes with context.log**: ${withContextLog}\n\n`;

  report += `## Logging Level Usage\n\n`;

  const levelCounts = {
    debug: 0,
    info: 0,
    warning: 0,
    error: 0,
  };

  for (const result of results) {
    for (const level of result.logLevels) {
      if (levelCounts[level] !== undefined) {
        levelCounts[level]++;
      }
    }
  }

  report += `| Level | Scenes Using |\n`;
  report += `|-------|-------------|\n`;
  for (const [level, count] of Object.entries(levelCounts)) {
    report += `| ${level} | ${count} |\n`;
  }
  report += `\n`;

  report += `## Scene Details\n\n`;

  for (const result of results) {
    const status =
      result.usesContextLog && !result.usesLegacyLogger
        ? '✅'
        : result.usesLegacyLogger
          ? '⚠️ '
          : '❓';

    report += `### ${status} \`${result.path}\`\n\n`;

    if (result.usesContextLog) {
      report += `**Logging Levels Used:** ${Array.from(result.logLevels).join(', ') || 'none'}\n\n`;

      if (result.logCalls.length > 0 && result.logCalls.length <= 10) {
        report += `**Log Calls:**\n`;
        for (const call of result.logCalls) {
          report += `- \`[${call.level}]\` ${call.message}\n`;
        }
        report += `\n`;
      } else if (result.logCalls.length > 10) {
        report += `**Log Calls:** ${result.logCalls.length} total (showing first 5)\n`;
        for (let i = 0; i < 5; i++) {
          const call = result.logCalls[i];
          report += `- \`[${call.level}]\` ${call.message}\n`;
        }
        report += `\n`;
      }
    } else {
      report += `**Status:** No context.log calls found\n\n`;
    }

    if (result.usesLegacyLogger) {
      report += `⚠️  **WARNING:** Scene uses legacy logger (logger.debug/info/warn/error) - should migrate to context.log()\n\n`;
    }
  }

  return report;
}

// Main execution
console.log('🔍 Scanning scenes for logging usage...\n');

const sceneFiles = findSceneFiles(scenesDir);
console.log(`Found ${sceneFiles.length} scene files\n`);

const results = sceneFiles.map(analyzeScene);

const report = generateReport(results);

fs.writeFileSync(reportPath, report, 'utf-8');

console.log(`✅ Report written to: ${reportPath}\n`);

// Print summary to console
const compliant = results.filter(
  (r) => r.usesContextLog && !r.usesLegacyLogger,
).length;
const withLegacy = results.filter((r) => r.usesLegacyLogger).length;

console.log(`Summary:`);
console.log(`  ✅ Compliant: ${compliant}/${results.length}`);
console.log(`  ⚠️  With legacy logger: ${withLegacy}`);

if (withLegacy > 0) {
  console.log(`\n⚠️  The following scenes need migration:`);
  for (const result of results) {
    if (result.usesLegacyLogger) {
      console.log(`  - ${result.path}`);
    }
  }
}
