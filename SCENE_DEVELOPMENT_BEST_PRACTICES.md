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

#### **3. Test Scene Registration**

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

#### **4. Debug Registration Issues**

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

```
scenes/
├── startup.js          # ✅ Auto-loaded (main)
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
    └── graphics-engine-demo.js  # ✅ Auto-loaded
```

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

**Remember**: If you create a scene and don't see "Scene registered: scene_name" in the daemon startup logs, it won't work! Always check the logs first.
