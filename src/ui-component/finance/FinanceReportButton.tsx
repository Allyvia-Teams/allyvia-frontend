import React, { useState } from 'react';
import { useStore } from 'react-redux';
import { Theme, Tooltip, IconButton, Menu, MenuItem } from '@mui/material';
import { IconDownload, IconFileText, IconFileSpreadsheet } from '@tabler/icons-react';
import { RootState } from 'store';
import { downloadFinanceCsv, downloadFinancePdf, FinanceCsvData } from '../../utils/reports';

interface FinanceReportButtonProps {
  startISO: string;
  endISO: string;
  theme: Theme;
  /** Load what the report reads before building it (the Finance snapshot loads it only on demand). */
  prepare?: () => Promise<unknown>;
}

export function FinanceReportButton({ startISO, endISO, theme, prepare }: FinanceReportButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Read Redux at click time, after `prepare` has loaded it.
  const store = useStore<RootState>();
  const reportData = async (): Promise<FinanceCsvData> => {
    if (prepare) await prepare();
    const { profitAndLoss, invoiceList, expensesList, balanceSheet, cashFlow, invoiceStatistics, expenseSummary } = (
      store.getState() as any
    ).finance;
    return { profitAndLoss, invoiceList, expensesList, balanceSheet, cashFlow, invoiceStatistics, expenseSummary };
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const downloadCSVReport = async () => {
    handleClose();
    try {
      downloadFinanceCsv(await reportData(), startISO, endISO);
    } catch (error) {
      console.error('Error preparing CSV report:', error);
      alert('Error preparing CSV report. Please try again.');
    }
  };

  const downloadPDFReport = async () => {
    try {
      await downloadFinancePdf(await reportData(), startISO, endISO);
    } catch (error) {
      console.error('Error preparing PDF report:', error);
      alert('Error preparing PDF report. Please try again.');
    }

    handleClose();
  };

  return (
    <>
      <Tooltip title="Download Report">
        <IconButton
          onClick={handleClick}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark'
            }
          }}
        >
          <IconDownload size={20} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <MenuItem onClick={downloadCSVReport}>
          <IconFileSpreadsheet size={18} style={{ marginRight: 8 }} />
          Download CSV Report
        </MenuItem>
        <MenuItem onClick={downloadPDFReport}>
          <IconFileText size={18} style={{ marginRight: 8 }} />
          Download PDF Report
        </MenuItem>
      </Menu>
    </>
  );
}
