/**
 * The Inner Circle compose dialogs must not close while their save is in
 * flight. Both hosts (Outreach, This week) UNMOUNT the composer on close,
 * while the save's `onSuccess`/`onError` belong to the mutation and still
 * run: a late failure lands as a toast with no form to fix, and a late
 * success runs the host's close and the recommendation accept against
 * whatever is open by then.
 *
 * The rule is `closeUnlessSaving`; the second half reads the dialogs' source,
 * because a MUI Dialog renders through a portal and nothing here can click a
 * backdrop. A dialog that kept its own `() => onClose()` would pass every
 * test of the helper.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { closeUnlessSaving } from './dialogClose';

describe('closeUnlessSaving', () => {
  it('closes when no save is in flight', () => {
    const onClose = vi.fn();
    closeUnlessSaving(false, onClose)();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does nothing while a save is in flight', () => {
    const onClose = vi.fn();
    closeUnlessSaving(true, onClose)();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("never hands MUI's (event, reason) to the host as a saved payload", () => {
    // `onClose(saved?)` reads its first argument as "the save succeeded".
    // MUI calls a Dialog's onClose with (event, 'backdropClick').
    const onClose = vi.fn();
    const close = closeUnlessSaving(false, onClose) as (...args: unknown[]) => void;
    close({ type: 'click' }, 'backdropClick');
    expect(onClose.mock.calls).toEqual([[]]);
  });
});

const DIALOGS = ['PromotionDialog.tsx', 'PerkDialog.tsx', 'StyleVoteDialog.tsx'] as const;

describe.each(DIALOGS)('%s waits for its save before closing', (file) => {
  const source = readFileSync(join(__dirname, file), 'utf8');

  it('builds its close from the guard over its save mutation', () => {
    expect(source).toContain('const close = closeUnlessSaving(saveMutation.isPending, onClose);');
  });

  it('routes the backdrop and Escape through it', () => {
    expect(source).toMatch(/<Dialog\b[^>]*\bonClose=\{close\}/);
    expect(source).toMatch(/<Dialog\b[^>]*\bdisableEscapeKeyDown=\{saveMutation\.isPending\}/);
  });

  it('routes Cancel through it and disables Cancel while saving', () => {
    expect(source).toMatch(/<Button onClick=\{close\} disabled=\{saveMutation\.isPending\}>\s*Cancel\s*<\/Button>/);
  });

  it('has no unguarded close left', () => {
    expect(source).not.toMatch(/=\{\(\) => onClose\(\)\}/);
  });
});
