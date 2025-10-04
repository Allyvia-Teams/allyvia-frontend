import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  CircularProgress,
  InputAdornment,
  ClickAwayListener
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconSearch, IconClock, IconTrendingUp } from '@tabler/icons-react';
import { debounce } from 'lodash-es';

interface SearchSuggestion {
  value: string;
  label: string;
  type?: 'exact' | 'partial' | 'recent' | 'query';
  count?: number;
}

interface AllyviaSearchAutocompleteProps {
  onSearch: (searchTerm: string) => void;
  fetchSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
  placeholder?: string;
  recentSearches?: string[];
  height?: number;
  width?: number | string;
  value?: string;
  onChange?: (value: string) => void;
}

export default function AllyviaSearchAutocomplete({
  onSearch,
  fetchSuggestions,
  placeholder = 'Search...',
  recentSearches = [],
  height = 40,
  width,
  value: controlledValue,
  onChange
}: AllyviaSearchAutocompleteProps) {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState(controlledValue || '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInputValue(controlledValue);
    }
  }, [controlledValue]);

  const fetchSuggestionsDebounced = useCallback(
    debounce(async (query: string) => {
      if (!fetchSuggestions || query.length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        const results = await fetchSuggestions(query);

        const formattedSuggestions = [
          ...results,
          {
            value: query,
            label: `Search for "${query}"`,
            type: 'query' as const
          }
        ];

        setSuggestions(formattedSuggestions);
        setShowDropdown(true);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [fetchSuggestions]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);

    if (onChange) {
      onChange(newValue);
    }

    if (newValue.trim()) {
      fetchSuggestionsDebounced(newValue);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.value);
    setSuggestions([]);
    setShowDropdown(false);
    onSearch(suggestion.value);

    if (onChange) {
      onChange(suggestion.value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        onSearch(inputValue);
        setShowDropdown(false);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;

      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;

      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          onSearch(inputValue);
          setShowDropdown(false);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleClickAway = () => {
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'recent':
        return <IconClock size={16} />;
      case 'exact':
        return <IconTrendingUp size={16} />;
      default:
        return <IconSearch size={16} />;
    }
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box
        sx={{
          position: 'relative',
          width: width || 'auto',
          minWidth: 300,
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <TextField
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length >= 2 && suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          variant="outlined"
          fullWidth
          sx={{
            backgroundColor: '#ffffff !important',
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#ffffff !important',
              background: '#ffffff !important'
            },
            '& .MuiInputBase-root': {
              backgroundColor: '#ffffff !important',
              background: '#ffffff !important'
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} />
              </InputAdornment>
            ),
            endAdornment: loading && (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ),
            sx: {
              height: `${height - 1}px`,
              minHeight: `${height - 1}px`,
              maxHeight: `${height - 1}px`,
              backgroundColor: '#ffffff !important',
              background: '#ffffff !important',
              '& input': {
                backgroundColor: '#ffffff !important',
                background: '#ffffff !important',
                color: theme.palette.text.primary
              },
              '& .MuiOutlinedInput-input': {
                backgroundColor: '#ffffff !important',
                background: '#ffffff !important'
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.divider
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main
              }
            }
          }}
        />

        {showDropdown && suggestions.length > 0 && (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: `${height + 4}px`,
              left: 0,
              right: 0,
              zIndex: 1000,
              maxHeight: 300,
              overflow: 'auto',
              backgroundColor: theme.palette.background.paper
            }}
          >
            <List ref={listRef} sx={{ py: 0 }}>
              {suggestions.map((suggestion, index) => (
                <ListItem key={`${suggestion.value}-${index}`} disablePadding>
                  <ListItemButton
                    selected={index === selectedIndex}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover
                      },
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.action.selected,
                        '&:hover': {
                          backgroundColor: theme.palette.action.selected
                        }
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                      {getIcon(suggestion.type)}

                      <ListItemText
                        primary={
                          <Typography variant="body2" component="span">
                            {suggestion.label}
                          </Typography>
                        }
                        sx={{ flex: 1 }}
                      />

                      {suggestion.count !== undefined && suggestion.count !== null && (
                        <Typography variant="caption" color="textSecondary">
                          {suggestion.count} {suggestion.count === 1 ? 'result' : 'results'}
                        </Typography>
                      )}
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
