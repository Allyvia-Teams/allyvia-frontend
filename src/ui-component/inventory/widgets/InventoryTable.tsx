import React from 'react';
import { AllyviaPaginatedTable, TableColumnConfig } from 'ui-component/common/AllyviaPaginatedTable';

type Props = {
  rows: any[];
  columns: TableColumnConfig[];
  onRowClick?: (params: any) => void;
  checkboxSelection?: boolean;
  onSelectionChange?: (ids: string[]) => void;
};

export const InventoryTableSection: React.FC<Props> = ({ rows, columns, onRowClick, checkboxSelection, onSelectionChange }) => {
  // Backend-only filter fields
  const backendFilterFields = ['category', 'item_type'];
  return (
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
    />
  );
};

export default InventoryTableSection;
export { InventoryTableSection as InventoryTable };
