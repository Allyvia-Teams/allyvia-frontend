import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material';

import { fetchEmailDrafts, type EmailDraft, type EmailDraftStatus, type EmailDraftType } from 'api/innerCircle.api';
import { formatDate } from 'utils/dateUtils';
import MainCard from 'ui-component/cards/MainCard';
import EmailDraftDrawer, { DRAFT_STATUS_CONFIG, DRAFT_TYPE_LABEL } from './EmailDraftDrawer';
import TierChip from './TierChip';
import { formatPct } from './formatters';

const PAGE_SIZE = 25;

type StatusFilter = 'all' | EmailDraftStatus;
type TypeFilter = 'all' | EmailDraftType;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'sent', label: 'Sent' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'failed', label: 'Failed' }
];

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'perk_invite', label: 'Perk invite' },
  { value: 'winback', label: 'Win-back' },
  { value: 'birthday', label: 'Birthday' }
];

export default function ApprovalsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('draft');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [page, setPage] = useState(0);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page: page + 1,
      page_size: PAGE_SIZE,
      status: statusFilter === 'all' ? undefined : statusFilter,
      draft_type: typeFilter === 'all' ? undefined : typeFilter
    }),
    [page, statusFilter, typeFilter]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ic-email-drafts', 'list', params],
    queryFn: () => fetchEmailDrafts(params)
  });

  const drafts: EmailDraft[] = data?.results ?? [];
  const total = data?.count ?? 0;

  return (
    <MainCard title="Email approvals">
      <Stack spacing={2}>
        <Typography variant="body2" color="textSecondary">
          Every automated email waits here for your sign-off. Nothing reaches a member until you approve it.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(0);
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as TypeFilter);
                setPage(0);
              }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
          <Table size="small" sx={{ minWidth: 860 }} aria-label="email approvals table">
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Offer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>Loading...</TableCell>
                </TableRow>
              )}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography color="error">Failed to load email drafts.</Typography>
                      <Button size="small" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && drafts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="textSecondary">
                      {statusFilter === 'draft'
                        ? 'No emails waiting for approval. Generate drafts from a promotion or perk to fill the queue.'
                        : 'No emails match these filters.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {drafts.map((draft) => (
                <TableRow key={draft.id} hover onClick={() => setSelectedDraftId(draft.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {draft.contact.name}
                      </Typography>
                      <TierChip tier={draft.contact.tier} />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" noWrap>
                      {draft.subject}
                    </Typography>
                    {draft.promotion_name && (
                      <Typography variant="caption" color="textSecondary" display="block" noWrap>
                        {draft.promotion_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={DRAFT_TYPE_LABEL[draft.draft_type]} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {draft.promo_code ? (
                      <Typography variant="body2" fontWeight={700}>
                        {formatPct(draft.promo_code.discount_pct)} off
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={DRAFT_STATUS_CONFIG[draft.status].label}
                      size="small"
                      color={DRAFT_STATUS_CONFIG[draft.status].color}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>{formatDate(draft.created_at, 'MMM dd, yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
        />
      </Stack>

      <EmailDraftDrawer draftId={selectedDraftId} onClose={() => setSelectedDraftId(null)} />
    </MainCard>
  );
}
