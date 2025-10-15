import React from 'react';
import { Box, Select, MenuItem, Typography, FormControl } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react';

interface AllyviaPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

// Custom square button component
const SquareButton = ({
  onClick,
  disabled = false,
  active = false,
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) => {
  const theme = useTheme();

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        width: '30px !important',
        height: '30px !important',
        minWidth: '30px !important',
        minHeight: '30px !important',
        maxWidth: '30px !important',
        maxHeight: '30px !important',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
        backgroundColor: active ? theme.palette.primary.main : 'transparent',
        color: active ? '#ffffff' : disabled ? theme.palette.text.disabled : theme.palette.text.secondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.2s',
        flexShrink: 0,
        aspectRatio: '1/1',
        userSelect: 'none',
        '&:hover': disabled
          ? {}
          : {
              borderColor: theme.palette.primary.main,
              backgroundColor: active ? theme.palette.primary.dark : theme.palette.action.hover
            }
      }}
    >
      {children}
    </Box>
  );
};

export default function AllyviaPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100]
}: AllyviaPaginationProps) {
  const theme = useTheme();

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageSizeChange = (event: any) => {
    if (onPageSizeChange) {
      onPageSizeChange(Number(event.target.value));
    }
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.default
      }}
    >
      {/* Left side - Info and page size selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Showing {startItem} to {endItem} of {totalItems} items
        </Typography>

        {onPageSizeChange && (
          <FormControl size="small" variant="outlined">
            <Select
              value={pageSize}
              onChange={handlePageSizeChange}
              sx={{
                height: '30px',
                minWidth: 60,
                '& .MuiSelect-select': {
                  paddingY: '4px',
                  paddingX: '8px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center'
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderRadius: '4px'
                },
                '& .MuiSvgIcon-root': {
                  fontSize: '1.2rem'
                }
              }}
            >
              {pageSizeOptions.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Right side - Pagination controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <SquareButton onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <IconChevronsLeft size={18} />
        </SquareButton>

        <SquareButton onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          <IconChevronLeft size={18} />
        </SquareButton>

        {generatePageNumbers().map((page, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
            {page === '...' ? (
              <Box
                sx={{
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.palette.text.secondary,
                  fontSize: '0.875rem'
                }}
              >
                ...
              </Box>
            ) : (
              <SquareButton onClick={() => onPageChange(page as number)} active={page === currentPage}>
                {page}
              </SquareButton>
            )}
          </Box>
        ))}

        <SquareButton onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          <IconChevronRight size={18} />
        </SquareButton>

        <SquareButton onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
          <IconChevronsRight size={18} />
        </SquareButton>
      </Box>
    </Box>
  );
}
