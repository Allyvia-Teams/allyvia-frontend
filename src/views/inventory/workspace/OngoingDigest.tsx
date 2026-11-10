// views/inventory/workspace/OngoingDigest.tsx
//
// The `ongoing` digest at the foot of Today's queue: items shown on 3+ of the
// last 5 days without action, which the reorder feeder deliberately keeps out
// of the ranked rows. Subdued on purpose: these are standing items the
// merchant has already seen several times, not new asks competing with the
// cards above. Rendered here and nowhere else.

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { AgentOngoingItem } from 'api/agent.api';

import { daysOutstandingLabel } from '../insights';

export default function OngoingDigest({ items }: { items: AgentOngoingItem[] }) {
  return (
    <Box sx={{ px: '14px', py: '12px', borderTop: 1, borderColor: 'divider' }} data-testid="ongoing-digest">
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.75 }}>
        Ongoing
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {items.map((item, index) => {
          const age = daysOutstandingLabel(item.days_outstanding);
          return (
            <Typography
              component="li"
              variant="body2"
              color="text.secondary"
              key={`${item.type}-${item.first_surfaced_at}-${index}`}
              sx={{ fontSize: '0.8125rem' }}
            >
              {item.text}
              {age && (
                <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                  {age}
                </Typography>
              )}
            </Typography>
          );
        })}
      </Box>
    </Box>
  );
}
