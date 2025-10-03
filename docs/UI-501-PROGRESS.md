# UI-501: Vue 3 + Vuetify 3 Migration - Progress Tracker

**Status**: 🚧 In Progress (Phase 1/4)  
**Started**: 2025-10-03  
**Estimated Completion**: 2-3 days

---

## ✅ Phase 1: Foundation Setup (COMPLETED)

### Dependencies Installed

- ✅ `vue@3` - Core Vue.js 3 framework
- ✅ `vuetify@3` - Material Design component library
- ✅ `@vitejs/plugin-vue` - Vite plugin for Vue SFCs
- ✅ `vite` - Fast build tool and dev server
- ✅ `@mdi/font` - Material Design Icons
- ✅ `pinia` - State management for Vue 3
- ✅ `@vue/test-utils` - Component testing utilities
- ✅ `vitest` - Fast unit test framework
- ✅ `happy-dom` - Lightweight DOM for testing

### Configuration

- ✅ `vite.config.js` created with:
  - Vue plugin configured
  - Vuetify auto-import enabled
  - Dev server proxy to Express backend (port 3000 → 10829)
  - Build output to `web/public/`
  - Vitest testing environment
- ✅ `.gitignore` updated to exclude build output

---

## 🚧 Phase 2: Frontend Structure (NEXT)

### Directory Structure to Create

```
web/
  frontend/              # NEW: Vue source files
    src/
      main.js           # Vue app entry point
      App.vue           # Root component
      components/
        DeviceCard.vue  # Device card component
        SceneSelector.vue
        SystemStatus.vue
      composables/
        useApi.js       # API client composable
        useToast.js     # Toast notifications (UI-502)
        useWebSocket.js # WebSocket client (UI-504)
      store/
        index.js        # Pinia store setup
        devices.js      # Device state management
        scenes.js       # Scene state management
      plugins/
        vuetify.js      # Vuetify configuration
      styles/
        main.scss       # Global styles
    index.html          # HTML entry point
    package.json        # Optional: Frontend-specific deps
  public/               # Build output (gitignored)
  server.js             # Express backend (unchanged)
```

### Tasks

- [ ] Create `web/frontend/index.html`
- [ ] Create `web/frontend/src/main.js` (Vue app bootstrap)
- [ ] Create `web/frontend/src/App.vue` (root component)
- [ ] Create `web/frontend/src/plugins/vuetify.js` (Vuetify config)
- [ ] Set up Pinia store structure
- [ ] Update `package.json` scripts for Vite

---

## ⏭️ Phase 3: Core Components (TODO)

### Components to Migrate

1. **SystemStatus.vue** - Header with build number, status, uptime
2. **DeviceCard.vue** - Device card with controls (initially non-collapsible)
3. **SceneSelector.vue** - Scene dropdown with next/prev buttons
4. **App.vue** - Main layout with device grid

### API Client

- [ ] Create `useApi.js` composable for REST API calls
- [ ] Error handling and loading states
- [ ] Request cancellation support

### State Management

- [ ] Pinia store for devices
- [ ] Pinia store for scenes
- [ ] Pinia store for system status
- [ ] Actions for API calls

---

## ⏭️ Phase 4: Integration & Testing (TODO)

### Integration

- [ ] Update Express server to serve Vite build output
- [ ] Add build step to `package.json`
- [ ] Update Dockerfile to build Vue frontend
- [ ] Add dev mode support (Vite dev server)

### Testing

- [ ] Unit tests for Vue components (`vitest`)
- [ ] Manual testing: All existing features work
- [ ] E2E: Scene switching, device controls
- [ ] Cross-browser testing

---

## 📝 Build Scripts to Add

```json
{
  "scripts": {
    "ui:dev": "vite",
    "ui:build": "vite build",
    "ui:preview": "vite preview",
    "ui:test": "vitest",
    "dev": "concurrently \"npm run ui:dev\" \"node daemon.js\"",
    "build": "npm run ui:build && echo 'Build complete!'"
  }
}
```

---

## 🎯 Acceptance Criteria Checklist

- [ ] Vue 3 + Vuetify 3 running with hot reload
- [ ] All existing functionality preserved:
  - [ ] Device list with current scenes
  - [ ] Scene selector per device
  - [ ] Next/Prev scene buttons
  - [ ] Display on/off toggle
  - [ ] Reset device button
  - [ ] Driver toggle (real/mock)
  - [ ] System status (build, uptime)
  - [ ] Restart daemon button
  - [ ] FPS/frametime display for animated scenes
- [ ] Component-based architecture
- [ ] Material Design UI with Vuetify
- [ ] Dark theme by default
- [ ] Responsive grid layout
- [ ] Zero breaking changes to backend API

---

## 🚀 Next Steps

### Immediate (This Session)

1. Create frontend directory structure
2. Set up Vue app entry point (`main.js`)
3. Configure Vuetify plugin
4. Create minimal `App.vue`
5. Update `package.json` scripts
6. Test dev server (`npm run ui:dev`)

### Near-term (Next Session)

1. Migrate SystemStatus component
2. Migrate DeviceCard component
3. Set up Pinia stores
4. Create API composable
5. Test full integration

### Integration

1. Update Express to serve Vite build
2. Update Dockerfile
3. Documentation updates
4. Final testing

---

## 📚 Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Vuetify 3 Documentation](https://vuetifyjs.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Pinia Documentation](https://pinia.vuejs.org/)

---

**Last Updated**: 2025-10-03  
**Next Checkpoint**: After Phase 2 (frontend structure)
