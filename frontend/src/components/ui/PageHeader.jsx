import React from 'react';
import { Typography, Box } from '@mui/material';

const PageHeader = ({ title, subtitle, actions, children }) => (
  <Box className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <Box className="min-w-0 flex-1">
      {title && (
        <Typography variant="h4" component="h1" className="!text-2xl md:!text-3xl">
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography variant="body1" color="text.secondary" className="!mt-1">
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
    {actions && (
      <Box className="flex shrink-0 flex-wrap items-center gap-3">{actions}</Box>
    )}
  </Box>
);

export default PageHeader;
