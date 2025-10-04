import React from 'react';
import { Grid } from '@mui/material';
import { QBEntityTable } from 'components/QBEntityTable';
import { gridSpacing } from 'store/constant';

const ExpensePage: React.FC = () => {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12 }}>
        <QBEntityTable entityType="bill" />
      </Grid>
    </Grid>
  );
};

export default ExpensePage;
