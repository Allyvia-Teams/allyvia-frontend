import React, { useState } from 'react';
import { Menu, MenuItem, IconButton, Tooltip } from '@mui/material';
import { IconDownload, IconFileSpreadsheet, IconFileText } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';

interface AnalyticsDownloadButtonProps {
  startISO: string;
  endISO: string;
}

function AnalyticsDownloadButton({ startISO, endISO }: AnalyticsDownloadButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { summary, revenueSeries, expenseBreakdown, topItems, lowStock, timeUtilization } = useSelector(
    (state: RootState) => state.analytics
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const downloadCSVReport = () => {
    // Generate comprehensive CSV content for all analytics data
    let csvContent = 'data:text/csv;charset=utf-8,';

    // ===== REPORT HEADER =====
    csvContent += 'ALLYVIA ANALYTICS COMPREHENSIVE REPORT\n';
    csvContent += `Report Period,${startISO} to ${endISO}\n`;
    csvContent += `Generated On,${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n`;
    csvContent += '\n';

    // ===== EXECUTIVE SUMMARY =====
    csvContent += 'EXECUTIVE SUMMARY\n';
    csvContent += 'Metric,Value,Currency,Status\n';

    if (summary) {
      csvContent += `Total Revenue,${summary.total_revenue || 0},${summary.currency || 'USD'},${(summary.total_revenue || 0) > 0 ? 'Positive' : 'Zero'}\n`;
      csvContent += `Payments Count,${summary.payments_count || 0},,${(summary.payments_count || 0) > 0 ? 'Active' : 'None'}\n`;
      csvContent += `Average Ticket,${summary.avg_ticket || 0},${summary.currency || 'USD'},${(summary.avg_ticket || 0) > 0 ? 'Good' : 'Low'}\n`;
      csvContent += `Total Expenses,${summary.expenses || 0},${summary.currency || 'USD'},${(summary.expenses || 0) > 0 ? 'Active' : 'None'}\n`;
      csvContent += `Net Income,${summary.net || 0},${summary.currency || 'USD'},${(summary.net || 0) > 0 ? 'Profitable' : 'Loss'}\n`;
      csvContent += `Inventory Value,${summary.inventory_value || 0},${summary.currency || 'USD'},${(summary.inventory_value || 0) > 0 ? 'Active' : 'Empty'}\n`;
    }

    csvContent += '\n';

    // ===== REVENUE SERIES DATA =====
    if (revenueSeries.length > 0) {
      csvContent += 'DAILY REVENUE SERIES\n';
      csvContent += 'Date,Revenue Amount,Currency\n';

      revenueSeries.forEach((item: any) => {
        csvContent += `${item.date},${item.amount},${summary?.currency || 'USD'}\n`;
      });

      csvContent += '\n';
    }

    // ===== EXPENSE BREAKDOWN =====
    if (expenseBreakdown.length > 0) {
      csvContent += 'EXPENSE BREAKDOWN BY CATEGORY\n';
      csvContent += 'Category,Amount,Currency,Percentage of Total\n';

      const totalExpenses = expenseBreakdown.reduce((sum: number, item: any) => sum + item.amount, 0);

      expenseBreakdown.forEach((item: any) => {
        const percentage = totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(2) : '0.00';
        csvContent += `${item.category},${item.amount},${summary?.currency || 'USD'},${percentage}%\n`;
      });

      csvContent += '\n';
    }

    // ===== PAYMENTS SUMMARY =====
    if (summary) {
      csvContent += 'PAYMENTS SUMMARY\n';
      csvContent += 'Metric,Value,Currency\n';
      csvContent += `Total Payments Count,${summary.payments_count || 0},${summary.currency || 'USD'}\n`;
      csvContent += `Total Revenue,${summary.total_revenue || 0},${summary.currency || 'USD'}\n`;
      csvContent += '\n';
    }

    // ===== TOP ITEMS =====
    if (topItems.length > 0) {
      csvContent += 'TOP PERFORMING ITEMS\n';
      csvContent += 'Item Name,Quantity,Amount,Item ID,Currency\n';

      topItems.forEach((item: any) => {
        csvContent += `${item.name},${item.qty},${item.amount},${item.item_id},${summary?.currency || 'USD'}\n`;
      });

      csvContent += '\n';
    }

    // ===== LOW STOCK ITEMS =====
    if (lowStock.length > 0) {
      csvContent += 'LOW STOCK ALERTS\n';
      csvContent += 'Item Name,On Hand,Reorder Point,Status,Item ID\n';

      lowStock.forEach((item: any) => {
        const status = item.on_hand <= item.reorder_point ? 'Critical' : 'Low';
        csvContent += `${item.name},${item.on_hand},${item.reorder_point},${status},${item.item_id}\n`;
      });

      csvContent += '\n';
    }

    // ===== TIME UTILIZATION =====
    if (timeUtilization.length > 0) {
      csvContent += 'TIME UTILIZATION BY WEEK\n';
      csvContent += 'Week Start,Hours Worked,Status\n';

      timeUtilization.forEach((item: any) => {
        const status = item.hours > 40 ? 'Overtime' : item.hours >= 30 ? 'Normal' : 'Underutilized';
        csvContent += `${item.week_start},${item.hours},${status}\n`;
      });

      csvContent += '\n';
    }

    // ===== INSIGHTS AND RECOMMENDATIONS =====
    csvContent += 'INSIGHTS AND RECOMMENDATIONS\n';
    csvContent += 'Area,Recommendation,Priority\n';

    // Generate insights based on data
    if (summary) {
      if ((summary.net || 0) < 0) {
        csvContent += 'Profitability,Review expenses and increase revenue,High\n';
      }
      if ((summary.avg_ticket || 0) < 50) {
        csvContent += 'Pricing,Consider increasing average ticket size,Medium\n';
      }
      if (lowStock.some((item: any) => item.on_hand <= item.reorder_point)) {
        csvContent += 'Inventory,Restock critical items immediately,High\n';
      }
      if (timeUtilization.some((item: any) => item.hours > 50)) {
        csvContent += 'Operations,Monitor overtime costs,Medium\n';
      }
      if ((summary.payments_count || 0) < 10) {
        csvContent += 'Sales,Focus on increasing transaction volume,High\n';
      }
    }

    csvContent += 'Overall,Continue monitoring key performance indicators,Low\n';

    // Create and download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `allyvia_analytics_report_${startISO}_to_${endISO}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    handleClose();
  };

  const downloadPDFReport = async () => {
    try {
      // Create comprehensive overview KPIs
      const totalRevenue = summary?.total_revenue || 0;
      const paymentsCount = summary?.payments_count || 0;
      const avgTicket = summary?.avg_ticket || 0;
      const totalExpenses = summary?.expenses || 0;
      const netIncome = summary?.net || 0;
      const inventoryValue = summary?.inventory_value || 0;
      const currency = summary?.currency || 'USD';

      // Create KPI objects for PDF
      const overviewKpis = [
        { label: 'Total Revenue', value: totalRevenue, sublabel: `Total income in ${currency}` },
        { label: 'Payments Count', value: paymentsCount, sublabel: 'Total transactions processed' },
        { label: 'Average Ticket', value: avgTicket, sublabel: `Mean transaction value in ${currency}` },
        { label: 'Total Expenses', value: totalExpenses, sublabel: `Total operational costs in ${currency}` },
        { label: 'Net Income', value: netIncome, sublabel: netIncome > 0 ? 'Profitable operations' : 'Loss making' },
        { label: 'Inventory Value', value: inventoryValue, sublabel: `Total stock value in ${currency}` }
      ];

      // Create table data for different sections
      const revenueTable = {
        columns: ['Date', 'Revenue Amount', 'Currency'],
        rows: revenueSeries.map((item: any) => ({
          date: item.date,
          amount: item.amount,
          currency: currency
        }))
      };

      const expenseTable = {
        columns: ['Category', 'Amount', 'Currency', 'Percentage'],
        rows: expenseBreakdown.map((item: any) => {
          const expenseTotal = expenseBreakdown.reduce((sum: number, exp: any) => sum + exp.amount, 0);
          const percentage = expenseTotal > 0 ? ((item.amount / expenseTotal) * 100).toFixed(2) : '0.00';
          return {
            category: item.category,
            amount: item.amount,
            currency: currency,
            percentage: `${percentage}%`
          };
        })
      };

      const topItemsTable = {
        columns: ['Item Name', 'Quantity', 'Amount', 'Item ID'],
        rows: topItems.map((item: any) => ({
          name: item.name,
          quantity: item.qty,
          amount: item.amount,
          item_id: item.item_id
        }))
      };

      const lowStockTable = {
        columns: ['Item Name', 'On Hand', 'Reorder Point', 'Status'],
        rows: lowStock.map((item: any) => ({
          name: item.name,
          on_hand: item.on_hand,
          reorder_point: item.reorder_point,
          status: item.on_hand <= item.reorder_point ? 'Critical' : 'Low'
        }))
      };

      // Note: In a real implementation, you would integrate with a PDF generation library
      // like jsPDF, Puppeteer, or send this data to a backend service for PDF generation
      console.log('PDF Generation Data:', {
        dateRange: `${startISO} to ${endISO}`,
        overviewKpis,
        revenueTable,
        expenseTable,
        topItemsTable,
        lowStockTable,
        timeUtilization
      });

      // For now, we'll create a simple alert indicating PDF generation
      alert('PDF generation functionality would be implemented here. Data has been logged to console for development.');

      handleClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  return (
    <>
      <Tooltip title="Download Analytics Report">
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

export default AnalyticsDownloadButton;
