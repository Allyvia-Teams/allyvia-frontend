import { Box, Button } from '@mui/material';

export function FinanceToolbar({
  chartType,
  onExportCSV,
  onExportPDF
}: {
  chartType: 'line' | 'area' | 'bar';
  onExportCSV: () => void;
  onExportPDF: () => void;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button variant="outlined" onClick={onExportCSV}>
        Export CSV
      </Button>
      <Button variant="outlined" onClick={onExportPDF}>
        Export PDF
      </Button>
    </Box>
  );
}
