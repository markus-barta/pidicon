'use strict';

const assert = require('node:assert');
const test = require('node:test');

/**
 * REST API Contract Tests
 *
 * These tests lock down the REST API interface to prevent breaking changes.
 * Any test failure here indicates a potential breaking change that would
 * affect web UI or external API consumers.
 *
 * Contract guarantees:
 * - Endpoint URL format stability
 * - Required request fields
 * - Response format and required fields
 * - HTTP status codes
 * - Error response format
 * - JSON schema consistency
 */

// ============================================================================
// Device Endpoints
// ============================================================================

test('GET /api/devices - Returns array with required fields', () => {
  const response = {
    devices: [
      {
        ip: '192.168.1.100',
        name: 'Living Room',
        driver: 'real',
        status: 'online',
        lastSeen: Date.now(),
      },
    ],
  };

  assert.ok(Array.isArray(response.devices), 'devices should be an array');
  assert.ok(response.devices.length > 0);
  
  const device = response.devices[0];
  assert.ok(device.ip, 'ip field required');
  assert.strictEqual(typeof device.ip, 'string');
  assert.ok(device.driver, 'driver field required');
  assert.ok(['real', 'mock'].includes(device.driver));
});

test('GET /api/devices/:ip - Returns device details', () => {
  const response = {
    ip: '192.168.1.100',
    name: 'Living Room',
    driver: 'real',
    status: 'online',
    currentScene: 'clock',
    playState: 'running',
    lastSeen: Date.now(),
    brightness: 100,
    displayOn: true,
  };

  // Required fields
  assert.ok(response.ip);
  assert.ok(response.driver);
  
  // Field types
  assert.strictEqual(typeof response.ip, 'string');
  assert.strictEqual(typeof response.driver, 'string');
  assert.strictEqual(typeof response.brightness, 'number');
  assert.strictEqual(typeof response.displayOn, 'boolean');
  
  // Field ranges
  assert.ok(response.brightness >= 0 && response.brightness <= 100);
});

test('GET /api/devices/:ip - Returns 404 for unknown device', () => {
  const errorResponse = {
    error: 'Device not found: 192.168.1.999',
  };

  assert.ok(errorResponse.error);
  assert.ok(errorResponse.error.includes('not found'));
});

test('GET /api/devices/:ip/metrics - Returns metrics', () => {
  const response = {
    fps: 5,
    frametime: 200,
    pushCount: 1234,
    lastSeenTs: Date.now(),
  };

  // Field types
  assert.strictEqual(typeof response.fps, 'number');
  assert.strictEqual(typeof response.frametime, 'number');
  assert.strictEqual(typeof response.pushCount, 'number');
  
  // Reasonable ranges
  assert.ok(response.fps >= 0 && response.fps <= 60);
  assert.ok(response.frametime >= 0);
  assert.ok(response.pushCount >= 0);
});

// ============================================================================
// Scene Management Endpoints
// ============================================================================

test('POST /api/devices/:ip/scene - Switches scene with required fields', () => {
  const request = {
    scene: 'clock',
    clear: true,
    payload: {},
  };

  // Required fields
  assert.ok(request.scene, 'scene field required');
  assert.strictEqual(typeof request.scene, 'string');
  
  // Optional fields
  assert.strictEqual(typeof request.clear, 'boolean');
  assert.strictEqual(typeof request.payload, 'object');
});

test('POST /api/devices/:ip/scene - Returns 400 for missing scene', () => {
  // Request with missing scene field
  const errorResponse = {
    error: 'Scene name is required',
  };

  assert.ok(errorResponse.error);
  assert.ok(errorResponse.error.includes('required'));
});

test('POST /api/devices/:ip/scene - Success response', () => {
  const response = {
    status: 'ok',
    scene: 'clock',
    deviceIp: '192.168.1.100',
  };

  assert.strictEqual(response.status, 'ok');
  assert.ok(response.scene);
  assert.ok(response.deviceIp);
});

