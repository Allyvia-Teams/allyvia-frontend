import React from 'react';
import { Stack, Typography, Card, CardContent, Divider, Box, Button } from '@mui/material';
import { IconEdit, IconX } from '@tabler/icons-react';
import ProfileInfoWidget from 'ui-component/profile/ProfileInfoWidget';
import PreferencesWidget from 'ui-component/profile/PreferencesWidget';
import ErrorBoundary from 'views/pages/error/ErrorBoundary';

/**
 * AccountTab - Main account settings tab
 *
 * Combines Profile and Preferences into a single card:
 * 1. Personal Information: Avatar, name, email, phone, role, security
 * 2. Preferences: Theme mode, accent color, sidebar behavior
 */
export default function AccountTab() {
  const [editMode, setEditMode] = React.useState(false);

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    // Trigger reset in child components by re-rendering
    window.dispatchEvent(new Event('cancel-edit'));
  };

  const handleProfileSaved = () => {
    setEditMode(false);
  };

  const handlePreferencesSaved = () => {
    setEditMode(false);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={4}>
          {/* Header with Edit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Account Information
            </Typography>
            {!editMode && (
              <Button variant="outlined" startIcon={<IconEdit size={18} />} onClick={handleEdit}>
                Edit
              </Button>
            )}
            {editMode && (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<IconX size={18} />} onClick={handleCancel}>
                  Cancel
                </Button>
              </Stack>
            )}
          </Box>

          {/* Personal Information Section */}
          <Box>
            <ProfileInfoWidget editMode={editMode} onSaved={handleProfileSaved} onCancel={handleCancel} />
          </Box>

          <Divider />

          {/* Preferences Section */}
          <Box>
            <ErrorBoundary>
              <PreferencesWidget editMode={editMode} onSaved={handlePreferencesSaved} />
            </ErrorBoundary>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
