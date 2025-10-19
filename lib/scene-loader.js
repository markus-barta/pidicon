/**
 * @fileoverview Scene Loader - Consolidated scene discovery and loading
 * @description Centralized utilities for discovering, loading, and validating
 * scene modules with consistent error handling and logging.
 *
 * This module eliminates duplicate scene loading code by providing:
 * - Automatic directory scanning (recursive or single-level)
 * - Scene interface validation
 * - Error collection and reporting
 * - Consistent logging
 *
 * Usage:
 *   const { SceneRegistration } = require('./lib/scene-loader');
 *   const results = SceneRegistration.registerFromStructure(sceneManager);
 *
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license GPL-3.0-or-later
 */

const fs = require('fs');
const path = require('path');

const logger = require('./logger');

/**
 * Scene Discovery and Loading Utilities
 *
 * Provides methods for discovering and loading scene modules from directories
 * with validation, error handling, and flexible configuration.
 *
 * @class
 */
class SceneLoader {
  /**
   * Create a SceneLoader instance
   * @param {string|null} scenesDir - Base directory for scenes (defaults to ./scenes)
   */
  constructor(scenesDir = null) {
    this.scenesDir = scenesDir || path.join(process.cwd(), 'scenes');
    this.loadedScenes = new Map();
    this.loadErrors = new Map();
  }

  /**
   * Load scenes from a directory
   * @param {string} directory - Directory to load scenes from
   * @param {Object} options - Loading options
   * @returns {Object} Loading results {scenes: Map, errors: Array}
   */
  loadFromDirectory(directory, options = {}) {
    const {
      recursive = false,
      filter = (file) => file.endsWith('.js'),
      onSuccess = (name) => logger.ok(`Scene loaded: ${name}`),
      onError = (file, error) =>
        logger.error(`Failed to load scene ${file}: ${error.message}`),
    } = options;

    const scenes = new Map();
    const errors = [];

    try {
      const files = this.getSceneFiles(directory, recursive, filter);

      files.forEach((file) => {
        try {
          const result = this.loadSceneFile(file, directory);
          if (result) {
            const { name, module } = result;
            scenes.set(name, module);
            onSuccess(name, module);
          }
        } catch (error) {
          const errorInfo = { file, error: error.message };
          errors.push(errorInfo);
          onError(file, error);
        }
      });
    } catch (error) {
      logger.error(
        `❌ Failed to load scenes from ${directory}: ${error.message}`,
      );
      errors.push({ directory, error: error.message });
    }

    return { scenes, errors };
  }

