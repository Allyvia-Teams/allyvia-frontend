// The price review a "mark this down" card opens (owner trust T16, design 4.9).
//
// Each item shows its price now, its cost when known and what is on hand, with a New price field and quick
// 10, 20 and 30 percent off buttons (the arithmetic is actionPrefill.ts's). The field starts empty unless the API
// sent a price its code computed; it never starts from the card's sentence. A price below cost shows a warning
// and needs a tick. Approve sends only the items with a valid new price, and only when nothing she typed is wrong.
//
// When a connected POS sets her prices there is no Approve: the dialog says so and offers the list to copy.
//
// MarkdownReviewContent is props-only so it can be rendered statically in tests; the dialog holds the state.

import { useState, type FocusEvent } from 'react';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import {
  appliedSentence,
  buildApproval,
  checkPrice,
  copyListText,
  dollars,
  GENERIC_PRICE_FAILURE,
  isAllyviaTill,
  posSentence,
  QUICK_PERCENTS,
  quickPrice,
  readPriceChangeFailure,
  readPriceChangeResult,
  rowKey,
  startingDrafts,
  type Draft,
  type MarkdownAction,
  type PriceChangeBody,
  type PriceChangeFailure
} from '../actionPrefill';
import type { ReviewResult } from '../prefillFlows';

export interface MarkdownReviewContentProps {
  action: MarkdownAction;
  drafts: Readonly<Record<string, Draft>>;
  saving: boolean;
  failure: PriceChangeFailure | null;
  copied: boolean;
  /** Set when the list could not be copied for her: shown selected, to copy by hand. */
  manualList?: string | null;
  onValue: (key: string, value: string) => void;
  onTick: (key: string, checked: boolean) => void;
  onApprove: () => void;
  onCopy: () => void;
  onClose: () => void;
}

export const REVIEW_TITLE = 'Review prices';
export const REVIEW_INTRO = 'Type the new price for each item, or use a quick button. Nothing changes until you approve.';

