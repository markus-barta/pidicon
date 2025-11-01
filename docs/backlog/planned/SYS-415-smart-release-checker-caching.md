# SYS-415: Smart Release Checker Caching

**Status**: Planned (2025-10-31) | **Priority**: P2 (Nice to Have)
**Effort**: 2-4 hours | **Owner**: mba

## Problem

ReleaseChecker now fetches from GitHub Pages on every check (no caching). For production with many users or
frequent checks, this could create unnecessary network requests.

## Goal

Re-implement intelligent caching that balances freshness with efficiency:

- Short TTL (1-5 minutes) for normal checks
- Force-refresh option for immediate updates
- Optional: Cache only when not in development mode

## Tasks

1. Add configurable cache duration (default 5 min, 0 to disable)
2. Implement cache-control headers or client-side TTL
3. Expose cache status in API response (cached vs fresh)
4. Add `?force=true` query param to bypass cache
5. Document caching behavior in VERSIONING.md

## Tests

- Unit: Cache hit/miss/expiry logic
- Integration: Verify force-refresh works
- E2E: Check update notification timing

## Notes

Cache was removed in build #902 to fix stale deployment visibility. Only re-add if production traffic justifies it.

## Related Changes

**Build #919+**: CI workflow reordered to publish GitHub Pages before Docker build (parallel execution).
Pages deployment (~40s) completes well before Docker build (~3-4 min), eliminating race condition where
Docker was available before Pages. No artificial delays needed.
