/**
 * @fileoverview BMAD Sprint Status Display Scene
 * @description Displays BMAD sprint progress and workflow status on Pixoo 64
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

'use strict';
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^(render|init|cleanup)$" }] */

const fs = require('fs');
const path = require('path');

const SCENE_NAME = 'bmad-sprint-status';

// Color constants (RGBA format)
const COLORS = {
  // Status colors
  SPRINT_ACTIVE: [0, 255, 0, 255], // Green
  SPRINT_BLOCKED: [255, 0, 0, 255], // Red
  SPRINT_PLANNING: [0, 0, 255, 255], // Blue
  SPRINT_DONE: [136, 136, 136, 255], // Gray

  // UI colors
  BACKGROUND: [0, 0, 0, 255], // Black
  TEXT_PRIMARY: [255, 255, 255, 255], // White
  TEXT_SECONDARY: [170, 170, 170, 255], // Light gray
  PROGRESS_FILL: [0, 170, 255, 255], // Cyan
  PROGRESS_EMPTY: [51, 51, 51, 255], // Dark gray
  STORY_HIGHLIGHT: [0, 255, 255, 255], // Cyan
  DIVIDER: [64, 64, 64, 255], // Subtle gray
};

// Layout constants for 64x64 display
const LAYOUT = {
  STATUS_BAR: { y: 0, height: 8 },
  STORY_SECTION: { y: 10, height: 12 },
  WORKFLOW_SECTION: { y: 24, height: 18 },
  METRICS_SECTION: { y: 44, height: 18 },
};

// Workflow stage abbreviations
const WORKFLOW_STAGES = {
  'brainstorm-project': 'BRAINSTRM',
  'domain-research': 'RESEARCH',
  'product-brief': 'BRIEF',
  prd: 'PRD',
  architecture: 'ARCH',
  'sprint-planning': 'PLANNING',
  'dev-story': 'DEV',
  'code-review': 'REVIEW',
  'story-done': 'DONE',
  retrospective: 'RETRO',
};

/**
 * Initialize scene
 * @param {Object} context - Scene context
 */
async function init(context) {
  const { log } = context;
  log?.('🚀 BMAD Sprint Status scene initialized', 'debug');
}

/**
 * Cleanup scene
 * @param {Object} context - Scene context
 */
async function cleanup(context) {
  const { log } = context;
  log?.('🧹 BMAD Sprint Status scene cleaned up', 'debug');
}

/**
 * Load and parse sprint status data from YAML file
 * @param {Function} log - Logger function
 * @returns {Object} Sprint status data or default demo data
 */
function loadSprintData(log) {
  try {
    const yamlPath = path.join(__dirname, '../../docs/bmad/sprint-status.yaml');

    if (!fs.existsSync(yamlPath)) {
      log?.(`Sprint status file not found, using demo data`, 'debug');
      return getDemoData();
    }

    // Read YAML file
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');

    // Simple YAML parser for our specific format
    const data = parseSprintYaml(yamlContent);
    log?.(
      `Loaded sprint data: ${data.currentSprint?.goal || 'No goal'}`,
      'debug'
    );

    return data;
  } catch (error) {
    log?.(`Error loading sprint data: ${error.message}`, 'warn');
    return getDemoData();
  }
}

/**
 * Simple YAML parser for sprint-status.yaml format
 * @param {string} yamlContent - YAML file content
 * @returns {Object} Parsed sprint data
 */
