import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Theme, Tooltip, IconButton, Menu, MenuItem } from '@mui/material';
import { IconDownload, IconFileText, IconFileSpreadsheet } from '@tabler/icons-react';
import { RootState } from 'store';
import { downloadFinanceCsv, downloadFinancePdf, FinanceCsvData } from '../../utils/reports';

interface FinanceReportButtonProps {
  startISO: string;
  endISO: string;
  theme: Theme;
}

export function FinanceReportButton({ startISO, endISO, theme }: FinanceReportButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Get Redux data
  const { profitAndLoss, invoiceList, expensesList, balanceSheet, cashFlow, invoiceStatistics, expenseSummary } = useSelector(
    (state: RootState) => (state as any).finance
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const downloadCSVReport = () => {
    const csvData: FinanceCsvData = {
      profitAndLoss,
      invoiceList,
      expensesList,
      balanceSheet,
      cashFlow,
      invoiceStatistics,
      expenseSummary
    };

    downloadFinanceCsv(csvData, startISO, endISO);
    handleClose();
  };

  const downloadPDFReport = async () => {
    try {
      const pdfData: FinanceCsvData = {
        profitAndLoss,
        invoiceList,
        expensesList,
        balanceSheet,
        cashFlow,
        invoiceStatistics,
        expenseSummary
      };

      await downloadFinancePdf(pdfData, startISO, endISO);
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
