import { useState, useRef, useEffect } from 'react';
import { Chip, Menu, MenuItem, TextField, ChipProps, ClickAwayListener } from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';

export interface ChipSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[]; // If provided, shows dropdown. Otherwise text input
  isEditable?: boolean;
  color?: ChipProps['color'];
  size?: ChipProps['size'];
  className?: string;
}

export default function ChipSelect({ value, onChange, options, isEditable = false, color, size = 'small', className }: ChipSelectProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isTextEdit, setIsTextEdit] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [inputWidth, setInputWidth] = useState(200);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  const open = Boolean(anchorEl);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // Focus input when entering text edit mode
  useEffect(() => {
    if (isTextEdit && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
  }, [isTextEdit]);

  const handleChipClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!isEditable) return;

    if (options && options.length > 0) {
      // Dropdown mode - always use chipRef as anchor
      setAnchorEl(chipRef.current);
    } else {
      // Text input mode - capture chip width for smooth transition
      if (chipRef.current) {
        setInputWidth(chipRef.current.offsetWidth);
      }
      setIsTextEdit(true);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (selectedValue: string) => {
    onChange(selectedValue);
    handleMenuClose();
  };

  const handleTextBlur = () => {
    if (tempValue.trim() !== '') {
      onChange(tempValue.trim());
    } else {
      setTempValue(value); // Reset to original if empty
    }
    setIsTextEdit(false);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTextBlur();
    } else if (e.key === 'Escape') {
      setTempValue(value); // Reset
      setIsTextEdit(false);
    }
  };

  // Text edit mode
  if (isTextEdit && !options) {
    return (
      <ClickAwayListener onClickAway={handleTextBlur}>
        <TextField
          inputRef={inputRef}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          size="small"
          variant="outlined"
          sx={{
            width: `${inputWidth}px`,
            minWidth: 100,
            '& .MuiOutlinedInput-root': {
              height: 32,
              fontSize: '0.8125rem',
              borderRadius: '16px',
              backgroundColor: color === 'primary' ? 'primary.main' : 'default.main',
              color: color === 'primary' ? 'primary.contrastText' : 'text.primary',
              '& fieldset': {
                borderColor: color === 'primary' ? 'primary.dark' : 'divider',
                borderWidth: '1px'
              },
              '&:hover fieldset': {
                borderColor: color === 'primary' ? 'primary.dark' : 'divider'
              },
              '&.Mui-focused fieldset': {
                borderColor: color === 'primary' ? 'primary.dark' : 'primary.main',
                borderWidth: '2px'
              }
            },
            '& .MuiOutlinedInput-input': {
              py: 0.5,
              px: 1.5,
              color: 'inherit'
            }
          }}
        />
      </ClickAwayListener>
    );
  }

  // Chip display mode
  return (
    <>
      <Chip
        ref={chipRef}
        label={value}
        color={color}
        size={size}
        className={className}
        onClick={handleChipClick}
        deleteIcon={isEditable && options && options.length > 0 ? <IconChevronDown size={14} /> : undefined}
        onDelete={isEditable && options && options.length > 0 ? handleChipClick : undefined}
        sx={{
          cursor: isEditable ? 'pointer' : 'default',
          '&:hover': isEditable
            ? {
                backgroundColor: color === 'primary' ? 'primary.dark' : 'action.hover'
              }
            : {},
          '& .MuiChip-deleteIcon': {
            color: 'inherit',
            margin: 0,
            marginLeft: '-6px',
            marginRight: '4px',
            '&:hover': {
              color: 'inherit'
            }
          }
        }}
      />

      {/* Dropdown menu for options */}
      {options && options.length > 0 && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center'
          }}
          slotProps={{
            paper: {
              sx: {
                minWidth: chipRef.current ? `${chipRef.current.offsetWidth}px` : 'auto',
                mt: 0.5
              }
            }
          }}
        >
          {options.map((option) => (
            <MenuItem key={option} selected={option === value} onClick={() => handleMenuItemClick(option)}>
              {option}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}
