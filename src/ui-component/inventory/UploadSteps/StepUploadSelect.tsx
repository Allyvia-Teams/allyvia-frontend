import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

type Props = {
  isDragActive: boolean;
  getRootProps: any;
  getInputProps: any;
  file: File | null;
  onDownloadTemplate: () => void;
  onDownloadDemo: () => void;
};

const StepUploadSelect: React.FC<Props> = ({ isDragActive, getRootProps, getInputProps, file, onDownloadTemplate, onDownloadDemo }) => {
  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          or click to select a file
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Supported: CSV files up to 10MB
        </Typography>
      </Paper>
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={onDownloadTemplate} size="small">
          Download Template
        </Button>
        <Button variant="outlined" onClick={onDownloadDemo} size="small">
          Download Demo Data (50 rows, 3 errors)
        </Button>
      </Stack>
      {file && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          Selected: {file.name}
        </Typography>
      )}
    </Box>
  );
};

export default StepUploadSelect;
