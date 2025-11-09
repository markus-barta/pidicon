# Epic 5: Mobile & Offline Capabilities

**Status:** Backlog  
**Target Version:** v3.5  
**Priority:** P2  
**Owner:** mba  
**Target Start:** Q3 2025 (Jul 2025)  
**Target Completion:** Q3 2025 (Sep 2025)

---

## Epic Overview

Enable mobile app for iOS and Android using Capacitor, implement offline mode with service workers, and add advanced scheduling capabilities. Transform PIDICON into a mobile-first, offline-capable platform.

### Business Value

- **Mobile Access:** Native apps improve mobile UX and enable push notifications
- **Offline Resilience:** Continue working when network unavailable
- **Advanced Scheduling:** Time-based scene automation increases utility
- **Platform Expansion:** Mobile apps reach broader audience

### Success Criteria

- [ ] Native mobile apps published to App Store and Google Play
- [ ] Offline mode allows basic operations without network
- [ ] Advanced scheduling enables complex time-based automation
- [ ] Push notifications for device events
- [ ] All tests passing with mobile features
- [ ] App store approval achieved

---

## Stories

### Story 5.1: Mobile App (Capacitor)

**Status:** Backlog  
**Priority:** P2  
**Points:** 21  
**Sprint:** Sprint 7-8

**Description:**
Create native mobile apps for iOS and Android using Capacitor, with native device controls, push notifications, offline caching, and touch-optimized UI.

**Acceptance Criteria:**

- [ ] Capacitor integration complete
- [ ] iOS app functional and tested
- [ ] Android app functional and tested
- [ ] Native device controls (camera, file system, etc.)
- [ ] Push notifications for device events
- [ ] Offline caching with service worker
- [ ] Touch-optimized UI (gestures, buttons)
- [ ] App icons and splash screens
- [ ] App store submission ready

**Platform-Specific Features:**

**iOS:**

- [ ] TestFlight beta distribution
- [ ] App Store submission
- [ ] iOS-specific UI guidelines
- [ ] Face ID / Touch ID (future)

**Android:**

- [ ] Google Play beta track
- [ ] Google Play submission
- [ ] Material Design guidelines
- [ ] Biometric auth (future)

**Technical Details:**

- Capacitor integration
- Native plugin development
- Push notification service
- App store build process
- Code signing and provisioning
- In-app updates mechanism

**UI Adaptations:**

- Larger touch targets
- Swipe gestures
- Bottom navigation
- Pull-to-refresh
- Loading states
- Error handling

**Definition of Done:**

- [ ] iOS app functional
- [ ] Android app functional
- [ ] Push notifications work
- [ ] Touch UI optimized
- [ ] App store submissions complete
- [ ] Beta testing completed
- [ ] Unit tests for mobile-specific code
- [ ] E2E tests for mobile flows
- [ ] Documentation updated
- [ ] Published to app stores

---

### Story 5.2: Offline Mode (Service Worker)

**Status:** Backlog  
**Priority:** P2  
**Points:** 8  
**Sprint:** Sprint 8

**Description:**
Implement service worker for offline functionality, including offline state management, operation queueing, and auto-sync on reconnection.

**Acceptance Criteria:**

- [ ] Service worker registered and active
- [ ] Offline state detection and UI indicator
- [ ] Cache strategy for static assets
- [ ] Queue operations while offline
- [ ] Auto-sync on reconnection
- [ ] Conflict resolution for offline changes
- [ ] Offline-capable views identified
- [ ] Graceful degradation for online-only features

**Offline-Capable Operations:**

- [ ] View device list (cached)
- [ ] View scene library (cached)
- [ ] Edit scene configurations (queued)
- [ ] View logs (cached)
- [ ] View system status (cached with timestamp)

**Online-Required Operations:**

- Real-time device updates
- Scene rendering preview
- New device discovery
- File uploads

**Technical Details:**

- Service Worker API
- IndexedDB for local storage
- Background Sync API
- Cache API for assets
- Network status detection
- Conflict resolution strategy

**Offline Indicator:**

- Banner notification when offline
- Timestamp of last sync
- Queue size indicator
- Manual sync button

**Definition of Done:**

- [ ] Service worker functional
- [ ] Offline operations queued
- [ ] Auto-sync works on reconnection
- [ ] Offline indicator visible
- [ ] Conflict resolution handles edge cases
- [ ] Unit tests for offline logic
- [ ] E2E tests for offline scenarios
- [ ] Documentation updated
- [ ] Deployed to production

---

