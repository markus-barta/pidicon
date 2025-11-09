# Sprint 2 Plan - Epic 0 Kickoff

**Sprint Number:** 2  
**Sprint Dates:** November 12 - November 18, 2025  
**Sprint Duration:** 7 days (1 week)  
**Epic Focus:** Epic 0 - System Stability & Watchdog Reliability  
**Created:** 2025-11-11  
**Created By:** Bob (Scrum Master)

---

## Sprint Goal

**"Fix the watchdog's false positive issue comprehensively through root cause analysis, architectural redesign, and thorough validation, establishing a stable foundation for future development."**

### Why This Sprint Matters

This sprint addresses a **critical production issue** that has:

- Eroded user trust (false "offline" warnings)
- Blocked future development (Epic 2-5 postponed)
- Persisted despite multiple previous fix attempts
- Created technical debt that compounds with each new feature

**Strategic Importance:** This is foundational. Without a reliable watchdog, all future development is built on unstable ground.

---

## Sprint Commitment

### Primary Story (Committed)

**Story 0.1: Watchdog Root Cause Analysis & Comprehensive Fix**

- **Story ID:** 0.1
- **Points:** 8 (full sprint)
- **Owner:** Charlie (Senior Dev)
- **Priority:** P0 (Critical)
- **Status:** Ready for Dev → In Progress (Nov 12)
- **Epic:** Epic 0 - System Stability

**Story Link:** [0-1-watchdog-root-cause-analysis.md](../stories/0-1-watchdog-root-cause-analysis.md)

**High-Level Tasks:**

1. Code Audit & Analysis (1-2 days)
2. Root Cause Identification (1 day)
3. Architecture Design (1 day)
4. Watchdog Independence Implementation (2-3 days)
5. Testing & Validation (1-2 days)
6. Documentation & Knowledge Transfer (1 day)

**Success Criteria:**

- [ ] Root cause identified and documented
- [ ] Architecture design approved by team
- [ ] Watchdog operates independently from scene rendering
- [ ] Zero false positives in 24-hour staging test
- [ ] Zero false negatives (all real failures detected)
- [ ] All 522+ existing tests still passing
- [ ] Performance impact < 1% CPU

### Secondary Story (Stretch Goal)

**Story 0.2: Three-Tier Device State Indicator**

- **Story ID:** 0.2
- **Points:** 5
- **Owner:** Charlie (after 0.1) or other dev
- **Priority:** P0 (Critical)
- **Status:** Ready for Dev (Sequential - waits for 0.1)
- **Epic:** Epic 0 - System Stability

**Story Link:** [0-2-three-tier-device-state-indicator.md](../stories/0-2-three-tier-device-state-indicator.md)

**Likelihood:** Low probability of starting in Sprint 2. More likely Sprint 3.

**Reason:** Story 0.1 is comprehensive (8 points) and includes validation time. If Charlie completes 0.1 early (unlikely given scope), he can start 0.2 late in sprint.

---

## Team Capacity & Allocation

**Available Capacity:**

| Team Member | Role          | Capacity     | Allocation                       |
| ----------- | ------------- | ------------ | -------------------------------- |
| Charlie     | Senior Dev    | 8 points     | Story 0.1 (8 pts)                |
| Markus      | Product Lead  | Advisory     | Architecture review, support     |
| Alice       | Product Owner | Advisory     | AC validation, stakeholder comms |
| Bob         | Scrum Master  | Facilitation | Sprint facilitation, tracking    |
| Dana        | QA Engineer   | Support      | Story 0.1 testing support        |

**Total Committed Velocity:** 8 points

**Notes:**

- Single-story sprint by design (high-complexity P0 story)
- Full team focus on one critical issue
- No parallel work to maintain focus

---

## Sprint Schedule

### Week Overview

**Tuesday, Nov 12 (Sprint Start - Day 1)**

- Sprint kickoff meeting (9:00 AM)
- Charlie starts Story 0.1: Code Audit & Analysis
- Daily standup

**Wednesday, Nov 13 (Day 2)**

- Continue Code Audit & Analysis
- Begin Root Cause Identification
- Daily standup

**Thursday, Nov 14 (Day 3 - Mid-Sprint)**

- **Mid-Sprint Check-in** (important milestone)
- Review root cause analysis findings
- Review proposed architecture design
- Team approval before implementation begins
- Daily standup

**Friday, Nov 15 (Day 4)**

- Begin Watchdog Independence Implementation
- Daily standup

**Saturday, Nov 16 (Day 5)**

