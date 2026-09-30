/**
 * ALL-21 — "Why this?" on a recommendation card.
 *
 * Everything rendered here is READ from what the engine recorded when the
 * recommendation was born (agent/rationale.py assembles it): the signal values
 * it was looking at, the baselines it snapshotted, the arithmetic behind the
 * dollar figure, and the facts it had learned about this business. Nothing is
 * regenerated — an LLM asked to explain a decision writes a plausible story
 * about that decision, and it can disagree with the numbers on the same card.
 *
 * Two consequences the UI has to honour:
 *
 *  - The stored model summary is labelled as the model's words, never mixed in
 *    with measured values.
 *  - Empty is a real answer. A recommendation from before the born-measurable
 *    fields (ALL-17 Phase 1) has no evidence to show, and saying so is the
 *    point — a panel that invented something would defeat the feature.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

// icons
import { IconChevronDown, IconChevronUp, IconInfoCircle } from '@tabler/icons-react';

// project imports
import { AgentAPI, RationaleGroundTruth, RationaleSignal, RecommendationRationale } from 'api/agent.api';

export const rationaleQueryKey = (pendingId: string) => ['agent', 'rationale', pendingId];

/** snake_case keys read badly in a panel aimed at a shop owner. */
const humanize = (key: string) => key.replace(/[_:]/g, ' ').replace(/\s+/g, ' ').trim();

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
};

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
    {children}
  </Typography>
);

const FactRow = ({ label, value }: { label: string; value: string }) => (
  <Box display="flex" justifyContent="space-between" gap={2} sx={{ py: 0.25 }}>
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0, wordBreak: 'break-word' }}>
      {label}
    </Typography>
    <Typography variant="caption" color="text.primary" sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
);

const SignalBlock = ({ signal }: { signal: RationaleSignal }) => {
  const theme = useTheme();

  // An abstention and a failure are different facts and are labelled
  // differently: "we had no location for you" is not "the weather service is
  // down", and reading one as the other is exactly the confusion ALL-125 and
  // ALL-126 were about.
  if (signal.abstained) {
    return (
      <Box sx={{ py: 0.5 }}>
        <Box display="flex" alignItems="center" gap={0.75}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {humanize(signal.key)}
          </Typography>
          <Chip size="small" variant="outlined" label="no reading" sx={{ height: 18, fontSize: 11 }} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Not used{signal.reason ? ` — ${humanize(String(signal.reason))}` : ''}
        </Typography>
      </Box>
    );
  }

  if (signal.unavailable) {
    return (
      <Box sx={{ py: 0.5 }}>
        <Box display="flex" alignItems="center" gap={0.75}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {humanize(signal.key)}
          </Typography>
          <Chip size="small" color="warning" variant="outlined" label="unavailable" sx={{ height: 18, fontSize: 11 }} />
        </Box>
        {signal.reason && (
          <Typography variant="caption" color="text.secondary">
            {String(signal.reason)}
          </Typography>
        )}
      </Box>
    );
  }

  const facts = signal.facts ?? {};
  const entries = Object.entries(facts);

  return (
    <Box sx={{ py: 0.5 }}>
      <Box display="flex" alignItems="center" gap={0.75}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {humanize(signal.key)}
        </Typography>
        {signal.cited && (
          <Chip
            size="small"
            label="used"
            sx={{ height: 18, fontSize: 11, bgcolor: theme.palette.primary.light, color: theme.palette.primary.dark }}
          />
        )}
      </Box>
      {entries.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No scalar values recorded.
        </Typography>
      ) : (
        entries.map(([name, value]) => <FactRow key={name} label={humanize(name)} value={formatValue(value)} />)
      )}
    </Box>
  );
};

const GroundTruthRow = ({ row }: { row: RationaleGroundTruth }) => {
  const window = row.baseline_window_days ? `${row.baseline_window_days}d` : row.method ? humanize(row.method) : '';
  const suffix = [window, row.source].filter(Boolean).join(' · ');

  return <FactRow label={`${humanize(row.metric ?? 'metric')}${suffix ? ` (${suffix})` : ''}`} value={formatValue(row.baseline_value)} />;
};

