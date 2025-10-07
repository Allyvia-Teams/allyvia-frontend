// Reusable RefreshButton component (moved from src/components)
import { IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import React from 'react';

type Props = {
  onClick: () => void; // dispatch your thunk(s) here
  'aria-label'?: string;
  title?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
};

export default function RefreshButton({ onClick, title = 'Refresh', disabled = false, size = 'small', ...rest }: Props) {
  return (
    <Tooltip title={title}>
      <IconButton onClick={onClick} aria-label={rest['aria-label'] ?? 'refresh'} disabled={disabled} size={size}>
        <RefreshIcon />
      </IconButton>
    </Tooltip>
  );
}
