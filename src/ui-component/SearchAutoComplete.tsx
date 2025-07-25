import { Autocomplete, Box, AutocompleteRenderInputParams, OutlinedInput, InputAdornment } from '@mui/material';
import { IconSearch, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { chartData } from 'views/dashboard/chart-data';
import React, { useState } from 'react';
import { HeaderAvatar } from './HeaderAvatar';
import { inventoryItems } from 'views/inventory/InventoryTableMock';
import { useNavigate } from 'react-router';

// TODO: Mock data! Remove when real data is available
const employees = chartData.EmployeeTable.map((e) => ({ name: `${e.firstName} ${e.lastName}`, group: 'employees' }));
const inventory = inventoryItems.map((i) => ({ name: i.name, group: 'inventory' }));

type DropdownOption = {
  name: string;
  group: 'employees' | 'inventory';
};

interface SearchAutocompleteProps {
  autoCompleteGroups: string[];
  lgWidth?: string | number;
  mdWidth?: string | number;
}

const capitalizeWord = (word: string): string => {
  return word[0].toUpperCase() + word.substring(1);
};

export const SearchAutoComplete = ({ autoCompleteGroups, lgWidth = 434, mdWidth = 250 }: SearchAutocompleteProps) => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<DropdownOption | null>(null);

  const data = [
    ...(autoCompleteGroups?.includes('employees') ? employees : []),
    ...(autoCompleteGroups?.includes('inventory') ? inventory : [])
  ];



  const handleSubmit = (item?: DropdownOption) => {
    if (item) {
      setSelectedItem(item)
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
        options={data}
        groupBy={(option) => capitalizeWord(option.group)}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.name === value.name}
        value={selectedItem}
        onChange={(_, newItem) => handleSubmit(newItem as DropdownOption) }
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
                  <IconSearch stroke={1.5} size="16px" />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            }
            endAdornment={
              <>
                {params.InputProps.endAdornment}
                <InputAdornment position="end">
                  <HeaderAvatar>
                    <IconAdjustmentsHorizontal stroke={1.5} size="20px" />
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
