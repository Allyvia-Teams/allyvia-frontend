import { Autocomplete, Box, AutocompleteRenderInputParams, OutlinedInput, InputAdornment } from '@mui/material';
import { IconSearch, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import React, { Dispatch } from 'react';
import { HeaderAvatar } from './HeaderAvatar';
import { useNavigate } from 'react-router';
import { headerSearchWidthLg, headerSearchWidthMd, headerIconSize } from 'store/constant';

export type DropdownOption = {
  name: string;
  group: string;
};

interface SearchAutocompleteProps {
  lgWidth?: string | number;
  mdWidth?: string | number;
  selectedItem: DropdownOption | null;
  setSelectedItem: Dispatch<React.SetStateAction<DropdownOption | null>>;
  options: DropdownOption[];
}

const capitalizeWord = (word: string): string => {
  return word[0].toUpperCase() + word.substring(1);
};

export const SearchAutoComplete = ({
  lgWidth = headerSearchWidthLg,
  mdWidth = headerSearchWidthMd,
  selectedItem,
  setSelectedItem,
  options
}: SearchAutocompleteProps) => {
  const navigate = useNavigate();

  const handleSubmit = (item?: DropdownOption) => {
    if (item) {
      setSelectedItem(item);
      navigate('/' + item.group);
    }
  };

  const handleEnterKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && selectedItem) {
      handleSubmit(selectedItem);
    }
  };

  return (
    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
      <Autocomplete
        noOptionsText={'No Matches Found'}
        openOnFocus={false}
        forcePopupIcon={false}
        options={options}
        groupBy={(option) => capitalizeWord(option.group)}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.name === value.name}
        value={selectedItem}
        onChange={(_, newItem) => handleSubmit(newItem as DropdownOption)}
        onKeyDown={handleEnterKey}
        renderInput={(params: AutocompleteRenderInputParams) => (
          <OutlinedInput
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
