# Development Backlog

## 🎯 **Current Sprint - Scene Management & Parameter Updates**

### **High Priority**

- [ ] **Test color change fix** - Verify `fill` scene now uses updated parameters
- [ ] **Test performance test looping** - Verify `test_performance_v3` continues looping
- [ ] **Test startup scene on real device** - Verify deployment info displays correctly

### **Medium Priority**

- [ ] **Add local MQTT testing setup** - Environment variables and local broker for development
  - [ ] Create `.env.example` with required MQTT variables
  - [ ] Add local Mosquitto broker setup instructions
  - [ ] Document local testing workflow
- [ ] **Remove debug logging** - Clean up excessive debug output from daemon.js
- [ ] **Performance optimization** - Review and optimize scene rendering performance

### **Low Priority**

- [ ] **Refactor deployment process** - Move from fish function + server script to repository-based deployment
  - [ ] Create `scripts/deploy.sh` in repository
  - [ ] Create `scripts/deploy-server.sh` for server-side deployment
  - [ ] Update fish function to use repository scripts
  - [ ] Document deployment process in README
  - [ ] Add CI/CD pipeline for automated deployment
  - [ ] **Add more startup scene info** - Show device IP, driver type, etc.
  - [ ] **Startup scene animation** - Add subtle animation to startup display
  - [ ] **Deployment tracking enhancements** - Add build time, environment info

---

## 🚀 **Future Features**

### **Scene Management**

- [ ] **Scene transitions** - Smooth transitions between scenes
- [ ] **Scene presets** - Save and restore scene configurations
- [ ] **Scene scheduling** - Time-based scene switching
- [ ] **Scene dependencies** - Scenes that require other scenes to be loaded first

### **Device Management**

- [ ] **Device discovery** - Automatic Pixoo device detection
- [ ] **Device health monitoring** - Connection status, response times
- [ ] **Device grouping** - Manage multiple devices as a group
- [ ] **Device profiles** - Different configurations per device

### **Performance & Monitoring**

- [ ] **Performance metrics dashboard** - Web interface for monitoring
- [ ] **Scene performance profiling** - Track render times per scene
- [ ] **Memory usage monitoring** - Track memory usage per scene
- [ ] **Error rate tracking** - Monitor and alert on errors

### **Development Tools**

- [ ] **Local MQTT testing setup** - Environment variables and local broker
- [ ] **Scene testing framework** - Automated testing for scenes
- [ ] **Performance benchmarking** - Automated performance testing
- [ ] **Code quality metrics** - Track code quality over time

---

## 🐛 **Known Issues**

### **Fixed Issues**

- ✅ **Startup scene device interface error** - Fixed by using basic `drawTextRgbaAligned`
- ✅ **Parameter change detection** - Fixed race condition in state tracking
- ✅ **Scene state synchronization** - Fixed context state not syncing with scene manager

### **Open Issues**

- [ ] **Local MQTT testing** - Need proper environment setup for local development
- [ ] **Debug logging cleanup** - Remove excessive debug output
- [ ] **Error handling** - Improve error handling and recovery

---

## 🔧 **Technical Debt**

### **Code Quality**

- [ ] **Remove debug logging** - Clean up debug statements from production code
- [ ] **Error boundaries** - Add proper error boundaries for scene crashes
- [ ] **Type safety** - Consider adding TypeScript or JSDoc type annotations
- [ ] **Testing coverage** - Add unit tests for critical functions

### **Architecture**

- [ ] **Configuration management** - Centralize configuration handling
- [ ] **Logging system** - Implement structured logging
- [ ] **Plugin system** - Allow third-party scene development
- [ ] **API versioning** - Plan for future API changes

---

## 📚 **Documentation**

### **User Documentation**

- [ ] **Installation guide** - Step-by-step setup instructions
- [ ] **Scene development guide** - How to create custom scenes
- [ ] **Troubleshooting guide** - Common issues and solutions
- [ ] **API reference** - Complete API documentation

### **Developer Documentation**

- [ ] **Architecture overview** - System design and components
- [ ] **Development setup** - Local development environment
- [ ] **Contributing guidelines** - How to contribute to the project
- [ ] **Release process** - How to release new versions

---

## 🎨 **UI/UX Improvements**

### **Startup Scene**

- [ ] **Better typography** - Improve text readability
- [ ] **Color scheme** - Consistent color palette
- [ ] **Layout optimization** - Better use of 64x64 space
- [ ] **Animation** - Subtle startup animations

### **Scene Transitions**

- [ ] **Fade effects** - Smooth transitions between scenes
- [ ] **Loading indicators** - Show when scenes are loading
- [ ] **Error displays** - Better error message presentation

---

## 🔒 **Security & Reliability**

### **Security**

- [ ] **MQTT authentication** - Secure MQTT connections
- [ ] **Input validation** - Validate all MQTT messages
- [ ] **Rate limiting** - Prevent MQTT spam
- [ ] **Access control** - Device-level access control

### **Reliability**

- [ ] **Automatic recovery** - Recover from device failures
- [ ] **Health checks** - Monitor device and scene health
- [ ] **Backup/restore** - Scene configuration backup
- [ ] **Rollback capability** - Revert to previous versions

---

## 📊 **Metrics & Monitoring**

### **System Metrics**

- [ ] **Uptime tracking** - Monitor system availability
- [ ] **Performance metrics** - Track system performance
- [ ] **Error tracking** - Monitor and alert on errors
- [ ] **Usage statistics** - Track feature usage

### **Business Metrics**

- [ ] **Device adoption** - Track number of active devices
- [ ] **Scene usage** - Most popular scenes
- [ ] **User satisfaction** - Feedback and ratings
- [ ] **Support requests** - Track support volume

---

## 🚀 **Release Planning**

### **v1.1.0 - Scene Management**

- [ ] Scene transitions
- [ ] Scene presets
- [ ] Scene scheduling

### **v1.2.0 - Device Management**

- [ ] Device discovery
- [ ] Device health monitoring
- [ ] Device grouping

### **v1.3.0 - Performance & Monitoring**

- [ ] Performance dashboard
- [ ] Scene profiling
- [ ] Error tracking

---

**Last Updated**: 2025-08-27  
**Next Review**: 2025-09-03  
**Owner**: Development Team
