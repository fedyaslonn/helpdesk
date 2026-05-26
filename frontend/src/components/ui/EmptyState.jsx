import React from 'react';
import { Typography, Box } from '@mui/material';

const EmptyState = ({ title, description, action }) => (
  <Box className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
    {title && (
      <Typography variant="subtitle1" fontWeight={700} color="text.secondary" gutterBottom>
        {title}
      </Typography>
    )}
    {description && (
      <Typography variant="body2" color="text.secondary" className="!mb-4 max-w-md">
        {description}
      </Typography>
    )}
    {action && <Box className="mt-2">{action}</Box>}
  </Box>
);

export default EmptyState;
