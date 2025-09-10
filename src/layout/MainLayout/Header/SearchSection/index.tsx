import { useState, Dispatch } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Popper from '@mui/material/Popper';
import Box from '@mui/material/Box';

// third party
import PopupState, { bindPopper, bindToggle } from 'material-ui-popup-state';

// project imports
import { ThemeMode } from 'config';
import Transitions from 'ui-component/extended/Transitions';
import { SearchAutoComplete, type DropdownOption } from 'ui-component/SearchAutoComplete';
import { HeaderAvatar } from 'ui-component/HeaderAvatar';
import { inventoryItems } from 'api/inventory.api';
import { chartData } from 'views/dashboard/chart-data';
import { useNavigate } from 'react-router';

// assets
import { IconAdjustmentsHorizontal, IconSearch, IconX } from '@tabler/icons-react';
import { Autocomplete } from '@mui/material';
import {
  headerSearchWidthMd,
  headerSearchWidthLg,
  mobileSearchPopperWidth,
  mobileSearchPopperTopOffset,
  headerIconSize
} from 'store/constant';

// Mock Data
const employees = chartData.EmployeeTable.map((e) => ({ name: `${e.firstName} ${e.lastName}`, group: 'employees' }));
const inventory = inventoryItems.map((i: any) => ({ name: i.name, group: 'inventory' }));

// ==============================|| SEARCH INPUT - MOBILE||============================== //

interface Props {
  value: DropdownOption | null;
  setValue: Dispatch<React.SetStateAction<DropdownOption | null>>;
  popupState: any;
  options: DropdownOption[];
}

function MobileSearch({ value, setValue, popupState, options }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value) {
      navigate('/' + value.group);
      setValue(() => null);
    }
  };

  return (
    <Autocomplete
      noOptionsText={'No Matches Found'}
      openOnFocus={false}
      forcePopupIcon={false}
      options={options}
      value={value}
      onChange={(_, newItem) => setValue(newItem as DropdownOption)}
      groupBy={(option) => option.group[0].toUpperCase() + option.group.substring(1)}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.name === value.name}
      onKeyDown={handleSubmit}
      renderInput={(params) => (
        <OutlinedInput
          id="input-search-header"
          placeholder="Search"
          inputRef={params.InputProps.ref}
          className={params.InputProps.className}
          onMouseDown={params.InputProps.onMouseDown}
          inputProps={{
            ...params.inputProps,
            'aria-label': 'search'
          }}
          startAdornment={
            <>
              <InputAdornment position="start">
                <IconSearch stroke={1.5} size={`${headerIconSize - 4}px`} />
              </InputAdornment>
              {params.InputProps.startAdornment}
            </>
          }
          endAdornment={
            <>
              {params.InputProps.endAdornment}
              <InputAdornment position="end">
                <HeaderAvatar>
                  <IconAdjustmentsHorizontal stroke={1.5} size={`${headerIconSize}px`} />
                </HeaderAvatar>
                <Box sx={{ ml: 2 }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      ...theme.typography.commonAvatar,
                      ...theme.typography.mediumAvatar,
                      bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'primary.light',
                      color: 'primary.dark',
                      '&:hover': {
                        bgcolor: 'orange.dark',
                        color: 'orange.light'
                      }
                    }}
                    {...bindToggle(popupState)}
                  >
                    <IconX stroke={1.5} size={`${headerIconSize}px`} />
                  </Avatar>
                </Box>
              </InputAdornment>
            </>
          }
          aria-describedby="search-helper-text"
          slotProps={{ input: { 'aria-label': 'weight', sx: { bgcolor: 'transparent', pl: 0.5 } } }}
          sx={{ width: '100%', ml: 0.5, px: 2, bgcolor: 'background.paper' }}
        />
      )}
    />
  );
}

// ==============================|| SEARCH INPUT ||============================== //

interface SearchSectionProps {
  lgWidth?: string | number;
  mdWidth?: string | number;
  autoCompleteGroups?: string[];
}
export default function SearchSection({
  lgWidth = headerSearchWidthLg,
  mdWidth = headerSearchWidthMd,
  autoCompleteGroups = ['employees', 'inventory']
}: SearchSectionProps) {
  const [value, setValue] = useState<DropdownOption | null>(null);

  const data = [
    ...(autoCompleteGroups?.includes('employees') ? employees : []),
    ...(autoCompleteGroups?.includes('inventory') ? inventory : [])
  ];

  return (
    <>
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <PopupState variant="popper" popupId="demo-popup-popper">
          {(popupState) => (
            <>
              <Box sx={{ ml: 2 }}>
                <HeaderAvatar {...bindToggle(popupState)}>
                  <IconSearch stroke={1.5} size={`${headerIconSize - 0.8}px`} />
                </HeaderAvatar>
              </Box>
              <Popper
                {...bindPopper(popupState)}
                transition
                sx={{
                  zIndex: 1100,
                  width: mobileSearchPopperWidth,
                  top: `-${mobileSearchPopperTopOffset}px !important`,
                  px: { xs: 1.25, sm: 1.5 }
                }}
              >
                {({ TransitionProps }) => (
                  <>
                    <Transitions type="zoom" {...TransitionProps} sx={{ transformOrigin: 'center left' }}>
                      <Card sx={{ bgcolor: 'background.default', border: 0, boxShadow: 'none' }}>
                        <Box sx={{ p: 2 }}>
                          <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Grid size="grow">
                              <MobileSearch value={value} setValue={setValue} popupState={popupState} options={data} />
                            </Grid>
                          </Grid>
                        </Box>
                      </Card>
                    </Transitions>
                  </>
                )}
              </Popper>
            </>
          )}
        </PopupState>
      </Box>
      <SearchAutoComplete mdWidth={mdWidth} lgWidth={lgWidth} setSelectedItem={setValue} selectedItem={value} options={data} />
    </>
  );
}
