import { Grid, Menu, MenuItem, useTheme } from "@mui/material"
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import { useState } from "react";


export const ChartSelectDropdown = ({ options, handleSelect}: {options: string[], handleSelect: (name: string) => void}) => {

 const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent<SVGSVGElement> | undefined) => {
    setAnchorEl(event?.currentTarget);
  };

     return (
         <Grid>
              <MoreHorizOutlinedIcon
                fontSize="small"
                sx={{ color: 'grey.500', cursor: 'pointer' }}
                aria-controls="menu-user-details-card"
                aria-haspopup="true"
                onClick={handleClick}
              />
              {anchorEl && (
                <Menu
                  id="menu-user-details-card"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={() => {setAnchorEl(null)}}
                  variant="selectedMenu"
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                  }}
                >
                    {options.map((option) => (
                        <MenuItem onClick={() => handleSelect(option)} key={option}>
                            {option}
                        </MenuItem>
                    ))}
                </Menu>
              )}
            </Grid>
     )
}