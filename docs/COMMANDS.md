# Available Commands

This document describes all available npm scripts and commands in the project.

---

## Development Commands

### `npm start`

Starts the development server with hot module replacement.

- **Usage**: `npm start`
- **Description**: Runs Vite dev server with host access
- **When to use**: Local development

### `npm run serve`

Preview the production build locally.

- **Usage**: `npm run serve`
- **Description**: Serves the production build using Vite preview
- **When to use**: Testing production build locally before deployment

---

## Build Commands

### `npm run build`

Builds the application for production.

- **Usage**: `npm run build`
- **Description**: Runs TypeScript compilation (`tsc`) and Vite production build
- **Output**: Creates `dist/` directory with optimized production assets
- **When to use**: Before deployment or to verify production build

---

## Code Quality Commands

### `npm run lint`

Runs ESLint to check code quality across all files.

- **Usage**: `npm run lint`
- **Description**: Checks all files for linting errors and warnings
- **When to use**: Before committing to check for code quality issues

### `npm run lint:ci`

Runs ESLint in CI mode (fails on warnings).

- **Usage**: `npm run lint:ci`
- **Description**: Same as `lint` but exits with error if any warnings are found
- **When to use**: In CI/CD pipelines to enforce strict code quality

### `npm run lint:fix`

Runs ESLint and automatically fixes fixable issues.

- **Usage**: `npm run lint:fix`
- **Description**: Automatically fixes ESLint errors that can be auto-fixed
- **When to use**: To quickly fix common linting issues

### `npm run prettier`

Formats all code files using Prettier.

- **Usage**: `npm run prettier`
- **Description**: Formats all JS, JSX, TS, TSX, JSON, MD, YAML files
- **When to use**: To format code according to project style guide

### `npm run prettier:check`

Checks if files are formatted correctly (does not modify files).

- **Usage**: `npm run prettier:check`
- **Description**: Verifies code formatting without making changes
- **When to use**: In CI/CD to verify code formatting

### `npm run typecheck`

Runs TypeScript type checking without emitting files.

- **Usage**: `npm run typecheck`
- **Description**: Validates TypeScript types across the entire project
- **When to use**: To verify type safety without building

---

## Comprehensive Check Commands

### `npm run checks`

Full validation including lint, typecheck, and build.

- **Usage**: `npm run checks`
- **Description**: Runs `lint`, `typecheck`, and `build` sequentially
- **When to use**:
  - Before pushing code (via pre-push hook)
  - Local full validation before important commits
  - Manual verification of code quality

### `npm run checks:ci`

CI-friendly checks without build (lint + typecheck only).

- **Usage**: `npm run checks:ci`
- **Description**: Runs `lint` and `typecheck` only (no build)
- **When to use**:
  - In CI/CD test jobs (faster execution)
  - When you only need quality checks without building

### `npm run checks:fast`

Quick checks with auto-fix (lint:fix + typecheck).

- **Usage**: `npm run checks:fast`
- **Description**: Runs `lint:fix` and `typecheck` for quick validation
- **When to use**:
  - Quick local validation
  - When you want auto-fixes applied

### `npm run ci`

Complete CI pipeline checks.

- **Usage**: `npm run ci`
- **Description**: Runs `lint:ci`, `prettier:check`, `typecheck`, and `build`
- **When to use**:
  - Full CI validation locally
  - Before creating pull requests

---

## Testing Commands

### `npm test`

Runs the test suite.

- **Usage**: `npm test`
- **Description**: Runs Vitest test suite
- **When to use**: To run all tests during development

---

## Git Hooks

### Pre-commit Hook

Automatically runs on `git commit`.

- **What it does**:
  - Formats staged files with Prettier
  - Lints and auto-fixes staged files with ESLint
- **Performance**: < 10 seconds
- **Can be skipped**: `git commit --no-verify`

### Pre-push Hook

Automatically runs on `git push`.

- **What it does**:
  - Runs `npm run checks` (full validation including build)
  - Catches issues before CI runs
- **Performance**: ~1-2 minutes (includes build)
- **Can be skipped**: `git push --no-verify`

---

## Command Comparison

| Command       | Lint | Typecheck | Build | Auto-fix | Use Case             |
| ------------- | ---- | --------- | ----- | -------- | -------------------- |
| `lint`        | ✅   | ❌        | ❌    | ❌       | Check code quality   |
| `lint:fix`    | ✅   | ❌        | ❌    | ✅       | Fix linting issues   |
| `typecheck`   | ❌   | ✅        | ❌    | ❌       | Check types          |
| `checks`      | ✅   | ✅        | ✅    | ❌       | Full validation      |
| `checks:ci`   | ✅   | ✅        | ❌    | ❌       | CI test job          |
| `checks:fast` | ✅   | ✅        | ❌    | ✅       | Quick validation     |
| `ci`          | ✅   | ✅        | ✅    | ❌       | Complete CI pipeline |

---

## Recommended Workflow

### Daily Development

1. Make code changes
2. `git add .` to stage files
3. `git commit` (pre-commit hook runs automatically)
4. `git push` (pre-push hook runs full validation)

### Before Pull Request

1. Run `npm run ci` to ensure all checks pass
2. Run `npm test` to ensure tests pass
3. Create pull request

### Quick Fixes

1. Run `npm run checks:fast` for quick validation with auto-fixes
2. Commit and push

### CI/CD Pipeline

- **Test Job**: Runs `npm run checks:ci` (no build)
- **Build Job**: Runs `npm run build` with environment config
- **Deploy Job**: Deploys built artifacts

---

## Troubleshooting

### Pre-commit hook is slow

- This should not happen with the optimized setup
- If it does, check if `lint-staged` is running correctly
- Verify you're not running old hooks

### Pre-push hook fails

- Check the error message
- Fix linting/type errors
- Or skip with `git push --no-verify` (not recommended)

### Build fails in CI

- Run `npm run build` locally to reproduce
- Check for TypeScript errors: `npm run typecheck`
- Verify environment variables are set correctly

---

## Notes

- All commands should be run from the project root directory
- Use `npm ci` instead of `npm install` in CI/CD (faster, more reliable)
- The `checks` command includes a build, which may take 30-60 seconds
- Pre-commit hooks are optimized for speed (< 10 seconds)
- Pre-push hooks run full validation to catch issues early
