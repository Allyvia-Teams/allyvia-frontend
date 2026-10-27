// Files the classifier could not place: the merchant says what each one holds
// (and how its dates read). The drop waits until every one is answered.

import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { BulkDrop, DateOrderChoice, ReclassifyBody } from 'api/importDrops.api';

import { DATE_ORDER_CHOICES, LEAVE_OUT, LEAVE_OUT_VALUE, entityAnswer, entityQuestions, type EntityQuestion } from './importDrop';

interface Props {
  drop: BulkDrop;
  busy?: boolean;
  onAnswer?: (fileId: string, body: ReclassifyBody) => void;
}

function Question({ question, busy, onAnswer }: { question: EntityQuestion } & Pick<Props, 'busy' | 'onAnswer'>) {
  const [choice, setChoice] = useState('');
  const [dateOrder, setDateOrder] = useState<DateOrderChoice | ''>('');
  const answer = entityAnswer(question, choice, dateOrder);
  const leavingOut = choice === LEAVE_OUT_VALUE;

  return (
    <Stack spacing={1.5} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <div>
        <Typography variant="subtitle2">{question.displayName}</Typography>
        {question.containerName ? (
          <Typography variant="caption" color="text.secondary">
            in {question.containerName}
          </Typography>
        ) : null}
        {question.reason ? (
          <Typography variant="body2" color="text.secondary">
            {question.reason}
          </Typography>
        ) : null}
      </div>

      {question.choices.length ? (
        <FormControl>
          <FormLabel id={`holds-${question.fileId}`}>What does this file hold?</FormLabel>
          <RadioGroup aria-labelledby={`holds-${question.fileId}`} value={choice} onChange={(event) => setChoice(event.target.value)}>
            {question.choices.map((option) => (
              <FormControlLabel key={option.value} value={option.value} control={<Radio size="small" />} label={option.label} />
            ))}
          </RadioGroup>
        </FormControl>
      ) : null}

      {question.needsDateOrder && !leavingOut ? (
        <FormControl>
          <FormLabel id={`dates-${question.fileId}`}>How are the dates written?</FormLabel>
          <RadioGroup
            aria-labelledby={`dates-${question.fileId}`}
            value={dateOrder}
            onChange={(event) => setDateOrder(event.target.value as DateOrderChoice)}
          >
            {DATE_ORDER_CHOICES.map((option) => (
              <FormControlLabel key={option.value} value={option.value} control={<Radio size="small" />} label={option.label} />
            ))}
          </RadioGroup>
        </FormControl>
      ) : null}

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          size="small"
          disabled={!answer || busy || !onAnswer}
          onClick={() => answer && onAnswer?.(question.fileId, answer)}
        >
          {leavingOut ? 'Leave it out' : 'Use this'}
        </Button>
        {/* A date-only question has no choice list, so leaving the file out needs its own button. */}
        {!question.choices.length ? (
          <Button size="small" disabled={busy || !onAnswer} onClick={() => onAnswer?.(question.fileId, { exclude: true })}>
            {LEAVE_OUT.label}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}

export default function EntityQuestions({ drop, busy, onAnswer }: Props) {
  const questions = entityQuestions(drop);
  if (!questions.length) return null;
  return (
    <Stack spacing={2}>
      <Alert severity="warning">
        This import waits until you answer {questions.length === 1 ? 'the question' : `all ${questions.length} questions`} below. Nothing
        imports before then.
      </Alert>
      {questions.map((question) => (
        <Question key={question.fileId} question={question} busy={busy} onAnswer={onAnswer} />
      ))}
    </Stack>
  );
}
