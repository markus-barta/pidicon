/**
 * @fileoverview SchedulerService Tests
 * @description Tests for time-based scene scheduling service
 */

'use strict';

const assert = require('node:assert');
const { describe, it, beforeEach, afterEach } = require('node:test');

const SchedulerService = require('../../../lib/services/scheduler-service');

// ============================================================================
// Mock Factories
// ============================================================================

function createMockLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    ok: () => {},
  };
}

function createMockSceneService() {
  return {
    getCurrentScene: async () => ({ currentScene: null }),
    switchToScene: async () => ({ success: true }),
    stopScene: async () => ({ success: true }),
  };
}

function createMockDeviceConfigStore(devices = []) {
  return {
    getAllDevices: () => devices,
  };
}

// ============================================================================
// Constructor Tests
// ============================================================================

describe('SchedulerService - Constructor', () => {
  it('should require logger', () => {
    assert.throws(
      () => {
        new SchedulerService({
          sceneService: createMockSceneService(),
          deviceConfigStore: createMockDeviceConfigStore(),
        });
      },
      /logger is required/,
      'Should throw when logger missing'
    );
  });

  it('should require sceneService', () => {
    assert.throws(
      () => {
        new SchedulerService({
          logger: createMockLogger(),
          deviceConfigStore: createMockDeviceConfigStore(),
        });
      },
      /sceneService is required/,
      'Should throw when sceneService missing'
    );
  });

  it('should require deviceConfigStore', () => {
    assert.throws(
      () => {
        new SchedulerService({
          logger: createMockLogger(),
          sceneService: createMockSceneService(),
        });
      },
      /deviceConfigStore is required/,
      'Should throw when deviceConfigStore missing'
    );
  });

  it('should initialize with all dependencies', () => {
    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService: createMockSceneService(),
      deviceConfigStore: createMockDeviceConfigStore(),
    });

    assert.ok(scheduler);
    assert.strictEqual(scheduler.running, false);
    assert.strictEqual(scheduler.checkInterval, null);
  });
});

// ============================================================================
// Start/Stop Tests
// ============================================================================

describe('SchedulerService - Start/Stop', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService: createMockSceneService(),
      deviceConfigStore: createMockDeviceConfigStore(),
    });
  });

  // Cleanup: stop scheduler after each test to prevent hanging
  afterEach(() => {
    if (scheduler && scheduler.running) {
      scheduler.stop();
    }
  });

  it('should start scheduler', () => {
    scheduler.start();

    assert.strictEqual(scheduler.running, true);
    assert.ok(scheduler.checkInterval, 'Should have interval set');

    // Clean up immediately
    scheduler.stop();
  });

  it('should not start if already running', () => {
    scheduler.start();
    const firstInterval = scheduler.checkInterval;

    scheduler.start(); // Try to start again

    assert.strictEqual(
      scheduler.checkInterval,
      firstInterval,
      'Should keep same interval'
    );

    // Clean up
    scheduler.stop();
  });

  it('should stop scheduler', () => {
    scheduler.start();
    assert.strictEqual(scheduler.running, true);

    scheduler.stop();

    assert.strictEqual(scheduler.running, false);
    assert.strictEqual(scheduler.checkInterval, null);
  });

  it('should handle stop when not running', () => {
    scheduler.stop(); // Should not throw
    assert.strictEqual(scheduler.running, false);
  });

  it('should report running status', () => {
    assert.strictEqual(scheduler.isRunning(), false);

    scheduler.start();
    assert.strictEqual(scheduler.isRunning(), true);

    scheduler.stop();
    assert.strictEqual(scheduler.isRunning(), false);
  });
});

// ============================================================================
// Schedule Checking Tests
// ============================================================================

