import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Popper from '@mui/material/Popper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// third party
import PopupState, { bindPopper, bindToggle } from 'material-ui-popup-state';

// project imports
import { ThemeMode } from 'config';
import Transitions from 'ui-component/extended/Transitions';
import { SearchAutoComplete, type DropdownOption } from 'ui-component/SearchAutoComplete';
import { HeaderAvatar } from 'ui-component/HeaderAvatar';
import { useNavigate } from 'react-router';
import { useSelector } from 'store';
import { useGlobalSearch } from 'hooks/useGlobalSearch';
import { getSearchResultPath } from 'types/globalSearch';

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

// ==============================|| SEARCH INPUT - MOBILE||============================== //

interface Props {
  value: DropdownOption | null;
  setValue: (value: DropdownOption | null) => void;
  popupState: any;
  options: DropdownOption[];
  inputValue: string;
  onInputChange: (value: string) => void;
  loading: boolean;
  onResultSelect?: () => void;
}

function MobileSearch({ value, setValue, popupState, options, inputValue, onInputChange, loading, onResultSelect }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleSubmit = (item?: DropdownOption | null) => {
    if (!item) {
      return;
    }

    setValue(null);
    onInputChange('');
    onResultSelect?.();
    navigate(getSearchResultPath(item));
  };

  const handleEnterKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value) {
      handleSubmit(value);
    }
  };

  return (
    <Autocomplete
      noOptionsText={inputValue.trim().length < 2 ? 'Type at least 2 characters' : 'No matches found'}
      openOnFocus={false}
      forcePopupIcon={false}
      filterOptions={(x) => x}
      loading={loading}
      options={options}
      inputValue={inputValue}
      onInputChange={(_, nextValue, reason) => {
        if (reason === 'input' || reason === 'clear') {
          onInputChange(nextValue);
        }
      }}
      value={value}
      onChange={(_, newItem) => handleSubmit(newItem as DropdownOption)}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, optionValue) => option.id === optionValue.id && option.type === optionValue.type}
      onKeyDown={handleEnterKey}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={`${option.type}-${option.id}`}>
          <Box>
            <Typography variant="body2">{option.label}</Typography>
            {option.subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {option.subtitle}
              </Typography>
            ) : null}
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <OutlinedInput
          id="input-search-header"
          placeholder="Search employees, inventory, CRM..."
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
              {loading ? (
                <InputAdornment position="end">
                  <CircularProgress color="inherit" size={18} />
                </InputAdornment>
              ) : null}
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
}

export default function SearchSection({ lgWidth = headerSearchWidthLg, mdWidth = headerSearchWidthMd }: SearchSectionProps) {
  const [value, setValue] = useState<DropdownOption | null>(null);
  const { currentRole } = useSelector((state) => state.auth);
  const { query, setQuery, results, loading, clearSearch } = useGlobalSearch(currentRole?.company_id);

  const handleResultSelect = () => {
    setValue(null);
    clearSearch();
  };

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
                              <MobileSearch
                                value={value}
                                setValue={setValue}
                                popupState={popupState}
                                options={results}
                                inputValue={query}
                                onInputChange={setQuery}
                                loading={loading}
                                onResultSelect={handleResultSelect}
                              />
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
      <SearchAutoComplete
        mdWidth={mdWidth}
        lgWidth={lgWidth}
        setSelectedItem={setValue}
        selectedItem={value}
        options={results}
        inputValue={query}
        onInputChange={setQuery}
        loading={loading}
        onResultSelect={handleResultSelect}
      />
    </>
  );
}
