/**
 * @fileoverview Universal Scene Config Tests
 * @description Tests for universal timing parameters and scheduling utilities
 */

'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');

const {
  UNIVERSAL_CONFIG_SCHEMA,
  isValidTimeFormat,
  isWithinSchedule,
  mergeSchemas,
  getDefaults,
} = require('../../lib/universal-scene-config');

// ============================================================================
// UNIVERSAL_CONFIG_SCHEMA Tests
// ============================================================================

describe('UNIVERSAL_CONFIG_SCHEMA', () => {
  it('should have all required timing parameters', () => {
    const expectedParams = [
      'renderInterval',
      'adaptiveTiming',
      'sceneTimeout',
      'scheduleEnabled',
      'scheduleStartTime',
      'scheduleEndTime',
      'scheduleWeekdays',
    ];

    expectedParams.forEach((param) => {
      assert.ok(
        UNIVERSAL_CONFIG_SCHEMA[param],
        `Schema should include ${param}`
      );
    });
  });

  it('should have proper default values', () => {
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.renderInterval.default, 250);
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.adaptiveTiming.default, true);
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.sceneTimeout.default, null);
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.scheduleEnabled.default, false);
    assert.deepStrictEqual(
      UNIVERSAL_CONFIG_SCHEMA.scheduleWeekdays.default,
      [0, 1, 2, 3, 4, 5, 6]
    );
  });

  it('should have proper type definitions', () => {
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.renderInterval.type, 'number');
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.adaptiveTiming.type, 'boolean');
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.scheduleWeekdays.type, 'array');
  });

  it('should have min/max constraints for numbers', () => {
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.renderInterval.min, 50);
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.renderInterval.max, 5000);
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.sceneTimeout.min, 1);
    assert.strictEqual(UNIVERSAL_CONFIG_SCHEMA.sceneTimeout.max, 1440);
  });
});

// ============================================================================
// isValidTimeFormat Tests
// ============================================================================

describe('isValidTimeFormat', () => {
  it('should accept valid HH:MM times', () => {
    const validTimes = ['00:00', '08:30', '12:00', '18:45', '23:59'];

    validTimes.forEach((time) => {
      assert.strictEqual(
        isValidTimeFormat(time),
        true,
        `${time} should be valid`
      );
    });
  });

  it('should reject invalid times', () => {
    const invalidTimes = [
      '24:00', // Hour too high
      '25:30', // Hour too high
      '12:60', // Minute too high
      '8:30', // Missing leading zero
      '08:5', // Missing leading zero in minutes
      '8:5', // Both missing leading zeros
      '12:00:00', // Seconds included
      '12', // No minutes
      'abc', // Not a time
      '', // Empty
      null, // Null
      undefined, // Undefined
      123, // Number
    ];

    invalidTimes.forEach((time) => {
      assert.strictEqual(
        isValidTimeFormat(time),
        false,
        `${time} should be invalid`
      );
    });
  });

  it('should accept edge case times', () => {
    assert.strictEqual(isValidTimeFormat('00:00'), true, 'Midnight');
    assert.strictEqual(isValidTimeFormat('23:59'), true, 'Last minute of day');
  });
});

// ============================================================================
// isWithinSchedule Tests
// ============================================================================

