import {
  Autocomplete,
  Box,
  AutocompleteRenderInputParams,
  OutlinedInput,
  InputAdornment,
  Typography,
  CircularProgress
} from '@mui/material';
import { IconSearch, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import React from 'react';
import { HeaderAvatar } from './HeaderAvatar';
import { useNavigate } from 'react-router';
import { headerSearchWidthLg, headerSearchWidthMd, headerIconSize } from 'store/constant';
import type { GlobalSearchResult } from 'types/globalSearch';
import { getSearchResultPath } from 'types/globalSearch';

// Backward-compatible alias used by SearchSection
export type DropdownOption = GlobalSearchResult;

interface SearchAutocompleteProps {
  lgWidth?: string | number;
  mdWidth?: string | number;
  selectedItem: GlobalSearchResult | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<GlobalSearchResult | null>>;
  options: GlobalSearchResult[];
  inputValue: string;
  onInputChange: (value: string) => void;
  loading?: boolean;
  onResultSelect?: () => void;
}

export const SearchAutoComplete = ({
  lgWidth = headerSearchWidthLg,
  mdWidth = headerSearchWidthMd,
  selectedItem,
  setSelectedItem,
  options,
  inputValue,
  onInputChange,
  loading = false,
  onResultSelect
}: SearchAutocompleteProps) => {
  const navigate = useNavigate();

  const handleSubmit = (item?: GlobalSearchResult | null) => {
    if (!item) {
      return;
    }

    setSelectedItem(null);
    onInputChange('');
    onResultSelect?.();
    navigate(getSearchResultPath(item));
  };

  const handleEnterKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && selectedItem) {
      handleSubmit(selectedItem);
    }
  };

  return (
    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
      <Autocomplete
        noOptionsText={inputValue.trim().length < 2 ? 'Type at least 2 characters' : 'No matches found'}
        openOnFocus={false}
        forcePopupIcon={false}
        filterOptions={(x) => x}
        loading={loading}
        options={options}
        inputValue={inputValue}
        onInputChange={(_, value, reason) => {
          if (reason === 'input' || reason === 'clear') {
            onInputChange(value);
          }
        }}
        groupBy={(option) => option.group}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.id === value.id && option.type === value.type}
        value={selectedItem}
        onChange={(_, newItem) => handleSubmit(newItem)}
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
        renderInput={(params: AutocompleteRenderInputParams) => (
          <OutlinedInput
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
                </InputAdornment>
              </>
            }
            sx={{ width: { md: mdWidth, lg: lgWidth }, ml: 2, px: 2 }}
          />
        )}
      />
    </Box>
  );
};