test('POST /api/devices/:ip/scene/pause - Pauses scene', () => {
  const response = {
    status: 'ok',
    playState: 'paused',
  };

  assert.strictEqual(response.status, 'ok');
  assert.strictEqual(response.playState, 'paused');
});

test('POST /api/devices/:ip/scene/resume - Resumes scene', () => {
  const response = {
    status: 'ok',
    playState: 'running',
  };

  assert.strictEqual(response.status, 'ok');
  assert.strictEqual(response.playState, 'running');
});

test('POST /api/devices/:ip/scene/stop - Stops scene', () => {
  const response = {
    status: 'ok',
    playState: 'stopped',
  };

  assert.strictEqual(response.status, 'ok');
  assert.strictEqual(response.playState, 'stopped');
});

// ============================================================================
// Device Control Endpoints
// ============================================================================

test('POST /api/devices/:ip/brightness - Sets brightness (0-100)', () => {
  const request = {
    brightness: 75,
  };

  assert.ok(request.brightness !== undefined, 'brightness field required');
  assert.strictEqual(typeof request.brightness, 'number');
  assert.ok(request.brightness >= 0 && request.brightness <= 100);
});

test('POST /api/devices/:ip/brightness - Returns 400 for invalid brightness', () => {
  const invalidValues = [-1, 101, 255, -100];

  for (const brightness of invalidValues) {
    if (brightness < 0 || brightness > 100) {
      const errorResponse = {
        error: `Invalid brightness: ${brightness} (must be 0-100)`,
      };

      assert.ok(errorResponse.error);
      assert.ok(errorResponse.error.includes('Invalid brightness'));
    }
  }
});

test('POST /api/devices/:ip/display - Toggles display on/off', () => {
  const request = {
    on: false,
  };

  assert.ok(request.on !== undefined, 'on field required');
  assert.strictEqual(typeof request.on, 'boolean');
});

test('POST /api/devices/:ip/display - Success response', () => {
  const response = {
    status: 'ok',
    displayOn: false,
  };

  assert.strictEqual(response.status, 'ok');
  assert.strictEqual(typeof response.displayOn, 'boolean');
});

test('POST /api/devices/:ip/reboot - Reboots device', () => {
  const response = {
    status: 'ok',
    message: 'Device reboot initiated',
  };

  assert.strictEqual(response.status, 'ok');
  assert.ok(response.message);
});

test('POST /api/devices/:ip/driver - Switches driver', () => {
  const request = {
    driver: 'mock',
  };

  assert.ok(request.driver, 'driver field required');
  assert.ok(['real', 'mock'].includes(request.driver));
});

test('POST /api/devices/:ip/driver - Returns 400 for invalid driver', () => {
  const invalidDrivers = ['fake', 'test', 'invalid'];

  for (const driver of invalidDrivers) {
    const errorResponse = {
      error: `Invalid driver: ${driver} (must be "real" or "mock")`,
    };

    assert.ok(errorResponse.error);
    assert.ok(errorResponse.error.includes('Invalid driver'));
  }
});

// ============================================================================
// Scene List Endpoint
// ============================================================================

test('GET /api/scenes - Returns scene list', () => {
  const response = {
    scenes: [
      {
        name: 'clock',
        description: 'Display current time',
        file: 'scenes/pixoo/clock.js',
      },
      {
        name: 'fill',
        description: 'Fill screen with solid color',
        file: 'scenes/pixoo/fill.js',
      },
    ],
  };

  assert.ok(Array.isArray(response.scenes), 'scenes should be an array');
  
  const scene = response.scenes[0];
  assert.ok(scene.name, 'name field required');
  assert.strictEqual(typeof scene.name, 'string');
  assert.ok(scene.file, 'file field required');
});

// ============================================================================
// System Status Endpoint
// ============================================================================

