# Story 2.4: Smart Release Checker Caching

**Story ID:** 2-4-smart-release-checker-caching  
**Epic:** Epic 2 - Configuration & Observability  
**Status:** Backlog  
**Priority:** P3  
**Points:** 2  
**Owner:** mba

---

## User Story

As a **PIDICON administrator**,  
I want **release checking to use intelligent caching**,  
So that **GitHub API rate limits are respected and response times are faster**.

---

## Context

ReleaseChecker currently fetches from GitHub Pages on every check (no caching). For production with many users or frequent checks, this could:

- Create unnecessary network requests
- Hit GitHub API rate limits
- Slow down system startup
- Waste bandwidth

**Note:** Cache was removed in build #902 to fix stale deployment visibility. Only re-add if production traffic justifies it.

**Related:** Build #919+ reordered CI workflow to publish GitHub Pages before Docker build (parallel execution). Pages deployment (~40s) completes before Docker build (~3-4 min), eliminating race condition where Docker was available before Pages. No artificial delays needed.

---

## Acceptance Criteria

### AC1: Configurable Cache Duration

- [ ] Add `release_checker.cache_ttl_minutes` config option (default: 60 = 1 hour)
- [ ] Support `0` to disable caching entirely
- [ ] Support custom TTL per deployment (dev vs production)
- [ ] Validate config on startup

### AC2: Cache Implementation

- [ ] Implement in-memory cache with TTL
- [ ] Optional persistent cache to filesystem (configurable)
- [ ] Cache invalidation after TTL expires
- [ ] Cache key includes version URL
- [ ] Handle cache corruption gracefully

### AC3: Cache-Control Headers

- [ ] Respect GitHub Pages cache-control headers
- [ ] Override with config TTL if specified
- [ ] Log cache hit/miss in debug mode
- [ ] Track cache age

### AC4: Force Refresh Option

- [ ] Add `?force=true` query param to `/api/version/check` endpoint
- [ ] Bypass cache on force refresh
- [ ] Update cache with fresh data after force refresh
- [ ] Log force refresh requests

### AC5: Cache Status in API Response

- [ ] Add `cached` field to API response (true/false)
- [ ] Add `cache_age_seconds` field
- [ ] Add `next_check_timestamp` field
- [ ] Show cache status in UI (optional)

### AC6: Check Interval Configuration

- [ ] Add `release_checker.check_interval_hours` (default: 24 hours)
- [ ] Check on daemon startup + interval
- [ ] Skip check if cache valid and recent
- [ ] Log check schedule in debug mode

### AC7: Rate Limit Handling

- [ ] Detect GitHub API rate limit errors (429 status)
- [ ] Fall back to cached data on rate limit
- [ ] Log rate limit warnings
- [ ] Retry with exponential backoff after rate limit

---

## Technical Design

### Configuration

```json
{
  "release_checker": {
    "enabled": true,
    "check_interval_hours": 24,
    "cache_ttl_minutes": 60,
    "cache_to_disk": true,
    "cache_file_path": "./data/release-cache.json"
  }
}
```

### Cache Structure

```javascript
{
  version: "3.2.1",
  timestamp: 1699564800000,
  ttl: 3600000,
  data: {
    current: "3.2.1",
    latest: "3.2.2",
    updateAvailable: true,
    releaseUrl: "https://github.com/..."
  }
}
```

### Cache Logic

```javascript
class ReleaseChecker {
  async checkForUpdates(force = false) {
    const cached = this.getCache();

    if (!force && cached && !this.isCacheExpired(cached)) {
      return {
        ...cached.data,
        cached: true,
        cacheAge: this.getCacheAge(cached),
      };
    }

    try {
      const fresh = await this.fetchFromGitHub();
      this.updateCache(fresh);
      return { ...fresh, cached: false };
    } catch (error) {
      if (this.isRateLimit(error) && cached) {
        return { ...cached.data, cached: true, rateLimited: true };
      }
      throw error;
    }
  }
}
```

---

## Tasks

### Task 1: Configuration (1h)

- [ ] 1.1: Add release_checker config schema
- [ ] 1.2: Load config on startup
- [ ] 1.3: Validate config values
- [ ] 1.4: Document configuration options
- [ ] 1.5: Test with various config combinations

### Task 2: In-Memory Cache (2h)