### Story 5.3: Advanced Scheduling

**Status:** Backlog  
**Priority:** P2  
**Points:** 8  
**Sprint:** Sprint 9

**Description:**
Implement advanced scheduling with time-based triggers, conditional logic, scene playlists, and calendar integration.

**Acceptance Criteria:**

- [ ] Time-based scene triggers (cron-like)
- [ ] Date range scheduling (e.g., "every weekday in December")
- [ ] Conditional logic (if/then/else)
- [ ] Scene playlists (sequence of scenes)
- [ ] Calendar integration (import events)
- [ ] Sunrise/sunset triggers
- [ ] Holiday detection
- [ ] Scheduling UI with visual calendar

**Scheduling Examples:**

```yaml
schedules:
  - name: 'Morning Weather'
    trigger: '0 7 * * MON-FRI'
    scene: 'weather-dashboard'
    devices: ['bedroom-display']

  - name: 'Holiday Lights'
    trigger: '0 18 * 12 *' # 6 PM in December
    conditions:
      - type: 'date-range'
        start: '2025-12-01'
        end: '2025-12-31'
    scene: 'christmas-lights'
    devices: ['all']

  - name: 'Scene Playlist'
    trigger: '0 9 * * SAT,SUN'
    playlist:
      - scene: 'welcome'
        duration: 30
      - scene: 'weather'
        duration: 300
      - scene: 'news'
        duration: 120
    devices: ['living-room']
```

**Technical Details:**

- Cron parser for scheduling
- Condition evaluation engine
- Playlist sequencer
- Calendar parser (iCal format)
- Sunrise/sunset calculation API
- Holiday database
- Schedule persistence
- Schedule conflict detection

**UI Features:**

- Visual calendar view
- Schedule list with filters
- Schedule editor (form-based)
- Test schedule button
- Schedule logs/history

**Definition of Done:**

- [ ] Time-based triggers functional
- [ ] Conditional logic works
- [ ] Scene playlists execute correctly
- [ ] Calendar integration imports events
- [ ] Sunrise/sunset triggers accurate
- [ ] Scheduling UI complete
- [ ] Unit tests for scheduling logic
- [ ] Integration tests for triggers
- [ ] Documentation updated
- [ ] Deployed to production

---

## Epic Definition of Done

- [ ] All stories completed (0/3)
- [ ] All acceptance criteria met
- [ ] Mobile apps published to app stores
- [ ] Offline mode functional
- [ ] Advanced scheduling operational
- [ ] All tests passing
- [ ] Documentation comprehensive
- [ ] Deployed to production
- [ ] Epic retrospective completed

---

## Dependencies

**External Dependencies:**

- Apple Developer Program (iOS)
- Google Play Developer Account (Android)
- App store review processes
- Push notification services (Firebase, APNs)

**Internal Dependencies:**

- Service worker infrastructure
- Scheduling engine
- Mobile-optimized UI components

---

## Risks & Mitigations

| Risk                      | Impact | Probability | Mitigation                                   |
| ------------------------- | ------ | ----------- | -------------------------------------------- |
| App store rejection       | High   | Medium      | Follow guidelines strictly, beta testing     |
| Mobile performance issues | High   | Medium      | Performance testing, optimization            |
| Offline sync conflicts    | Medium | Low         | Robust conflict resolution, user education   |
| Scheduling complexity     | Medium | Medium      | Start with simple triggers, expand gradually |

---

## Notes

**Sprint Planning:**

- **Total Points:** 37 SP (~6 weeks for single developer)
- **Duration:** 3 sprints (6 weeks)
- **Focus:** Mobile platform and offline capabilities

**Strategic Importance:**

- Mobile apps significantly expand market reach
- Offline mode improves reliability perception
- Advanced scheduling enables automation use cases
- Platform parity (web + mobile) is table stakes

**App Store Considerations:**

- Both platforms require developer accounts ($99/year iOS, $25 one-time Android)
- Review processes can take 1-2 weeks
- Need privacy policy and terms of service
- App store guidelines must be followed strictly

**Phasing Strategy:**

- Sprint 7-8: Mobile app foundation (21 SP, complex integration)
- Sprint 8: Offline mode (overlaps with mobile for synergy)
- Sprint 9: Advanced scheduling (high user value)

---

**Epic Status:** Backlog  
**Last Updated:** 2025-11-09  
**Previous Epic:** Epic 4 - Scene Marketplace & Advanced Features  
**Next Epic:** Epic 6 - Plugin System & Multi-User (v4.0)
