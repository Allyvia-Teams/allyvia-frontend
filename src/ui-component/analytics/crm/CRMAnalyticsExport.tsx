import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider
} from '@mui/material';
import { Download, Save, FileDownload, TableChart, PictureAsPdf, Description } from '@mui/icons-material';
import { CRMAnalyticsParams } from 'types/analytics';

interface CRMAnalyticsExportProps {
  filters: CRMAnalyticsParams;
  data: {
    overview?: any;
    pipeline?: any;
    conversion?: any;
    sources?: any;
    activities?: any;
    dealAging?: any;
    reps?: any;
    stalled?: any;
    atRisk?: any;
    tasksDue?: any;
    recentWinsLosses?: any;
  };
}

const CRMAnalyticsExport: React.FC<CRMAnalyticsExportProps> = ({ filters, data }) => {
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const handleExportCSV = () => {
    // Create CSV content from current data
    const csvContent = generateCSVContent();
    downloadFile(csvContent, 'crm-analytics.csv', 'text/csv');
  };

  const handleExportXLSX = () => {
    // For XLSX export, we would use a library like xlsx
    // For now, we'll export as CSV with .xlsx extension
    const csvContent = generateCSVContent();
    downloadFile(csvContent, 'crm-analytics.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const handleExportPDF = () => {
    // For PDF export, we would capture the current view and generate PDF
    // For now, we'll show a message
    alert('PDF export functionality would capture the current dashboard view and generate a PDF report.');
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;

    // Save current filters as a named view
    const savedViews = JSON.parse(localStorage.getItem('crm-analytics-views') || '[]');
    const newView = {
      id: Date.now().toString(),
      name: viewName,
      filters: filters,
      createdAt: new Date().toISOString()
    };

    savedViews.push(newView);
    localStorage.setItem('crm-analytics-views', JSON.stringify(savedViews));

    setViewName('');
    setSaveViewOpen(false);
    alert(`View "${viewName}" saved successfully!`);
  };

  const generateCSVContent = () => {
    let csvContent = 'CRM Analytics Export\n';
    csvContent += `Generated: ${new Date().toLocaleString()}\n`;
    csvContent += `Filters: ${JSON.stringify(filters, null, 2)}\n\n`;

    // Add KPIs
    if (data.overview?.kpis) {
      csvContent += 'KPIs\n';
      csvContent += 'Metric,Value\n';
      const kpis = data.overview.kpis;
      Object.entries(kpis).forEach(([key, value]) => {
        if (typeof value === 'number' && !key.includes('delta')) {
          csvContent += `${key},${value}\n`;
        }
      });
      csvContent += '\n';
    }

    // Add Pipeline data
    if (data.pipeline?.stages) {
      csvContent += 'Pipeline by Stage\n';
      csvContent += 'Stage,Count,Total Value,Median Age (Days)\n';
      data.pipeline.stages.forEach((stage: any) => {
        csvContent += `${stage.stage_name},${stage.count},${stage.total_value},${stage.median_age_days}\n`;
      });
      csvContent += '\n';
    }

    // Add Conversion data
    if (data.conversion?.steps) {
      csvContent += 'Conversion Waterfall\n';
      csvContent += 'Step,Count,Conversion Rate\n';
      data.conversion.steps.forEach((step: any) => {
        csvContent += `${step.step},${step.count},${step.conversion_rate}\n`;
      });
      csvContent += '\n';
    }

    // Add Sources data
    if (data.sources?.sources) {
      csvContent += 'Lead Sources\n';
      csvContent += 'Source,Count,Value,Conversion Rate\n';
      data.sources.sources.forEach((source: any) => {
        csvContent += `${source.source_name},${source.count},${source.value},${source.conversion_rate}\n`;
      });
      csvContent += '\n';
    }

    // Add Stalled Deals
    if (data.stalled?.deals) {
      csvContent += 'Stalled Deals\n';
      csvContent += 'Deal Name,Stage,Value,Days in Stage,Last Activity,Owner\n';
      data.stalled.deals.forEach((deal: any) => {
        csvContent += `${deal.deal_name},${deal.stage},${deal.value},${deal.days_in_stage},${deal.last_activity},${deal.owner}\n`;
      });
      csvContent += '\n';
    }

    return csvContent;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSavedViews = () => {
    return JSON.parse(localStorage.getItem('crm-analytics-views') || '[]');
  };

  const loadSavedView = (view: any) => {
    // This would be handled by the parent component
    alert(`Loading view "${view.name}" - this would restore the filters: ${JSON.stringify(view.filters)}`);
  };

  const deleteSavedView = (viewId: string) => {
    const savedViews = getSavedViews();
    const updatedViews = savedViews.filter((view: any) => view.id !== viewId);
    localStorage.setItem('crm-analytics-views', JSON.stringify(updatedViews));
  };

  const savedViews = getSavedViews();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Export & Save View
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExportCSV} disabled={!data.overview}>
            Export CSV
          </Button>
          <Button variant="outlined" startIcon={<TableChart />} onClick={handleExportXLSX} disabled={!data.overview}>
            Export XLSX
          </Button>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={handleExportPDF} disabled={!data.overview}>
            Export PDF
          </Button>
          <Button variant="contained" startIcon={<Save />} onClick={() => setSaveViewOpen(true)}>
            Save Current View
          </Button>
        </Stack>

        {/* Saved Views */}
        {savedViews.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Saved Views
            </Typography>
            <List dense>
              {savedViews.map((view: any) => (
                <ListItem key={view.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Description />
                  </ListItemIcon>
                  <ListItemText primary={view.name} secondary={`Created: ${new Date(view.createdAt).toLocaleDateString()}`} />
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => loadSavedView(view)}>
                      Load
                    </Button>
                    <Button size="small" color="error" onClick={() => deleteSavedView(view.id)}>
                      Delete
                    </Button>
                  </Stack>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Current Filters Summary */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Filters
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {Object.entries(filters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;

              let displayValue = value;
              if (Array.isArray(value)) {
                displayValue = value.join(', ');
              }

              return <Chip key={key} label={`${key}: ${displayValue}`} size="small" variant="outlined" />;
            })}
            {Object.keys(filters).length === 0 && (
              <Typography color="textSecondary" variant="body2">
                No filters applied
              </Typography>
            )}
          </Stack>
        </Box>
      </CardContent>

      {/* Save View Dialog */}
      <Dialog open={saveViewOpen} onClose={() => setSaveViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Current View</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="View Name"
            fullWidth
            variant="outlined"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="e.g., Q4 Pipeline Review"
          />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            This will save the current filter settings as a named view that you can quickly restore later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveViewOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveView} variant="contained" disabled={!viewName.trim()}>
            Save View
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default CRMAnalyticsExport;
