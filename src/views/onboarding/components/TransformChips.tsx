import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { transformLabel } from '../mapping';

// Read-only transform labels — the server owns the transform vocabulary and
// recomputes transforms on every PATCH; the wizard only displays them.
export default function TransformChips({ transforms }: { transforms: string[] }) {
  if (transforms.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {transforms.map((op) => (
        <Chip key={op} size="small" variant="outlined" label={transformLabel(op)} />
      ))}
    </Stack>
  );
}