describe('isWithinSchedule', () => {
  describe('Simple schedules (same day)', () => {
    it('should return true when within schedule', () => {
      const schedule = {
        startTime: '08:00',
        endTime: '18:00',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      };

      // Test times within schedule
      const testTimes = [
        '2025-10-27T08:00:00', // Start boundary
        '2025-10-27T12:00:00', // Middle
        '2025-10-27T17:59:00', // Just before end
      ];

      testTimes.forEach((timeStr) => {
        const now = new Date(timeStr);
        assert.strictEqual(
          isWithinSchedule(schedule, now),
          true,
          `${timeStr} should be within schedule`
        );
      });
    });

    it('should return false when outside schedule', () => {
      const schedule = {
        startTime: '08:00',
        endTime: '18:00',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      };

      // Test times outside schedule
      const testTimes = [
        '2025-10-27T07:59:00', // Before start
        '2025-10-27T18:00:00', // At end (exclusive)
        '2025-10-27T22:00:00', // After end
        '2025-10-27T00:00:00', // Midnight
      ];

      testTimes.forEach((timeStr) => {
        const now = new Date(timeStr);
        assert.strictEqual(
          isWithinSchedule(schedule, now),
          false,
          `${timeStr} should be outside schedule`
        );
      });
    });
  });

  describe('Overnight schedules', () => {
    it('should handle schedules spanning midnight (22:00 - 06:00)', () => {
      const schedule = {
        startTime: '22:00',
        endTime: '06:00',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      };

      // Times that should be WITHIN schedule
      const withinTimes = [
        '2025-10-27T22:00:00', // Start
        '2025-10-27T23:30:00', // Late night
        '2025-10-28T00:00:00', // Midnight (next day)
        '2025-10-28T03:00:00', // Early morning
        '2025-10-28T05:59:00', // Just before end
      ];

      withinTimes.forEach((timeStr) => {
        const now = new Date(timeStr);
        assert.strictEqual(
          isWithinSchedule(schedule, now),
          true,
          `${timeStr} should be within overnight schedule`
        );
      });

      // Times that should be OUTSIDE schedule
      const outsideTimes = [
        '2025-10-27T06:00:00', // At end (exclusive)
        '2025-10-27T12:00:00', // Midday
        '2025-10-27T21:59:00', // Before start
      ];

      outsideTimes.forEach((timeStr) => {
        const now = new Date(timeStr);
        assert.strictEqual(
          isWithinSchedule(schedule, now),
          false,
          `${timeStr} should be outside overnight schedule`
        );
      });
    });
  });

  describe('Weekday filtering', () => {
    it('should respect weekday restrictions (Mon-Fri only)', () => {
      const schedule = {
        startTime: '08:00',
        endTime: '18:00',
        weekdays: [1, 2, 3, 4, 5], // Monday-Friday
      };

      // Monday 10:00 (should be within)
      assert.strictEqual(
        isWithinSchedule(schedule, new Date('2025-10-27T10:00:00')),
        true,
        'Monday should be within schedule'
      );

      // Sunday 10:00 (should be outside - wrong weekday)
      assert.strictEqual(
        isWithinSchedule(schedule, new Date('2025-10-26T10:00:00')),
        false,
        'Sunday should be outside schedule'
      );

      // Saturday 10:00 (should be outside - wrong weekday)
      assert.strictEqual(
        isWithinSchedule(schedule, new Date('2025-11-01T10:00:00')),
        false,
        'Saturday should be outside schedule'
      );
    });

    it('should handle weekend-only schedules', () => {
      const schedule = {
        startTime: '10:00',
        endTime: '20:00',
        weekdays: [0, 6], // Sunday and Saturday
      };

      // Sunday 12:00 (should be within)
      assert.strictEqual(
        isWithinSchedule(schedule, new Date('2025-10-26T12:00:00')),
        true,
        'Sunday should be within schedule'
      );

      // Monday 12:00 (should be outside - wrong weekday)
      assert.strictEqual(
        isWithinSchedule(schedule, new Date('2025-10-27T12:00:00')),
        false,
        'Monday should be outside weekend schedule'
      );
    });

    it('should handle single weekday schedules', () => {
      const schedule = {
        startTime: '08:00',
        endTime: '18:00',
        weekdays: [3], // Wednesday only
      };

      // Wednesday 10:00 (should be within)
      assert.strictEqual(
        isWithinSchedule(schedule, new Date('2025-10-29T10:00:00')),
        true,
        'Wednesday should be within schedule'
      );

      // Thursday 10:00 (should be outside)
      assert.strictEqual(
        isWithinSchedule(schedule, new Date('2025-10-30T10:00:00')),
        false,
        'Thursday should be outside Wednesday-only schedule'
      );
    });
  });

  describe('Edge cases', () => {
    it('should return false for incomplete schedule config', () => {
      // Missing endTime
      assert.strictEqual(
        isWithinSchedule({
          startTime: '08:00',
          weekdays: [1, 2, 3, 4, 5],
        }),
        false
      );

      // Missing startTime
      assert.strictEqual(
        isWithinSchedule({
          endTime: '18:00',
          weekdays: [1, 2, 3, 4, 5],
        }),
        false
      );

      // Null schedule
      assert.strictEqual(isWithinSchedule(null), false);

      // Undefined schedule
      assert.strictEqual(isWithinSchedule(undefined), false);
    });

    it('should handle empty weekdays array', () => {
      const schedule = {
        startTime: '08:00',
        endTime: '18:00',
        weekdays: [],
      };

      assert.strictEqual(
        isWithinSchedule(schedule, new Date('2025-10-27T10:00:00')),
        false,
        'Empty weekdays should never match'
      );
    });

    it('should use current time when now parameter omitted', () => {
      const schedule = {
        startTime: '00:00',
        endTime: '23:59',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      };

      // Should not throw and should return boolean
      const result = isWithinSchedule(schedule);
      assert.strictEqual(typeof result, 'boolean');
    });
  });
});

