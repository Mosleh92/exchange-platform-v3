import React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

export default function Breadcrumb({ items }) {
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {items.map((item, idx) =>
        idx < items.length - 1 ? (
          <Link key={item.href || idx} color="inherit" href={item.href} underline="hover">
            {item.label}
          </Link>
        ) : (
          <Typography key={item.href || idx} color="text.primary">
            {item.label}
          </Typography>
        )
      )}
    </Breadcrumbs>
  );
} 