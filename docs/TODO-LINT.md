# TODO: ESLint follow-ups

How to refresh this list:

- Run: npm run lint:errors (see output in terminal) or eslint . --quiet -f codeframe

Track errors to fix (keep under 5; update as you go):

- [x] scenes/test_performance_v2.js:118: timeSinceLast is assigned but never used - FIXED
- [x] scenes/test_performance_v2.js:195: iteration is assigned but never used - FIXED
- [x] scenes/test_performance_v2.js:253: fps is assigned but never used - FIXED
- [x] scenes/test_performance_v2.js:275: chartX is not defined - FIXED
- [x] scenes/test_performance_v3.js:24: There should be no empty line within import group - FIXED
- [x] scenes/test_performance_v3.js:244: advancedChart is assigned but never used - FIXED
- [x] scenes/test_performance_v3.js:468: getPerformanceColor is not defined - FIXED
- [x] scenes/test_performance_v3.js:529: currentTime is defined but never used - FIXED

Notes:

- New code in src/\*\* must pass with 0 errors.
- Legacy code can ship with warnings; migrate gradually.
- Current status: 0 errors, 118 warnings ✅ ALL ERRORS FIXED!
- Next focus: Gradually reduce warnings by refactoring complex functions