// ============================================================================
// mergeSchemas Tests
// ============================================================================

describe('mergeSchemas', () => {
  it('should merge universal and scene schemas', () => {
    const sceneSchema = {
      color: { type: 'color', default: [255, 0, 0, 255] },
      brightness: { type: 'number', default: 80, min: 0, max: 100 },
    };

    const merged = mergeSchemas(sceneSchema);

    // Should have universal params
    assert.ok(merged.renderInterval, 'Should have renderInterval');
    assert.ok(merged.adaptiveTiming, 'Should have adaptiveTiming');

    // Should have scene params
    assert.ok(merged.color, 'Should have color');
    assert.ok(merged.brightness, 'Should have brightness');
  });

  it('should handle null scene schema', () => {
    const merged = mergeSchemas(null);

    // Should have universal params
    assert.ok(merged.renderInterval);
    assert.ok(merged.adaptiveTiming);

    // Should not throw
    assert.ok(merged);
  });

  it('should allow scene schema to override universal params', () => {
    const sceneSchema = {
      renderInterval: { type: 'number', default: 500, min: 100, max: 1000 },
    };

    const merged = mergeSchemas(sceneSchema);

    // Scene override should take precedence
    assert.strictEqual(merged.renderInterval.default, 500);
    assert.strictEqual(merged.renderInterval.min, 100);
    assert.strictEqual(merged.renderInterval.max, 1000);
  });

  it('should preserve all universal params when scene has no conflicts', () => {
    const sceneSchema = {
      customParam: { type: 'string', default: 'test' },
    };

    const merged = mergeSchemas(sceneSchema);

    assert.strictEqual(merged.renderInterval.default, 250);
    assert.strictEqual(merged.adaptiveTiming.default, true);
    assert.strictEqual(merged.customParam.default, 'test');
  });
});

// ============================================================================
// getDefaults Tests
// ============================================================================

describe('getDefaults', () => {
  it('should extract default values from schema', () => {
    const schema = {
      param1: { type: 'number', default: 100 },
      param2: { type: 'boolean', default: true },
      param3: { type: 'string', default: 'test' },
    };

    const defaults = getDefaults(schema);

    assert.deepStrictEqual(defaults, {
      param1: 100,
      param2: true,
      param3: 'test',
    });
  });

  it('should handle null/undefined defaults', () => {
    const schema = {
      param1: { type: 'number', default: null },
      param2: { type: 'string', default: undefined },
    };

    const defaults = getDefaults(schema);

    assert.strictEqual(defaults.param1, null);
    assert.strictEqual(defaults.param2, undefined);
  });

  it('should return empty object for empty schema', () => {
    const defaults = getDefaults({});
    assert.deepStrictEqual(defaults, {});
  });

  it('should get all universal defaults', () => {
    const defaults = getDefaults(UNIVERSAL_CONFIG_SCHEMA);

    assert.strictEqual(defaults.renderInterval, 250);
    assert.strictEqual(defaults.adaptiveTiming, true);
    assert.strictEqual(defaults.sceneTimeout, null);
    assert.strictEqual(defaults.scheduleEnabled, false);
    assert.deepStrictEqual(defaults.scheduleWeekdays, [0, 1, 2, 3, 4, 5, 6]);
  });
});
