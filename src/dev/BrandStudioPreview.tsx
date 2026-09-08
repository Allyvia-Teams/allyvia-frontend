import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import BrandStudio from '../ui-component/settings/BrandStudio';
import { BRAND_STYLES } from '../themes/brandExperience';
import type { BrandTheme } from '../types/config';
const theme = createTheme({
  typography: { fontFamily: 'Inter, sans-serif' },
  palette: { primary: { main: '#234C3A' }, background: { default: '#FAFAF8' } }
});
// Development-only visual playground; no authentication, merchant data or API writes.
function Preview() {
  const [brand, setBrand] = useState<NonNullable<BrandTheme>>(BRAND_STYLES[0].brand);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: 1600, mx: 'auto' }}>
        <BrandStudio brand={brand} onChange={setBrand} />
      </Box>
    </ThemeProvider>
  );
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Preview />);
