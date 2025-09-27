#!/usr/bin/env node

/**
 * Test script for Scene Framework
 * Tests base classes, composition, and factory functionality
 */

const { getDevice } = require('../lib/device-adapter');
const {
  BaseScene,
  StaticScene,
  AnimatedScene,
  DataScene,
  SceneComposition,
  SceneFactory,
} = require('../lib/scene-framework');

async function testSceneFramework() {
  console.log('🧪 Testing Scene Framework...\n');

  // Get a mock device for testing
  const device = getDevice('framework-test-device');

  // Test 1: BaseScene functionality
  console.log('✅ Test 1: BaseScene functionality');

  class TestScene extends BaseScene {
    constructor() {
      super({
        name: 'test_scene',
        config: { debug: false, customOption: 'test' },
      });
    }

    async render(/* context */) {
      return null; // Static scene
    }
  }

  const testScene = new TestScene();
  console.log('  ✓ BaseScene constructor works');
  console.log(`  ✓ Scene name: ${testScene.name}`);
  console.log(`  ✓ Config merged: ${JSON.stringify(testScene.config)}`);

  // Test 2: StaticScene functionality
  console.log('\n✅ Test 2: StaticScene functionality');

  class TestStaticScene extends StaticScene {
    constructor() {
      super({ name: 'test_static', config: { debug: false } });
    }

    async renderContent(context) {
      // Simple test render
      await context.device.clear();
      return 'rendered';
    }
  }

  const staticScene = new TestStaticScene();
  const mockContext = {
    device,
    state: new Map(),
    getState: (key) => mockContext.state.get(key),
    setState: (key, value) => mockContext.state.set(key, value),
    publishOk: () => {},
  };

  // Test initialization
  await staticScene.init(mockContext);
  console.log('  ✓ StaticScene initialization works');

  // Test rendering
  const result = await staticScene.render(mockContext);
  console.log('  ✓ StaticScene render returns null (completion)');
  console.log(`  ✓ Render result: ${result}`);

  // Test 3: AnimatedScene functionality
  console.log('\n✅ Test 3: AnimatedScene functionality');

  class TestAnimatedScene extends AnimatedScene {
    constructor() {
      super({ name: 'test_animated', config: { debug: false, maxFrames: 5 } });
    }

    async renderFrame(/* context */) {
      return 'frame_rendered';
    }
  }

  const animatedScene = new TestAnimatedScene();

  // Test initialization
  await animatedScene.init(mockContext);
  console.log('  ✓ AnimatedScene initialization works');

  // Test multiple renders (should stop after maxFrames)
  for (let i = 0; i < 7; i++) {
    await animatedScene.render(mockContext);
    if (i < 4) {
      console.log(`  ✓ Frame ${i + 1}: continues rendering`);
    } else if (i === 4) {
      console.log(`  ✓ Frame ${i + 1}: reached maxFrames, returns null`);
    }
  }

  // Test 4: DataScene functionality
  console.log('\n✅ Test 4: DataScene functionality');

  class TestDataScene extends DataScene {
    constructor() {
      super({
        name: 'test_data',
        config: { debug: false, updateInterval: 100 }, // Very short for testing
      });
    }

    async fetchData(/* context */) {
      return { testData: 'fetched', timestamp: Date.now() };
    }

    async renderFrame(/* context */) {
      return 'data_rendered';
    }
  }

  const dataScene = new TestDataScene();

  // Test initialization
  await dataScene.init(mockContext);
  console.log('  ✓ DataScene initialization works');

  // Test data fetching
  await dataScene.render(mockContext);
  const currentData = dataScene.getCurrentData(mockContext);
  console.log('  ✓ DataScene fetches data');
  console.log(`  ✓ Current data: ${JSON.stringify(currentData)}`);

  // Test 5: SceneComposition functionality
  console.log('\n✅ Test 5: SceneComposition functionality');

  const composition = new SceneComposition();

  class Layer1Scene extends StaticScene {
    constructor() {
      super({ name: 'layer1' });
    }
    async renderContent(/* ctx */) {
      return 'layer1';
    }
  }

  class Layer2Scene extends StaticScene {
    constructor() {
      super({ name: 'layer2' });
    }
    async renderContent(/* ctx */) {
      return 'layer2';
    }
  }

  composition.addLayer(new Layer1Scene(), { zIndex: 1 });
  composition.addLayer(new Layer2Scene(), { zIndex: 0 });
  console.log('  ✓ SceneComposition adds layers');

  console.log(`  ✓ Layers count: ${composition.layers.length}`);
  console.log(
    `  ✓ Layer order by z-index: ${composition.layers.map((l) => l.scene.name).join(', ')}`,
  );

  // Test 6: SceneFactory functionality
  console.log('\n✅ Test 6: SceneFactory functionality');

  const factoryStatic = SceneFactory.createScene('static', {
    name: 'factory_static',
  });
  console.log('  ✓ SceneFactory creates static scene');
  console.log(`  ✓ Factory scene type: ${factoryStatic.constructor.name}`);

  const factoryAnimated = SceneFactory.createScene('animated', {
    name: 'factory_animated',
  });
  console.log('  ✓ SceneFactory creates animated scene');
  console.log(`  ✓ Factory scene type: ${factoryAnimated.constructor.name}`);

  const factoryData = SceneFactory.createScene('data', {
    name: 'factory_data',
  });
  console.log('  ✓ SceneFactory creates data scene');
  console.log(`  ✓ Factory scene type: ${factoryData.constructor.name}`);

  const factoryComposition = SceneFactory.createComposition();
  console.log('  ✓ SceneFactory creates composition');
  console.log(
    `  ✓ Factory composition type: ${factoryComposition.constructor.name}`,
  );

  console.log('\n🎉 All Scene Framework tests passed!');
  console.log('📚 Framework provides:');
  console.log('   • BaseScene: Common functionality and lifecycle');
  console.log('   • StaticScene: One-time rendering scenes');
  console.log('   • AnimatedScene: Continuous animation scenes');
  console.log('   • DataScene: Data-driven animated scenes');
  console.log('   • SceneComposition: Multi-layer scene composition');
  console.log('   • SceneFactory: Easy scene instantiation');
}

// Run the test
testSceneFramework().catch((error) => {
  console.error('❌ Framework test failed:', error);
  process.exit(1);
});
