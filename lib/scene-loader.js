/**
 * @fileoverview Scene Loader - Consolidated scene discovery and loading
 * @description Centralized utilities for discovering, loading, and validating
 * scene modules with consistent error handling and logging.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const fs = require('fs');
const path = require('path');

const logger = require('./logger');

/**
 * Scene Discovery and Loading Utilities
 */
class SceneLoader {
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
   * @param {string} filePath - Path to scene file
   * @returns {Object|null} Scene info {name, module} or null on error
   */
  loadSceneFile(filePath) {
    try {
      const module = require(filePath);
      const derivedName = path.basename(filePath, '.js');
      const sceneName = module.name || derivedName;

      // Validate scene interface
      if (!this.validateSceneInterface(module)) {
        throw new Error(
          `Scene ${sceneName} does not implement required interface`,
        );
      }

      return { name: sceneName, module };
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
 */
const SceneRegistration = {
  /**
   * Register scenes from directory structure
   * @param {SceneManager} sceneManager - Scene manager instance
   * @param {string} baseDir - Base scenes directory
   * @returns {Object} Registration results
   */
  registerFromStructure(sceneManager, baseDir = null) {
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

    return results;
  },
};

module.exports = {
  SceneLoader,
  SceneRegistration,
};
