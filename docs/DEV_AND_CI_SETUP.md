# 🧭 PIDICON – Dev Environment & Enforcement Overview

\*Last update: 2025-10-23\_

## 1️⃣ Purpose

Ensure all code, documentation, commits, and automated actions stay consistent across developers, CI, and Cursor AI assistance.

The environment combines:

| Layer                       | Tool / File                      | Role                                        |
| --------------------------- | -------------------------------- | ------------------------------------------- |
| Editor guidance             | `.cursor/rules/pidicon.mdc`      | Human + AI code standards                   |
| Lint & formatting           | ESLint / Prettier / Markdownlint | Code & docs hygiene                         |
| Commit validation           | Commitlint + Husky               | Enforce Conventional Commits                |
| Hook automation             | Husky + lint‑staged              | Run checks before commit / push             |
| Deployment trigger          | Husky (pre‑push)                 | Notify Watchtower for container auto‑update |
| Environment reproducibility | **devenv (Nix)**                 | Pin Node / npm toolchain                    |

---

## 2️⃣ Key setup summary

| Component    | Version              | Location             | Notes                                                 |
| ------------ | -------------------- | -------------------- | ----------------------------------------------------- |
| Node / npm   | 24.10.0 (via devenv) | reproducible         | pinned environment                                    |
| ESLint       | 9.36                 | `.eslintrc.json`     | max 50 LOC / no magic numbers / complexity ≤ 10       |
| Prettier     | 3.6                  | `.prettierrc`        | line width 80; aligns Markdown tables                 |
| Markdownlint | 0.45                 | `.markdownlint.json` | requires code‑block languages                         |
| Commitlint   | 20.1                 | `.commitlintrc.cjs`  | enforces Conventional Commits                         |
| Husky        | ≥ 9                  | `.husky/`            | modern layout hooks                                   |
| lint‑staged  | 15.x                 | `package.json`       | runs ESLint + Prettier + Markdownlint on staged files |

---

## 3️⃣ Hook logic overview

### `.husky/pre‑commit`

- Runs `npx lint-staged` → auto‑fixes staged JS / TS / MD.
- Validates `.cursor/rules/*.mdc` YAML front‑matter (safe detection).
- Stops commit if structural issues found.

### `.husky/commit‑msg`

- Runs `npx --no -- commitlint --edit "$1"`.
- Blocks non‑conforming commit messages (must follow _Conventional Commit_ style).

### `.husky/pre‑push`

- Runs full `npm run lint -- --max‑warnings=0` + `markdownlint`.
- If clean, triggers **remote Watchtower** (non‑blocking) to pull and redeploy new PIDICON image after CI build.

---

## 4️⃣ Cursor rule highlights

File: `.cursor/rules/pidicon.mdc` (v2.1.0)

- Split long tasks into sub‑plans (> 30 min work).
- JS quality: no magic numbers, ≤ 50 lines / function, complexity ≤ 10, ≤ 5 params.
- Markdown: use language identifiers in fences.
- Commit style: Conventional Commits (`feat`, `fix`, `docs`, etc.).
- Scene modules: implement `init/run/teardown`.
- Bash scripts: POSIX shebang; doc examples prefer fish syntax.
- Always mention `build N (hash)` for deployment references.

---

## 5️⃣ Developer workflow

1. Work inside devenv shell (`devenv shell`) – ensures pinned Node env.
2. Edit code; Cursor follows the pidicon rules interactively.
3. On `git commit`:
   - `pre‑commit` auto‑formats and lints staged files.
   - Commitlint validates message syntax.
4. On `git push`:
   - Lint re‑runs, then Watchtower triggers remote redeploy.

Failed checks block commit/push until fixed.

---

## 6️⃣ Maintenance notes

- To add new AI or linting rules → update `.cursor/rules/pidicon.mdc`, bump `version`.
- To add/modify lint commands → edit `lint‑staged` in `package.json`.
- Husky auto‑installs via `npm run prepare` after clone.
- Run once in a while:

  ```bash
  npm audit fix
  npx prettier --write .
  ```

---

## 7️⃣ TL;DR

> **Cursor = guidance**  
> **ESLint / Prettier / Commitlint / Markdownlint (+ Husky) = enforcement**  
> **Watchtower** = auto‑deploy  
> **Devenv** = reproducible environment

Everything else is just smart glue. 🧠💪
