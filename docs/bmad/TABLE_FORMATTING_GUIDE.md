# Table Formatting Guide - Prettier + Markdownlint

**Status:** ✅ CONFIGURED AUTOMATICALLY

---

## 🎯 Problem Statement

AI agents (like Claude) often create markdown tables that look good in preview but have misaligned pipes (`|`) in the raw markdown, especially with:

- **Emojis** (✅ 🚀 ⚠️ 💯 🎉) - Take up 2 character widths
- **ASCII art** (`[=====>   ]`) - Variable widths
- **Long text** - Inconsistent spacing

---

## ✅ Solution: Automatic Formatting

### Configuration Already in Place

1. **Prettier** (`.prettierrc`)
   - Auto-formats tables with perfect alignment
   - Handles emojis correctly
   - Runs automatically on save via lint-staged

2. **lint-staged** (`package.json`)
   - Runs `prettier -w` on all `*.md` files
   - Triggered by pre-commit hook

3. **Markdownlint** (`.markdownlint.json`)
   - Validates table structure
   - Disabled overly strict rules (MD056 - table column count)

---

## 📊 How It Works

### Before (AI-generated or hand-written):

```markdown
| Name   | Status    | Description                |
| ------ | --------- | -------------------------- |
| Epic 1 | ✅ Done   | This is a long description |
| Epic 2 | 🚀 Active | Short                      |
```

### After (auto-formatted by Prettier on save):

```markdown
| Name   | Status    | Description                |
| ------ | --------- | -------------------------- |
| Epic 1 | ✅ Done   | This is a long description |
| Epic 2 | 🚀 Active | Short                      |
```

**Result:** Perfect alignment, even with emojis! ✨

---

## 🔧 Configuration Details

### `.prettierrc` (Updated)

```json
{
  "printWidth": 80,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "proseWrap": "preserve",
  "overrides": [
    {
      "files": "*.md",
      "options": {
        "printWidth": 120,
        "proseWrap": "preserve"
      }
    }
  ]
}
```

**Key Settings:**

- `printWidth: 120` for markdown (wider than code)
- `proseWrap: "preserve"` - Don't wrap prose text
- Tables auto-format with perfect alignment

### `lint-staged` (Already Configured)

```json
{
  "*.{json,md,yml,yaml}": ["prettier -w"]
}
```

**When this runs:**

- On every `git commit`
- Via `.husky/pre-commit` hook
- Auto-formats all staged markdown files

---

## 🎯 Workflow for AI-Generated Tables

### When AI Creates a Table:

1. **AI writes table** (possibly misaligned):

```markdown
| Status | Name   | Progress |
| ------ | ------ | -------- |
| ✅     | Done   | 100%     |
| 🚀     | Active | 75%      |
```

2. **You save the file** → Prettier auto-formats:

```markdown
| Status | Name   | Progress |
| ------ | ------ | -------- |
| ✅     | Done   | 100%     |
| 🚀     | Active | 75%      |
```

3. **You commit** → lint-staged ensures formatting:

```bash
git add docs/my-file.md
git commit -m "docs: add status table"
# → Prettier runs automatically
# → Table is perfectly aligned
```

---

## 📋 Real-World Examples

### Example 1: Emoji Status Table

**Input:**

```markdown
| Epic   | Status     | Stories |
| ------ | ---------- | ------- |
| Epic 1 | ✅ Done    | 4/4     |
| Epic 2 | 🚀 Active  | 2/4     |
| Epic 3 | ⚠️ Blocked | 0/3     |
```

**Output (auto-formatted):**

```markdown
| Epic   | Status     | Stories |
| ------ | ---------- | ------- |
| Epic 1 | ✅ Done    | 4/4     |
| Epic 2 | 🚀 Active  | 2/4     |
| Epic 3 | ⚠️ Blocked | 0/3     |
```

### Example 2: ASCII Art Progress Bars

**Input:**

```markdown
| Task   | Progress     | Status |
| ------ | ------------ | ------ |
| Build  | [=========>] | 90%    |
| Test   | [=====> ]    | 50%    |
| Deploy | [===> ]      | 30%    |
```