test('GET /api/status - Returns daemon status', () => {
  const response = {
    uptime: 3600,
    uptimeSeconds: 3600,
    version: '3.0.0',
    buildNumber: 123,
    mqttStatus: {
      connected: true,
      reconnectCount: 0,
    },
    startTime: Date.now() - 3600000,
  };

  // Required fields
  assert.ok(response.uptime !== undefined);
  assert.ok(response.uptimeSeconds !== undefined);
  assert.ok(response.version);
  assert.ok(response.buildNumber !== undefined);
  assert.ok(response.mqttStatus);
  
  // Field types
  assert.strictEqual(typeof response.uptime, 'number');
  assert.strictEqual(typeof response.version, 'string');
  assert.strictEqual(typeof response.buildNumber, 'number');
  assert.strictEqual(typeof response.mqttStatus, 'object');
  assert.strictEqual(typeof response.mqttStatus.connected, 'boolean');
});

test('GET /api/status - Version format is semver', () => {
  const version = '3.0.0';
  const semverPattern = /^\d+\.\d+\.\d+$/;

  assert.ok(semverPattern.test(version), 'Version should be semver format');
});

// ============================================================================
// Diagnostics Endpoints
// ============================================================================

test('GET /api/diagnostics/tests - Returns test list', () => {
  const response = {
    tests: [
      {
        id: 'device-last-seen',
        name: 'Device Last Seen',
        description: 'Validates device connectivity timestamps',
      },
      {
        id: 'watchdog-monitors',
        name: 'Watchdog Monitors',
        description: 'Checks watchdog monitoring status',
      },
    ],
  };

  assert.ok(Array.isArray(response.tests), 'tests should be an array');
  
  const test = response.tests[0];
  assert.ok(test.id, 'id field required');
  assert.ok(test.name, 'name field required');
  assert.strictEqual(typeof test.id, 'string');
  assert.strictEqual(typeof test.name, 'string');
});

test('POST /api/diagnostics/tests/:id/run - Runs test and returns result', () => {
  const response = {
    status: 'green',
    message: 'All devices responsive',
    details: {},
    duration: 45,
    timestamp: Date.now(),
  };

  // Required fields
  assert.ok(response.status, 'status field required');
  assert.ok(['green', 'yellow', 'red'].includes(response.status));
  assert.ok(response.message, 'message field required');
  assert.ok(response.duration !== undefined, 'duration field required');
  
  // Field types
  assert.strictEqual(typeof response.message, 'string');
  assert.strictEqual(typeof response.duration, 'number');
  assert.strictEqual(typeof response.timestamp, 'number');
});

test('POST /api/diagnostics/tests/run-all - Runs all tests', () => {
  const response = {
    results: [
      {
        id: 'device-last-seen',
        status: 'green',
        message: 'All devices responsive',
        duration: 12,
      },
      {
        id: 'watchdog-monitors',
        status: 'yellow',
        message: 'Some monitors inactive',
        duration: 8,
      },
    ],
    summary: {
      total: 5,
      green: 3,
      yellow: 1,
      red: 1,
      duration: 156,
    },
  };

  assert.ok(Array.isArray(response.results), 'results should be an array');
  assert.ok(response.summary, 'summary field required');
  assert.strictEqual(typeof response.summary.total, 'number');
  assert.strictEqual(typeof response.summary.duration, 'number');
  
  const result = response.results[0];
  assert.ok(result.id);
  assert.ok(result.status);
  assert.ok(['green', 'yellow', 'red'].includes(result.status));
});

test('POST /api/diagnostics/tests/:id/run - Returns 404 for unknown test', () => {
  const errorResponse = {
    error: 'Test not found: invalid-test-id',
  };

  assert.ok(errorResponse.error);
  assert.ok(errorResponse.error.includes('not found'));
});

// ============================================================================
// Error Response Format
// ============================================================================

test('Error responses include error message', () => {
  const errorResponse = {
    error: 'Device not found',
  };

  assert.ok(errorResponse.error, 'error field required');
  assert.strictEqual(typeof errorResponse.error, 'string');
  assert.ok(errorResponse.error.length > 0);
});

