# Scene Development Best Practices

## 🚨 **CRITICAL: Scene Registration**

### **❌ Common Mistake: Scene Not Registered**

- **Problem**: Scene placed in `scenes/examples/` but not loaded
- **Error**: `⚠ [WARN] No renderer found for scene: scene_name`
- **Root Cause**: Scenes must be explicitly registered with SceneManager

### **✅ How Scenes Are Loaded**

**Automatic Loading Locations:**

```javascript
// daemon.js automatically loads from:
✅ ./scenes/*.js                    // Main scenes
✅ ./scenes/examples/*.js          // Example/demo scenes
❌ ./scenes/subdir/*.js            // NOT loaded automatically
❌ ./scenes/examples/subdir/*.js   // NOT loaded automatically
```

**Scene Registration Process:**

```javascript
// In daemon.js - happens automatically on startup
sceneManager.registerScene(sceneName, sceneModule);

// Scene name derived from:
const sceneName = sceneModule.name || path.basename(file, '.js');
```

### **🔧 Scene Development Workflow**

#### **1. Create Scene File**

```javascript
// ✅ Correct locations:
scenes/my_scene.js              // Main production scene
scenes/examples/my_demo.js      // Demo/example scene

// ❌ Wrong locations:
scenes/demos/my_demo.js         // Won't be loaded!
scenes/examples/demos/...       // Won't be loaded!
```

#### **2. Required Scene Interface**

```javascript
class MyScene {
  constructor() {
    this.name = 'my_scene'; // ✅ Required: matches filename
  }

  async init(context) {
    // Optional: Called once when scene starts
  }

  async render(context) {
    // ✅ Required: Main render loop
    // Return delay in milliseconds or null to stop
    return 200; // ~5fps
  }

  async cleanup(context) {
    // Optional: Called when scene stops
  }
}

module.exports = MyScene; // ✅ Required
```

#### **3. Push Frames to Display**

```javascript
async render(context) {
  // Draw your scene content
  await context.device.clear();
  await context.device.fillRect([0, 0], [64, 64], [255, 0, 0, 255]);

  // ❌ FORGETTING THIS = BLANK SCREEN!
  await context.device.push('my_scene', context.publishOk);

  return 200; // Delay until next frame
}
```

**CRITICAL**: Every render method **MUST** call `await device.push(sceneName, publishOk)` at the end!

- Without push, nothing appears on screen despite successful rendering
- Scene initializes, logs show success, but display stays blank
- This is the #1 reason scenes appear "broken"

#### **4. Test Scene Registration**

```bash
# 1. Start daemon and check logs
npm start

# 2. Look for these lines in startup logs:
✅ Scene registered: my_scene
✅ Loaded example scene: my_demo

# 3. Test scene switching
mosquitto_pub -h $HOST -t "pixoo/$DEVICE/state/upd" -m '{"scene":"my_scene"}'

# 4. If you get "No renderer found" - scene not registered!
```

#### **5. Debug Registration Issues**

```bash
# Check if file exists and is valid JS
node -e "console.log(require('./scenes/examples/graphics_engine_demo.js'))"

# Check daemon startup logs for registration errors
grep "Failed to load scene" logs/*.log

# Verify scene interface
node -e "
const scene = require('./scenes/examples/graphics_engine_demo.js');
console.log('Name:', scene.name);
console.log('Has render:', typeof scene.prototype?.render === 'function');
console.log('Has init:', typeof scene.prototype?.init === 'function');
"
```

### **📁 Scene File Organization**

```text
scenes/
├── startup.js         # ✅ Auto-loaded (main)
├── empty.js           # ✅ Auto-loaded (main)
├── power_price.js     # ✅ Auto-loaded (main)
├── advanced_chart.js  # ✅ Auto-loaded (main)
└── examples/          # ✅ Auto-loaded directory
    ├── draw_api_animated.js
    ├── draw_api.js
    ├── performance-test.js
    ├── framework-static-demo.js
    ├── framework-animated-demo.js
    ├── framework-data-demo.js
    └── graphics-engine-demo.js  # ✅ Auto-loaded (configurable)
```

