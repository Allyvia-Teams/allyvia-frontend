# CLAUDE.md — allyvia-frontend

Guidance for AI agents (Claude Code, Cursor) working in this repo.

## Formatting is enforced by CI — always run it before committing

CI runs `eslint . --max-warnings=0`. Prettier violations surface as ESLint
**warnings**, and `--max-warnings=0` makes every warning fail the build. A
single misplaced line break fails CI exactly like a type error.

**Before every commit:**

```bash
npm run lint:fix     # eslint --fix (applies prettier)
npm run typecheck    # tsc --noEmit
```

Or run the full CI gate locally:

```bash
npm run ci           # lint:ci + prettier:check + typecheck + build
```

A `husky` pre-commit hook runs `lint-staged` (prettier + eslint --fix on
staged files). It only works if hooks are installed — `npm install` runs
`prepare: husky`, which sets `core.hooksPath`. If commits are landing
unformatted, check `git config core.hooksPath` returns `.husky/_`.

### Committing from a GUI client

GitHub Desktop, VS Code and Tower run hooks with a minimal PATH that excludes
nvm / homebrew / volta node, which used to kill the hook with
`npx: command not found`. `.husky/pre-commit` now locates node itself before
running lint-staged. If it still can't find node on your machine, create
`~/.config/husky/init.sh` (husky sources it automatically) with whatever PATH
export or nvm sourcing your shell uses.

## Formatting config

`.prettierrc` is the single source of truth. `eslint.config.mjs` delegates to
it via `'prettier/prettier': 'warn'` with no inline options — do not re-declare
prettier options in the ESLint config, that caused drift previously.

## Commands

| Command             | Purpose                    |
| ------------------- | -------------------------- |
| `npm start`         | Vite dev server            |
| `npm run lint:fix`  | Auto-fix lint + formatting |
| `npm run typecheck` | Type check only            |
| `npm test`          | Vitest                     |
| `npm run build`     | Production build           |
| `npm run ci`        | Everything CI runs         |

## Conventions

- TypeScript throughout; avoid `any`.
- MUI: no deep imports (`@mui/*/*/*` is lint-blocked — breaks tree-shaking).
- Feature code lives in `src/features/<domain>/`; page-level views in `src/views/`.
- Default branch is `develop`.
