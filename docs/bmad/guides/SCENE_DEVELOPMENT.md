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
✅ ./scenes/*.js                      // Core production scenes (startup, empty, fill)
✅ ./scenes/examples/*.js            // Showcase scenes (pixoo_showcase)
✅ ./scenes/examples/dev/*.js        // Development & advanced scenes (hidden by default in UI)
❌ ./scenes/subdir/*.js              // NOT loaded automatically
❌ ./scenes/examples/other/*.js      // NOT loaded automatically (must be in root or dev/)
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
scenes/my_scene.js                   // Core production scene (e.g., startup, empty, fill)
scenes/examples/my_showcase.js       // Showcase/demo scene (visible by default)
scenes/examples/dev/my_advanced.js   // Development scene (hidden by default in UI)

// ❌ Wrong locations:
scenes/demos/my_demo.js              // Won't be loaded!
scenes/examples/other/...            // Won't be loaded!
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

---

## 🌐 Multi-Device Scene Development (v3.0+)

### Overview

PIDICON v3.0+ supports multiple device types (Pixoo 64x64, AWTRIX 32x8, etc.). Scenes can now adapt to different display dimensions and capabilities instead of hardcoding for Pixoo's 64x64 resolution.

### Core Concepts

**Device Capabilities**: Every device has a `capabilities` object describing what it can do:

```javascript
context.device.capabilities = {
  width: 64, // Display width in pixels
  height: 64, // Display height in pixels
  colorDepth: 24, // Bits per pixel
  hasAudio: false, // Audio playback support
  hasTextRendering: true,
  hasImageRendering: true,
  hasPrimitiveDrawing: true,
  hasCustomApps: false,
  hasIconSupport: false,
  minBrightness: 0,
  maxBrightness: 100,
};
```

### Writing Device-Agnostic Scenes

#### ✅ DO: Use Capabilities for Dimensions

```javascript
class ResponsiveScene {
  async render(context) {
    const { width, height } = context.device.capabilities;

    // Calculate center dynamically
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // Draw centered rectangle (works on any display size!)
    await context.device.fillRect(
      [centerX - 10, centerY - 10],
      [centerX + 10, centerY + 10],
      [255, 0, 0, 255]
    );

    await context.device.push('responsive_scene', context.publishOk);
    return 200;
  }
}
```

#### ❌ DON'T: Hardcode Dimensions

```javascript
class PixooOnlyScene {
  async render(context) {
    // ❌ BAD: Assumes 64x64 display
    await context.device.fillRect(
      [32, 32], // Hardcoded center
      [34, 34],
      [255, 0, 0, 255]
    );
    // Will break on AWTRIX (32x8) or other displays!
  }
}
```

### Responsive Layout Patterns

#### Pattern 1: Centered Elements

```javascript
async render(context) {
  const { width, height } = context.device.capabilities;

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // Center text
  await context.device.drawText(
    'HELLO',
    [centerX, centerY],
    [255, 255, 255, 255],
    'center'
  );

  await context.device.push('centered', context.publishOk);
  return 200;
}
```

#### Pattern 2: Proportional Sizing

```javascript
async render(context) {
  const { width, height } = context.device.capabilities;

  // Box takes up 50% of display width/height
  const boxWidth = Math.floor(width * 0.5);
  const boxHeight = Math.floor(height * 0.5);

  // Center the box
  const x = Math.floor((width - boxWidth) / 2);
  const y = Math.floor((height - boxHeight) / 2);

  await context.device.fillRect(
    [x, y],
    [x + boxWidth, y + boxHeight],
    [0, 255, 0, 255]
  );

  await context.device.push('proportional', context.publishOk);
  return 200;
}
```

#### Pattern 3: Adaptive Text Size

```javascript
async render(context) {
  const { width, height } = context.device.capabilities;

  // Smaller displays get smaller text
  const fontSize = height < 16 ? 'small' : 'large';
  const message = width < 32 ? 'HI' : 'HELLO';

  await context.device.drawText(
    message,
    [width / 2, height / 2],
    [255, 255, 255, 255],
    'center',
    fontSize
  );

  await context.device.push('adaptive_text', context.publishOk);
  return 200;
}
```

#### Pattern 4: Layout Switching

```javascript
async render(context) {
  const { width, height } = context.device.capabilities;

  if (width >= 64 && height >= 64) {
    // Large display: show full UI with multiple elements
    await this.renderFullUI(context);
  } else if (width >= 32 && height >= 8) {
    // Small display: show simplified UI
    await this.renderCompactUI(context);
  } else {
    // Tiny display: minimal info only
    await this.renderMinimalUI(context);
  }

  await context.device.push('adaptive_layout', context.publishOk);
  return 200;
}
```

### Device Compatibility Checks

#### Optional: Declare Device Requirements

```javascript
class AudioVisualizer {
  constructor() {
    this.name = 'audio_visualizer';
  }

  // Optional: Check if device supports required features
  isCompatible(capabilities) {
    if (!capabilities.hasAudio) {
      return {
        compatible: false,
        reason: 'This scene requires audio support',
      };
    }
    if (capabilities.width < 32) {
      return {
        compatible: false,
        reason: 'Display too small (min 32px width required)',
      };
    }
    return { compatible: true };
  }

  async render(context) {
    // Use audio API (only available on AWTRIX)
    await context.device.playTone(440, 200);
    // ... visualizer code
  }
}
```

### Using Graphics Engine with Multi-Device

The `GraphicsEngine` automatically adapts to display capabilities:

```javascript
const GraphicsEngine = require('../lib/graphics-engine');

class GradientScene {
  async render(context) {
    const { width, height } = context.device.capabilities;

    // Graphics engine auto-adapts to dimensions!
    const gfx = new GraphicsEngine(context.device, context.device.capabilities);

    // Gradient fills entire display regardless of size
    await gfx.drawGradientBackground(
      [0, 0, 255], // Blue
      [255, 0, 255], // Magenta
      'vertical'
    );

    await context.device.push('gradient', context.publishOk);
    return 200;
  }
}
```

### Device-Specific Features

#### Checking for Optional Features

```javascript
async render(context) {
  const caps = context.device.capabilities;

  // Use audio if available (AWTRIX)
  if (caps.hasAudio) {
    await context.device.playTone(880, 100);
  }

  // Use icon library if available (AWTRIX)
  if (caps.hasIconSupport) {
    await context.device.setIcon('weather-sunny');
  }

  // Use custom apps if available (AWTRIX)
  if (caps.hasCustomApps) {
    await context.device.sendCustomApp({
      text: 'Hello',
      icon: 1234,
    });
  }

  // Fallback to basic drawing (works everywhere)
  await context.device.drawText('Hello', [10, 10], [255, 255, 255, 255]);
  await context.device.push('device_specific', context.publishOk);
  return 200;
}
```

### Testing Multi-Device Scenes

#### 1. Test with Mock Devices

```javascript
// Set up mock devices with different capabilities in daemon.js
const testCapabilities = {
  small: { width: 16, height: 16 },
  awtrix: { width: 32, height: 8, hasAudio: true },
  large: { width: 128, height: 64 },
};
```

#### 2. Verify Layout Responsiveness

- Test scene on Pixoo 64x64 (default)
- Test scene on AWTRIX 32x8 (when driver available)
- Check that text/graphics scale appropriately
- Ensure no hardcoded coordinates break layout

#### 3. Use Scene Simulator (Future)

```bash
# Simulate different devices (planned feature)
npm run scene-simulator my_scene --device=awtrix
npm run scene-simulator my_scene --device=pixoo64
```

### Best Practices for Multi-Device Scenes

1. **Always query `context.device.capabilities`** - Never assume display size
2. **Use relative positioning** - Calculate positions based on width/height
3. **Test on multiple resolutions** - Verify layout adapts correctly
4. **Provide fallbacks** - If device lacks a feature, use alternative
5. **Document device requirements** - Use `isCompatible()` if needed
6. **Use GraphicsEngine** - It handles multi-device rendering automatically
7. **Keep text readable** - Adapt font size for small displays
8. **Consider aspect ratios** - AWTRIX (32x8) is very wide, Pixoo (64x64) is square

### Migration from v2.x to v3.x

#### Old v2.x Scene (Pixoo-only)

```javascript
class OldScene {
  async render(context) {
    // ❌ Hardcoded for Pixoo 64x64
    await context.device.fillRect([0, 0], [64, 64], [0, 0, 0, 255]);
    await context.device.drawText('Hello', [32, 32], [255, 255, 255, 255]);
    await context.device.push('old_scene', context.publishOk);
    return 200;
  }
}
```

#### New v3.x Scene (Multi-device)

```javascript
class NewScene {
  async render(context) {
    const { width, height } = context.device.capabilities;

    // ✅ Adapts to any display size
    await context.device.fillRect([0, 0], [width, height], [0, 0, 0, 255]);
    await context.device.drawText(
      'Hello',
      [Math.floor(width / 2), Math.floor(height / 2)],
      [255, 255, 255, 255],
      'center'
    );
    await context.device.push('new_scene', context.publishOk);
    return 200;
  }
}
```

**Migration Steps**:

1. Replace all `64` with `context.device.capabilities.width`
2. Replace all `64` (height) with `context.device.capabilities.height`
3. Calculate centers dynamically: `Math.floor(width / 2)`
4. Test on Pixoo to ensure no regressions
5. Optional: Add device compatibility checks
6. Optional: Add device-specific enhancements

### Example: Complete Multi-Device Scene

```javascript
const GraphicsEngine = require('../lib/graphics-engine');

class MultiDeviceExample {
  constructor() {
    this.name = 'multi_device_example';
  }

  // Optional: Check device compatibility
  isCompatible(capabilities) {
    if (capabilities.width < 16 || capabilities.height < 8) {
      return {
        compatible: false,
        reason: 'Display too small (minimum 16x8 required)',
      };
    }
    return { compatible: true };
  }

  async init(context) {
    const caps = context.device.capabilities;
    context.log(`Initializing for ${caps.width}x${caps.height} display`);
  }

  async render(context) {
    const { width, height } = context.device.capabilities;
    const gfx = new GraphicsEngine(context.device, context.device.capabilities);

    // Clear screen
    await context.device.clear();

    // Draw adaptive gradient background
    await gfx.drawGradientBackground([0, 0, 128], [128, 0, 255], 'diagonal');

    // Center text with adaptive size
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const text = width >= 64 ? 'MULTI-DEVICE' : width >= 32 ? 'MULTI' : 'MD';

    await context.device.drawText(
      text,
      [centerX, centerY],
      [255, 255, 255, 255],
      'center'
    );

    // Add device-specific enhancement
    if (context.device.capabilities.hasAudio) {
      // Play a tone on AWTRIX devices
      await context.device.playTone(440, 50);
    }

    // Push frame
    await context.device.push('multi_device_example', context.publishOk);
    return 200; // ~5fps
  }

  async cleanup(context) {
    context.log('Scene stopped');
  }
}

module.exports = MultiDeviceExample;
```

---

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
├── startup.js                        # ✅ Core scene
├── empty.js                          # ✅ Core scene
├── fill.js                           # ✅ Core scene
└── examples/
    ├── pixoo_showcase.js            # ✅ Main showcase (visible by default)
    └── dev/                         # ✅ Development scenes (hidden by default in UI)
        ├── advanced_chart.js        # Advanced features
        ├── power_price.js           # Production dashboard
        ├── template.js              # Development template
        ├── draw_api.js              # Drawing demos
        ├── draw_api_animated.js
        ├── framework-static-demo.js
        ├── framework-animated-demo.js
        ├── framework-data-demo.js
        ├── performance-test.js
        ├── config-validator-demo.js
        └── startup-static.js
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
cp scenes/examples/dev/template.js scenes/my_new_scene.js
# Or for a showcase scene:
cp scenes/examples/dev/template.js scenes/examples/my_showcase.js
# Edit name, implement render logic
```

#### **Quick Registration Check**

```bash
# Add to package.json scripts:
"check-scenes": "node -e \"require('./lib/scene-loader').SceneRegistration.registerFromStructure(require('./lib/scene-manager').SceneManager.prototype.constructor(), './scenes')\""
```

### **🚨 Pro Tips to Avoid Registration Issues**

1. **✅ Core scenes go in `scenes/` (startup, empty, fill)**
2. **✅ Showcase scenes go in `scenes/examples/` (pixoo_showcase)**
3. **✅ Dev/advanced scenes go in `scenes/examples/dev/` (hidden by default in UI)**
4. **✅ Use class-based scenes with proper `this.name`**
5. **✅ Check daemon logs immediately after adding new scene**
6. **✅ Test scene switching right after daemon restart**
7. **✅ Use consistent naming: filename matches `scene.name`**
8. **❌ Don't create other subdirectories - only examples/ and examples/dev/ are auto-loaded**
9. **❌ Don't forget to export the class with `module.exports`**

### **🔍 Troubleshooting Checklist**

When you get "No renderer found for scene":

1. **File location**: Is it in `scenes/`, `scenes/examples/`, or `scenes/examples/dev/`?
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

1. **Copy this file**: `docs/SCENE_DEVELOPMENT.md`
2. **Set up auto-loading**: Use the same daemon.js scene loading pattern
3. **Document locations**: Clearly mark which directories are auto-loaded
4. **Add validation**: Consider adding scene validation in CI/CD

---

**Remember**: If you create a scene and don't see "Scene registered: scene_name" in the daemon startup logs,
it won't work! Always check the logs first.
