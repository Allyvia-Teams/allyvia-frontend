import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { debounce } from 'lodash-es';

import type { ContactSearchResult, NewContactInfo } from '../types/pos.types';
import { posApi } from '../api/posApi';

export type CustomerSelection =
  | { type: 'existing'; contact: ContactSearchResult }
  | { type: 'new'; info: NewContactInfo }
  | { type: 'skip' };

interface CustomerSearchPanelProps {
  onSelect: (selection: CustomerSelection | null) => void;
  selection: CustomerSelection | null;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatPhone(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

export default function CustomerSearchPanel({ onSelect, selection }: CustomerSearchPanelProps) {
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // "Register" form state (shown when no results found)
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [registerError, setRegisterError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchResults = useCallback(
    debounce(async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setSearched(false);
        setShowDropdown(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await posApi.searchContacts(q);
        setResults(data);
        setSearched(true);
        setShowDropdown(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchResults(query);
    return () => fetchResults.cancel();
  }, [query, fetchResults]);

  // Reset register form whenever query changes
  useEffect(() => {
    setShowRegisterForm(false);
    setRegisterError('');
  }, [query]);

  const handleSelectExisting = (contact: ContactSearchResult) => {
    onSelect({ type: 'existing', contact });
    setShowDropdown(false);
    setQuery('');
  };

  const handleClearSelection = () => {
    onSelect(null);
    setQuery('');
    setResults([]);
    setSearched(false);
    setShowDropdown(false);
    setShowRegisterForm(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSkip = () => {
    onSelect({ type: 'skip' });
    setShowDropdown(false);
    setShowRegisterForm(false);
    setQuery('');
  };

  const handleOpenRegisterForm = () => {
    setNewName(query.trim());
    setNewEmail('');
    setNewPhone('');
    setRegisterError('');
    setShowRegisterForm(true);
    setShowDropdown(false);
  };

  const handleRegisterSubmit = () => {
    if (!newEmail.trim() && !newPhone.trim()) {
      setRegisterError('Please enter at least an email or phone number.');
      return;
    }
    const info: NewContactInfo = {
      name: newName.trim() || newEmail.trim() || newPhone.trim(),
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined
    };
    onSelect({ type: 'new', info });
    setShowRegisterForm(false);
    setQuery('');
  };

  // ── Render: contact already selected ──────────────────────────────────────
  if (selection) {
    if (selection.type === 'existing') {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, color: 'text.secondary' }}>
            Customer
          </Typography>
          <Chip
            avatar={
              <Avatar sx={{ bgcolor: theme.palette.primary.main, fontSize: 11, fontWeight: 700 }}>
                {initials(selection.contact.name)}
              </Avatar>
            }
            label={
              <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, py: 0.25 }}>
                <Typography variant="body2" fontWeight={700} component="span">
                  {selection.contact.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="span">
                  {selection.contact.email}
                  {selection.contact.phone ? ` · ${formatPhone(selection.contact.phone)}` : ''}
                </Typography>
              </Box>
            }
            onDelete={handleClearSelection}
            deleteIcon={<CloseIcon fontSize="small" />}
            sx={{
              height: 'auto',
              py: 0.5,
              px: 0.5,
              borderRadius: 2,
              border: `1px solid ${theme.palette.primary.light}`,
              bgcolor: theme.palette.primary.light + '22',
              '& .MuiChip-label': { px: 1 }
            }}
          />
        </Box>
      );
    }

    if (selection.type === 'new') {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, color: 'text.secondary' }}>
            Customer
          </Typography>
          <Chip
            avatar={
              <Avatar sx={{ bgcolor: theme.palette.success.main, fontSize: 11, fontWeight: 700 }}>
                <PersonAddIcon sx={{ fontSize: 14 }} />
              </Avatar>
            }
            label={
              <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, py: 0.25 }}>
                <Typography variant="body2" fontWeight={700} component="span">
                  {selection.info.name}{' '}
                  <Typography component="span" variant="caption" color="success.main">
                    (new)
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary" component="span">
                  {[selection.info.email, selection.info.phone].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
            }
            onDelete={handleClearSelection}
            deleteIcon={<CloseIcon fontSize="small" />}
            sx={{
              height: 'auto',
              py: 0.5,
              px: 0.5,
              borderRadius: 2,
              border: `1px solid ${theme.palette.success.light}`,
              bgcolor: theme.palette.success.light + '22',
              '& .MuiChip-label': { px: 1 }
            }}
          />
        </Box>
      );
    }

    // type === 'skip'
    return (
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Walk-in (no customer linked)
        </Typography>
        <Button size="small" variant="text" onClick={handleClearSelection} sx={{ textTransform: 'none', minWidth: 0 }}>
          Change
        </Button>
      </Box>
    );
  }

  // ── Render: search UI ──────────────────────────────────────────────────────
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, color: 'text.secondary' }}>
        Customer{' '}
        <Typography component="span" variant="caption" color="text.disabled">
          (optional)
        </Typography>
      </Typography>

      <Box sx={{ position: 'relative' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          placeholder="Search by name, email, or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onFocus={() => {
            if (searched && results.length > 0) setShowDropdown(true);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">{loading ? <CircularProgress size={14} /> : <SearchIcon fontSize="small" />}</InputAdornment>
            )
          }}
        />

        {/* Results dropdown */}
        {showDropdown && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1300,
              mt: 0.5,
              maxHeight: 220,
              overflow: 'auto'
            }}
          >
            {results.length > 0 ? (
              <List disablePadding>
                {results.map((contact) => (
                  <ListItemButton key={contact.id} onMouseDown={() => handleSelectExisting(contact)} dense sx={{ gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: theme.palette.primary.main }}>
                      {initials(contact.name)}
                    </Avatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={700}>
                          {contact.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {contact.email}
                          {contact.phone ? ` · ${formatPhone(contact.phone)}` : ''}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  No contact found for &ldquo;{query}&rdquo;
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onMouseDown={handleOpenRegisterForm}
                    sx={{ textTransform: 'none' }}
                  >
                    Add contact
                  </Button>
                  <Button size="small" variant="outlined" onMouseDown={handleSkip} sx={{ textTransform: 'none' }}>
                    Skip — walk-in
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        )}
      </Box>

      {/* Walk-in skip shortcut (shown before searching) */}
      {!searched && !query && (
        <Button
          size="small"
          variant="text"
          startIcon={<PersonIcon fontSize="small" />}
          onClick={handleSkip}
          sx={{ mt: 0.5, textTransform: 'none', color: 'text.secondary' }}
        >
          Skip — walk-in customer
        </Button>
      )}

      {/* Register new contact form */}
      <Collapse in={showRegisterForm}>
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.default
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            New contact
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField size="small" fullWidth label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <TextField size="small" fullWidth label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <TextField size="small" fullWidth label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </Box>
          {registerError && (
            <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
              {registerError}
            </Alert>
          )}
          <Divider sx={{ my: 1.25 }} />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size="small" variant="outlined" onClick={() => setShowRegisterForm(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={handleRegisterSubmit} sx={{ textTransform: 'none' }}>
              Add &amp; link
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