function parseSprintYaml(yamlContent) {
  const lines = yamlContent.split('\n');
  const data = {
    currentSprint: {},
    workflowStage: null,
    workflowProgress: null,
    stories: [],
  };

  let currentSection = null;
  let currentStory = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') continue;

    // Section headers
    if (trimmed === 'current_sprint:') {
      currentSection = 'sprint';
      continue;
    } else if (trimmed === 'development_status:') {
      currentSection = 'stories';
      continue;
    }

    // Parse sprint data
    if (currentSection === 'sprint') {
      if (trimmed.startsWith('goal:')) {
        data.currentSprint.goal = trimmed
          .replace(/goal:\s*['"]?/, '')
          .replace(/['"]$/, '');
      } else if (trimmed.startsWith('status:')) {
        data.currentSprint.status = trimmed
          .replace(/status:\s*['"]?/, '')
          .replace(/['"]$/, '');
      } else if (trimmed.startsWith('start_date:')) {
        data.currentSprint.startDate = trimmed
          .replace(/start_date:\s*['"]?/, '')
          .replace(/['"]$/, '');
      }
    }

    // Parse workflow data (at root level)
    if (trimmed.startsWith('workflow_stage:')) {
      data.workflowStage = trimmed
        .replace(/workflow_stage:\s*['"]?/, '')
        .replace(/['"]$/, '');
    } else if (trimmed.startsWith('workflow_progress:')) {
      // Parse {current: X, total: Y} format
      const match = trimmed.match(/current:\s*(\d+),\s*total:\s*(\d+)/);
      if (match) {
        data.workflowProgress = {
          current: parseInt(match[1]),
          total: parseInt(match[2]),
        };
      }
    }

    // Parse story data
    if (currentSection === 'stories') {
      if (trimmed.match(/^['"]?[\w-]+['"]?:/)) {
        // New story key
        const key = trimmed.replace(/['"]?:$/, '').replace(/^['"]?/, '');
        currentStory = { key, status: 'backlog', title: null };
        data.stories.push(currentStory);
      } else if (currentStory) {
        if (trimmed.startsWith('status:')) {
          currentStory.status = trimmed
            .replace(/status:\s*['"]?/, '')
            .replace(/['"]$/, '');
        } else if (trimmed.startsWith('title:')) {
          currentStory.title = trimmed
            .replace(/title:\s*['"]?/, '')
            .replace(/['"]$/, '');
        }
      }
    }
  }

  return data;
}

/**
 * Get demo/fallback sprint data
 * @returns {Object} Demo sprint data
 */
function getDemoData() {
  return {
    currentSprint: {
      goal: 'No Active Sprint',
      status: 'planning',
      startDate: new Date().toISOString().split('T')[0],
    },
    workflowStage: 'planning',
    workflowProgress: { current: 0, total: 8 },
    stories: [{ key: 'demo-story', status: 'backlog', title: 'Demo Story' }],
  };
}

/**
 * Truncate and format story key for display
 * @param {string} key - Story key (e.g., "1-2-ui-preferences-persistence")
 * @param {string|null} title - Story title if available
 * @param {number} maxLength - Maximum display length
 * @returns {Object} Formatted story display with id and title
 */
function formatStoryForDisplay(key, title, maxLength = 20) {
  // Parse story key (format: "epic-story-title-slug")
  const parts = key.split('-');
  const epic = parts[0] || '?';
  const story = parts[1] || '?';
  const storyId = `${epic}-${story}`;

  // Use provided title or derive from key
  let displayTitle = title || parts.slice(2).join(' ');

  // Abbreviate common words
  displayTitle = displayTitle
    .replace(/authentication/gi, 'auth')
    .replace(/management/gi, 'mgmt')
    .replace(/configuration/gi, 'config')
    .replace(/preferences/gi, 'prefs')
    .replace(/persistence/gi, 'persist')
    .replace(/implementation/gi, 'impl');

  // Capitalize first letter of each word
  displayTitle = displayTitle
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Truncate if too long
  if (displayTitle.length > maxLength) {
    displayTitle = displayTitle.substring(0, maxLength - 3) + '...';
  }

  return { id: storyId, title: displayTitle };
}

/**
 * Determine sprint status from data
 * @param {Object} sprintData - Sprint data object
 * @returns {Object} Status info with color and text
 */
function getSprintStatus(sprintData) {
  const inProgressCount = sprintData.stories.filter(
    (s) => s.status === 'in-progress'
  ).length;
  const completedCount = sprintData.stories.filter(
    (s) => s.status === 'done'
  ).length;
  const totalCount = sprintData.stories.length;

  if (inProgressCount > 0) {
    return { text: 'IN PROGRESS', color: COLORS.SPRINT_ACTIVE };
  } else if (completedCount === totalCount && totalCount > 0) {
    return { text: 'COMPLETED', color: COLORS.SPRINT_DONE };
  } else if (sprintData.currentSprint.status === 'blocked') {
    return { text: 'BLOCKED', color: COLORS.SPRINT_BLOCKED };
  } else {
    return { text: 'PLANNING', color: COLORS.SPRINT_PLANNING };
  }
}

/**
 * Get current in-progress story
 * @param {Object} sprintData - Sprint data object
 * @returns {Object|null} Current story or null
 */
function getCurrentStory(sprintData) {
  const inProgress = sprintData.stories.filter(
    (s) => s.status === 'in-progress'
  );

  if (inProgress.length === 0) {
    return null;
  } else if (inProgress.length === 1) {
    return inProgress[0];
  } else {
    // Multiple in-progress stories
    return {
      key: 'multiple',
      title: 'Multiple Stories',
      status: 'in-progress',
    };
  }
}

/**
 * Render scene
 * @param {Object} context - Scene context
 * @returns {Promise<number>} Delay until next render (ms)
 */
async function render(context) {
  const { device, publishOk, log } = context;

  try {
    // Clear screen
    await device.clear();

    // Load sprint data
    const sprintData = loadSprintData(log);
    const status = getSprintStatus(sprintData);
    const currentStory = getCurrentStory(sprintData);

    // Calculate story metrics
    const totalStories = sprintData.stories.length;
    const completedStories = sprintData.stories.filter(
      (s) => s.status === 'done'
    ).length;
    const progressPercent =
      totalStories > 0
        ? Math.round((completedStories / totalStories) * 100)
        : 0;

    // --- Section 1: Status Bar (Top 8px) ---
    await device.fillRectangleRgba(
      [0, LAYOUT.STATUS_BAR.y],
      [64, LAYOUT.STATUS_BAR.height],
      status.color
    );
    await device.drawTextRgbaAligned(
      status.text,
      [32, LAYOUT.STATUS_BAR.y + 1],
      COLORS.BACKGROUND, // Black text on colored background
      'center'
    );

    // Divider line
    await device.drawLineRgba([0, 9], [63, 9], COLORS.DIVIDER);

    // --- Section 2: Current Story (10-22px) ---
    if (currentStory) {
      const storyDisplay = formatStoryForDisplay(
        currentStory.key,
        currentStory.title,
        18
      );

      await device.drawTextRgbaAligned(
        `Story ${storyDisplay.id}:`,
        [2, LAYOUT.STORY_SECTION.y],
        COLORS.TEXT_SECONDARY,
        'left'
      );

      await device.drawTextRgbaAligned(
        storyDisplay.title,
        [2, LAYOUT.STORY_SECTION.y + 6],
        COLORS.STORY_HIGHLIGHT,
        'left'
      );
    } else {
      await device.drawTextRgbaAligned(
        'No Active Story',
        [32, LAYOUT.STORY_SECTION.y + 3],
        COLORS.TEXT_SECONDARY,
        'center'
      );
    }

    // Divider line
    await device.drawLineRgba([0, 23], [63, 23], COLORS.DIVIDER);

    // --- Section 3: Workflow Stage (24-42px) ---
    const workflowLabel =
      WORKFLOW_STAGES[sprintData.workflowStage] || 'UNKNOWN';
    await device.drawTextRgbaAligned(
      'WORKFLOW:',
      [2, LAYOUT.WORKFLOW_SECTION.y],
      COLORS.TEXT_SECONDARY,
      'left'
    );

    await device.drawTextRgbaAligned(
      workflowLabel,
      [2, LAYOUT.WORKFLOW_SECTION.y + 6],
      COLORS.TEXT_PRIMARY,
      'left'
    );

    // Workflow progress bar
    if (sprintData.workflowProgress) {
      const { current, total } = sprintData.workflowProgress;
      const progressWidth = Math.round((current / total) * 60);

      // Progress bar background
      await device.fillRectangleRgba(
        [2, LAYOUT.WORKFLOW_SECTION.y + 13],
        [60, 4],
        COLORS.PROGRESS_EMPTY
      );

      // Progress bar fill
      if (progressWidth > 0) {
        await device.fillRectangleRgba(
          [2, LAYOUT.WORKFLOW_SECTION.y + 13],
          [progressWidth, 4],
          COLORS.PROGRESS_FILL
        );
      }

      // Progress text
      await device.drawTextRgbaAligned(
        `${current}/${total}`,
        [32, LAYOUT.WORKFLOW_SECTION.y + 13],
        COLORS.TEXT_PRIMARY,
        'center'
      );
    }

    // Divider line
    await device.drawLineRgba([0, 43], [63, 43], COLORS.DIVIDER);

    // --- Section 4: Story Metrics (44-62px) ---
    await device.drawTextRgbaAligned(
      `Stories: ${completedStories}/${totalStories}`,
      [2, LAYOUT.METRICS_SECTION.y],
      COLORS.TEXT_SECONDARY,
      'left'
    );

    // Story completion progress bar
    const storyProgressWidth = Math.round((progressPercent / 100) * 60);

    // Progress bar background
    await device.fillRectangleRgba(
      [2, LAYOUT.METRICS_SECTION.y + 7],
      [60, 4],
      COLORS.PROGRESS_EMPTY
    );

    // Progress bar fill
    if (storyProgressWidth > 0) {
      await device.fillRectangleRgba(
        [2, LAYOUT.METRICS_SECTION.y + 7],
        [storyProgressWidth, 4],
        COLORS.SPRINT_ACTIVE
      );
    }

    // Percentage text
    await device.drawTextRgbaAligned(
      `${progressPercent}%`,
      [32, LAYOUT.METRICS_SECTION.y + 7],
      COLORS.TEXT_PRIMARY,
      'center'
    );

    // Push frame to device
    await device.push(SCENE_NAME, publishOk);

    // Update every 30 seconds
    return 30000;
  } catch (error) {
    log?.(`Error rendering BMAD sprint status: ${error.message}`, 'error');
    return 30000; // Try again in 30 seconds
  }
}

// Scene metadata
const description =
  'Displays BMAD sprint progress, workflow stage, and current story status on a 64x64 pixel display with color-coded indicators';
const category = 'Development';
const deviceTypes = ['pixoo64'];
const tags = ['bmad', 'sprint', 'status', 'development', 'workflow'];
const sceneType = 'development';
const author = 'Markus Barta (mba)';
const version = '1.0.0';
const thumbnail = null;
const isHidden = false;
const sortOrder = 500;

module.exports = {
  name: SCENE_NAME,
  init,
  cleanup,
  render,
  wantsLoop: true,
  description,
  category,
  deviceTypes,
  tags,
  sceneType,
  author,
  version,
  thumbnail,
  isHidden,
  sortOrder,
  metadata: {
    refreshInterval: 30000, // 30 seconds
    description,
  },
};
