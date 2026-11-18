// material-ui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

// project imports
import { Panel } from 'ui-component/frame';
import { lineColours, type DayPanel as DayPanelModel } from './trendsView';

export const DAY_PANEL_PROMPT = 'Choose a day on the chart to see what it took, the weather, what was on, and what we expected.';

/** One day's sentences. Each wears the colour of the line it is about. */
export default function DayPanel({ panel }: { panel: DayPanelModel | null }) {
  const colours = lineColours(useTheme());
  return (
    <Panel title={panel ? panel.heading : 'A day'}>
      <Box sx={{ px: '14px', py: '12px' }} aria-live="polite">
        {panel ? (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {panel.lines.map((line, i) => (
              <Box component="li" key={`${line.line}-${i}`} sx={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Box
                  component="span"
                  aria-hidden
                  sx={{ mt: '7px', width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: colours[line.line] }}
                />
                <Typography sx={{ fontSize: '0.9375rem', lineHeight: 1.45 }}>{line.text}</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{DAY_PANEL_PROMPT}</Typography>
        )}
      </Box>
    </Panel>
  );
}