const RationaleBody = ({ rationale }: { rationale: RecommendationRationale }) => {
  const { summary, signals, ground_truth: groundTruth, expected_value: expectedValue, learned_facts: learnedFacts } = rationale;

  const hasEvidence = signals.length > 0 || groundTruth.length > 0 || expectedValue !== null || learnedFacts.length > 0;

  if (!hasEvidence && !summary) {
    return (
      <Typography variant="caption" color="text.secondary">
        This recommendation predates evidence capture, so there is nothing recorded to show.
      </Typography>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={1.25}>
      {summary && (
        <Box>
          <SectionHeading>What the model said</SectionHeading>
          <Typography variant="caption" color="text.primary" sx={{ display: 'block', fontStyle: 'italic' }}>
            {summary.text}
          </Typography>
        </Box>
      )}

      {expectedValue && (
        <Box>
          <SectionHeading>Expected value</SectionHeading>
          <Box display="flex" alignItems="baseline" gap={0.75}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {expectedValue.dollars ? `$${Number(expectedValue.dollars).toLocaleString()}` : 'Not estimated'}
            </Typography>
            {expectedValue.period && (
              <Typography variant="caption" color="text.secondary">
                over {expectedValue.period}
              </Typography>
            )}
            {/* "computed" means the arithmetic produced it. "llm" means the
                model guessed and nothing checked it. The merchant is entitled
                to know which one they are looking at. */}
            <Chip
              size="small"
              variant="outlined"
              color={expectedValue.basis === 'computed' ? 'success' : 'default'}
              label={expectedValue.basis === 'computed' ? 'calculated' : 'model estimate'}
              sx={{ height: 18, fontSize: 11 }}
            />
          </Box>
          {Object.entries(expectedValue.assumptions ?? {}).map(([name, value]) => (
            <FactRow key={name} label={humanize(name)} value={formatValue(value)} />
          ))}
        </Box>
      )}

      {groundTruth.length > 0 && (
        <Box>
          <SectionHeading>Measured before this was suggested</SectionHeading>
          {groundTruth.map((row, index) => (
            <GroundTruthRow key={`${row.metric}-${index}`} row={row} />
          ))}
        </Box>
      )}

      {signals.length > 0 && (
        <Box>
          <SectionHeading>Signals read</SectionHeading>
          {signals.map((signal) => (
            <SignalBlock key={signal.key} signal={signal} />
          ))}
        </Box>
      )}

      {learnedFacts.length > 0 && (
        <Box>
          <SectionHeading>What we&apos;ve learned about your business</SectionHeading>
          {learnedFacts.map((fact, index) => (
            <Box key={`${fact.kind}-${index}`} display="flex" alignItems="flex-start" gap={0.75} sx={{ py: 0.25 }}>
              <Chip size="small" variant="outlined" label={humanize(fact.kind)} sx={{ height: 18, fontSize: 11 }} />
              <Typography variant="caption" color="text.primary">
                {fact.statement}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * The "Why this?" toggle plus its panel.
 *
 * The request is made only once the merchant opens it (`enabled: open`): the
 * pending list is polled and can hold weeks of cards, and nobody should pay for
 * evidence they did not ask for.
 */
const RecommendationRationalePanel = ({ pendingId }: { pendingId: string }) => {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: rationaleQueryKey(pendingId),
    queryFn: () => AgentAPI.Recommendations.rationale(pendingId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  return (
    <Box sx={{ mt: 0.5 }}>
      <Button
        size="small"
        variant="text"
        color="inherit"
        onClick={() => setOpen((prev) => !prev)}
        startIcon={<IconInfoCircle size={14} />}
        endIcon={open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        sx={{ px: 0.5, minWidth: 0, textTransform: 'none', color: 'text.secondary' }}
        aria-expanded={open}
      >
        Why this?
      </Button>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ pt: 0.5 }}>
          <Divider sx={{ mb: 1 }} />
          {isLoading && <Skeleton variant="rounded" height={72} />}
          {isError && (
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" color="error">
                Couldn&apos;t load the reasoning behind this.
              </Typography>
              <Button size="small" variant="text" onClick={() => refetch()} sx={{ textTransform: 'none' }}>
                Retry
              </Button>
            </Box>
          )}
          {data && <RationaleBody rationale={data} />}
        </Box>
      </Collapse>
    </Box>
  );
};

export default RecommendationRationalePanel;
