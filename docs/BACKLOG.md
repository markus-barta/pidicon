# Development Backlog

This document tracks planned features, known issues, and technical debt for the
Pixoo Daemon project.

---

## 🚀 Future Features

### High Priority

- **Scene Transitions**: Implement smooth visual transitions between scenes.
- **Local MQTT Setup**: Document and simplify the process for local development
  and testing.

### Medium Priority

- **Performance Dashboard**: Create a web interface for monitoring key
  performance metrics.
- **Scene Presets**: Allow users to save and load scene configurations.
- **Device Health Monitoring**: Track connection status and response times.

### Low Priority

- **Device Discovery**: Automatically detect Pixoo devices on the network.
- **Scene Scheduling**: Implement time-based scene switching.

---

## 🔧 Technical Debt & Known Issues

- **Testing Coverage**: Increase unit test coverage for critical utility
  functions and the scene manager.
- **Configuration Management**: Centralize all configuration into a single,
  well-documented location.
- **Fix Build Number Test**: The build number test is currently disabled and
  needs to be reliably fixed and re-enabled.

---

## ✅ Completed Tasks (For Reference)

- Refactored `daemon.js` and implemented structured logging.
- Organized scene files and improved JSDoc coverage.
- Established a testing framework with initial unit tests.
- Refined all project documentation for clarity and professionalism.
