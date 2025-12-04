import { Box } from '@mui/material';
import { ReactNode } from 'react';

interface MetricCardsRowProps {
  children: ReactNode;
}

/**
 * MetricCardsRow - Flexbox layout container for metric cards
 *
 * Displays children in a responsive row with equal distribution.
 * Cards automatically wrap on smaller screens.
 *
 * @example
 * <MetricCardsRow>
 *   <AllyviaSubcard value="$1000" label="Revenue" />
 *   <AllyviaSubcard value="50" label="Orders" />
 *   <AllyviaSubcard value="25%" label="Growth" />
 * </MetricCardsRow>
 */
export default function MetricCardsRow({ children }: MetricCardsRowProps) {
  return (
    <Box
      display="flex"
      gap={2}
      flexWrap="wrap"
      mb={3}
      sx={{
        '& > *': {
          flex: '1 1 280px',
          minWidth: '280px'
        }
      }}
    >
      {children}
    </Box>
  );
}