## 🎨 **CONFIGURABLE CONSTANTS - No More Magic Numbers!**

### **✅ Why Configurable Constants?**

Modern scenes should use **configurable constants** instead of hardcoded "magic numbers":

- **🔧 Easy Adaptation**: Change display dimensions without rewriting code
- **📱 Scalability**: Support larger displays (128x128, 256x256, etc.)
- **🎯 Maintainability**: Single source of truth for all positioning and timing
- **🧪 Testability**: Easy to modify values for testing different scenarios
- **📚 Documentation**: Self-documenting code with clear intent

### **🚀 Graphics Engine Demo - Configuration Example**

```javascript
// Configuration constants - no more magic numbers!
const GFX_DEMO_CONFIG = {
  // Display dimensions
  DISPLAY: {
    WIDTH: 64, // ← Change this for larger displays
    HEIGHT: 64,
    CENTER_X: 32,
    CENTER_Y: 32,
  },

  // Timing and animation
  TIMING: {
    PHASE_DURATION_FRAMES: 60, // ~12 seconds at 5fps
    FADE_IN_DURATION_MS: 1000,
    FADE_OUT_DURATION_MS: 3000,
  },

  // Text effects phase
  TEXT_EFFECTS: {
    TITLE_POSITION: [32, 8],
    TITLE_COLOR: [255, 255, 255, 255],
    SHADOW_COLOR: [100, 100, 255, 255],
    // ... more config
  },

  // Animations phase
  ANIMATIONS: {
    BOUNCE_AREA: {
      MIN_Y: 24,
      MAX_Y: 48,
      START_Y: 32,
    },
    BOUNCE_SPEED: 2.0,
    RAINBOW_TEXT: {
      START_X: -20,
      END_X: 50,
      SPEED: 1.5,
    },
    // ... more config
  },
};

// Usage in render methods:
const ballX = GFX_DEMO_CONFIG.DISPLAY.CENTER_X; // Instead of: const ballX = 32;
this.bounceSpeed = GFX_DEMO_CONFIG.ANIMATIONS.BOUNCE_SPEED; // Instead of: 2.0
```

### **📏 Configuration Structure Guidelines**

**1. Display Properties:**

```javascript
DISPLAY: {
  WIDTH: 64, HEIGHT: 64,        // Canvas dimensions
  CENTER_X: 32, CENTER_Y: 32,   // Calculated centers
}
```

**2. Timing Constants:**

```javascript
TIMING: {
  PHASE_DURATION_FRAMES: 60,     // Animation phases
  FADE_IN_DURATION_MS: 1000,     // Transition timing
  FRAME_TIME_HISTORY_SIZE: 10,   // Performance tracking
}
```

**3. Position Constants:**

```javascript
ELEMENT_NAME: {
  POSITION: [x, y],              // Screen coordinates
  SIZE: [width, height],         // Dimensions
  COLOR: [r, g, b, a],           // RGBA values
}
```

**4. Animation Parameters:**

```javascript
ANIMATION: {
  SPEED: 2.0,                    // Movement speed
  AREA: { MIN: 0, MAX: 100 },    // Movement bounds
  RADIUS: 15,                    // Orbital radius
  ANGLE_INCREMENT: 0.05,         // Rotation speed
}
```

### **🔧 Adapting for Larger Displays**

When upgrading to larger displays (128x128, 256x256), only change the config:

```javascript
const GFX_DEMO_CONFIG = {
  DISPLAY: {
    WIDTH: 128, // ← Changed from 64
    HEIGHT: 128, // ← Changed from 64
    CENTER_X: 64, // ← Changed from 32
    CENTER_Y: 64, // ← Changed from 32
  },

  // All other values scale proportionally...
  ANIMATIONS: {
    BOUNCE_AREA: {
      MIN_Y: 48,
      MAX_Y: 96,
      START_Y: 64, // ← Scaled up
    },
    // ... rest unchanged!
  },
};
```