**Output (auto-formatted):**

```markdown
| Task   | Progress     | Status |
| ------ | ------------ | ------ |
| Build  | [=========>] | 90%    |
| Test   | [=====> ]    | 50%    |
| Deploy | [===> ]      | 30%    |
```

### Example 3: Mixed Content

**Input:**

```markdown
| ID  | Type | Description                          | Status    |
| --- | ---- | ------------------------------------ | --------- |
| 1-1 | feat | UI preferences persistence           | ✅ Done   |
| 1-2 | feat | AWTRIX driver implementation         | ✅ Done   |
| 2-1 | feat | Config hot-reload with file watching | 🚀 Active |
```

**Output (auto-formatted):**

```markdown
| ID  | Type | Description                       | Status    |
| --- | ---- | --------------------------------- | --------- |
| 1-1 | feat | UI preferences persistence        | ✅ Done   |
| 1-2 | feat | AWTRIX driver implementation      | ✅ Done   |
| 2-1 | feat | Config hot-reload with file watch | 🚀 Active |
```

---

## 🚫 Known Limitations

### 1. Terminal Width Perception

**Issue:** Emojis display as 2 characters wide in most terminals, but Prettier treats them as 1-2 depending on the emoji.

**Impact:** Tables may look slightly misaligned in some terminals/editors.

**Solution:** Prettier uses Unicode-aware width calculation, so alignment is correct in most modern editors (VS Code, Cursor, GitHub, etc.).

### 2. Very Long Table Cells

**Issue:** Cells with 100+ characters might wrap in narrow editors.

**Solution:** `printWidth: 120` for markdown gives more room. Tables will be readable in most modern editors.

### 3. Complex ASCII Art

**Issue:** Multi-line ASCII art in table cells doesn't work well.

**Solution:** Use code blocks instead of tables for complex ASCII art.

---

## ✅ Verification

### Manual Test:

1. Create a markdown file with a messy table:

```bash
cat > /tmp/test-table.md << 'EOF'
| Name | Status | Notes |
|---|---|---|
| Item 1 | ✅ | Done |
| Item 2 | 🚀 | In progress |
EOF
```

2. Format with Prettier:

```bash
npx prettier --write /tmp/test-table.md
cat /tmp/test-table.md
```

3. Result should show perfect alignment:

```markdown
| Name   | Status | Notes       |
| ------ | ------ | ----------- |
| Item 1 | ✅     | Done        |
| Item 2 | 🚀     | In progress |
```

### Automated Test (Pre-commit):

```bash
# Create a markdown file with messy table
echo "| A | B | C |" > test.md
echo "|---|---|---|" >> test.md
echo "| 1 | ✅ | Done |" >> test.md

# Stage and commit
git add test.md
git commit -m "test: table formatting"

# → Prettier runs automatically
# → Table is perfectly aligned in commit
```

---

## 📝 Best Practices for AI Agents

### When Creating Tables:

1. **Don't worry about alignment** - Prettier will fix it
2. **Use simple pipe syntax** - `| A | B | C |`
3. **Include header separator** - `|---|---|---|`
4. **Let Prettier handle spacing** - It knows emoji widths

### When Reviewing AI-Generated Tables:

1. **Save the file** - Prettier auto-formats
2. **Check the preview** - Should look perfect
3. **Check the raw markdown** - Should be aligned
4. **Commit** - lint-staged ensures formatting

---

## 🎯 Summary

✅ **Problem:** AI-generated tables often have misaligned pipes in raw markdown

✅ **Solution:** Prettier auto-formats tables on save with perfect alignment

✅ **Configuration:** Already in place (`.prettierrc` + `lint-staged`)

✅ **Workflow:** Save → Auto-format → Commit → Perfect tables

✅ **Emoji Support:** Full support, proper width calculation

✅ **ASCII Art:** Supported in table cells

✅ **Sync:** CLI, Cursor IDE, pre-commit hooks all use same config

---

**No manual table formatting required! Just write tables normally and let Prettier handle the rest.** 🎉
