import { useState } from 'react';
import { Box, Button, Chip, Drawer, Stack, Typography } from '@mui/material';
import type { PerkRecommendation, RecommendationField } from 'api/innerCircle.api';
import { recommendationReasons } from 'views/inner-circle/network';
export default function RecommendationHint({
  recommendation,
  field,
  pct,
  onPick,
  disabled = false
}: {
  recommendation: PerkRecommendation;
  field: RecommendationField;
  pct: number;
  onPick: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (recommendation.dismissed_at) return null;
  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip label={`Recommended: ${pct}%`} size="small" color="primary" variant="outlined" onClick={onPick} disabled={disabled} />
        <Button size="small" onClick={() => setOpen(true)}>
          Why?
        </Button>
      </Stack>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: { xs: 300, sm: 420 }, p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h4">Why this suggestion</Typography>
            <Chip label={`${recommendation.confidence} confidence`} />
            <Typography>Suggestions fill the form. Your discounts change only when you save.</Typography>
            {recommendationReasons(recommendation, field).map((reason) => (
              <Typography variant="body2" key={reason}>
                {reason}
              </Typography>
            ))}
            <Button onClick={() => setOpen(false)}>Close</Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
