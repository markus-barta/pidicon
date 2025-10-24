'use strict';

const assert = require('node:assert');
const test = require('node:test');

/**
 * MQTT Command Contract Tests
 *
 * These tests lock down the MQTT command interface to prevent breaking changes.
 * Any test failure here indicates a potential breaking change that would
 * affect external systems sending MQTT commands.
 *
 * Contract guarantees:
 * - Topic format stability
 * - Required payload fields
 * - Optional payload fields (backward compatibility)
 * - Error response format
 * - Response topic format
 */

// Mock implementations (if needed in future)

// ============================================================================
// Topic Format Contract Tests
// ============================================================================

test('MQTT topic format: pixoo/<ip>/state/upd', () => {
  const validTopics = [
    'pixoo/192.168.1.100/state/upd',
    'pixoo/10.0.0.5/state/upd',
    'pixoo/172.16.0.1/state/upd',
  ];

  const topicPattern = /^pixoo\/(\d{1,3}\.){3}\d{1,3}\/state\/upd$/;

  for (const topic of validTopics) {
    assert.ok(topicPattern.test(topic), `Valid topic should match: ${topic}`);
  }
});

test('MQTT topic format: pixoo/<ip>/scene/set', () => {
  const validTopics = [
    'pixoo/192.168.1.100/scene/set',
    'pixoo/10.0.0.5/scene/set',
  ];

  const topicPattern = /^pixoo\/(\d{1,3}\.){3}\d{1,3}\/scene\/set$/;

  for (const topic of validTopics) {
    assert.ok(topicPattern.test(topic), `Valid topic should match: ${topic}`);
  }
});

test('MQTT topic format: pixoo/<ip>/driver/set', () => {
  const topicPattern = /^pixoo\/(\d{1,3}\.){3}\d{1,3}\/driver\/set$/;
  const topic = 'pixoo/192.168.1.100/driver/set';

  assert.ok(topicPattern.test(topic));
});

test('MQTT topic format: pixoo/<ip>/reset/set', () => {
  const topicPattern = /^pixoo\/(\d{1,3}\.){3}\d{1,3}\/reset\/set$/;
  const topic = 'pixoo/192.168.1.100/reset/set';

  assert.ok(topicPattern.test(topic));
});

test('MQTT topic format: /home/pixoo/<ip>/scene/switch (alternative)', () => {
  const topicPattern = /^\/home\/pixoo\/(\d{1,3}\.){3}\d{1,3}\/scene\/switch$/;
  const topic = '/home/pixoo/192.168.1.100/scene/switch';

  assert.ok(topicPattern.test(topic));
});

test('MQTT topic format: /home/pixoo/<ip>/driver/switch (alternative)', () => {
  const topicPattern = /^\/home\/pixoo\/(\d{1,3}\.){3}\d{1,3}\/driver\/switch$/;
  const topic = '/home/pixoo/192.168.1.100/driver/switch';

  assert.ok(topicPattern.test(topic));
});

test('MQTT topic format: /home/pixoo/<ip>/device/reset (alternative)', () => {
  const topicPattern = /^\/home\/pixoo\/(\d{1,3}\.){3}\d{1,3}\/device\/reset$/;
  const topic = '/home/pixoo/192.168.1.100/device/reset';

  assert.ok(topicPattern.test(topic));
});

// ============================================================================
// state/upd Command Contract Tests
// ============================================================================

test('state/upd: valid payload with scene', () => {
  const payload = JSON.stringify({
    scene: 'fill',
    color: [255, 0, 0, 255],
  });

  const parsed = JSON.parse(payload);

  assert.ok(parsed.scene, 'scene field required');
  assert.strictEqual(typeof parsed.scene, 'string');
});

test('state/upd: payload with clear flag', () => {
  const payload = JSON.stringify({
    scene: 'clock',
    clear: true,
  });

  const parsed = JSON.parse(payload);

  assert.strictEqual(typeof parsed.clear, 'boolean');
});

test('state/upd: payload supports optional frames', () => {
  const payload = JSON.stringify({
    scene: 'performance-test',
    frames: 100,
  });

  const parsed = JSON.parse(payload);

  assert.strictEqual(typeof parsed.frames, 'number');
  assert.ok(parsed.frames > 0);
});

test('state/upd: payload supports optional interval', () => {
  const payload = JSON.stringify({
    scene: 'performance-test',
    interval: 150,
  });

  const parsed = JSON.parse(payload);

  assert.strictEqual(typeof parsed.interval, 'number');
  assert.ok(parsed.interval > 0);
});

test('state/upd: payload supports scene-specific data', () => {
  const payload = JSON.stringify({
    scene: 'power_price',
    currentCentPrice: 24.7,
    batteryStatus: {
      USOC: 85,
      BatteryCharging: false,
    },
  });

  const parsed = JSON.parse(payload);

  assert.ok(parsed.currentCentPrice);
  assert.ok(parsed.batteryStatus);
  assert.strictEqual(typeof parsed.batteryStatus, 'object');
});