**Result**: All scenes work on larger displays without code changes!

### **🧪 Testing with Different Configurations**

```javascript
// Test different display sizes
const testConfigs = [
  { width: 64, height: 64, centerX: 32, centerY: 32 },
  { width: 128, height: 128, centerX: 64, centerY: 64 },
  { width: 256, height: 256, centerX: 128, centerY: 128 },
];

// Run same scene code with different configs
testConfigs.forEach((config) => {
  const scene = new GraphicsEngineDemoScene({ displayConfig: config });
  // Test rendering...
});
```

### **✅ Implementation Checklist**

- [x] **Replace Magic Numbers**: All hardcoded values → config constants
- [x] **Display Scaling**: Easy adaptation for larger screens
- [x] **Animation Bounds**: Configurable movement areas
- [x] **Color Schemes**: Centralized color definitions
- [x] **Timing Values**: Configurable durations and speeds
- [x] **Position Coordinates**: Named position constants
- [x] **Test Coverage**: All tests pass with new config
- [x] **Documentation**: Updated best practices guide

### **🚨 Pro Tips for Configurable Scenes**

1. **✅ Always use config constants** instead of magic numbers
2. **✅ Group related values** (positions, colors, timing)
3. **✅ Calculate centers** from width/height for scalability
4. **✅ Use descriptive names** for all configuration keys
5. **✅ Test with different sizes** before committing
6. **✅ Document scaling behavior** for larger displays
7. **❌ Never hardcode positions** like `[32, 8]` in render code

### **🛠️ Development Tools**

#### **Scene Template Generator**

```bash
# Use existing examples as templates:
cp scenes/examples/framework-static-demo.js scenes/my_new_scene.js
# Edit name, implement render logic
```

#### **Quick Registration Check**

```bash
# Add to package.json scripts:
"check-scenes": "node -e \"require('./lib/scene-loader').SceneRegistration.registerFromStructure(require('./lib/scene-manager').SceneManager.prototype.constructor(), './scenes')\""
```

### **🚨 Pro Tips to Avoid Registration Issues**

1. **✅ Always put example scenes in `scenes/examples/`**
2. **✅ Use class-based scenes with proper `this.name`**
3. **✅ Check daemon logs immediately after adding new scene**
4. **✅ Test scene switching right after daemon restart**
5. **✅ Use consistent naming: filename matches `scene.name`**
6. **❌ Don't create subdirectories in scenes/ - won't be loaded**
7. **❌ Don't forget to export the class with `module.exports`**

### **🔍 Troubleshooting Checklist**

When you get "No renderer found for scene":

1. **File location**: Is it in `scenes/` or `scenes/examples/`?
2. **File extension**: Must be `.js`
3. **Export**: Does `module.exports = MyScene` exist?
4. **Class name**: Does the class have a proper constructor?
5. **Scene name**: Is `this.name` set and matches filename?
6. **Interface**: Does it have `render()` and `init()` methods?
7. **Syntax**: Run `node -c scenes/examples/my_scene.js`
8. **Daemon logs**: Check for "Failed to load scene" errors
9. **Restart**: Did you restart the daemon after adding the file?

### **📝 Adding This To Future Projects**

When creating new Pixoo Daemon projects:

1. **Copy this file**: `SCENE_DEVELOPMENT_BEST_PRACTICES.md`
2. **Set up auto-loading**: Use the same daemon.js scene loading pattern
3. **Document locations**: Clearly mark which directories are auto-loaded
4. **Add validation**: Consider adding scene validation in CI/CD

---

**Remember**: If you create a scene and don't see "Scene registered: scene_name" in the daemon startup logs,
it won't work! Always check the logs first.
