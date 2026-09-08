// Issues, rolled up by kind and expandable.
//
// A thousand identical warnings is one fact. Listing them flat would make a
// merchant scroll past the one blocker that actually stops the import, so each
// kind collapses to a single row with a count and a few real examples.

import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import type { IssueRollup } from 'api/posIntegrations.api';
import { ENTITY_LABELS } from 'api/posIntegrations.api';

// Plain-language headlines. The backend's codes are precise and unreadable;
// these say what happened to the merchant's data and, where it matters, what
// we did about it.
const HEADLINES: Record<string, string> = {
  customer_unidentifiable: 'Customers with no name, email or phone',
  email_invalid: 'Email addresses we couldn’t use',
  duplicate_customer_in_file: 'The same email on more than one row',
  duplicate_customer_email: 'Customers who already exist in Allyvia',
  duplicate_customer_phone: 'Customers sharing a phone number with an existing contact',
  duplicate_product_sku: 'Items whose SKU already exists in Allyvia',
  duplicate_product_barcode: 'Items sharing a barcode with an existing item',
  product_unnamed: 'Products with no name',
  order_undated: 'Sales with no date',
  order_total_missing: 'Sales with no total',
  order_currency_missing: 'Sales with no currency',
  order_arithmetic_mismatch: 'Sales whose parts don’t add up to the total',
  line_variant_unresolved: 'Sold items that aren’t in your catalogue',
  customer_unresolved: 'Sales pointing at a customer who isn’t in this import',
  inventory_variant_unresolved: 'Stock levels for items that aren’t in your catalogue',
  inventory_quantity_missing: 'Stock levels with no quantity',
  negative_inventory: 'Negative stock levels',
  negative_stock_clamped: 'Negative stock stored as zero',
  unexpected_negative_amount: 'Negative amounts where we expected positive ones',
  negative_amount: 'Negative amounts',
  unparseable_value: 'Values we couldn’t read',
  date_in_future: 'Dates in the future',
  date_unparseable: 'Dates we couldn’t read',
  phone_unauseable: 'Phone numbers we kept as-is',
  phone_unparseable: 'Phone numbers we couldn’t standardise',
  currency_missing: 'Prices with no currency',
  duplicate_external_id: 'Records that repeat an ID',
  line_quantity_rounded: 'Quantities rounded to whole units',
  schema_invalid: 'Records we couldn’t read at all'
};

// What we did, for the cases where a warning is a decision rather than a
// problem. Silence here would leave a merchant guessing whether data was lost.
const OUTCOMES: Record<string, string> = {
  email_invalid: 'The customer was imported without an email. The original is kept as extra data.',
  line_variant_unresolved: 'The sale and its line were imported in full — only the link to a catalogue item is missing.',
  customer_unresolved: 'The sale was imported as an anonymous sale.',
  negative_inventory: 'Allyvia can’t hold negative stock, so it will be stored as zero and the original noted.',
  duplicate_customer_in_file: 'These rows will be combined into one contact.',
  unparseable_value: 'That field was left empty. The rest of the record was imported.',
  date_in_future: 'Imported as-is — usually a mistyped year in the export.',
  order_arithmetic_mismatch: 'We import the total your system reported, not a recalculated one.',
  line_quantity_rounded: 'Amounts are unchanged; only the unit count was rounded.',
  phone_unparseable: 'The number was kept exactly as written.'
};

interface Props {
  issues: IssueRollup[];
}

export default function IssueList({ issues }: Props) {
  if (!issues.length) return null;

  const blockers = issues.filter((i) => i.severity === 'blocker');
  const warnings = issues.filter((i) => i.severity === 'warn');

  const renderGroup = (group: IssueRollup[], heading: string, color: 'error' | 'warning') => {
    if (!group.length) return null;
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          {heading}
        </Typography>
        {group.map((issue) => (
          <Accordion key={`${issue.entity}-${issue.code}`} disableGutters variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                <Chip size="small" color={color} label={issue.count} />
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {HEADLINES[issue.code] ?? issue.code.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ENTITY_LABELS[issue.entity] ?? issue.entity}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              {OUTCOMES[issue.code] && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {OUTCOMES[issue.code]}
                </Typography>
              )}
              <List dense disablePadding>
                {issue.examples.map((example, index) => (
                  <ListItem key={`${example.external_id}-${index}`} disableGutters>
                    <ListItemText
                      primary={example.message}
                      secondary={example.external_id}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
              {issue.count > issue.examples.length && (
                <Typography variant="caption" color="text.secondary">
                  …and {issue.count - issue.examples.length} more.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  };

  return (
    <Stack spacing={3}>
      {renderGroup(blockers, 'Needs fixing before you can import', 'error')}
      {renderGroup(warnings, 'Worth knowing', 'warning')}
    </Stack>
  );
}
