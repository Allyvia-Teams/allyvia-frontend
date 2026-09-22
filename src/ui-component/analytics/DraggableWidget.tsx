import React from 'react';
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconX } from '@tabler/icons-react';
import type { WidgetSize } from 'views/analytics/registry/types';

export type DraggableWidgetProps = {
  id: string;
  title: string;
  width: WidgetSize;
  children: React.ReactNode;
  onResize: (width: WidgetSize) => void;
  onRemove?: () => void;
};

const WIDTH_OPTIONS: Array<{ value: WidgetSize; label: string }> = [
  { value: 'third', label: '1/3' },
  { value: 'half', label: '1/2' },
  { value: 'full', label: 'full' }
];

const DraggableWidget: React.FC<DraggableWidgetProps> = ({ id, title, width, children, onResize, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    position: 'relative',
    height: '100%'
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        outline: isOver && !isDragging ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: 2,
        borderRadius: 1,
        '&:hover .analytics-widget-remove': {
          opacity: 1
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1,
          minHeight: 32
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Tooltip title="Drag to reorder">
            <IconButton
              size="small"
              aria-label={`Drag ${title}`}
              {...attributes}
              {...listeners}
              sx={{ cursor: 'grab', touchAction: 'none' }}
            >
              <IconGripVertical size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={width}
          onChange={(_, next: WidgetSize | null) => {
            if (next) {
              onResize(next);
            }
          }}
          aria-label={`${title} width`}
        >
          {WIDTH_OPTIONS.map((option) => (
            <ToggleButton key={option.value} value={option.value} aria-label={`Set ${title} width to ${option.label}`}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {onRemove ? (
          <IconButton
            className="analytics-widget-remove"
            size="small"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
            sx={{
              opacity: 0,
              transition: 'opacity 0.15s ease-in-out'
            }}
          >
            <IconX size={16} />
          </IconButton>
        ) : (
          <Box sx={{ width: 34 }} />
        )}
      </Box>

      {children}
    </Box>
  );
};

export default DraggableWidget;
