import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  IconButton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { IconChevronDown, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'store';
import bankingApi, { BANK_CATEGORIES } from 'api/banking';

/** The rules the owner has taught, and a way to retire one that is wrong. */
export default function MerchantRules() {
  const role = useSelector((state) => state.auth.currentRole);
  const qc = useQueryClient();
  const [snack, setSnack] = useState('');
  const rules = useQuery({
    queryKey: ['banking', 'rules', role?.company_id],
    queryFn: bankingApi.rules,
    enabled: !!role?.company_id
  });
  const remove = useMutation({
    mutationFn: bankingApi.deleteRule,
    onSuccess: async (result) => {
      setSnack(`Rule removed. ${result.reapplied_count} transactions re-sorted.`);
      await qc.invalidateQueries({ queryKey: ['banking'] });
    }
  });
  const isAdmin = role?.role_type === 'admin';
  const list = rules.data ?? [];
  return (
    <>
      <Accordion sx={{ border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<IconChevronDown />} aria-controls="merchant-rules" id="merchant-rules-header">
          <Typography>Merchant rules ({list.length})</Typography>
        </AccordionSummary>
        <AccordionDetails id="merchant-rules">
          {/* The mutation can fail while the list is still good; keep showing it. */}
          {remove.isError && <Alert severity="error">Could not remove the rule.</Alert>}
          {rules.isError ? (
            <Alert severity="error">Could not load merchant rules.</Alert>
          ) : rules.isLoading ? (
            <Typography>Loading merchant rules…</Typography>
          ) : list.length === 0 ? (
            <Typography color="text.secondary">
              No rules yet. Correcting a transaction&apos;s category creates one for that merchant.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small" aria-label="Merchant rules">
                <TableHead>
                  <TableRow>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Transactions</TableCell>
                    {isAdmin && <TableCell />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.merchant_key}</TableCell>
                      <TableCell>{BANK_CATEGORIES[rule.category]}</TableCell>
                      <TableCell align="right">{rule.transaction_count}</TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            aria-label={`Remove the rule for ${rule.merchant_key}`}
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(rule.id)}
                          >
                            <IconTrash size={18} />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} />
    </>
  );
}
