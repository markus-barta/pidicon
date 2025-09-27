/**
 * @fileoverview Configuration Validator - Validation and presets for scene configurations
 * @description Lightweight validation system for Pixoo scene configurations with presets
 * and clear error messaging. Supports JSON schema validation and common configuration templates.
 * @author Markus Barta (mba) with assistance from Cursor AI
 * @license MIT
 */

const logger = require('./logger');

/**
 * Configuration Validator - Validates scene configurations and provides presets
 */
class ConfigValidator {
  constructor() {
    this.presets = new Map();
    this.schemas = new Map();
    this.errors = [];

    // Initialize built-in presets and schemas
    this._initializePresets();
    this._initializeSchemas();
  }

  /**
   * Initialize built-in configuration presets
   * @private
   */
  _initializePresets() {
    // Text display presets
    this.presets.set('text-simple', {
      fontSize: 'medium',
      color: [255, 255, 255, 255],
      alignment: 'center',
      shadow: false,
      outline: false,
    });

    this.presets.set('text-fancy', {
      fontSize: 'large',
      color: [255, 255, 100, 255],
      alignment: 'center',
      shadow: true,
      outline: true,
      shadowColor: [0, 0, 0, 180],
      outlineColor: [100, 50, 0, 255],
    });

    // Chart display presets
    this.presets.set('chart-basic', {
      width: 64,
      height: 64,
      backgroundColor: [20, 20, 40, 255],
      gridColor: [100, 100, 100, 100],
      dataColor: [100, 200, 255, 255],
      showGrid: true,
      showLabels: false,
      animationDuration: 500,
    });

    this.presets.set('chart-advanced', {
      width: 64,
      height: 64,
      backgroundColor: [15, 15, 35, 255],
      gridColor: [150, 150, 150, 120],
      dataColor: [255, 200, 100, 255],
      showGrid: true,
      showLabels: true,
      labelColor: [200, 200, 200, 255],
      animationDuration: 1000,
      easing: 'easeOut',
    });

    // Status indicator presets
    this.presets.set('status-indicator', {
      size: 8,
      onColor: [0, 255, 0, 255],
      offColor: [100, 100, 100, 255],
      blinkDuration: 1000,
      position: [56, 8],
      label: true,
      labelColor: [255, 255, 255, 255],
    });

    // Performance monitoring presets
    this.presets.set('performance-monitor', {
      updateInterval: 200,
      showFps: true,
      showFrameTime: true,
      showMemory: false,
      alertThreshold: 100, // ms
      historySize: 60,
      colorScheme: 'traffic-light', // green/yellow/red
    });

    logger.debug(`📋 Initialized ${this.presets.size} configuration presets`);
  }

  /**
   * Initialize validation schemas
   * @private
   */
  _initializeSchemas() {
    // Text configuration schema
    this.schemas.set('text', {
      type: 'object',
      properties: {
        text: { type: 'string', maxLength: 50 },
        position: {
          type: 'array',
          items: { type: 'number', minimum: 0, maximum: 64 },
          minItems: 2,
          maxItems: 2,
        },
        color: {
          type: 'array',
          items: { type: 'number', minimum: 0, maximum: 255 },
          minItems: 4,
          maxItems: 4,
        },
        alignment: { enum: ['left', 'center', 'right'] },
        fontSize: { enum: ['small', 'medium', 'large'] },
        shadow: { type: 'boolean' },
        outline: { type: 'boolean' },
      },
      required: ['text', 'position'],
    });

    // Chart configuration schema
    this.schemas.set('chart', {
      type: 'object',
      properties: {
        width: { type: 'number', minimum: 1, maximum: 64 },
        height: { type: 'number', minimum: 1, maximum: 64 },
        data: {
          type: 'array',
          items: { type: 'number' },
        },
        backgroundColor: {
          type: 'array',
          items: { type: 'number', minimum: 0, maximum: 255 },
          minItems: 4,
          maxItems: 4,
        },
        showGrid: { type: 'boolean' },
        showLabels: { type: 'boolean' },
        animationDuration: { type: 'number', minimum: 0 },
      },
      required: ['width', 'height'],
    });

    logger.debug(`📋 Initialized ${this.schemas.size} validation schemas`);
  }

  /**
   * Get a preset configuration
   * @param {string} presetName - Name of the preset
   * @returns {Object|null} Preset configuration or null if not found
   */
  getPreset(presetName) {
    return this.presets.get(presetName) || null;
  }

  /**
   * Get all available presets
   * @returns {Map} Map of preset names to configurations
   */
  getAllPresets() {
    return new Map(this.presets);
  }

  /**
   * Create configuration from preset with overrides
   * @param {string} presetName - Base preset name
   * @param {Object} overrides - Configuration overrides
   * @returns {Object|null} Merged configuration or null if preset not found
   */
  createFromPreset(presetName, overrides = {}) {
    const preset = this.getPreset(presetName);
    if (!preset) {
      this._addError(
        `Preset '${presetName}' not found. Available presets: ${Array.from(this.presets.keys()).join(', ')}`,
      );
      return null;
    }

    // Deep merge preset with overrides
    return this._deepMerge(preset, overrides);
  }

  /**
   * Validate configuration against schema
   * @param {Object} config - Configuration to validate
   * @param {string} schemaName - Schema name to validate against
   * @returns {boolean} True if valid
   */
  validate(config, schemaName) {
    this.errors = []; // Reset errors

    const schema = this.schemas.get(schemaName);
    if (!schema) {
      this._addError(
        `Schema '${schemaName}' not found. Available schemas: ${Array.from(this.schemas.keys()).join(', ')}`,
      );
      return false;
    }

    return this._validateAgainstSchema(config, schema, '');
  }

