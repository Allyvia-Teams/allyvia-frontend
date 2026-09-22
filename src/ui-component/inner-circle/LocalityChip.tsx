import { Chip } from '@mui/material';
import type { Locality } from 'api/innerCircle.api';
import { localityLabel } from 'views/inner-circle/network';
export default function LocalityChip({ locality }: { locality?: Locality }) {
  return (
    <Chip
      label={localityLabel(locality)}
      size="small"
      variant="outlined"
      color={locality === 'local' ? 'success' : locality === 'visitor' ? 'info' : 'default'}
    />
  );
}
