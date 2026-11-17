// The chat rail on the Insights page (owner trust T11): "Ask Allyvia". Props only; useInsightChat.ts holds the
// state and makes the calls, insightChat.ts decides every sentence. The look follows the buy planner's chat
// rail, but nothing is shared with it: its state, citations and confirm cards belong to the plan.
//
// The chat explains and never changes a recommendation, so there is no confirm card here, only answers whose
// figures can take her to the card they came from.

import { useEffect, useRef, type RefObject } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconChevronsRight, IconSend } from '@tabler/icons-react';

import {
  MAX_MESSAGE_CHARS,
  REFUSED_HINT,
  canSend,
  counterText,
  refChips,
  userMessageLabels,
  type ChatState,
  type LogMessage
} from '../insightChat';

export interface InsightChatRailProps {
  state: ChatState;
  /** The title of a card on the page by its Recommendation id; null when it is not there. */
  titleOf: (recommendationId: string) => string | null;
  /** The page's card id for a Recommendation id when that card is on the page; null when it is not. */
  cardOnPage: (recommendationId: string) => string | null;
  /** A figure's chip was pressed: take her to that card. */
  onCite: (cardId: string) => void;
  /** A "Document" chip was pressed: open that document (owner trust T12). Absent: the chip is plain text. */
  onOpenDocument?: (documentId: string) => void;
  onDraft: (text: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onNew: () => void;
  onDetach: (recommendationId: string) => void;
  onClose: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}

const EMPTY = 'Ask why a recommendation says what it does. Add up to 3 recommendations to the chat, or just ask a question.';

function Bubble({ message, props }: { message: LogMessage; props: InsightChatRailProps }) {
  const { titleOf, cardOnPage, onCite, onOpenDocument } = props;
  const mine = message.role === 'user';
  const labels = message.role === 'user' ? userMessageLabels(message.recommendationIds, titleOf) : [];
  const chips = message.role === 'assistant' ? refChips(message, cardOnPage) : [];
  const refused = message.role === 'assistant' && message.refused;

  return (
    <Box data-chat-message={message.role} sx={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <Box
        sx={(theme) => ({
          maxWidth: '92%',
          px: '12px',
          py: '8px',
          borderRadius: '10px',
          bgcolor: mine ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.text.primary, 0.04),
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere'
        })}
      >
        {labels.length > 0 && (
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 0.5 }} data-chat-about>
            {labels.map((label, i) => (
              <Chip
                key={`${label}-${i}`}
                size="small"
                variant="outlined"
                label={label}
                sx={{ maxWidth: '100%', height: 22, fontSize: '0.72rem' }}
              />
            ))}
          </Stack>
        )}
        <Typography variant="body2" color={refused ? 'text.secondary' : 'text.primary'}>
          {message.text}
        </Typography>
      </Box>
      {refused && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }} data-chat-refused-hint>
          {REFUSED_HINT}
        </Typography>
      )}
      {chips.length > 0 && (
        <Stack
          direction="row"
          spacing={0.5}
          useFlexGap
          sx={{ flexWrap: 'wrap', mt: 0.5 }}
          role="group"
          aria-label="Where these figures come from"
          data-chat-refs
        >
          {chips.map((chip) => {
            const body =
              chip.documentId && onOpenDocument ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={chip.label}
                  onClick={() => onOpenDocument(chip.documentId as string)}
                  aria-label={`Open the document: ${chip.tooltip}`}
                  data-ref-chip
                  data-ref-document={chip.documentId}
                  sx={{ height: 22, fontSize: '0.72rem' }}
                />
              ) : chip.cardId ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={chip.label}
                  onClick={() => onCite(chip.cardId as string)}
                  aria-label={`Show the recommendation for ${chip.label}`}
                  data-ref-chip
                  data-ref-card={chip.cardId}
                  sx={{ height: 22, fontSize: '0.72rem' }}
                />
              ) : (
                <Chip
                  size="small"
                  variant="outlined"
                  label={chip.label}
                  data-ref-chip
                  sx={{ height: 22, fontSize: '0.72rem', cursor: 'default' }}
                />
              );
            return chip.tooltip ? (
              <Tooltip key={chip.key} title={chip.tooltip} describeChild>
                {body}
              </Tooltip>
            ) : (
              <span key={chip.key}>{body}</span>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

export default function InsightChatRail(props: InsightChatRailProps) {
  const { state, onDraft, onSend, onRetry, onNew, onDetach, onClose, inputRef } = props;
  const counter = counterText(state.draft.length);
  // Each turn lands at the bottom of the log, in view.
  const log = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [state.messages.length, state.pending]);

  return (
    <Box
      component="aside"
      aria-label="Ask Allyvia"
      data-insight-chat
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" sx={{ fontWeight: 600 }}>
            Ask Allyvia
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Plain answers from your own numbers.
          </Typography>
        </Box>
        <Button size="small" variant="text" color="inherit" onClick={onNew} disabled={state.pending} sx={{ flexShrink: 0 }}>
          New conversation
        </Button>
        <IconButton size="small" onClick={onClose} aria-label="Collapse the chat">
          <IconChevronsRight size={18} />
        </IconButton>
      </Box>

      <Box
        ref={log}
        role="log"
        aria-live="polite"
        aria-busy={state.pending}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, py: 1.5 }}
        data-chat-log
      >
        <Stack spacing={1.5}>
          {state.messages.length === 0 && !state.pending && (
            <Typography variant="body2" color="text.secondary" data-chat-empty>
              {EMPTY}
            </Typography>
          )}
          {state.loadError && (
            <Typography variant="body2" color="text.secondary" data-chat-load-error>
              Your earlier messages did not load. You can still ask.
            </Typography>
          )}
          {state.messages.map((message) => (
            <Bubble key={message.key} message={message} props={props} />
          ))}
        </Stack>
        {state.pending && (
          <Box sx={{ mt: 1.5 }} data-chat-pending>
            <Typography variant="caption" color="text.secondary">
              Looking at your numbers…
            </Typography>
            <LinearProgress sx={{ mt: 0.5 }} />
          </Box>
        )}
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
        {state.attached.length > 0 && (
          <Stack
            direction="row"
            spacing={0.5}
            useFlexGap
            sx={{ flexWrap: 'wrap', mb: 1 }}
            role="group"
            aria-label="In this chat"
            data-chat-attached
          >
            {state.attached.map((card) => (
              <Chip
                key={card.recommendationId}
                size="small"
                label={card.title}
                onDelete={() => onDetach(card.recommendationId)}
                sx={{ maxWidth: '100%' }}
              />
            ))}
          </Stack>
        )}
        {/* Mounted empty, so a notice that arrives is announced. */}
        <Typography variant="caption" color="text.secondary" component="div" role="status" sx={{ mb: state.notice ? 0.5 : 0 }}>
          {state.notice ?? ''}
        </Typography>
        {state.error && (
          <Stack direction="row" spacing={1} role="alert" sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }} data-chat-error>
            <Typography variant="body2" color="error">
              {state.error}
            </Typography>
            {state.failed && (
              <Button size="small" variant="outlined" onClick={onRetry} disabled={state.pending}>
                Retry
              </Button>
            )}
          </Stack>
        )}
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={6}
            size="small"
            placeholder="Ask why a recommendation says what it does"
            value={state.draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSend();
              }
            }}
            inputRef={inputRef}
            slotProps={{ htmlInput: { 'aria-label': 'Ask Allyvia', maxLength: MAX_MESSAGE_CHARS } }}
          />
          <Button type="submit" variant="contained" disabled={!canSend(state)} aria-label="Send" sx={{ minWidth: 0, px: 1.5, height: 40 }}>
            <IconSend size={16} />
          </Button>
        </Box>
        {counter && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5, textAlign: 'right' }} data-chat-counter>
            {counter}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