  /**
   * Get validation errors
   * @returns {Array} Array of error messages
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get validation errors as formatted string
   * @returns {string} Formatted error message
   */
  getErrorString() {
    if (this.errors.length === 0) {
      return '';
    }

    return this.errors
      .map((error, index) => `${index + 1}. ${error}`)
      .join('\n');
  }

  /**
   * Validate and merge preset configuration
   * @param {string} presetName - Preset name
   * @param {Object} overrides - Configuration overrides
   * @param {string} schemaName - Schema to validate against
   * @returns {Object|null} Validated configuration or null on error
   */
  createValidatedConfig(presetName, overrides = {}, schemaName = null) {
    this.errors = [];

    // Create config from preset
    const config = this.createFromPreset(presetName, overrides);
    if (!config) {
      return null; // Preset errors already added
    }

    // Validate if schema specified
    if (schemaName && !this.validate(config, schemaName)) {
      return null; // Validation errors already added
    }

    return config;
  }

  /**
   * Add a custom preset
   * @param {string} name - Preset name
   * @param {Object} config - Preset configuration
   * @returns {boolean} True if added successfully
   */
  addPreset(name, config) {
    if (this.presets.has(name)) {
      this._addError(`Preset '${name}' already exists`);
      return false;
    }

    if (!config || typeof config !== 'object') {
      this._addError(`Invalid preset configuration for '${name}'`);
      return false;
    }

    this.presets.set(name, { ...config });
    logger.debug(`📋 Added custom preset: ${name}`);
    return true;
  }

  /**
   * Add a custom validation schema
   * @param {string} name - Schema name
   * @param {Object} schema - Validation schema
   * @returns {boolean} True if added successfully
   */
  addSchema(name, schema) {
    if (this.schemas.has(name)) {
      this._addError(`Schema '${name}' already exists`);
      return false;
    }

    if (!schema || typeof schema !== 'object') {
      this._addError(`Invalid schema for '${name}'`);
      return false;
    }

    this.schemas.set(name, { ...schema });
    logger.debug(`📋 Added custom schema: ${name}`);
    return true;
  }

  /**
   * Validate configuration against schema (recursive)
   * @private
   */
  _validateAgainstSchema(value, schema, path) {
    const currentPath = path ? `${path}` : 'root';

    // Handle different schema types
    switch (schema.type) {
      case 'object':
        return this._validateObject(value, schema, currentPath);
      case 'array':
        return this._validateArray(value, schema, currentPath);
      case 'string':
        return this._validateString(value, schema, currentPath);
      case 'number':
        return this._validateNumber(value, schema, currentPath);
      case 'boolean':
        return (
          typeof value === 'boolean' ||
          this._addError(
            `${currentPath}: expected boolean, got ${typeof value}`,
          )
        );
      default:
        // Enum validation
        if (schema.enum) {
          return (
            schema.enum.includes(value) ||
            this._addError(
              `${currentPath}: value '${value}' not in allowed values: ${schema.enum.join(', ')}`,
            )
          );
        }
        return true; // Unknown type, allow
    }
  }

  /**
   * Validate object
   * @private
   */
  _validateObject(obj, schema, path) {
    if (typeof obj !== 'object' || obj === null) {
      this._addError(`${path}: expected object, got ${typeof obj}`);
      return false;
    }

    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in obj)) {
          this._addError(
            `${path}: missing required property '${requiredProp}'`,
          );
          return false;
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in obj) {
          if (
            !this._validateAgainstSchema(
              obj[propName],
              propSchema,
              `${path}.${propName}`,
            )
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate array
   * @private
   */
  _validateArray(arr, schema, path) {
    if (!Array.isArray(arr)) {
      this._addError(`${path}: expected array, got ${typeof arr}`);
      return false;
    }

    if (schema.minItems !== undefined && arr.length < schema.minItems) {
      this._addError(
        `${path}: array too short, minimum ${schema.minItems} items`,
      );
      return false;
    }

    if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
      this._addError(
        `${path}: array too long, maximum ${schema.maxItems} items`,
      );
      return false;
    }

    if (schema.items) {
      for (let i = 0; i < arr.length; i++) {
        if (
          !this._validateAgainstSchema(arr[i], schema.items, `${path}[${i}]`)
        ) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate string
   * @private
   */
  _validateString(str, schema, path) {
    if (typeof str !== 'string') {
      this._addError(`${path}: expected string, got ${typeof str}`);
      return false;
    }

    if (schema.maxLength !== undefined && str.length > schema.maxLength) {
      this._addError(
        `${path}: string too long, maximum ${schema.maxLength} characters`,
      );
      return false;
    }

    if (schema.minLength !== undefined && str.length < schema.minLength) {
      this._addError(
        `${path}: string too short, minimum ${schema.minLength} characters`,
      );
      return false;
    }

    return true;
  }

  /**
   * Validate number
   * @private
   */
  _validateNumber(num, schema, path) {
    if (typeof num !== 'number' || isNaN(num)) {
      this._addError(`${path}: expected number, got ${typeof num}`);
      return false;
    }

    if (schema.minimum !== undefined && num < schema.minimum) {
      this._addError(`${path}: number too small, minimum ${schema.minimum}`);
      return false;
    }

    if (schema.maximum !== undefined && num > schema.maximum) {
      this._addError(`${path}: number too large, maximum ${schema.maximum}`);
      return false;
    }

    return true;
  }

  /**
   * Deep merge two objects
   * @private
   */
  _deepMerge(target, source) {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this._deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Add validation error
   * @private
   */
  _addError(message) {
    this.errors.push(message);
    logger.debug(`⚠️ Config validation error: ${message}`);
    return false;
  }
}

module.exports = ConfigValidator;
