# Cursor Rules Directory

**OFFICIAL LOCATION** for Cursor AI rules in this project.

## Critical Information

🚨 **DO NOT use `.cursorrules` at project root!**

✅ **USE `.cursor/rules/*.mdc` instead** - This is the official Cursor location.

## Why This Location?

Cursor's built-in UI creates rules here when you use:

```
Menu → New → Rule
```

This creates files in `.cursor/rules/` with `.mdc` extension (Markdown with YAML
frontmatter).

## File Format

```markdown
---
version: 2.0.0
rules:
  - description: Rule description
    globs:
      - '**/*.js'
    alwaysApply: true
    config:
      key: value
---

# Optional Markdown Documentation

Additional context and examples can go here.
```

## Current Rules

- **`pidicon.mdc`** - Main project rules (10 rules total)

## Validation

Pre-commit hook (`.husky/pre-commit`) automatically validates:

- YAML frontmatter structure
- Required fields (description, globs, alwaysApply)
- Structured config keys (not comments!)

## How We Learned This

**Mistake**: Initially created `.cursorrules` at root, thinking it was the standard.

**Discovery**: Used Cursor's UI (New → Rule) and it created `.cursor/rules/test.mdc`
automatically.

**Conclusion**: Cursor's own UI reveals the official location. Trust the UI, not
assumptions!

## References

- Cursor documentation (built-in help)
- This project's standards: `../../STANDARDS.md`
- Code quality guide: `../../docs/CODE_QUALITY.md`

---

**Last Updated**: 2025-10-08  
**Never Again**: Always trust what Cursor's UI creates! 🎯
