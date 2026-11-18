// "2 draft orders made, one per vendor" (owner trust T16): shown when the order flow made more than one draft
// or had to leave an item out. One order and nothing left out goes straight to the editor.
//
// Every order has a button into its editor (the first is the main one). An item with no vendor says so and links
// to its style, where the Vendor picker is. Closing the dialog leaves the drafts as they are: nothing was sent.

import { Box, Button, Dialog, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material';

import { DRAFTS_NOT_SENT, type OrdersSummary } from '../actionPrefill';

export interface DraftOrdersContentProps {
  summary: OrdersSummary;
  onOpen: (route: string) => void;
  onClose: () => void;
}

export function DraftOrdersContent({ summary, onOpen, onClose }: DraftOrdersContentProps) {
  return (
    <Stack spacing={2} data-draft-orders>
      <Box>
        <Typography sx={{ fontWeight: 600 }} data-orders-sentence>
          {summary.sentence}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          {DRAFTS_NOT_SENT}
        </Typography>
      </Box>

      <Stack spacing={1} role="list" aria-label="Draft orders">
        {summary.orders.map((order, index) => (
          <Box key={order.id ?? order.route} role="listitem">
            <Button
              variant={index === 0 ? 'contained' : 'outlined'}
              color={index === 0 ? 'primary' : 'inherit'}
              onClick={() => onOpen(order.route)}
            >
              Open {order.label}
            </Button>
          </Box>
        ))}
      </Stack>

      {summary.leftOut.length > 0 && (
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Not in these orders</Typography>
          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }} data-left-out>
            {summary.leftOut.map((row) => (
              <li key={row.key}>
                <Typography sx={{ fontSize: '0.9375rem' }} component="span">
                  {row.reason}
                </Typography>
                {row.fix && (
                  <>
                    {' '}
                    <Link
                      href={row.fix.href}
                      onClick={(event) => {
                        event.preventDefault();
                        onOpen(row.fix!.href);
                      }}
                    >
                      {row.fix.label}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </Stack>
        </Box>
      )}

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button color="inherit" onClick={onClose}>
          Close
        </Button>
      </Stack>
    </Stack>
  );
}

export interface DraftOrdersDialogProps extends DraftOrdersContentProps {}

export default function DraftOrdersDialog(props: DraftOrdersDialogProps) {
  return (
    <Dialog open onClose={props.onClose} fullWidth maxWidth="sm" aria-labelledby="draft-orders-title">
      <DialogTitle id="draft-orders-title">Draft orders</DialogTitle>
      <DialogContent>
        <DraftOrdersContent {...props} />
      </DialogContent>
    </Dialog>
  );
}
