# Epic 2: Configuration & Observability

**Status:** Backlog  
**Target Version:** v3.3  
**Priority:** P2  
**Owner:** mba  
**Target Start:** 2025-12-01  
**Target Completion:** 2025-12-15

---

## Epic Overview

Enhance configuration management and system observability to improve developer experience and operational reliability. Enable hot-reload configuration changes, real-time log viewing, intelligent watchdog behavior, and efficient release checking.

### Business Value

- **Developer Experience:** Hot-reload configuration eliminates restart delays, improving iteration speed
- **Debugging:** Live log viewer reduces time to diagnose production issues
- **Reliability:** Smart watchdog prevents cascading failures and rapid restart loops
- **Performance:** Cached release checking reduces API calls and improves responsiveness

### Success Criteria

- [ ] Configuration changes apply without daemon restart
- [ ] Live logs viewable in web UI with filtering and search
- [ ] Watchdog prevents rapid restart loops with exponential backoff
- [ ] Release checker respects GitHub API rate limits
- [ ] All tests passing (522+ tests maintained)
- [ ] Developer documentation updated with new capabilities

---

## Stories

### Story 2.1: Config Hot-Reload (CFG-503)

**Status:** Backlog  
**Priority:** P2  
**Points:** 5  
**Sprint:** Sprint 2

**Description:**
Implement configuration hot-reload to allow changes without daemon restart. Watch config files for changes, validate before applying, and notify users of reload success/failure.

**Acceptance Criteria:**

- [ ] Watch config files for changes (daemon.json, config.yml)
- [ ] Reload configuration without daemon restart
- [ ] Validate configuration before applying
- [ ] UI notification on successful/failed reload
- [ ] Add `/api/reload-config` endpoint
- [ ] Preserve current connections during reload
- [ ] Roll back to previous config on validation failure

**Technical Details:**

- File system watcher for config files
- Config validation schema
- Atomic config swap mechanism
- WebSocket notification system
- REST API endpoint for manual reload
- Error handling and rollback logic

**Definition of Done:**

- [ ] Config changes apply without restart
- [ ] Validation prevents invalid configs
- [ ] UI shows reload notifications
- [ ] Unit tests for config validation
- [ ] Integration tests for hot-reload
- [ ] Documentation updated
- [ ] Deployed to production

---

### Story 2.2: Live Log Viewer (UI-524)

**Status:** Backlog  
**Priority:** P2  
**Points:** 3  
**Sprint:** Sprint 2

**Description:**
Create real-time log viewer in web UI with filtering, search, and export capabilities. Enable developers to diagnose issues without SSH access to server.

**Acceptance Criteria:**

- [ ] Real-time log streaming via WebSocket
- [ ] Filter by level (debug, info, warn, error)
- [ ] Filter by source (daemon, web, mqtt, scene)
- [ ] Filter by device ID
- [ ] Search/grep functionality with regex support
- [ ] Auto-scroll toggle
- [ ] Export logs to file (JSON, text)
- [ ] Configurable max log buffer size
- [ ] Performance: Handle 1000+ logs without lag

**Technical Details:**

- WebSocket log streaming endpoint
- Log buffer management (circular buffer)
- Client-side filtering and search
- Vue component for log viewer
- Export functionality (download as file)
- Performance optimization for large log sets

**UI Design:**

- Dedicated "Logs" view in navigation
- Filter panel (collapsible)
- Log entries with color coding by level
- Search bar with regex toggle
- Export button
- Auto-scroll toggle button
- Clear logs button

**Definition of Done:**

- [ ] Live logs visible in Web UI
- [ ] All filtering options functional
- [ ] Search works with regex
- [ ] Export to file works
- [ ] Performance acceptable with 1000+ logs
- [ ] Unit tests for log filtering
- [ ] E2E tests for log viewer UI
- [ ] Documentation updated
- [ ] Deployed to production

---

### Story 2.3: Watchdog Restart Cooldown Backoff (OPS-414)

**Status:** Backlog  
**Priority:** P2  
**Points:** 3  
**Sprint:** Sprint 2

**Description:**
Implement exponential backoff for watchdog restart attempts to prevent rapid restart loops that can cause system instability. Add maximum restart rate limiting and alerting.

**Acceptance Criteria:**

