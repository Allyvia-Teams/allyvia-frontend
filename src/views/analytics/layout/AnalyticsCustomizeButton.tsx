import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useAnalyticsLayout } from './AnalyticsLayoutContext';

const AnalyticsCustomizeButton: React.FC = () => {
  const { openPicker } = useAnalyticsLayout();

  return (
    <Tooltip title="Customize widgets">
      <IconButton onClick={openPicker} aria-label="Customize widgets" size="small" color="primary">
        <AddCircleOutlineIcon />
      </IconButton>
    </Tooltip>
  );
};

export default AnalyticsCustomizeButton;
