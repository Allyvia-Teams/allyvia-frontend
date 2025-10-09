import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Typography, Box } from '@mui/material';
import { DASHBOARD_PATH } from 'config';
import HomeTwoToneIcon from '@mui/icons-material/HomeTwoTone';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import img404 from 'assets/images/maintenance/img-404-error.svg';

export default function Error404() {
  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        boxSizing: 'border-box'
      }}
    >
      {/* SVG Image with Animation */}
      <Box
        component="img"
        src={img404}
        alt="404 Error"
        sx={{
          width: '100%',
          maxWidth: 300,
          height: 'auto',
          marginBottom: 3,
          animation: 'bounce 2s infinite'
        }}
      />

      {/* Title */}
      <Typography
        variant="h4"
        sx={{
          marginBottom: 3,
          fontWeight: 600,
          textAlign: 'center'
        }}
      >
        Page Not Found
      </Typography>

      {/* Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          component={Link}
          to={DASHBOARD_PATH}
          startIcon={<HomeTwoToneIcon />}
          sx={{ minWidth: 140 }}
        >
          Home
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={() => window.history.back()}
          startIcon={<ArrowBackTwoToneIcon />}
          sx={{ minWidth: 140 }}
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );
}