- [ ] Exponential backoff for restart attempts (1s, 2s, 4s, 8s, 16s, 30s max)
- [ ] Maximum restart rate limiting (max 10 restarts per hour)
- [ ] Alert on repeated failures (3+ failures in 5 minutes)
- [ ] Dashboard for watchdog history (last 24 hours)
- [ ] Manual reset of backoff state
- [ ] Configuration for backoff parameters

**Technical Details:**

- Restart attempt counter with timestamps
- Exponential backoff calculation
- Rate limit checking
- Alert mechanism (log, UI notification, optional email)
- Watchdog state persistence across daemon restarts
- Configuration in daemon.json

**Backoff Algorithm:**

```
attempt_delay = min(base_delay * (2 ^ attempt_count), max_delay)
base_delay = 1 second
max_delay = 30 seconds
```

**Definition of Done:**

- [ ] Watchdog prevents rapid restart loops
- [ ] Exponential backoff implemented
- [ ] Rate limiting functional
- [ ] Alert system works
- [ ] Dashboard shows watchdog history
- [ ] Configuration options documented
- [ ] Unit tests for backoff logic
- [ ] Integration tests for watchdog
- [ ] Documentation updated
- [ ] Deployed to production

---

### Story 2.4: Smart Release Checker Caching (SYS-415)

**Status:** Backlog  
**Priority:** P3  
**Points:** 2  
**Sprint:** Sprint 2

**Description:**
Implement caching for GitHub API responses to reduce rate limit usage and improve response times. Add configurable check intervals and manual refresh capability.

**Acceptance Criteria:**

- [ ] Cache GitHub API responses for 1 hour (configurable)
- [ ] Reduce API calls by 95% (check on daemon start + interval)
- [ ] Configurable check interval (default: 24 hours)
- [ ] Manual refresh button in UI
- [ ] Display cache age and next check time
- [ ] Handle GitHub API rate limit errors gracefully

**Technical Details:**

- In-memory cache with TTL
- Optional persistent cache (filesystem)
- Cache invalidation logic
- Manual refresh endpoint
- Rate limit header tracking
- Graceful degradation on rate limit

**Configuration:**

```json
{
  "release_checker": {
    "enabled": true,
    "check_interval_hours": 24,
    "cache_ttl_minutes": 60,
    "cache_to_disk": true
  }
}
```

**Definition of Done:**

- [ ] GitHub API calls reduced significantly
- [ ] Cache TTL configurable
- [ ] Manual refresh works
- [ ] Rate limit errors handled gracefully
- [ ] UI shows cache status
- [ ] Unit tests for caching logic
- [ ] Documentation updated
- [ ] Deployed to production

---

## Epic Definition of Done

- [ ] All stories completed (0/4)
- [ ] All acceptance criteria met
- [ ] All tests passing (522+ tests)
- [ ] Documentation comprehensive
- [ ] Deployed to production
- [ ] Stable for 7 days in production
- [ ] Epic retrospective completed

---

## Dependencies

**External Dependencies:**

- File system watchers (native Node.js)
- GitHub API (for release checking)

**Internal Dependencies:**

- WebSocket infrastructure (existing)
- Configuration management system
- Watchdog implementation (existing)
- REST API framework (existing)

---

## Risks & Mitigations

| Risk                                | Impact | Probability | Mitigation                                      |
| ----------------------------------- | ------ | ----------- | ----------------------------------------------- |
| Config reload breaks running scenes | High   | Medium      | Comprehensive validation, rollback mechanism    |
| Log streaming performance impact    | Medium | Low         | Buffering, rate limiting, client-side filtering |
| Watchdog backoff too aggressive     | Low    | Medium      | Configurable parameters, manual reset           |
| GitHub rate limits still exceeded   | Low    | Low         | Conservative defaults, user configuration       |

---

## Notes

**Sprint Planning:**

- **Total Points:** 13 SP (aligned with Sprint 1 velocity)
- **Duration:** 2 weeks
- **Focus:** Developer experience and operational improvements

**Technical Considerations:**

- Config hot-reload requires careful state management
- Log viewer needs performance optimization for production logs
- Watchdog changes require thorough testing to avoid worse behavior

**User Impact:**

- Config hot-reload: High value for development and production tuning
- Log viewer: High value for debugging and support
- Watchdog backoff: Critical for production stability
- Release caching: Low user visibility but important for rate limits

---

**Epic Status:** Backlog  
**Last Updated:** 2025-11-09  
**Previous Epic:** Epic 1 - Core Foundation  
**Next Epic:** Epic 3 - Testing & Documentation
