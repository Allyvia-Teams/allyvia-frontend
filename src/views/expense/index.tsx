import React from 'react';
import { Grid } from '@mui/material';
import BillsTable from './BillsTable';
import { gridSpacing } from 'store/constant';

const ExpensePage: React.FC = () => {
  return (
    <Grid container spacing={gridSpacing}>
      <Grid item xs={12}>
        <BillsTable />
      </Grid>
    </Grid>
  );
};

export default ExpensePage;
