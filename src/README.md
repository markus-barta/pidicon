# Source Code Directory

This directory contains new and modernized code that follows stricter quality standards.

## Code Quality Standards

All code in this directory must pass with **ZERO ESLint errors**:

- **Complexity**: Maximum 10 (error)
- **Parameters**: Maximum 5 (error)
- **Function Length**: Maximum 80 lines (error)
- **Import Order**: Strict enforcement (error)
- **No Unused Variables**: Strict enforcement (error)

## Migration Strategy

- **New features** → Place in `src/`
- **Refactored code** → Move from root to `src/`
- **Legacy code** → Keep in root with warnings
- **Gradual improvement** → Move functions as they're refactored

## Current Status

- `src/` is ready for new code
- Root directory allows warnings for gradual improvement
- Legacy code excluded from strict enforcement
