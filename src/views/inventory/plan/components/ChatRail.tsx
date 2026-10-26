// The chat beside the memo (design §8 and §10; B6's endpoint). It explains from the plan's own numbers and
// proposes changes she confirms. Presentational over chat.ts's state: the page owns the calls.

import { useEffect, useRef, useState, type RefObject } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconSend, IconX } from '@tabler/icons-react';

import type { Citation } from 'api/buying.api';

import { citationLabel, type ChatState } from '../chat';
import type { ChipsState } from '../selection';
import ConfirmCard from './ConfirmCard';

interface Props {
  state: ChatState;
  chips: ChipsState;
  /** Why the assistant cannot answer here (switched off, or plan mode off), or null. */
  offline: string | null;
  shortcutLabel: string;
  onRemoveChip: (anchor: string) => void;
  onSend: (text: string) => void;
  onCite: (citation: Citation, fromLocalId: string) => void;
  onConfirm: (localId: string, index: number, which: 'confirm' | 'record') => void;
  onDismiss: (localId: string, index: number) => void;
  onNote: (localId: string, index: number, note: string) => void;
  onClose?: () => void;
  /** The page focuses the input after Add to chat. */
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}

export const messageDomId = (localId: string) => `plan-msg-${localId}`;

export default function ChatRail({
  state,
  chips,
  offline,
  shortcutLabel,
  onRemoveChip,
  onSend,
  onCite,
  onConfirm,
  onDismiss,
  onNote,
  onClose,
  inputRef
}: Props) {
  const [text, setText] = useState('');
  const log = useRef<HTMLDivElement | null>(null);
  // Each turn lands at the bottom of the log, in view (the mockup's scrollTop = scrollHeight).
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [state.messages.length, state.pending]);
  const send = () => {
    const message = text.trim();
    if (!message || state.pending || offline) return;
    onSend(message);
    setText('');
  };

  return (
    <Box
      component="aside"
      aria-label="Ask about this plan"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box
        sx={{ px: '16px', py: '12px', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography component="h2" sx={{ fontWeight: 600 }}>
            Ask about this plan
          </Typography>
          <Typography variant="caption" color="text.secondary">
            It cites the memo&apos;s numbers and proposes changes you confirm.
          </Typography>
        </Box>
        {onClose ? (
          <IconButton size="small" onClick={onClose} aria-label="Close the chat">
            <IconX size={16} />
          </IconButton>
        ) : null}
      </Box>

      <Box
        ref={log}
        role="log"
        aria-live="polite"
        aria-busy={state.pending}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: '16px', py: '12px' }}
      >
        <Stack spacing={1.5}>
          {state.messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Select anything on the memo and press {shortcutLabel} to bring it into the chat, then ask why, or what if.
            </Typography>
          ) : null}
          {state.messages.map((m) => (
            <Box
              key={m.localId}
              id={messageDomId(m.localId)}
              tabIndex={-1}
              sx={(theme) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.role === 'owner' ? 'flex-end' : 'flex-start',
                borderRadius: '10px',
                outline: 'none',
                '&:focus-visible': { boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.55)}` },
                '&.plan-flash': { bgcolor: alpha(theme.palette.warning.main, 0.18) }
              })}
            >
              <Box
                sx={(theme) => ({
                  maxWidth: '92%',
                  px: '12px',
                  py: '8px',
                  borderRadius: '10px',
                  bgcolor: m.role === 'owner' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.text.primary, 0.04),
                  whiteSpace: 'pre-wrap'
                })}
              >
                {m.chips.length ? (
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.25 }}>
                    About: {m.chips.join(' · ')}
                  </Typography>
                ) : null}
                <Typography variant="body2" color={m.refused ? 'text.secondary' : 'text.primary'}>
                  {m.text}
                </Typography>
              </Box>
              {m.citations.length ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  useFlexGap
                  sx={{ flexWrap: 'wrap', mt: 0.5 }}
                  role="group"
                  aria-label="Where these numbers are"
                >
                  {m.citations.map((c, i) => (
                    <Chip
                      key={i}
                      size="small"
                      variant="outlined"
                      label={citationLabel(c)}
                      onClick={() => onCite(c, m.localId)}
                      sx={{ height: 22, fontSize: '0.72rem', fontFamily: 'monospace' }}
                    />
                  ))}
                </Stack>
              ) : null}
              {m.cards.length ? (
                <Stack spacing={1} sx={{ mt: 1, width: '100%' }}>
                  {m.cards.map((c, i) => (
                    <ConfirmCard
                      key={i}
                      state={c}
                      onConfirm={(which) => onConfirm(m.localId, i, which)}
                      onDismiss={() => onDismiss(m.localId, i)}
                      onNote={(note) => onNote(m.localId, i, note)}
                    />
                  ))}
                </Stack>
              ) : null}
              {m.quickReplies.length && m === state.messages[state.messages.length - 1] ? (
                <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                  {m.quickReplies.map((reply) => (
                    <Chip
                      key={reply}
                      label={reply}
                      onClick={() => !state.pending && !offline && onSend(reply)}
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Stack>
              ) : null}
            </Box>
          ))}
        </Stack>
        {state.pending ? (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Reading the plan…
            </Typography>
            <LinearProgress sx={{ mt: 0.5 }} />
          </Box>
        ) : null}
      </Box>

      <Box sx={{ px: '16px', py: '12px', borderTop: '1px solid', borderColor: 'divider' }}>
        {chips.chips.length ? (
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }} role="group" aria-label="In the chat's context">
            {chips.chips.map((chip) => (
              <Chip
                key={chip.anchor}
                size="small"
                label={chip.label}
                onDelete={() => onRemoveChip(chip.anchor)}
                sx={{ maxWidth: '100%' }}
              />
            ))}
          </Stack>
        ) : null}
        {chips.notice ? (
          <Typography variant="caption" color="text.secondary" component="div" role="status" sx={{ mb: 0.5 }}>
            {chips.notice}
          </Typography>
        ) : null}
        {state.error ? (
          <Typography variant="body2" color="error" role="alert" sx={{ mb: 0.75 }}>
            {state.error}
          </Typography>
        ) : null}
        {offline ? (
          <Typography variant="body2" color="text.secondary">
            {offline}
          </Typography>
        ) : (
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={6}
              size="small"
              placeholder="Why this number? What if…?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              inputRef={inputRef}
              slotProps={{ htmlInput: { 'aria-label': 'Ask about this plan', maxLength: 2000 } }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!text.trim() || state.pending}
              aria-label="Send"
              sx={{ minWidth: 0, px: 1.5, height: 40 }}
            >
              <IconSend size={16} />
            </Button>
          </Box>
        )}
        <Typography variant="caption" color="text.disabled" component="div" sx={{ mt: 0.75 }}>
          Select anything on the memo and press {shortcutLabel} to bring it into the chat. The assistant proposes changes; you confirm them.
        </Typography>
      </Box>
    </Box>
  );
}
