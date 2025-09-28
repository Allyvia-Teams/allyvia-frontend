import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { googleDriveAPI } from 'api/googleDrive.api';

const GoogleDriveCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        // Check if this is running in a popup window
        const isPopup = window.opener && window.opener !== window;

        if (error) {
          console.error('OAuth error:', error);
          if (isPopup) {
            // Notify parent window of error and close popup
            window.opener?.postMessage({ type: 'GOOGLE_DRIVE_AUTH_ERROR', error }, '*');
            window.close();
          } else {
            // Redirect to documents page with error
            navigate('/documents?error=oauth_error');
          }
          return;
        }

        if (code) {
          // Send the authorization code to the backend
          const response = await googleDriveAPI.connectGoogleDrive(code);

          if (response && 'success' in response && response.success) {
            // Success
            if (isPopup) {
              // Notify parent window of success and close popup
              window.opener?.postMessage({ type: 'GOOGLE_DRIVE_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              // Redirect to documents page with success
              navigate('/documents?connected=true');
            }
          } else {
            // Error
            if (isPopup) {
              // Notify parent window of error and close popup
              window.opener?.postMessage({ type: 'GOOGLE_DRIVE_AUTH_ERROR', error: 'connection_failed' }, '*');
              window.close();
            } else {
              // Redirect to documents page with error
              navigate('/documents?error=connection_failed');
            }
          }
        } else {
          // No code
          if (isPopup) {
            // Notify parent window of error and close popup
            window.opener?.postMessage({ type: 'GOOGLE_DRIVE_AUTH_ERROR', error: 'no_code' }, '*');
            window.close();
          } else {
            // Redirect to documents page with error
            navigate('/documents?error=no_code');
          }
        }
      } catch (error) {
        console.error('Callback error:', error);
        const isPopup = window.opener && window.opener !== window;

        if (isPopup) {
          // Notify parent window of error and close popup
          window.opener?.postMessage({ type: 'GOOGLE_DRIVE_AUTH_ERROR', error: 'callback_error' }, '*');
          window.close();
        } else {
          // Redirect to documents page with error
          navigate('/documents?error=callback_error');
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" gap={2}>
      <CircularProgress size={60} />
      <Typography variant="h6" color="textSecondary">
        Connecting to Google Drive...
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Please wait while we complete the authentication process.
      </Typography>
    </Box>
  );
};

export default GoogleDriveCallback;