describe('SchedulerService - Schedule Checking', () => {
  it('should activate scene when within schedule', async () => {
    let switchedScene = null;
    let switchedIp = null;

    const sceneService = {
      getCurrentScene: async () => ({ currentScene: null }),
      switchToScene: async (ip, scene) => {
        switchedIp = ip;
        switchedScene = scene;
        return { success: true };
      },
      stopScene: async () => ({ success: true }),
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          testScene: {
            scheduleEnabled: true,
            scheduleStartTime: '00:00',
            scheduleEndTime: '23:59',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6], // All days
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    // With 00:00-23:59 schedule, should always activate
    await scheduler.checkSchedules();

    assert.strictEqual(switchedIp, '192.168.1.100');
    assert.strictEqual(switchedScene, 'testScene');
  });

  it('should not activate scene when outside schedule time', async () => {
    let switchCalled = false;

    const sceneService = {
      getCurrentScene: async () => ({ currentScene: null }),
      switchToScene: async () => {
        switchCalled = true;
        return { success: true };
      },
      stopScene: async () => ({ success: true }),
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          testScene: {
            scheduleEnabled: true,
            scheduleStartTime: '22:00', // 10 PM
            scheduleEndTime: '23:00', // 11 PM
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    await scheduler.checkSchedules();

    assert.strictEqual(
      switchCalled,
      false,
      'Should not switch when outside schedule'
    );
  });

  it('should not activate scene when schedule disabled', async () => {
    let switchCalled = false;

    const sceneService = {
      getCurrentScene: async () => ({ currentScene: null }),
      switchToScene: async () => {
        switchCalled = true;
        return { success: true };
      },
      stopScene: async () => ({ success: true }),
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          testScene: {
            scheduleEnabled: false, // Disabled
            scheduleStartTime: '08:00',
            scheduleEndTime: '18:00',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    await scheduler.checkSchedules();

    assert.strictEqual(
      switchCalled,
      false,
      'Should not switch when schedule disabled'
    );
  });

  it('should not activate if scene already active', async () => {
    let switchCalled = false;

    const sceneService = {
      getCurrentScene: async () => ({ currentScene: 'testScene' }), // Already active
      switchToScene: async () => {
        switchCalled = true;
        return { success: true };
      },
      stopScene: async () => ({ success: true }),
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          testScene: {
            scheduleEnabled: true,
            scheduleStartTime: '00:00',
            scheduleEndTime: '23:59',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    await scheduler.checkSchedules();

    assert.strictEqual(
      switchCalled,
      false,
      'Should not switch if scene already active'
    );
  });

  it('should deactivate scene when outside schedule', async () => {
    let stopCalled = false;

    const sceneService = {
      getCurrentScene: async () => ({ currentScene: 'testScene' }), // Scene is active
      switchToScene: async () => ({ success: true }),
      stopScene: async () => {
        stopCalled = true;
        return { success: true };
      },
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          testScene: {
            scheduleEnabled: true,
            scheduleStartTime: '22:00', // 10 PM (not now)
            scheduleEndTime: '23:00', // 11 PM
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    await scheduler.checkSchedules();

    assert.strictEqual(stopCalled, true, 'Should stop scene outside schedule');
  });

  it('should skip scenes with missing schedule times', async () => {
    let switchCalled = false;

    const sceneService = {
      getCurrentScene: async () => ({ currentScene: null }),
      switchToScene: async () => {
        switchCalled = true;
        return { success: true };
      },
      stopScene: async () => ({ success: true }),
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          testScene: {
            scheduleEnabled: true,
            // Missing startTime and endTime
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    await scheduler.checkSchedules();

    assert.strictEqual(
      switchCalled,
      false,
      'Should skip scene with missing schedule times'
    );
  });
});

// ============================================================================
// Multi-Device Tests
// ============================================================================

describe('SchedulerService - Multiple Devices', () => {
  it('should handle multiple devices independently', async () => {
    const switchedScenes = [];

    const sceneService = {
      getCurrentScene: async () => ({ currentScene: null }),
      switchToScene: async (ip, scene) => {
        switchedScenes.push({ ip, scene });
        return { success: true };
      },
      stopScene: async () => ({ success: true }),
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          scene1: {
            scheduleEnabled: true,
            scheduleStartTime: '00:00',
            scheduleEndTime: '23:59',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
      {
        ip: '192.168.1.101',
        sceneDefaults: {
          scene2: {
            scheduleEnabled: true,
            scheduleStartTime: '00:00',
            scheduleEndTime: '23:59',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    await scheduler.checkSchedules();

    assert.strictEqual(switchedScenes.length, 2);
    assert.strictEqual(switchedScenes[0].ip, '192.168.1.100');
    assert.strictEqual(switchedScenes[0].scene, 'scene1');
    assert.strictEqual(switchedScenes[1].ip, '192.168.1.101');
    assert.strictEqual(switchedScenes[1].scene, 'scene2');
  });

  it('should continue checking other devices if one fails', async () => {
    const switchedScenes = [];

    const sceneService = {
      getCurrentScene: async (_ip) => ({ currentScene: null }),
      switchToScene: async (ip, scene) => {
        if (ip === '192.168.1.100') {
          throw new Error('Device error');
        }
        switchedScenes.push({ ip, scene });
        return { success: true };
      },
      stopScene: async () => ({ success: true }),
    };

    const devices = [
      {
        ip: '192.168.1.100', // Will fail
        sceneDefaults: {
          scene1: {
            scheduleEnabled: true,
            scheduleStartTime: '00:00',
            scheduleEndTime: '23:59',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
      {
        ip: '192.168.1.101', // Should still work
        sceneDefaults: {
          scene2: {
            scheduleEnabled: true,
            scheduleStartTime: '00:00',
            scheduleEndTime: '23:59',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    await scheduler.checkSchedules();

    // Should have switched second device despite first failing
    assert.strictEqual(switchedScenes.length, 1);
    assert.strictEqual(switchedScenes[0].ip, '192.168.1.101');
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('SchedulerService - Error Handling', () => {
  it('should handle scene service errors gracefully', async () => {
    const sceneService = {
      getCurrentScene: async () => {
        throw new Error('Service error');
      },
      switchToScene: async () => ({ success: true }),
      stopScene: async () => ({ success: true }),
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          testScene: {
            scheduleEnabled: true,
            scheduleStartTime: '00:00',
            scheduleEndTime: '23:59',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    // Should not throw
    await scheduler.checkSchedules();
  });

  it('should handle deviceConfigStore errors', async () => {
    const deviceConfigStore = {
      getAllDevices: () => {
        throw new Error('Config error');
      },
    };

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService: createMockSceneService(),
      deviceConfigStore,
    });

    // Should throw (critical error)
    await assert.rejects(
      async () => {
        await scheduler.checkSchedules();
      },
      /Config error/,
      'Should propagate critical errors'
    );
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('SchedulerService - Integration', () => {
  it('should handle complete schedule lifecycle', async () => {
    const events = [];

    const sceneService = {
      getCurrentScene: async (_ip) => {
        return { currentScene: events.length > 0 ? 'testScene' : null };
      },
      switchToScene: async (ip, scene) => {
        events.push({ action: 'switch', ip, scene });
        return { success: true };
      },
      stopScene: async (ip) => {
        events.push({ action: 'stop', ip });
        return { success: true };
      },
    };

    const devices = [
      {
        ip: '192.168.1.100',
        sceneDefaults: {
          testScene: {
            scheduleEnabled: true,
            scheduleStartTime: '00:00',
            scheduleEndTime: '23:59',
            scheduleWeekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      },
    ];

    const scheduler = new SchedulerService({
      logger: createMockLogger(),
      sceneService,
      deviceConfigStore: createMockDeviceConfigStore(devices),
    });

    // First check: should activate
    await scheduler.checkSchedules();

    // Second check: already active, should do nothing
    await scheduler.checkSchedules();

    assert.strictEqual(events.length, 1, 'Should only switch once');
    assert.strictEqual(events[0].action, 'switch');
  });
});