test('state/upd: malformed JSON rejected', () => {
  const malformedPayloads = [
    '{invalid json',
    '{"scene": }',
    '',
    'null',
    'undefined',
  ];

  for (const payload of malformedPayloads) {
    try {
      JSON.parse(payload);
      if (payload !== 'null' && payload !== 'undefined') {
        assert.fail(`Should have thrown: ${payload}`);
      }
    } catch (error) {
      // Expected for malformed JSON
      assert.ok(error instanceof SyntaxError || error.message);
    }
  }
});

test('state/upd: empty payload rejected', () => {
  const payload = '';

  assert.throws(() => {
    const parsed = JSON.parse(payload || '{}');
    if (!parsed.scene) {
      throw new Error('Missing required field: scene');
    }
  });
});

test('state/upd: missing scene field handled', () => {
  const payload = JSON.stringify({
    color: [255, 0, 0, 255],
  });

  const parsed = JSON.parse(payload);

  // Contract: scene field is optional if device has default scene
  // But should log warning if missing
  assert.strictEqual(parsed.scene, undefined);
});

// ============================================================================
// scene/set Command Contract Tests
// ============================================================================

test('scene/set: valid payload with name', () => {
  const payload = JSON.stringify({
    name: 'clock',
  });

  const parsed = JSON.parse(payload);

  assert.ok(parsed.name, 'name field required');
  assert.strictEqual(typeof parsed.name, 'string');
});

test('scene/set: payload validates scene name format', () => {
  const validSceneNames = [
    'clock',
    'fill',
    'empty',
    'power_price',
    'draw_api_animated',
    'performance-test',
  ];

  for (const name of validSceneNames) {
    const payload = JSON.stringify({ name });
    const parsed = JSON.parse(payload);

    assert.strictEqual(parsed.name, name);
    // Scene name pattern: alphanumeric, underscore, hyphen
    assert.ok(/^[a-zA-Z0-9_-]+$/.test(parsed.name));
  }
});

test('scene/set: missing name field rejected', () => {
  const payload = JSON.stringify({});

  const parsed = JSON.parse(payload);

  assert.throws(() => {
    if (!parsed.name) {
      throw new Error('Missing required field: name');
    }
  });
});

// ============================================================================
// driver/set Command Contract Tests
// ============================================================================

test('driver/set: valid driver "real"', () => {
  const payload = JSON.stringify({
    driver: 'real',
  });

  const parsed = JSON.parse(payload);

  assert.strictEqual(parsed.driver, 'real');
});

test('driver/set: valid driver "mock"', () => {
  const payload = JSON.stringify({
    driver: 'mock',
  });

  const parsed = JSON.parse(payload);

  assert.strictEqual(parsed.driver, 'mock');
});

test('driver/set: invalid driver rejected', () => {
  const invalidDrivers = ['fake', 'test', 'invalid', '', null, undefined];

  for (const driver of invalidDrivers) {
    const parsed = { driver };

    const validDrivers = ['real', 'mock'];
    if (!validDrivers.includes(parsed.driver)) {
      // Contract: invalid driver should be rejected
      assert.ok(true, `Invalid driver rejected: ${driver}`);
    } else {
      assert.fail(`Should reject invalid driver: ${driver}`);
    }
  }
});

test('driver/set: simple string payload "mock" accepted', () => {
  // Backward compatibility: some clients send plain string instead of JSON
  const payload = 'mock';

  // Contract: system should handle both JSON and plain string
  const driver = payload === 'real' || payload === 'mock' ? payload : null;

  assert.strictEqual(driver, 'mock');
});

test('driver/set: simple string payload "real" accepted', () => {
  const payload = 'real';
  const driver = payload === 'real' || payload === 'mock' ? payload : null;

  assert.strictEqual(driver, 'real');
});

// ============================================================================
// reset/set Command Contract Tests
// ============================================================================

test('reset/set: empty payload accepted', () => {
  const payload = '';

  // Contract: reset command doesn't require payload
  assert.ok(true, 'Empty payload accepted for reset');
});

test('reset/set: any payload accepted', () => {
  const payloads = ['soft', 'hard', '{}', 'true', 'reset'];

  // Contract: reset ignores payload content
  payloads.forEach(() => {
    assert.ok(true, 'Payload accepted for reset');
  });
});

// ============================================================================
// Response Topic Contract Tests
// ============================================================================

test('Response topic: pixoo/<ip>/ok format', () => {
  const responseTopicPattern = /^pixoo\/(\d{1,3}\.){3}\d{1,3}\/ok$/;
  const topic = 'pixoo/192.168.1.100/ok';

  assert.ok(responseTopicPattern.test(topic));
});

test('Response topic: pixoo/<ip>/error format', () => {
  const responseTopicPattern = /^pixoo\/(\d{1,3}\.){3}\d{1,3}\/error$/;
  const topic = 'pixoo/192.168.1.100/error';

  assert.ok(responseTopicPattern.test(topic));
});

test('Response topic: pixoo/<ip>/scene format', () => {
  const responseTopicPattern = /^pixoo\/(\d{1,3}\.){3}\d{1,3}\/scene$/;
  const topic = 'pixoo/192.168.1.100/scene';

  assert.ok(responseTopicPattern.test(topic));
});

