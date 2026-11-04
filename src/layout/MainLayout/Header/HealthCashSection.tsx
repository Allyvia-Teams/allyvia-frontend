import { Box, Typography } from '@mui/material';
import { useHealthCashContext } from 'api/health.api';
import type { CashContextView } from 'health/buildCashContextView';

/** Mounted only inside the open drawer, so the request happens only then. */
export default function HealthCashSection() {
  const { view, loading, failed } = useHealthCashContext(true);
  return <HealthCashSectionView view={view} loading={loading} failed={failed} />;
}

export function HealthCashSectionView({ view, loading, failed }: { view: CashContextView | null; loading: boolean; failed: boolean }) {
  if (!loading && !failed && !view) return null;
  return (
    <Box component="section" aria-labelledby="health-cash-title" sx={{ mt: 2 }}>
      <Typography id="health-cash-title" variant="h4">
        Cash and bills
      </Typography>
      <Box role="status" aria-live="polite">
        {loading && <Typography sx={{ my: 1 }}>Loading cash and bills…</Typography>}
        {failed && <Typography sx={{ my: 1 }}>Cash and bills could not be read right now.</Typography>}
      </Box>
      {view?.message && <Typography sx={{ my: 1 }}>{view.message}</Typography>}
      {view && !view.message && (
        <>
          <Typography sx={{ my: 1 }}>{view.cash}</Typography>
          {view.payables.map((payable) => (
            <Box key={payable.currency} sx={{ my: 1 }}>
              <Typography variant="subtitle1">{payable.total}</Typography>
              {payable.buckets.length > 0 && (
                <Box component="ul" sx={{ pl: 2, my: 0 }}>
                  {payable.buckets.map((bucket) => (
                    <li key={bucket.label}>
                      <Typography color="text.secondary">
                        {bucket.label}: {bucket.amount}
                      </Typography>
                    </li>
                  ))}
                </Box>
              )}
            </Box>
          ))}
          {view.notes.length + view.scheduled.length + view.possiblyPaid.length > 0 && (
            <Box component="ul" sx={{ pl: 2, my: 1 }}>
              {[...view.notes, ...view.scheduled, ...view.possiblyPaid].map((line) => (
                <li key={line}>
                  <Typography color="text.secondary">{line}</Typography>
                </li>
              ))}
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            {view.footnote}
          </Typography>
        </>
      )}
    </Box>
  );
}
