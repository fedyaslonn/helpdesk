import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingState = ({ message = 'Загрузка…', fullScreen = false }) => (
  <Box
    className={
      fullScreen
        ? 'flex min-h-[50vh] flex-col items-center justify-center gap-4'
        : 'flex flex-col items-center justify-center gap-3 py-12'
    }
  >
    <CircularProgress size={40} color="primary" />
    {message && (
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);

export default LoadingState;
