import React from 'react';

/**
 * Горизонтальная группа кнопок с единым gap (12px).
 */
const ButtonGroup = ({ children, className = '', vertical = false }) => (
  <div
    className={
      vertical
        ? `flex flex-col gap-3 ${className}`
        : `flex flex-wrap items-center gap-3 ${className}`
    }
  >
    {children}
  </div>
);

export default ButtonGroup;
