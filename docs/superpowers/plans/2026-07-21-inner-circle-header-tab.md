# Inner Circle Header Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header's dead space with a prominent branded Inner Circle tab and remove the Inner Circle sidebar group.

**Architecture:** One new self-contained header component (`InnerCircleTab`) keyed entirely off the MUI theme (brand primary + resolved heading font — both already brand-aware with automatic fallback), inserted between the header's two flexGrow spacers; plus a sidebar menu-item removal.

**Tech Stack:** React 19, MUI v7 (Berry) + Emotion, react-router-dom v7, @tabler/icons-react.

**Spec:** `docs/superpowers/specs/2026-07-21-inner-circle-header-tab-design.md`

## Global Constraints

- Branch: `innercirclecrmmerge` — never create a new branch; verify with `git branch --show-current` before every commit (an external session has switched checkouts before).
- Node/npm only via nvm: `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` before any npm command.
- Backend: zero changes. TypeScript strict — no `any`. MUI v7 + Emotion; no Tailwind.
- Typecheck baseline: 48 pre-existing errors in theme/layout files (`MainContentStyled.ts`, `chartPalette.ts`, `compStyleOverride.tsx`, etc.). Gate = **no NEW errors in touched files**, plus `npm run build` success.
- Accent/font come from the theme (`theme.palette.primary.main`, `theme.typography.h4.fontFamily`) — never from raw `brandTheme` hex/font strings, so the no-brand fallback is automatic.
- Working dir: `/Users/nigelfernando/Documents/Allyvia/allyvia-frontend`. Tests: `npx vitest run <path>` (never bare `npm test` — watch mode).

## Verified facts

- `Header/index.tsx:104-105` is exactly two adjacent `<Box sx={{ flexGrow: 1 }} />` lines between `<SearchSection …/>` and the `{/* Global synchronization status */}` comment.
- `themes/index.tsx:28`: `headingFont = brandTheme?.headingFont ?? headingFontFamily`, applied to h1–h4 in `themes/typography.tsx`; font loading (`loadCustomFont`/`loadGoogleFont`) already fires there at bootstrap.
- `menu-items/pages.ts`: `inner-circle` collapse group is lines ~93–108; `IconCrown` and `IconClipboardList` are used ONLY by that group within this file.
- `InnerCirclePage.tsx` already has a "Survey Drafts" header button → nothing to relocate.
- `headerIconSize = 20` in `store/constant.ts` (for scale reference; the tab icon is deliberately larger at 22).

## File Structure (end state)

```
src/layout/MainLayout/Header/InnerCircleTab.tsx  (new)
src/layout/MainLayout/Header/index.tsx           (modified — spacer·tab·spacer + import)
src/menu-items/pages.ts                          (modified — inner-circle group + 2 unused icons removed)
```

---

### Task 1: InnerCircleTab component + header placement

**Files:**
- Create: `src/layout/MainLayout/Header/InnerCircleTab.tsx`
- Modify: `src/layout/MainLayout/Header/index.tsx` (one import + lines 104–105)

**Interfaces:**
- Consumes: `theme.palette.primary.main`, `theme.typography.h4.fontFamily` (both brand-aware with fallback), `useMediaQuery(theme.breakpoints.down('md'))`.
- Produces: `<InnerCircleTab />` — no props.

- [ ] **Step 1: Create the component**

`src/layout/MainLayout/Header/InnerCircleTab.tsx`:
```tsx
import { useLocation, useNavigate } from 'react-router-dom';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

// assets
import { IconCrown } from '@tabler/icons-react';

// ==============================|| HEADER - INNER CIRCLE TAB ||============================== //

// Prominent branded entry point for Inner Circle, centered in the header.
// Accent + label font key off the theme, which is already brand-derived
// (brand primary -> palette.primary, brand heading font -> typography.h4),
// so the tab renders fully styled with or without a configured brand.
export default function InnerCircleTab() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const active = location.pathname.startsWith('/inner-circle');
  const primary = theme.palette.primary.main;

  const tab = (
    <ButtonBase
      onClick={() => navigate('/inner-circle')}
      aria-label="Inner Circle"
      aria-current={active ? 'page' : undefined}
      sx={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        px: downMD ? 1.25 : 2.5,
        py: 0.75,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: alpha(primary, active ? 0.45 : 0.24),
        bgcolor: alpha(primary, active ? 0.16 : 0.08),
        color: active ? primary : 'text.primary',
        transition: 'all .2s ease-in-out',
        '&:hover': { bgcolor: alpha(primary, active ? 0.2 : 0.12) }
      }}
    >
      <IconCrown size={22} stroke={1.8} color={primary} />
      {!downMD && (
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: theme.typography.h4.fontFamily,
            fontWeight: 600,
            lineHeight: 1.1,
            color: 'inherit',
            whiteSpace: 'nowrap'
          }}
        >
          Inner Circle
        </Typography>
      )}
    </ButtonBase>
  );

  return downMD ? <Tooltip title="Inner Circle">{tab}</Tooltip> : tab;
}
```