export function MarkdownReviewContent({
  action,
  drafts,
  saving,
  failure,
  copied,
  manualList = null,
  onValue,
  onTick,
  onApprove,
  onCopy,
  onClose
}: MarkdownReviewContentProps) {
  const ours = isAllyviaTill(action.priceApply);
  const approval = buildApproval(action, drafts);

  return (
    <Stack spacing={2} data-markdown-review>
      <Typography color="text.secondary" sx={{ fontSize: '0.9375rem' }} data-review-intro>
        {ours ? REVIEW_INTRO : posSentence(action.priceApply)}
      </Typography>

      <Stack spacing={1.5} role="list" aria-label="Items to review">
        {action.items.map((row) => {
          const key = rowKey(row);
          const draft = drafts[key];
          const check = checkPrice(row, draft);
          const serverSaid = row.itemIds.map((id) => failure?.byItem[id]).find(Boolean);
          const what = row.variantCount > 1 ? `${row.variantCount} sizes and colours` : null;
          return (
            <Box
              key={key}
              role="listitem"
              data-review-row={key}
              sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', p: 1.5, bgcolor: 'background.paper' }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }} useFlexGap>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                    {[row.sku, what].filter(Boolean).join(' · ')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', mt: 0.5 }}>
                    <span data-review-now>Now {dollars(row.price)}</span>
                    {row.cost && <span data-review-cost>{`, cost ${dollars(row.cost)}`}</span>}
                    <span data-review-onhand>{`, ${row.onHand} on hand`}</span>
                  </Typography>
                </Box>
                {ours && (
                  <Stack spacing={1} sx={{ minWidth: { sm: 220 } }}>
                    <TextField
                      size="small"
                      label="New price"
                      value={draft?.value ?? ''}
                      onChange={(e) => onValue(key, e.target.value)}
                      disabled={saving}
                      error={check.blocking}
                      slotProps={{
                        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                        htmlInput: { inputMode: 'decimal', 'aria-label': `New price for ${row.name}` }
                      }}
                    />
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      {QUICK_PERCENTS.map((pct) => (
                        <Button
                          key={pct}
                          size="small"
                          variant="outlined"
                          color="inherit"
                          disabled={saving}
                          onClick={() => {
                            const price = quickPrice(row, pct);
                            if (price !== null) onValue(key, price);
                          }}
                        >
                          {pct}% off
                        </Button>
                      ))}
                    </Stack>
                    {check.message && (
                      <Typography
                        color={check.status === 'below_cost' ? 'warning.dark' : 'error'}
                        sx={{ fontSize: '0.8125rem' }}
                        data-review-message
                      >
                        {check.message}
                      </Typography>
                    )}
                    {check.status === 'below_cost' && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={!!draft?.belowCostOk}
                            onChange={(e) => onTick(key, e.target.checked)}
                            disabled={saving}
                          />
                        }
                        label="Sell below cost"
                      />
                    )}
                    {serverSaid && (
                      <Typography color="error" sx={{ fontSize: '0.8125rem' }} data-review-server-message>
                        {serverSaid}
                      </Typography>
                    )}
                  </Stack>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {manualList !== null && (
        <TextField
          multiline
          fullWidth
          size="small"
          value={manualList}
          label="Select this list and copy it"
          slotProps={{
            input: { readOnly: true },
            htmlInput: { 'data-review-manual-list': '', onFocus: (event: FocusEvent<HTMLTextAreaElement>) => event.currentTarget.select() }
          }}
        />
      )}

      {failure && (
        <Alert severity="error" data-review-failure>
          {failure.sentence}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        {ours ? (
          <>
            <Button color="inherit" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={onApprove} disabled={!approval.canApprove || saving} data-review-approve>
              {saving
                ? 'Saving'
                : approval.changedRows > 0
                  ? `Approve ${approval.changedRows} ${approval.changedRows === 1 ? 'change' : 'changes'}`
                  : 'Approve'}
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={onClose}>
              Close
            </Button>
            <Button variant="contained" onClick={onCopy} data-review-copy>
              {copied ? 'Copied' : 'Copy list'}
            </Button>
          </>
        )}
      </Stack>
    </Stack>
  );
}

/** Writes the clipboard, falling back to the old copy command; false when neither worked. */
const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(box);
      return ok;
    } catch {
      return false;
    }
  }
};

export interface MarkdownReviewDialogProps {
  action: MarkdownAction;
  apply: (body: PriceChangeBody) => Promise<unknown>;
  onClose: (result: ReviewResult) => void;
}

export default function MarkdownReviewDialog({ action, apply, onClose }: MarkdownReviewDialogProps) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => startingDrafts(action.items));
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<PriceChangeFailure | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualList, setManualList] = useState<string | null>(null);

  const cancel = () => onClose({ done: false, sentence: null });

  const approve = async () => {
    const { body } = buildApproval(action, drafts);
    if (!body || saving) return;
    setSaving(true);
    setFailure(null);
    try {
      const result = readPriceChangeResult(await apply(body));
      onClose({ done: true, sentence: appliedSentence(result.changed) });
    } catch (error) {
      setFailure(readPriceChangeFailure(error) ?? { status: null, sentence: GENERIC_PRICE_FAILURE, byItem: {} });
      setSaving(false);
    }
  };

  const copy = async () => {
    const text = copyListText(action, drafts);
    if (await copyText(text)) {
      setCopied(true);
      // She took the list to her register: the card counts as acted on.
      onClose({ done: true, sentence: 'List copied.' });
    } else {
      // Some browsers refuse to write the clipboard: show the list selected so she can copy it by hand.
      setManualList(text);
      setFailure({ status: null, sentence: 'Allyvia could not copy the list for you. Copy it from the box below.', byItem: {} });
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : cancel} fullWidth maxWidth="md" aria-labelledby="markdown-review-title">
      <DialogTitle id="markdown-review-title">{REVIEW_TITLE}</DialogTitle>
      <DialogContent>
        <MarkdownReviewContent
          action={action}
          drafts={drafts}
          saving={saving}
          failure={failure}
          copied={copied}
          manualList={manualList}
          onValue={(key, value) => setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? { belowCostOk: false }), value } }))}
          onTick={(key, checked) =>
            setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? { value: '' }), belowCostOk: checked } }))
          }
          onApprove={approve}
          onCopy={copy}
          onClose={cancel}
        />
      </DialogContent>
    </Dialog>
  );
}
