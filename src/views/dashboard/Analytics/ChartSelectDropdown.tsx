import { Button, Grid, Menu, MenuItem, useTheme } from '@mui/material';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import { useState } from 'react';

export const ChartSelectDropdown = ({ options, handleSelect }: { options: string[]; handleSelect: (name: string) => void }) => {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement> | undefined) => {
    setAnchorEl(event?.currentTarget);
  };

  return (
    <Grid>
      <Button onClick={handleClick} sx={{ padding: '8px', border: '1px solid', ':hover': { backgroundColor: theme.palette.action.hover } }}>
        <ListAltRoundedIcon fontSize="medium" sx={{ color: 'primary.main', cursor: 'pointer' }} />
      </Button>
      {anchorEl && (
        <Menu
          id="menu-user-details-card"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          variant="selectedMenu"
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
        >
          {options.map((option) => (
            <MenuItem
              onClick={() => {
                handleSelect(option), setAnchorEl(null);
              }}
              key={option}
            >
              {option}
            </MenuItem>
          ))}
        </Menu>
      )}
    </Grid>
  );
};