- Continue Implementation
- (Weekend day, Charlie's choice to work or rest)

**Sunday, Nov 17 (Day 6)**

- Complete Implementation
- Begin Testing & Validation
- (Weekend day, Charlie's choice to work or rest)

**Monday, Nov 18 (Sprint End - Day 7)**

- Complete Testing (24-hour test may extend to Tuesday)
- Documentation
- **Sprint Review** (afternoon)
- **Sprint Retrospective** (after review)

**Note:** 24-hour validation test may run overnight Mon→Tue, extending validation into early Sprint 3. This is acceptable.

---

## Sprint Ceremonies

### Daily Standup

**Time:** 9:00 AM daily  
**Duration:** 15 minutes  
**Format:** Async or sync (team preference)  
**Facilitator:** Bob (SM)

**Standup Questions:**

1. What did you accomplish since last standup?
2. What are you working on today?
3. Any blockers or concerns?
4. Are we on track for the sprint goal?

**Focus:** Story 0.1 progress, blockers, team support needs

### Mid-Sprint Check-in (Thursday, Nov 14)

**Time:** 2:00 PM  
**Duration:** 60 minutes  
**Attendees:** Markus, Charlie, Bob, Alice, Dana (optional)

**Agenda:**

1. Review root cause analysis findings (15 min)
   - What is the root cause?
   - Evidence supporting the finding
   - Confidence level
2. Review proposed architecture design (30 min)
   - New watchdog architecture
   - Separation of concerns
   - Implementation approach
3. Team Q&A and approval (15 min)
   - Technical feasibility
   - Risk assessment
   - Go/no-go decision for implementation

**Outcome:** Architecture design approved, Charlie proceeds to implementation with confidence.

**Critical Decision Point:** This is a gate. If root cause is unclear or design is risky, we pause and reassess.

### Sprint Review (Monday, Nov 18 - Afternoon)

**Time:** 3:00 PM  
**Duration:** 60 minutes  
**Attendees:** Full team + stakeholders (optional)

**Agenda:**

1. Demo watchdog fix (20 min)
   - Show root cause analysis findings
   - Show new architecture
   - Demo zero false positives
2. Review acceptance criteria (20 min)
   - Walk through each AC
   - Validate with evidence (tests, logs)
3. Discuss what's next (10 min)
   - Story 0.2 readiness
   - Sprint 3 planning
4. Feedback & questions (10 min)

**Outcome:** Story 0.1 accepted as "done" (or documented what remains).

### Sprint Retrospective (Monday, Nov 18 - After Review)

**Time:** 4:15 PM (after review)  
**Duration:** 45 minutes  
**Facilitator:** Bob (SM)  
**Format:** Using BMAD retrospective workflow

**Agenda:**

1. What went well?
2. What didn't go well?
3. What did we learn?
4. Action items for next sprint

**Outcome:** Documented retrospective, process improvements identified.

---

## Risks & Mitigation

| Risk                                               | Impact   | Probability | Mitigation Strategy                                                               |
| -------------------------------------------------- | -------- | ----------- | --------------------------------------------------------------------------------- |
| Root cause deeper than expected                    | High     | Medium      | Story may extend beyond 8 points (acceptable). No shortcuts. Quality > estimates. |
| Architectural changes break existing functionality | High     | Medium      | Run all 522+ tests frequently. Comprehensive integration testing.                 |
| 24-hour validation extends timeline                | Medium   | High        | Plan for validation to run over weekend or into Sprint 3. Acceptable.             |
| Charlie unavailable mid-sprint                     | High     | Low         | Markus available for backup. Document progress daily.                             |
| False positives persist after fix                  | Critical | Low         | Comprehensive testing, multiple validation stages, production monitoring.         |
| Performance regression                             | Medium   | Low         | Performance testing included in ACs. Monitor CPU/memory.                          |

**Risk Mitigation Philosophy:**

- **Quality over speed:** Extend timeline if needed to get it right
- **Test early, test often:** Catch regressions immediately
- **Communicate proactively:** Surface issues in daily standup
- **No surprises:** Mid-sprint check-in ensures alignment

---

## Dependencies & Prerequisites

### Dependencies (External)

- [x] Staging environment ready (confirmed)
- [x] Production logs accessible (confirmed)
- [ ] All 522 existing tests passing (verify Tuesday)
- [x] Story 0.1 fully drafted and ready (confirmed)

### Prerequisites (Before Sprint Start)

- [x] Story 0.1 status: ready-for-dev
- [x] Charlie confirmed as owner
- [x] Team reviewed story details
- [x] Sprint goal defined and communicated
- [x] Stakeholders informed of roadmap pivot

### Blockers

**Current Blockers:** None

**Potential Blockers:**

- Test infrastructure issues → Mitigation: Dana supports, Bob escalates
- Access issues (logs, staging) → Mitigation: Resolve in kickoff meeting

---

## Success Metrics

### Sprint-Level Metrics

- **Velocity:** 8 points (Story 0.1 complete)
- **Sprint Goal Achievement:** Yes/No (watchdog fixed)
- **False Positive Rate:** 0% (current: >0%)
- **Test Pass Rate:** 100% (522/522 tests)
- **Code Coverage:** Maintain or improve

### Story-Level Metrics

- **Story 0.1 Completion:** 100% of ACs met
- **Watchdog CPU Overhead:** < 1%
- **24-Hour Test:** Zero false positives, zero false negatives
- **Production Validation:** 7 days stable (extends beyond sprint)

### Quality Metrics

- **Regressions Introduced:** 0
- **Code Review Approval:** Yes
- **Documentation Complete:** Yes
- **Team Confidence:** High (validated in retro)

---

## Communication Plan

### Stakeholder Communication

**Initial Update (Monday, Nov 11 - Today):**

- **Owner:** Alice (PO)
- **Audience:** Stakeholders, management
- **Message:** Roadmap pivot, Epic 0 prioritization, Epic 2-5 postponed
- **Rationale:** Critical stability issue takes precedence
- **Timeline:** Epic 0 completion ~2 sprints (Nov 12 - Nov 23)

**Mid-Sprint Update (Thursday, Nov 14):**

- **Owner:** Alice (PO) or Bob (SM)
- **Audience:** Stakeholders
- **Message:** Root cause identified, design approved, on track

**Sprint End Update (Monday, Nov 18):**

- **Owner:** Alice (PO)
- **Audience:** Stakeholders
- **Message:** Story 0.1 complete, validation results, Sprint 3 plan

### Team Communication

**Daily:**

- Standup updates (async or sync)
- Slack/chat for quick questions
- Document progress in story file

**Weekly:**

- Sprint review (demos, progress)
- Retrospective (process improvements)

---

## Definition of Done (Sprint Level)

Sprint 2 is considered "done" when:

- [ ] Story 0.1 all acceptance criteria met (8 ACs)
- [ ] Root cause analysis documented
- [ ] Architecture design approved and documented
- [ ] Watchdog implemented and tested
- [ ] Zero false positives in 24-hour staging test
- [ ] Zero false negatives (all real failures detected within 30s)
- [ ] All 522+ existing tests passing
- [ ] Performance impact < 1% CPU
- [ ] Code reviewed and approved
- [ ] Code merged to main branch
- [ ] Deployed to staging
- [ ] Documentation updated (architecture, troubleshooting)
- [ ] Sprint review completed
- [ ] Sprint retrospective completed

**Note:** 7-day production validation (AC7 of Story 0.1) extends beyond sprint but is part of story DoD.

---

## Backlog Refinement for Sprint 3

**During Sprint 2, prepare:**

- Story 0.2: Confirm owner, review ACs (if starting Sprint 3)
- Story 0.3: Review with Dana, prepare test infrastructure
- CI infrastructure setup: Self-hosted runner on miniserver24

**Backlog Refinement Session:**

- **When:** Friday, Nov 15 (mid-sprint)
- **Duration:** 30 minutes
- **Attendees:** Bob, Alice, Markus
- **Purpose:** Refine Sprint 3 plan based on Story 0.1 progress

---

## Notes

### Sprint Focus

This is a **focused, single-story sprint**. The goal is depth, not breadth. Charlie has full team support to solve this comprehensively.

### "Done" Philosophy

We're not done until:

- We understand the root cause
- We've designed the right solution
- We've tested thoroughly
- We've validated in production

**No shortcuts.** Quality is paramount.

### Team Support

Charlie is not alone:

- Markus: Architecture review, technical decisions
- Dana: Testing support, validation
- Bob: Remove blockers, facilitate
- Alice: Validate acceptance, stakeholder comms

### Learning Opportunity

This sprint is a learning opportunity:

- How to conduct comprehensive root cause analysis
- How to design for true independence
- How to test critical infrastructure
- How to validate stability

Document lessons learned in retrospective.

---

## References

- **Epic 0:** [epic-0-system-stability.md](../epics/epic-0-system-stability.md)
- **Story 0.1:** [0-1-watchdog-root-cause-analysis.md](../stories/0-1-watchdog-root-cause-analysis.md)
- **Epic 1 Retrospective:** [epic-1-retro-2025-11-09.md](../retrospectives/epic-1-retro-2025-11-09.md)
- **Sprint Status Tracking:** [sprint-status.yaml](../sprint-status.yaml)
- **Story Completion Criteria:** [STORY_COMPLETION_CRITERIA.md](../guides/STORY_COMPLETION_CRITERIA.md)

---

## Change Log

| Date       | Author | Change                        |
| ---------- | ------ | ----------------------------- |
| 2025-11-11 | Bob/SM | Initial Sprint 2 plan created |

---

**Sprint Status:** Ready to Start  
**Sprint Start Date:** Tuesday, November 12, 2025  
**Next Milestone:** Mid-Sprint Check-in (Thursday, Nov 14)

---

**🎯 Sprint Goal:** Fix the watchdog comprehensively. No shortcuts. THIS HAS TO WORK!