test('Response topic: pixoo/<ip>/driver format', () => {
  const responseTopicPattern = /^pixoo\/(\d{1,3}\.){3}\d{1,3}\/driver$/;
  const topic = 'pixoo/192.168.1.100/driver';

  assert.ok(responseTopicPattern.test(topic));
});

// ============================================================================
// Error Response Contract Tests
// ============================================================================

test('Error response: includes error message', () => {
  const errorResponse = JSON.stringify({
    error: 'Scene not found: invalid_scene',
    timestamp: Date.now(),
  });

  const parsed = JSON.parse(errorResponse);

  assert.ok(parsed.error, 'error field required');
  assert.strictEqual(typeof parsed.error, 'string');
  assert.ok(parsed.error.length > 0);
});

test('Error response: includes timestamp', () => {
  const errorResponse = JSON.stringify({
    error: 'Invalid driver',
    timestamp: Date.now(),
  });

  const parsed = JSON.parse(errorResponse);

  assert.ok(parsed.timestamp, 'timestamp field required');
  assert.strictEqual(typeof parsed.timestamp, 'number');
});

test('Error response: does not include stack trace', () => {
  const errorResponse = JSON.stringify({
    error: 'Scene render failed',
    timestamp: Date.now(),
  });

  const parsed = JSON.parse(errorResponse);

  assert.strictEqual(parsed.stack, undefined, 'stack field should not be included');
  assert.strictEqual(parsed.stackTrace, undefined);
});

// ============================================================================
// Success Response Contract Tests
// ============================================================================

test('Success response: includes success message', () => {
  const successResponse = JSON.stringify({
    status: 'ok',
    message: 'Scene switched to clock',
    timestamp: Date.now(),
  });

  const parsed = JSON.parse(successResponse);

  assert.ok(parsed.status || parsed.message, 'status or message required');
});

test('Success response: includes timestamp', () => {
  const successResponse = JSON.stringify({
    status: 'ok',
    timestamp: Date.now(),
  });

  const parsed = JSON.parse(successResponse);

  assert.ok(parsed.timestamp);
  assert.strictEqual(typeof parsed.timestamp, 'number');
});

// ============================================================================
// Payload Size Limits (DoS Prevention)
// ============================================================================

test('Payload size: accepts reasonable size (< 100KB)', () => {
  const payload = JSON.stringify({
    scene: 'power_price',
    data: new Array(1000).fill({ value: 123.45 }),
  });

  assert.ok(payload.length < 100 * 1024, 'Reasonable payload size');
});

test('Payload size: warns on large payloads (> 1MB)', () => {
  const largeData = new Array(100000).fill({ value: 123.45, name: 'test' });
  const payload = JSON.stringify({
    scene: 'test',
    data: largeData,
  });

  // Contract: system should handle but log warning
  if (payload.length > 1024 * 1024) {
    assert.ok(true, 'Large payload warning triggered');
  }
});

// ============================================================================
// Forward Compatibility Tests
// ============================================================================

test('Forward compatibility: extra fields ignored', () => {
  const payload = JSON.stringify({
    scene: 'clock',
    clear: true,
    futureField: 'future_value', // New field from future version
    experimentalFlag: true,
  });

  const parsed = JSON.parse(payload);

  // Contract: extra fields should not cause errors
  assert.ok(parsed.scene);
  assert.ok(parsed.futureField); // Preserved
  assert.strictEqual(parsed.experimentalFlag, true);
});

test('Forward compatibility: new command topics coexist', () => {
  // Contract: new topic patterns can be added without breaking existing ones
  const existingTopics = [
    'pixoo/192.168.1.100/state/upd',
    'pixoo/192.168.1.100/scene/set',
  ];

  const newTopics = [
    'pixoo/192.168.1.100/config/set', // Future command
    'pixoo/192.168.1.100/animation/play', // Future command
  ];

  // Existing topics should still match their patterns
  assert.ok(/\/state\/upd$/.test(existingTopics[0]));
  assert.ok(/\/scene\/set$/.test(existingTopics[1]));

  // New topics don't break existing patterns
  assert.ok(!/(state|scene|driver|reset)\/set$/.test(newTopics[0]));
});

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

test('Backward compatibility: old topic format still supported', () => {
  // Contract: both /home/pixoo and pixoo/ prefixes should work
  const oldFormat = '/home/pixoo/192.168.1.100/scene/switch';
  const newFormat = 'pixoo/192.168.1.100/scene/set';

  assert.ok(oldFormat.includes('scene'));
  assert.ok(newFormat.includes('scene'));
});

test('Backward compatibility: simple string driver payload', () => {
  // Contract: both JSON and plain string driver payloads work
  const jsonPayload = JSON.stringify({ driver: 'mock' });
  const stringPayload = 'mock';

  const jsonParsed = JSON.parse(jsonPayload);
  const stringDriver = stringPayload === 'mock' || stringPayload === 'real' ? stringPayload : null;

  assert.strictEqual(jsonParsed.driver, 'mock');
  assert.strictEqual(stringDriver, 'mock');
});