- [ ] **Step 2: Place it in the header**

`src/layout/MainLayout/Header/index.tsx` — add import after line 10 (`import GlobalSyncIndicator …`):
```ts
import InnerCircleTab from './InnerCircleTab';
```
Replace lines 104–105:
```tsx
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ flexGrow: 1 }} />
```
with:
```tsx
      <Box sx={{ flexGrow: 1 }} />
      <InnerCircleTab />
      <Box sx={{ flexGrow: 1 }} />
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` — grep output for `InnerCircleTab|Header/index`; expected: no matches (48 pre-existing errors elsewhere).
Run: `npm run build` — expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/layout/MainLayout/Header/InnerCircleTab.tsx src/layout/MainLayout/Header/index.tsx
git commit -m "feat(header): branded Inner Circle tab centered between search and controls"
```

---

### Task 2: Remove the Inner Circle sidebar group

**Files:**
- Modify: `src/menu-items/pages.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: sidebar without the `inner-circle` collapse group.

- [ ] **Step 1: Delete the group and its now-unused icons**

In `src/menu-items/pages.ts`:
1. Delete the entire `inner-circle` collapse object (the `{ id: 'inner-circle', title: 'Inner Circle', type: 'collapse', icon: icons.IconCrown, children: [ …inner-circle-home…, …inner-circle-survey-drafts… ] },` block, ~lines 93–108).
2. Remove `IconCrown` and `IconClipboardList` from the `@tabler/icons-react` import list AND from the `icons` object (each is used only by the deleted group in this file — verify with a quick grep of the file before removing; if another entry uses either icon, leave that identifier in place and note it).

- [ ] **Step 2: Verify**

Run: `grep -n "IconCrown\|IconClipboardList\|inner-circle" src/menu-items/pages.ts` — expected: no matches.
Run: `npm run typecheck` — no errors referencing `pages.ts`.
Run: `npm run build` — success.

- [ ] **Step 3: Commit**

```bash
git add src/menu-items/pages.ts
git commit -m "feat(menu): remove Inner Circle sidebar group (replaced by header tab)"
```

---

### Task 3: Verification pass

**Files:** none (fix-forward only).

- [ ] **Step 1: Static checks**

Run: `npm run typecheck` (48 baseline errors, none in touched files), `npm run build` (success), `npx vitest run` (all suites pass — 98/98 expected).
Run: `npx prettier --check src/layout/MainLayout/Header/InnerCircleTab.tsx src/layout/MainLayout/Header/index.tsx src/menu-items/pages.ts` — clean; if not, `npx prettier --write` those files and amend/commit.

- [ ] **Step 2: In-browser (dev servers on :3000/:8000)**

1. Header shows the crown pill centered between search bar and right controls; label "Inner Circle" beneath the crown.
2. Click → lands on `/inner-circle`; tab shows active treatment (deeper tint, primary label). Navigate to `/dashboard` → inactive treatment.
3. Resize to < md (e.g. 700px wide) → label hidden, crown-only, tooltip on hover, no overlap with the search bar.
4. Sidebar: no Inner Circle group (and no CRM — from Part 1).
5. On `/inner-circle`, the "Survey Drafts" button still navigates to `/inner-circle/surveys/drafts`.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: Part 2 verification follow-ups"
```
(Skip if nothing needed fixing.)

## Self-review notes

- Spec coverage: component/pill/active/responsive (T1), placement (T1), sidebar removal + Survey Drafts intact (T2, verified in-page button exists), fallback-by-theme (T1 design), verification (T3).
- No component unit tests: repo has no @testing-library; the component has no extractable pure logic (active check is one `startsWith`). Verification is typecheck/build/browser, consistent with repo practice for layout components.
