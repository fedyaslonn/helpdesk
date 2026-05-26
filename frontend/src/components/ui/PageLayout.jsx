import React from 'react';

/**
 * Единая обёртка контента страницы (внутри AppShell).
 */
const PageLayout = ({ children, className = '', maxWidth = 'max-w-7xl' }) => (
  <div className={`hd-page w-full ${maxWidth} mx-auto px-4 py-6 md:px-6 md:py-8 ${className}`}>
    {children}
  </div>
);

export default PageLayout;
