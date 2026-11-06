// What an import does to sales, stock and Inner Circle, and the three templates.

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { IMPORT_TEMPLATES, templateUrl } from './importDrop';

export const HOW_IMPORTS_WORK = [
  "Sales history keeps each sale's original date.",
  'Importing sales history never changes your stock.',
  'A quantity column in a product file sets opening stock. Columns named for one of your stores go to that store; otherwise the stock goes to the default store you pick above.',
  'Re-importing the same file never adds stock twice.',
  'After customers or sales import, Inner Circle sets itself up: duplicates are merged, a default ladder is created if you have none, and members are enrolled. The report shows what changed.'
];

export default function HowImportsWork({ apiBase }: { apiBase: string }) {
  return (
    <Stack spacing={1.5}>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {HOW_IMPORTS_WORK.map((line) => (
          <li key={line}>
            <Typography variant="body2">{line}</Typography>
          </li>
        ))}
      </Box>
      <Typography variant="body2">
        Start from a template:{' '}
        {IMPORT_TEMPLATES.map((template, index) => (
          <span key={template.file}>
            {index ? ' · ' : ''}
            <Link href={templateUrl(apiBase, template.file)} download={template.file}>
              {template.label}
            </Link>
          </span>
        ))}
      </Typography>
    </Stack>
  );
}
