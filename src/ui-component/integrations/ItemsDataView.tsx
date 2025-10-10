import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'store';
import {
  Box,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { fetchItemsList } from 'store/slices/integrations';
import ItemDetailDrawer from './ItemDetailDrawer';
import {
  AllyviaFilterDatePicker,
  AllyviaFilterSearch,
  AllyviaFilterSelect,
  AllyviaFilterButton,
  AllyviaPagination,
  AllyviaSearchAutocomplete
} from 'ui-component/common';
import TableSkeleton from 'ui-component/common/TableSkeleton';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { useUrlFilters } from 'hooks/useUrlFilters';
import qbApi from 'api/qb';
import { QBItem, QBItemSuggestion } from 'types/qb';

interface ItemsDataViewProps {
  companyId: string;
}

export default function ItemsDataView({ companyId }: ItemsDataViewProps) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [items, setItems] = useState<QBItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<RangeValue | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statsData, setStatsData] = useState({
    total_items: 0,
    services_count: 0,
    inventory_count: 0,
    non_inventory_count: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const { filters, updateFilter, updateFilters, clearFilters } = useUrlFilters({
    search: '',
    type: 'all',
    status: 'active',
    page: 1,
    page_size: 10
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!companyId) return;

      setStatsLoading(true);
      try {
        const stats = await qbApi.getItemsStats(companyId);
        setStatsData(stats);
      } catch (error) {
        console.error('Error fetching items stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [companyId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!companyId) return;

      setLoading(true);
      try {
        const response = await qbApi.getItemsPaginated({
          company_id: companyId,
          search: debouncedSearch,
          type: filters.type === 'all' ? undefined : filters.type,
          status: filters.status as 'active' | 'inactive' | '',
          start_date: dateRange?.start ? new Date(dateRange.start.toString()).toISOString() : undefined,
          end_date: dateRange?.end ? new Date(dateRange.end.toString()).toISOString() : undefined,
          page: filters.page,
          page_size: filters.page_size
        });

        setItems(response.results);
        setTotalCount(response.count);
        setTotalPages(response.total_pages);
      } catch (error) {
        console.error('Error fetching items:', error);
        setItems([]);
        setTotalCount(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [companyId, debouncedSearch, filters.type, filters.status, filters.page, filters.page_size, dateRange]);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!companyId) return [];

      try {
        const response = await qbApi.getItemSuggestions({
          q: query,
          company_id: companyId
        });

        return response.suggestions.map((s) => ({
          value: s.name,
          label: s.name,
          type: 'exact' as const,
          count: s.count
        }));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
      }
    },
    [companyId]
  );

  const handleItemClick = (itemId: string) => {
    const index = items.findIndex((item) => item.qb_id === itemId);
    setSelectedItemId(itemId);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedItemId(null);
  };

  const handleItemNavigate = (itemId: string) => {
    const index = items.findIndex((item) => item.qb_id === itemId);
    setSelectedItemId(itemId);
    setSelectedIndex(index);
  };

  const handleClearFilters = () => {
    clearFilters();
    setDateRange(null);
  };

  const handleSearch = (searchTerm: string) => {
    updateFilter('search', searchTerm);
  };

  const handlePageChange = (page: number) => {
    updateFilter('page', page);
  };

  const handlePageSizeChange = (pageSize: number) => {
    updateFilters({ page_size: pageSize, page: 1 });
  };

  return (
    <Box>
      <Box sx={{ position: 'relative' }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 300 }}>
                {statsLoading ? '-' : statsData.total_items}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Items
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 300 }}>
                {statsLoading ? '-' : statsData.services_count}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Services
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 300 }}>
                {statsLoading ? '-' : statsData.inventory_count}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Inventory
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 300 }}>
                {statsLoading ? '-' : statsData.non_inventory_count}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Non-Inventory
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 3, alignItems: 'center' }}>
        <AllyviaSearchAutocomplete
          placeholder="Search items..."
          value={filters.search}
          onChange={(value: string) => updateFilter('search', value)}
          onSearch={handleSearch}
          fetchSuggestions={fetchSuggestions}
          height={40}
          width="400px"
        />
        <AllyviaFilterDatePicker value={dateRange} onChange={setDateRange} height={40} placeholder="mm/dd/yyyy - mm/dd/yyyy" />
        <AllyviaFilterSelect
          value={filters.type}
          onChange={(e: SelectChangeEvent) => updateFilter('type', e.target.value)}
          height={40}
          width={150}
          placeholder="All Types"
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'Service', label: 'Service' },
            { value: 'Inventory', label: 'Inventory' },
            { value: 'NonInventory', label: 'Non-Inventory' }
          ]}
        />
        <AllyviaFilterSelect
          value={filters.status}
          onChange={(e: SelectChangeEvent) => updateFilter('status', e.target.value)}
          height={40}
          width={150}
          placeholder="Active Only"
          options={[
            { value: 'active', label: 'Active Only' },
            { value: 'inactive', label: 'Inactive Only' },
            { value: 'all', label: 'All Status' }
          ]}
        />
        <AllyviaFilterButton label="Clear" onClick={handleClearFilters} height={40} variant="outlined" color="primary" />
      </Box>

      {loading && items.length === 0 ? (
        <TableSkeleton rows={filters.page_size} columns={5} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Qty on Hand</TableCell>
                <TableCell align="right">Unit Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body1" color="textSecondary" sx={{ py: 3 }}>
                      {totalCount === 0
                        ? 'No items data available. Click "Sync Items" to fetch from QuickBooks'
                        : 'No items match your filters'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: QBItem) => (
                  <TableRow key={item.qb_id} hover sx={{ cursor: 'pointer' }} onClick={() => handleItemClick(item.qb_id)}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.sku || '-'}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell align="right">{item.type === 'Inventory' ? item.qty_on_hand || 0 : '-'}</TableCell>
                    <TableCell align="right">{item.unit_price ? `$${parseFloat(item.unit_price).toFixed(2)}` : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AllyviaPagination
        currentPage={filters.page}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={filters.page_size}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[10, 20, 50, 100]}
      />

      {/* Item Detail Drawer */}
      <ItemDetailDrawer
        open={drawerOpen}
        itemId={selectedItemId}
        items={items}
        currentIndex={selectedIndex}
        companyId={companyId}
        onClose={handleDrawerClose}
        onNavigate={handleItemNavigate}
      />
    </Box>
  );
}