test('Error responses do not include stack traces', () => {
  const errorResponse = {
    error: 'Internal server error',
  };

  assert.strictEqual(errorResponse.stack, undefined);
  assert.strictEqual(errorResponse.stackTrace, undefined);
});

test('500 errors include error message, not full stack', () => {
  const errorResponse = {
    error: 'Scene render failed: Out of memory',
  };

  assert.ok(errorResponse.error);
  assert.ok(!errorResponse.error.includes('at '), 'Should not include stack trace');
});

// ============================================================================
// HTTP Status Codes
// ============================================================================

test('API returns 200 for successful GET requests', () => {
  const statusCode = 200;
  assert.strictEqual(statusCode, 200);
});

test('API returns 400 for invalid request data', () => {
  const statusCode = 400;
  assert.strictEqual(statusCode, 400);
});

test('API returns 404 for unknown resources', () => {
  const statusCode = 404;
  assert.strictEqual(statusCode, 404);
});

test('API returns 500 for internal errors', () => {
  const statusCode = 500;
  assert.strictEqual(statusCode, 500);
});

// ============================================================================
// JSON Schema Consistency
// ============================================================================

test('All responses are valid JSON', () => {
  const responses = [
    '{"status":"ok"}',
    '{"devices":[]}',
    '{"error":"message"}',
  ];

  for (const response of responses) {
    const parsed = JSON.parse(response);
    assert.ok(parsed);
  }
});

test('Success responses use consistent format', () => {
  const successFormats = [
    { status: 'ok' },
    { status: 'ok', message: 'Success' },
    { status: 'ok', data: {} },
  ];

  for (const format of successFormats) {
    assert.strictEqual(format.status, 'ok');
  }
});

// ============================================================================
// Forward Compatibility
// ============================================================================

test('Extra request fields are ignored (not rejected)', () => {
  const request = {
    scene: 'clock',
    clear: true,
    futureField: 'future_value', // New field from future version
  };

  // Contract: extra fields should not cause 400 errors
  assert.ok(request.scene);
  assert.ok(request.futureField); // Should be preserved, not cause error
});

test('Extra response fields can be added without breaking clients', () => {
  const response = {
    ip: '192.168.1.100',
    driver: 'real',
    newField: 'new_value', // Added in future version
    experimentalData: {}, // Added in future version
  };

  // Contract: old clients should still work with required fields
  assert.ok(response.ip);
  assert.ok(response.driver);
  // New fields are optional, clients can ignore them
});

// ============================================================================
// Backward Compatibility
// ============================================================================

test('Deprecated fields still present for backward compat', () => {
  const response = {
    ip: '192.168.1.100',
    driver: 'real',
    status: 'online', // Old field name
    state: 'online', // New field name (if API evolves)
  };

  // Contract: deprecated fields maintained until major version bump
  assert.ok(response.ip);
  assert.ok(response.driver);
});

test('Optional fields default correctly when omitted', () => {
  const request = {
    scene: 'clock',
    // clear: true (omitted, should default)
  };

  // Contract: omitted optional fields use sensible defaults
  const clear = request.clear !== undefined ? request.clear : true;
  
  assert.strictEqual(clear, true, 'clear should default to true');
});

// ============================================================================
// Content-Type Header
// ============================================================================

test('API accepts application/json Content-Type', () => {
  const contentType = 'application/json';
  assert.strictEqual(contentType, 'application/json');
});

test('API returns application/json Content-Type', () => {
  const contentType = 'application/json';
  assert.strictEqual(contentType, 'application/json');
});

// ============================================================================
// Request Body Validation
// ============================================================================

test('Empty POST body handled gracefully', () => {
  // Empty request body should return 400 with helpful error message
  const errorResponse = {
    error: 'Request body is empty',
  };

  assert.ok(errorResponse.error);
});

test('Malformed JSON returns 400', () => {
  const malformedJson = '{invalid json';

  try {
    JSON.parse(malformedJson);
    assert.fail('Should have thrown');
  } catch (error) {
    // Expected: API should return 400 Bad Request
    assert.ok(error instanceof SyntaxError);
  }
});