  /**
   * Get scene files from directory
   * @param {string} directory - Directory to scan
   * @param {boolean} recursive - Whether to scan recursively
   * @param {Function} filter - File filter function
   * @returns {Array} Array of file paths
   */
  getSceneFiles(directory, recursive = false, filter = null) {
    const files = [];

    if (!fs.existsSync(directory)) {
      logger.warn(`⚠️ Scene directory does not exist: ${directory}`);
      return files;
    }

    const items = fs.readdirSync(directory);

    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory() && recursive) {
        files.push(...this.getSceneFiles(itemPath, recursive, filter));
      } else if (stat.isFile() && (!filter || filter(item))) {
        files.push(itemPath);
      }
    }

    return files;
  }

  /**
   * Load a single scene file
   * @param {string} filePath - Absolute path to scene file
   * @returns {Object|null} Scene info {name, module, relativePath} or null on error
   */
  loadSceneFile(filePath) {
    try {
      // Ensure absolute path for require()
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(filePath);

      const module = require(absolutePath);
      const derivedName = path.basename(filePath, '.js');
      const sceneName = module.name || derivedName;

      // Calculate relative path from scenes directory
      const relativePath = path
        .relative(this.scenesDir, absolutePath)
        .split(path.sep)
        .join('/');

      // Validate scene interface
      if (!this.validateSceneInterface(module)) {
        throw new Error(
          `Scene ${sceneName} does not implement required interface`,
        );
      }

      // Attach file path to module for reference
      module.filePath = relativePath;

      return { name: sceneName, module, relativePath };
    } catch (error) {
      throw new Error(`Failed to load scene ${filePath}: ${error.message}`);
    }
  }

  /**
   * Validate scene interface
   * @param {Object} sceneModule - Scene module to validate
   * @returns {boolean} True if interface is valid
   */
  validateSceneInterface(sceneModule) {
    if (!sceneModule || typeof sceneModule !== 'object') {
      return false;
    }

    // Required methods
    const requiredMethods = ['render'];
    const missingMethods = requiredMethods.filter(
      (method) => typeof sceneModule[method] !== 'function',
    );

    if (missingMethods.length > 0) {
      logger.warn(
        `⚠️ Scene missing required methods: ${missingMethods.join(', ')}`,
      );
      return false;
    }

    // Recommended methods
    const recommendedMethods = ['init', 'cleanup'];
    const missingRecommended = recommendedMethods.filter(
      (method) => !sceneModule[method],
    );

    if (missingRecommended.length > 0) {
      logger.debug(
        `ℹ️ Scene missing recommended methods: ${missingRecommended.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Load scenes from multiple directories
   * @param {Array} directories - Array of directory paths
   * @param {Object} options - Loading options
   * @returns {Object} Combined loading results
   */
  loadFromDirectories(directories, options = {}) {
    const allScenes = new Map();
    const allErrors = [];

    directories.forEach((directory) => {
      try {
        const { scenes, errors } = this.loadFromDirectory(directory, options);
        scenes.forEach((module, name) => {
          allScenes.set(name, module);
        });
        allErrors.push(...errors);
      } catch (error) {
        logger.error(
          `❌ Failed to load scenes from ${directory}: ${error.message}`,
        );
        allErrors.push({ directory, error: error.message });
      }
    });

    return { scenes: allScenes, errors: allErrors };
  }

  /**
   * Get summary of loaded scenes
   * @returns {Object} Summary with counts and lists
   */
  getSummary() {
    const scenes = Array.from(this.loadedScenes.keys());
    const errors = Array.from(this.loadErrors.keys());

    return {
      total: scenes.length,
      errors: errors.length,
      loaded: scenes,
      failed: errors,
    };
  }
}

/**
 * Scene Registration Helper - Provides convenient registration methods
 *
 * Eliminates duplicate scene loading code by providing a single utility
 * that handles:
 * - Loading from main scenes directory
 * - Loading from scenes/examples directory
 * - Error collection and reporting
 * - Automatic scene registration
 *
 * This replaces ~30 lines of duplicate code in daemon.js
 */
const SceneRegistration = {
  /**
   * Register scenes from directory structure
   *
   * Automatically loads scenes from:
   * - baseDir/*.js (main scenes)
   * - baseDir/examples/*.js (example/demo scenes)
   * - userScenesDir/*.js (user custom scenes, if provided)
   *
   * @param {SceneManager} sceneManager - Scene manager instance to register scenes with
   * @param {string|null} baseDir - Base scenes directory (defaults to ./scenes)
   * @param {string|null} userScenesDir - User custom scenes directory (e.g., /data/scenes)
   * @returns {Object} Registration results {scenes: Map, errors: Array}
   * @example
   *   const results = SceneRegistration.registerFromStructure(sceneManager);
   *   console.log(`Loaded ${results.scenes.size} scenes`);
   *   if (results.errors.length > 0) {
   *     console.error('Failed to load:', results.errors);
   *   }
   */
  registerFromStructure(sceneManager, baseDir = null, userScenesDir = null) {
    const loader = new SceneLoader(baseDir);
    const results = {
      scenes: new Map(),
      errors: [],
    };

    // Load main scenes
    const mainDir = baseDir || path.join(process.cwd(), 'scenes');
    const mainResult = loader.loadFromDirectory(mainDir, {
      onSuccess: (name, module) => {
        try {
          sceneManager.registerScene(name, module);
          results.scenes.set(name, module);
        } catch (error) {
          results.errors.push({
            scene: name,
            error: error.message,
            type: 'registration',
          });
        }
      },
    });

    results.errors.push(...mainResult.errors);

    // Load example scenes if directory exists
    const examplesDir = path.join(mainDir, 'examples');
    if (fs.existsSync(examplesDir)) {
      const examplesResult = loader.loadFromDirectory(examplesDir, {
        onSuccess: (name, module) => {
          try {
            sceneManager.registerScene(name, module);
            results.scenes.set(name, module);
          } catch (error) {
            results.errors.push({
              scene: name,
              error: error.message,
              type: 'registration',
            });
          }
        },
      });

      results.errors.push(...examplesResult.errors);
    }

    // Load dev scenes if directory exists
    const devDir = path.join(mainDir, 'examples', 'dev');
    if (fs.existsSync(devDir)) {
      const devResult = loader.loadFromDirectory(devDir, {
        onSuccess: (name, module) => {
          try {
            sceneManager.registerScene(name, module);
            results.scenes.set(name, module);
          } catch (error) {
            results.errors.push({
              scene: name,
              error: error.message,
              type: 'registration',
            });
          }
        },
      });

      results.errors.push(...devResult.errors);
    }

    // Load user custom scenes if directory exists and is provided
    if (userScenesDir && fs.existsSync(userScenesDir)) {
      logger.info(`📁 Loading user custom scenes from: ${userScenesDir}`);
      const userLoader = new SceneLoader(userScenesDir);
      const userResult = userLoader.loadFromDirectory(userScenesDir, {
        recursive: true, // Allow nested directories in user scenes
        onSuccess: (name, module) => {
          try {
            sceneManager.registerScene(name, module);
            results.scenes.set(name, module);
            logger.ok(`✨ Loaded user scene: ${name}`);
          } catch (error) {
            results.errors.push({
              scene: name,
              error: error.message,
              type: 'user-scene-registration',
            });
          }
        },
        onError: (file, error) => {
          logger.warn(
            `⚠️  Failed to load user scene ${file}: ${error.message}`,
          );
        },
      });

      results.errors.push(...userResult.errors);
    } else if (userScenesDir) {
      logger.info(
        `📁 User scenes directory not found: ${userScenesDir} (will be created on first use)`,
      );
    }

    return results;
  },
};

module.exports = {
  SceneLoader,
  SceneRegistration,
};
