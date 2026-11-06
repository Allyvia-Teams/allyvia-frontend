import React from 'react';
import { Typography } from '@mui/material';
import { AllyviaPaginatedTable, TableColumnConfig } from 'ui-component/common/AllyviaPaginatedTable';

type Props = {
  rows: any[];
  columns: TableColumnConfig[];
  onRowClick?: (params: any) => void;
  checkboxSelection?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  loading?: boolean;
  /** Shown above the table while `loading`, e.g. "Loading inventory… 2,300 of 6,482 items". */
  loadingLabel?: string;
};

export const InventoryTableSection: React.FC<Props> = ({
  rows,
  columns,
  onRowClick,
  checkboxSelection,
  onSelectionChange,
  loading = false,
  loadingLabel
}) => {
  // Backend-only filter fields
  const backendFilterFields = ['category', 'item_type'];
  return (
    <>
      {loading && loadingLabel && (
        <Typography variant="body2" color="text.secondary" role="status" sx={{ mb: 1 }}>
          {loadingLabel}
        </Typography>
      )}
      <AllyviaPaginatedTable
        rows={rows}
        columns={columns}
        showFilters={true}
        filterFields={backendFilterFields}
        title="Inventory Items"
        showPagination={true}
        height={500}
        showColumnSelector={true}
        onRowClick={onRowClick}
        checkboxSelection={checkboxSelection}
        onSelectionChange={onSelectionChange}
        loading={loading}
      />
    </>
  );
};

export default InventoryTableSection;
export { InventoryTableSection as InventoryTable };