- [ ] 2.1: Implement cache storage
- [ ] 2.2: Implement TTL expiration logic
- [ ] 2.3: Add cache hit/miss tracking
- [ ] 2.4: Add cache age calculation
- [ ] 2.5: Unit tests for cache logic

### Task 3: Persistent Cache (2h)

- [ ] 3.1: Implement filesystem cache storage
- [ ] 3.2: Load cache on daemon startup
- [ ] 3.3: Save cache after successful check
- [ ] 3.4: Handle file corruption
- [ ] 3.5: Test persistence across restarts

### Task 4: Force Refresh (1h)

- [ ] 4.1: Add `?force=true` query param handling
- [ ] 4.2: Bypass cache on force refresh
- [ ] 4.3: Update cache with fresh data
- [ ] 4.4: Log force refresh events
- [ ] 4.5: Test force refresh endpoint

### Task 5: Rate Limit Handling (2h)

- [ ] 5.1: Detect rate limit responses
- [ ] 5.2: Fall back to cache on rate limit
- [ ] 5.3: Log rate limit warnings
- [ ] 5.4: Implement retry backoff
- [ ] 5.5: Test rate limit scenarios

### Task 6: API Response Enhancement (1h)

- [ ] 6.1: Add `cached` field to response
- [ ] 6.2: Add `cacheAge` field
- [ ] 6.3: Add `nextCheck` field
- [ ] 6.4: Update API documentation
- [ ] 6.5: Test API response format

### Task 7: Testing (2h)

- [ ] 7.1: Unit tests for cache logic
- [ ] 7.2: Integration tests for TTL expiration
- [ ] 7.3: Integration tests for force refresh
- [ ] 7.4: Integration tests for rate limits
- [ ] 7.5: Test persistence across daemon restarts

### Task 8: Documentation (1h)

- [ ] 8.1: Update VERSIONING.md with caching behavior
- [ ] 8.2: Document configuration options
- [ ] 8.3: Add troubleshooting guide
- [ ] 8.4: Document force refresh API

**Total Estimated Effort:** ~12 hours (~2 days)

---

## Testing Strategy

### Unit Tests

- Cache storage and retrieval
- TTL expiration logic
- Cache age calculation
- Rate limit detection

### Integration Tests

- Full check cycle with cache
- Cache persistence across restarts
- Force refresh bypasses cache
- Rate limit fallback to cache

### E2E Tests

- Version check uses cache
- Force refresh updates cache
- Cache status shown in API
- Rate limit handled gracefully

---

## Dependencies

- Existing ReleaseChecker implementation
- GitHub Pages deployment timing (build #919+)
- Filesystem access for persistent cache

---

## Risks & Mitigations

| Risk                           | Impact | Probability | Mitigation                                  |
| ------------------------------ | ------ | ----------- | ------------------------------------------- |
| Stale cache shows old version  | Medium | Low         | Short TTL (1 hour), force refresh option    |
| Cache corruption causes errors | Low    | Low         | Validation on load, fallback to fresh fetch |
| Rate limits still exceeded     | Low    | Low         | Conservative defaults, user configuration   |
| Persistent cache file grows    | Low    | Very Low    | Single file with fixed structure            |

---

## Success Criteria

- GitHub API calls reduced by 95%+ (one check per hour max)
- Cache TTL configurable per deployment
- Force refresh works immediately
- Rate limit errors handled gracefully
- Cache status visible in API response
- All tests passing
- Documentation comprehensive

---

## Design Decisions

**Why 1-hour default TTL?**

- Balances freshness with API conservation
- GitHub releases are infrequent (days/weeks)
- User can force refresh immediately if needed

**Why optional persistent cache?**

- Reduces API calls after daemon restart
- Useful for frequent restarts (development)
- Optional to avoid filesystem dependencies

**Why respect rate limits?**

- GitHub Pages has reasonable limits
- Falling back to cache prevents errors
- Good API citizen behavior

**Why cache status in response?**

- Transparency for debugging
- Users can see cache age
- Helps understand update check timing

---

## Notes

Cache was removed in build #902 to fix stale deployment visibility. Only re-implement if production traffic justifies the complexity.

**Recommendation:** Start with in-memory cache only, add persistent cache if needed.

**Future Enhancement:** WebSocket notification when new version detected (push vs poll).

---

## Change Log

| Date       | Author | Change                       |
| ---------- | ------ | ---------------------------- |
| 2025-11-09 | Bob/SM | Created from backlog SYS-415 |
