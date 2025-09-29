import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { keyframes } from '@mui/system';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Skeleton,
  Pagination,
  SelectChangeEvent,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip
} from '@mui/material';
import { IconRefresh, IconX, IconCheck } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import {
  fetchSquareConnectionStatus,
  disconnectSquare,
  fetchSquareCatalog,
  fetchSquareAllData,
  fetchSquareLocations,
  fetchSquareMappings,
  saveSquareMappings,
  fetchSquareWebhookEvents,
  clearSquareError
} from 'store/slices/integrations';
import { useSelector } from 'store';
import { getSquareAuthUrl } from 'api/square';
import { getCompanyId } from 'utils/authStorage';
import SquareIcon from '@mui/icons-material/Square';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import InventoryIcon from '@mui/icons-material/Inventory';
import BuildIcon from '@mui/icons-material/Build';
import CategoryIcon from '@mui/icons-material/Category';
import PaymentIcon from '@mui/icons-material/Payment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SquareAccountMapper from 'ui-component/integrations/SquareAccountMapper';
import SquareSyncHistory from 'ui-component/integrations/SquareSyncHistory';
import CompanySelector from 'ui-component/integrations/CompanySelector';

// Define keyframes for animations
const pulse = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`square-tabpanel-${index}`} aria-labelledby={`square-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `square-tab-${index}`,
    'aria-controls': `square-tabpanel-${index}`
  };
}

const SquareIntegration: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [webhookStatusFilter, setWebhookStatusFilter] = useState<string>('');
  const [webhookPage, setWebhookPage] = useState<number>(1);

  // New state for enhanced UI features
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('items');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('items');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [customersData, setCustomersData] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Autocomplete state
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Item detail modal state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const {
    connectionStatus,
    catalog,
    invoices,
    payments,
    orders,
    customers,
    locations,
    mappings,
    webhookEvents,
    webhookEventsMeta,
    loading,
    error
  } = useSelector((state: any) => state.integrations.square);

  const { currentRole } = useSelector((state: any) => state.auth);
  const currentCompanyId = companyId || selectedCompanyId || getCompanyId() || currentRole?.company_id;

  useEffect(() => {
    if (currentCompanyId) {
      dispatch(fetchSquareConnectionStatus(currentCompanyId) as any);
      // Only fetch data if not already loaded to improve initial load time
      if (!catalog || catalog.length === 0) {
        dispatch(fetchSquareAllData(currentCompanyId) as any);
      }
    }
  }, [dispatch, currentCompanyId]);

  // Separate useEffect for webhook events to avoid unnecessary re-fetches
  useEffect(() => {
    if (currentCompanyId) {
      dispatch(
        fetchSquareWebhookEvents({
          companyId: currentCompanyId,
          status: webhookStatusFilter || undefined,
          limit: 20,
          offset: (webhookPage - 1) * 20
        }) as any
      );
    }
  }, [dispatch, currentCompanyId, webhookStatusFilter, webhookPage]);

  // Auto-refresh Square data every 10 minutes to get new items (further reduced frequency for better performance)
  useEffect(() => {
    if (currentCompanyId) {
      const interval = setInterval(() => {
        console.log('Auto-refreshing Square data...');
        // Only refresh if user is actively viewing the integration
        if (document.visibilityState === 'visible') {
          dispatch(fetchSquareAllData(currentCompanyId) as any);
        }
      }, 600000); // Refresh every 10 minutes instead of 5 minutes

      return () => clearInterval(interval);
    }
  }, [dispatch, currentCompanyId]);

  // Update search suggestions when catalog data changes (debounced for performance)
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        const suggestions = generateSearchSuggestions(searchTerm);
        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }, 300); // Debounce search suggestions by 300ms

      return () => clearTimeout(timeoutId);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [catalog, searchTerm]);

  const handleCompanySelected = (companyId: string) => {
    setSelectedCompanyId(companyId);
    // Reset tab to connection tab when company changes
    setTabValue(0);
  };

  useEffect(() => {
    if (error) {
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => {
        dispatch(clearSquareError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Nested subcategories structure
  const subCategoryOptions = [
    {
      key: 'items',
      label: 'Items & Services',
      children: [
        {
          key: 'items',
          label: 'Items',
          children: [
            { key: 'items', label: 'Items' },
            { key: 'categories', label: 'Categories' },
            { key: 'modifiers', label: 'Modifiers' },
            { key: 'discounts', label: 'Discounts' },
            { key: 'taxes', label: 'Taxes' }
          ]
        },
        {
          key: 'gift-cards',
          label: 'Gift Cards',
          children: [
            {
              key: 'egift-cards',
              label: 'eGift Cards',
              children: [{ key: 'configure', label: 'Configure' }]
            }
          ]
        }
      ]
    },
    {
      key: 'payments',
      label: 'Payments & Invoices',
      children: [
        { key: 'transactions', label: 'Transactions' },
        {
          key: 'orders',
          label: 'Orders',
          children: [
            { key: 'orders-overview', label: 'Overview' },
            { key: 'all-orders', label: 'All orders' },
            { key: 'shipments', label: 'Shipments' }
          ]
        },
        {
          key: 'invoices',
          label: 'Invoices',
          children: [
            { key: 'invoices-overview', label: 'Overview' },
            { key: 'invoices-list', label: 'Invoices' },
            { key: 'recurring-series', label: 'Recurring series' },
            { key: 'estimates', label: 'Estimates' }
          ]
        },
        {
          key: 'settings',
          label: 'Settings',
          children: [
            { key: 'payment-settings', label: 'Payment settings' },
            { key: 'invoice-settings', label: 'Invoice settings' }
          ]
        },
        { key: 'subscriptions', label: 'Subscriptions' }
      ]
    },
    {
      key: 'customers',
      label: 'Customers',
      children: [
        {
          key: 'customer-directory',
          label: 'Customer Directory',
          children: [
            { key: 'directory', label: 'Directory' },
            { key: 'insights', label: 'Insights' },
            { key: 'settings', label: 'Settings' }
          ]
        },
        {
          key: 'loyalty',
          label: 'Loyalty',
          children: [
            { key: 'loyalty-overview', label: 'Overview' },
            {
              key: 'activity',
              label: 'Activity',
              children: [
                { key: 'all-activity', label: 'All activity' },
                { key: 'promotions', label: 'Promotions' },
                { key: 'activity-settings', label: 'Settings' }
              ]
            }
          ]
        }
      ]
    },
    {
      key: 'reports',
      label: 'Reports',
      children: [
        { key: 'sales', label: 'Sales' },
        { key: 'accounting', label: 'Accounting' },
        { key: 'payments', label: 'Payments' },
        { key: 'operations', label: 'Operations' },
        { key: 'settings', label: 'Settings' }
      ]
    },
    {
      key: 'staff',
      label: 'Staff',
      children: [
        { key: 'team', label: 'Team' },
        { key: 'scheduling', label: 'Scheduling' },
        { key: 'time-tracking', label: 'Time tracking' },
        { key: 'settings', label: 'Settings' }
      ]
    }
  ];

  // Handler functions for nested menu
  const handleSectionChange = (sectionKey: string) => {
    setSelectedSection(sectionKey);
    // Reset subcategory to first available option
    const section = subCategoryOptions.find((s) => s.key === sectionKey);
    if (section && section.children) {
      const firstChild = section.children[0];
      if (firstChild.children) {
        setSelectedSubCategory(firstChild.children[0].key);
      } else {
        setSelectedSubCategory(firstChild.key);
      }
    }
  };

  const handleSubCategoryChange = (subCategoryKey: string) => {
    setSelectedSubCategory(subCategoryKey);
  };

  const handleToggleExpand = (itemKey: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
    }
    setExpandedItems(newExpanded);
  };

  const renderNestedMenu = (items: any[], level: number = 0) => {
    return items.map((item) => (
      <Box key={item.key}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px',
            paddingLeft: `${16 + level * 20}px`,
            cursor: 'pointer',
            backgroundColor: selectedSubCategory === item.key ? '#e3f2fd' : 'transparent',
            borderLeft: selectedSubCategory === item.key ? '3px solid #1976d2' : '3px solid transparent',
            '&:hover': {
              backgroundColor: '#f5f5f5'
            },
            borderRadius: '4px',
            margin: '2px 0'
          }}
          onClick={() => {
            if (item.children) {
              handleToggleExpand(item.key);
            } else {
              handleSubCategoryChange(item.key);
            }
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: selectedSubCategory === item.key ? 600 : 400,
              color: selectedSubCategory === item.key ? '#1976d2' : 'inherit',
              flex: 1
            }}
          >
            {item.label}
          </Typography>
          {item.children && (
            <Box
              sx={{
                transform: expandedItems.has(item.key) ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              ▼
            </Box>
          )}
        </Box>
        {item.children && expandedItems.has(item.key) && <Box>{renderNestedMenu(item.children, level + 1)}</Box>}
      </Box>
    ));
  };

  // Data filtering function
  const getFilteredData = () => {
    let data: any[] = [];

    switch (selectedSection) {
      case 'items':
        switch (selectedSubCategory) {
          case 'items':
            data = catalog?.filter((item: any) => item.type === 'ITEM') || [];
            break;
          case 'categories':
            data = catalog?.filter((item: any) => item.type === 'CATEGORY') || [];
            break;
          case 'modifiers':
            data = catalog?.filter((item: any) => item.type === 'MODIFIER') || [];
            break;
          case 'discounts':
            data = catalog?.filter((item: any) => item.type === 'DISCOUNT') || [];
            break;
          case 'taxes':
            data = catalog?.filter((item: any) => item.type === 'TAX') || [];
            break;
          case 'gift-cards':
          case 'egift-cards':
          case 'configure':
            data = catalog?.filter((item: any) => item.type === 'ITEM' && item.name.toLowerCase().includes('gift')) || [];
            break;
          default:
            data = catalog || [];
        }
        break;
      case 'payments':
        switch (selectedSubCategory) {
          case 'transactions':
            data = payments || [];
            break;
          case 'orders':
          case 'orders-overview':
          case 'all-orders':
          case 'shipments':
            data = orders || [];
            break;
          case 'invoices':
          case 'invoices-overview':
          case 'invoices-list':
          case 'recurring-series':
          case 'estimates':
            data = invoices || [];
            break;
          case 'settings':
          case 'payment-settings':
          case 'invoice-settings':
            data =
              webhookEvents?.filter((event: any) => event.event_type?.includes('settings') || event.event_type?.includes('config')) || [];
            break;
          case 'subscriptions':
            data =
              webhookEvents?.filter(
                (event: any) => event.event_type === 'subscription.created' || event.event_type === 'subscription.updated'
              ) || [];
            break;
          default:
            data = payments || [];
        }
        break;
      case 'customers':
        switch (selectedSubCategory) {
          case 'customer-directory':
          case 'directory':
          case 'insights':
          case 'settings':
            data = customers || [];
            break;
          case 'loyalty':
          case 'loyalty-overview':
          case 'activity':
          case 'all-activity':
          case 'promotions':
          case 'activity-settings':
            data =
              webhookEvents?.filter((event: any) => event.event_type === 'loyalty.created' || event.event_type === 'loyalty.updated') || [];
            break;
          default:
            data = customers || [];
        }
        break;
      case 'reports':
        switch (selectedSubCategory) {
          case 'sales':
          case 'accounting':
          case 'payments':
          case 'operations':
          case 'settings':
            data =
              webhookEvents?.filter(
                (event: any) => event.event_type?.includes(selectedSubCategory) || event.event_type?.includes('report')
              ) || [];
            break;
          default:
            data = webhookEvents || [];
        }
        break;
      case 'staff':
        switch (selectedSubCategory) {
          case 'team':
          case 'scheduling':
          case 'time-tracking':
          case 'settings':
            data =
              webhookEvents?.filter(
                (event: any) => event.event_type?.includes(selectedSubCategory) || event.event_type?.includes('staff')
              ) || [];
            break;
          default:
            data = webhookEvents || [];
        }
        break;
      default:
        data = catalog || [];
    }

    // Apply search filter
    if (searchTerm) {
      data = data.filter(
        (item: any) =>
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      data = data.filter((item: any) => item.type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'Active') {
        data = data.filter((item: any) => (item.is_deleted !== undefined ? !item.is_deleted : item.active === true));
      } else if (statusFilter === 'Inactive') {
        data = data.filter((item: any) => (item.is_deleted !== undefined ? item.is_deleted : item.active === false));
      }
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      data = data.filter((item: any) => {
        const itemCategory = item.type === 'CATEGORY' ? item.name : item.category_name;
        return itemCategory === categoryFilter;
      });
    }

    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      data = data.filter((item: any) => {
        const itemDate = new Date(item.created_at || item.updated_at);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    return data;
  };

  // Get paginated data
  const getPaginatedData = () => {
    const filteredData = getFilteredData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  };

  // Get total pages
  const getTotalPages = () => {
    const filteredData = getFilteredData();
    return Math.ceil(filteredData.length / itemsPerPage);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // Only load data if it's not already loaded to avoid unnecessary API calls
    if (currentCompanyId) {
      switch (newValue) {
        case 1: // Items Details tab
          // Only fetch if catalog is empty or stale
          if (!catalog || catalog.length === 0) {
            dispatch(fetchSquareAllData(currentCompanyId) as any);
          }
          break;
        case 2: // Mappings tab
          // Only fetch if mappings are empty
          if (!mappings || mappings.length === 0) {
            dispatch(fetchSquareMappings(currentCompanyId) as any);
          }
          // Only fetch catalog if empty
          if (!catalog || catalog.length === 0) {
            dispatch(fetchSquareAllData(currentCompanyId) as any);
          }
          break;
        case 3: // Sync History tab
          // Only fetch if webhook events are empty
          if (!webhookEvents || webhookEvents.length === 0) {
            handleWebhookRefresh();
          }
          break;
        default:
          break;
      }
    }
  };

  const handleConnect = async () => {
    if (!currentCompanyId) {
      console.error('Missing company_id');
      return;
    }

    setIsConnecting(true);
    try {
      const { auth_url } = await getSquareAuthUrl(currentCompanyId);
      window.location.href = auth_url;
    } catch (err: any) {
      console.error('Error fetching Square URL', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to get Square authorization URL';
      dispatch(clearSquareError()); // Clear any existing error first
      // You could dispatch an error action here if you have one
      alert(`Connection Error: ${errorMessage}`);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentCompanyId) return;

    if (window.confirm('Are you sure you want to disconnect Square? This will remove all mappings and sync data.')) {
      try {
        await dispatch(disconnectSquare(currentCompanyId) as any);
        // Success message could be shown here
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to disconnect Square';
        alert(`Disconnect Error: ${errorMessage}`);
      }
    }
  };

  const handleSaveMappings = async (newMappings: any[]) => {
    if (!currentCompanyId) return;

    try {
      await dispatch(
        saveSquareMappings({
          companyId: currentCompanyId,
          mappings: newMappings
        }) as any
      );
      // Refresh mappings after successful save
      await dispatch(fetchSquareMappings(currentCompanyId) as any);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to save mappings';
      alert(`Save Error: ${errorMessage}`);
    }
  };

  const handleWebhookStatusFilterChange = (status: string) => {
    setWebhookStatusFilter(status);
    setWebhookPage(1); // Reset to first page when filter changes
  };

  const handleWebhookPageChange = (page: number) => {
    setWebhookPage(page);
  };

  const handleWebhookRefresh = () => {
    if (currentCompanyId) {
      dispatch(
        fetchSquareWebhookEvents({
          companyId: currentCompanyId,
          status: webhookStatusFilter || undefined,
          limit: 20,
          offset: (webhookPage - 1) * 20
        }) as any
      );
    }
  };

  const handleRefresh = () => {
    if (currentCompanyId) {
      console.log('Manual refresh triggered');
      // Force refresh all data when user manually clicks refresh
      dispatch(fetchSquareAllData(currentCompanyId) as any);
      // Also refresh mappings if we're on the mappings tab
      if (tabValue === 2) {
        dispatch(fetchSquareMappings(currentCompanyId) as any);
      }
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching

    // Generate suggestions based on catalog data
    if (value.length > 0) {
      const suggestions = generateSearchSuggestions(value);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Generate search suggestions based on catalog data (optimized for performance)
  const generateSearchSuggestions = (query: string): string[] => {
    if (!catalog || catalog.length === 0 || query.length < 2) return [];

    const suggestions = new Set<string>();
    const lowerQuery = query.toLowerCase();

    // Limit search to first 100 items for better performance
    const limitedCatalog = catalog.slice(0, 100);

    limitedCatalog.forEach((item: any) => {
      // Add item names that match the query
      if (item.name && item.name.toLowerCase().includes(lowerQuery)) {
        suggestions.add(item.name);
      }

      // Add SKUs that match the query
      if (item.sku && item.sku.toLowerCase().includes(lowerQuery)) {
        suggestions.add(item.sku);
      }

      // Skip description processing for better performance
    });

    // Convert Set to Array and limit to 5 suggestions for faster rendering
    return Array.from(suggestions).slice(0, 5);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (event: SelectChangeEvent) => {
    setTypeFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleCategoryFilterChange = (event: SelectChangeEvent) => {
    setCategoryFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Helper function to get unique types from catalog data
  const getUniqueTypes = (): string[] => {
    if (!catalog || catalog.length === 0) return [];
    const types = new Set<string>();
    catalog.forEach((item: any) => {
      if (item.type) {
        types.add(item.type);
      }
    });
    return Array.from(types).sort();
  };

  // Helper function to get unique categories from catalog data
  const getUniqueCategories = (): string[] => {
    if (!catalog || catalog.length === 0) return [];
    const categories = new Set<string>();

    catalog.forEach((item: any) => {
      if (item.type === 'CATEGORY' && item.name) {
        categories.add(item.name);
      } else if (item.category_name) {
        categories.add(item.category_name);
      }
    });

    return Array.from(categories).sort();
  };

  // Helper function to get unique statuses from catalog data
  const getUniqueStatuses = (): string[] => {
    if (!catalog || catalog.length === 0) return [];
    const statuses = new Set<string>();

    catalog.forEach((item: any) => {
      if (item.is_deleted !== undefined) {
        statuses.add(item.is_deleted ? 'Inactive' : 'Active');
      } else if (item.active !== undefined) {
        statuses.add(item.active ? 'Active' : 'Inactive');
      }
    });

    return Array.from(statuses).sort();
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (event: SelectChangeEvent) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Item detail modal handlers
  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const getConnectionStatusChip = () => {
    if (!connectionStatus) return <Chip label="Unknown" color="default" />;

    if (connectionStatus.is_connected && connectionStatus.access_token_valid) {
      return <Chip label="Connected" color="success" />;
    } else if (connectionStatus.is_connected && !connectionStatus.access_token_valid) {
      return <Chip label="Token Expired" color="warning" />;
    } else {
      return <Chip label="Disconnected" color="error" />;
    }
  };

  if (!currentCompanyId) {
    return (
      <MainCard title="Square Integration">
        <CompanySelector />
      </MainCard>
    );
  }

  return (
    <MainCard
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #00C851, #00A041)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 200, 81, 0.3)'
            }}
          >
            <SquareIcon sx={{ fontSize: 24, color: 'white' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Square Integration
          </Typography>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Connection Status - Simple like QuickBooks */}
        <Box>
          <Card
            sx={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      background: connectionStatus?.is_connected ? '#00C851' : '#ff6b6b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <SquareIcon sx={{ fontSize: 24, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        mb: 0.5
                      }}
                    >
                      Test Company
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary'
                      }}
                    >
                      Square
                    </Typography>
                    {connectionStatus?.is_connected && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.8rem'
                        }}
                      >
                        Connected:{' '}
                        {connectionStatus.connected_at
                          ? new Date(connectionStatus.connected_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Unknown'}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  {connectionStatus?.is_connected ? (
                    <>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={loading.allData}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          px: 2,
                          py: 1
                        }}
                      >
                        {loading.allData ? <CircularProgress size={16} /> : 'Sync Now'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleDisconnect}
                        disabled={loading.disconnect}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          px: 2,
                          py: 1
                        }}
                      >
                        {loading.disconnect ? <CircularProgress size={16} /> : 'Disconnect'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleConnect}
                      disabled={isConnecting}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 2,
                        py: 1
                      }}
                    >
                      {isConnecting ? <CircularProgress size={16} /> : 'Connect'}
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Error Alert */}
        {error && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="error" onClose={() => dispatch(clearSquareError())}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Tabs - Always visible for full functionality */}
        <Box>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e9ecef',
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                borderBottom: '1px solid #e9ecef',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                px: 2
              }}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="Square integration tabs"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    minHeight: 56,
                    px: 3,
                    py: 2,
                    color: 'text.secondary',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      color: 'primary.main',
                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                    },
                    '&.Mui-selected': {
                      color: 'primary.main',
                      fontWeight: 700
                    }
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '2px 2px 0 0',
                    background: 'linear-gradient(90deg, #1976d2, #1565c0)',
                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
                  }
                }}
              >
                <Tab label="Connection" {...a11yProps(0)} />
                <Tab label="Items Details" {...a11yProps(1)} />
                <Tab label="Mappings" {...a11yProps(2)} />
                <Tab label="Sync History" {...a11yProps(3)} />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Box sx={{ mb: 4 }}>
                  <SquareIcon sx={{ fontSize: 80, color: '#00C851', mb: 2 }} />
                  <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Square Integration Active
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    Your Square account is successfully connected and ready to sync data. Use the tabs above to manage your integration
                    settings and view synchronized data.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={loading.allData}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: 2,
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}
                  >
                    {loading.allData ? <CircularProgress size={20} /> : 'Refresh Data'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<RefreshIcon />}
                    onClick={() => dispatch(fetchSquareLocations(currentCompanyId) as any)}
                    disabled={loading.locations}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}
                  >
                    {loading.locations ? <CircularProgress size={20} /> : 'Refresh Locations'}
                  </Button>
                </Box>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Items Details Section */}
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                    Catalog Management
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                    View and manage your Square catalog items, track inventory levels, and monitor product performance.
                  </Typography>
                </Box>

                {/* Summary Statistics */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                  {loading.allData ? (
                    // Loading skeleton for summary cards
                    Array.from({ length: 4 }).map((_, index) => (
                      <Box key={index} sx={{ flex: '1 1 25%', minWidth: '250px' }}>
                        <Card
                          sx={{
                            borderRadius: 3,
                            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                            border: '1px solid #e9ecef'
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                              <Skeleton variant="circular" width={48} height={48} />
                              <Skeleton variant="circular" width={20} height={20} />
                            </Box>
                            <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 0.5 }} />
                            <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '60%' }} />
                          </CardContent>
                        </Card>
                      </Box>
                    ))
                  ) : (
                    <>
                      <Box sx={{ flex: '1 1 25%', minWidth: '150px' }}>
                        <Card
                          sx={{
                            borderRadius: 1,
                            backgroundColor: 'white',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <InventoryIcon sx={{ fontSize: 16, color: '#666', mr: 1 }} />
                              <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
                                {catalog?.filter((item: any) => item.type === 'ITEM').length || 0}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              Total Items
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      <Box sx={{ flex: '1 1 25%', minWidth: '150px' }}>
                        <Card
                          sx={{
                            borderRadius: 1,
                            backgroundColor: 'white',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <BuildIcon sx={{ fontSize: 16, color: '#666', mr: 1 }} />
                              <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
                                {catalog?.filter((item: any) => item.type === 'SERVICE').length || 0}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              Services
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      <Box sx={{ flex: '1 1 25%', minWidth: '150px' }}>
                        <Card
                          sx={{
                            borderRadius: 1,
                            backgroundColor: 'white',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <CategoryIcon sx={{ fontSize: 16, color: '#666', mr: 1 }} />
                              <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
                                {catalog?.filter((item: any) => item.type === 'CATEGORY').length || 0}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              Categories
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                      <Box sx={{ flex: '1 1 25%', minWidth: '150px' }}>
                        <Card
                          sx={{
                            borderRadius: 1,
                            backgroundColor: 'white',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <PaymentIcon sx={{ fontSize: 16, color: '#666', mr: 1 }} />
                              <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
                                {payments?.length || 0}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              Payments
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                    </>
                  )}
                </Box>

                {/* Nested Menu Structure */}
                <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                  {/* SECTION Column */}
                  <Card sx={{ width: 300, borderRadius: 3, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: 0 }}>
                      <Box
                        sx={{ p: 2, borderBottom: '1px solid #e9ecef', background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          SECTION
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2 }}>
                        {subCategoryOptions.map((section) => (
                          <Box
                            key={section.key}
                            sx={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              backgroundColor: selectedSection === section.key ? '#e3f2fd' : 'transparent',
                              borderLeft: selectedSection === section.key ? '3px solid #1976d2' : '3px solid transparent',
                              borderRadius: '4px',
                              margin: '4px 0',
                              '&:hover': {
                                backgroundColor: '#f5f5f5'
                              }
                            }}
                            onClick={() => handleSectionChange(section.key)}
                          >
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: selectedSection === section.key ? 600 : 400,
                                color: selectedSection === section.key ? '#1976d2' : 'inherit'
                              }}
                            >
                              {section.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* SUBCATEGORY Column */}
                  <Card sx={{ width: 300, borderRadius: 3, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: 0 }}>
                      <Box
                        sx={{ p: 2, borderBottom: '1px solid #e9ecef', background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          SUBCATEGORY
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2 }}>
                        {(() => {
                          const currentSection = subCategoryOptions.find((s) => s.key === selectedSection);
                          if (currentSection && currentSection.children) {
                            return renderNestedMenu(currentSection.children);
                          }
                          return (
                            <Typography variant="body2" color="text.secondary">
                              Select a section to view subcategories
                            </Typography>
                          );
                        })()}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {/* Filters Section */}
                <Card
                  sx={{
                    mb: 4,
                    borderRadius: 3,
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e9ecef',
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Filters & Search
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                      <Box sx={{ flex: '1 1 25%', minWidth: '250px' }}>
                        <Autocomplete
                          freeSolo
                          options={searchSuggestions}
                          value={searchTerm}
                          onInputChange={(event, newValue) => {
                            if (event && event.type === 'change') {
                              handleSearchChange(event as React.ChangeEvent<HTMLInputElement>);
                            }
                          }}
                          onChange={(event, newValue) => {
                            if (typeof newValue === 'string') {
                              setSearchTerm(newValue);
                              setCurrentPage(1);
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Search items..."
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  backgroundColor: 'white',
                                  '&:hover': {
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: 'primary.main',
                                      borderWidth: 2
                                    }
                                  },
                                  '&.Mui-focused': {
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: 'primary.main',
                                      borderWidth: 2
                                    }
                                  }
                                }
                              }}
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary' }} />
                                  </InputAdornment>
                                )
                              }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">{option}</Typography>
                              </Box>
                            </Box>
                          )}
                          noOptionsText="No matching items found"
                          clearOnEscape
                          selectOnFocus
                          handleHomeEndKeys
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Start Date"
                          value={dateRange.start}
                          onChange={(e: any) => handleDateRangeChange('start', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'white'
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
                        <TextField
                          fullWidth
                          type="date"
                          label="End Date"
                          value={dateRange.end}
                          onChange={(e) => handleDateRangeChange('end', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'white'
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
                        <FormControl fullWidth>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={typeFilter}
                            onChange={handleTypeFilterChange}
                            label="Type"
                            sx={{
                              borderRadius: 2,
                              backgroundColor: 'white',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderRadius: 2
                              }
                            }}
                          >
                            <MenuItem value="all">All Types</MenuItem>
                            {getUniqueTypes().map((type: string) => (
                              <MenuItem key={type} value={type}>
                                {type === 'ITEM'
                                  ? 'Inventory'
                                  : type === 'SERVICE'
                                    ? 'Service'
                                    : type === 'CATEGORY'
                                      ? 'Category'
                                      : type === 'MODIFIER'
                                        ? 'Modifier'
                                        : type === 'MODIFIER_LIST'
                                          ? 'Modifier List'
                                          : type === 'DISCOUNT'
                                            ? 'Discount'
                                            : type === 'TAX'
                                              ? 'Tax'
                                              : type === 'ITEM_VARIATION'
                                                ? 'Item Variation'
                                                : type}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
                        <FormControl fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                            label="Status"
                            sx={{
                              borderRadius: 2,
                              backgroundColor: 'white',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderRadius: 2
                              }
                            }}
                          >
                            <MenuItem value="all">All Status</MenuItem>
                            {getUniqueStatuses().map((status: string) => (
                              <MenuItem key={status} value={status}>
                                {status}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ flex: '1 1 20%', minWidth: '200px' }}>
                        <FormControl fullWidth>
                          <InputLabel>Category</InputLabel>
                          <Select
                            value={categoryFilter}
                            onChange={handleCategoryFilterChange}
                            label="Category"
                            sx={{
                              borderRadius: 2,
                              backgroundColor: 'white',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderRadius: 2
                              }
                            }}
                          >
                            <MenuItem value="all">All Categories</MenuItem>
                            {getUniqueCategories().map((category: string) => (
                              <MenuItem key={category} value={category}>
                                {category}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ flex: '1 1 10%', minWidth: '100px' }}>
                        <Button
                          variant="outlined"
                          onClick={handleClearFilters}
                          startIcon={<ClearIcon />}
                          fullWidth
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            borderWidth: 2,
                            '&:hover': {
                              borderWidth: 2,
                              backgroundColor: 'rgba(255, 107, 107, 0.04)',
                              borderColor: '#ff6b6b',
                              color: '#ff6b6b'
                            }
                          }}
                        >
                          Clear
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Data Table */}
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e9ecef',
                    overflow: 'hidden'
                  }}
                >
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ p: 3, borderBottom: '1px solid #e9ecef', background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0 }}>
                        Items Overview
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Manage and view your Square catalog items
                      </Typography>
                    </Box>
                    <TableContainer
                      component={Paper}
                      sx={{
                        boxShadow: 'none',
                        borderRadius: 0,
                        '& .MuiTable-root': {
                          '& .MuiTableHead-root': {
                            '& .MuiTableRow-root': {
                              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                              '& .MuiTableCell-head': {
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: 'text.primary',
                                borderBottom: '2px solid #e9ecef',
                                py: 2,
                                px: 3
                              }
                            }
                          },
                          '& .MuiTableBody-root': {
                            '& .MuiTableRow-root': {
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                transform: 'scale(1.01)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                              },
                              '& .MuiTableCell-root': {
                                borderBottom: '1px solid #f0f0f0',
                                py: 2,
                                px: 3,
                                fontSize: '0.875rem'
                              }
                            }
                          }
                        }
                      }}
                    >
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>SKU</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Qty on Hand</TableCell>
                            <TableCell>Unit Price</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {loading.allData ? (
                            // Loading skeleton for table rows
                            Array.from({ length: 5 }).map((_, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Skeleton variant="circular" width={8} height={8} />
                                    <Skeleton variant="text" sx={{ width: 120 }} />
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Skeleton variant="text" sx={{ width: 80 }} />
                                </TableCell>
                                <TableCell>
                                  <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                                </TableCell>
                                <TableCell>
                                  <Skeleton variant="text" sx={{ width: 40 }} />
                                </TableCell>
                                <TableCell>
                                  <Skeleton variant="text" sx={{ width: 60 }} />
                                </TableCell>
                                <TableCell>
                                  <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                                </TableCell>
                                <TableCell align="center">
                                  <Skeleton variant="circular" width={32} height={32} />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : getFilteredData().length > 0 ? (
                            getPaginatedData().map((item: any, index: number) => (
                              <TableRow
                                key={item.id || index}
                                sx={{
                                  '&:last-child td': { borderBottom: 0 },
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: '#f5f5f5'
                                  }
                                }}
                                onClick={() => handleItemClick(item)}
                              >
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: item.is_deleted ? '#ff6b6b' : '#00C851'
                                      }}
                                    />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {item.name || 'N/A'}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {item.sku || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={item.type || 'N/A'}
                                    color={item.type === 'ITEM' ? 'success' : item.type === 'SERVICE' ? 'primary' : 'default'}
                                    size="small"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      height: 24
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {item.quantity || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                    {item.price_money ? `$${(item.price_money.amount / 100).toFixed(2)}` : 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={item.is_deleted ? 'Inactive' : 'Active'}
                                    color={item.is_deleted ? 'error' : 'success'}
                                    size="small"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      height: 24
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Tooltip title="Refresh Item" arrow>
                                    <IconButton
                                      size="small"
                                      sx={{
                                        color: 'primary.main',
                                        '&:hover': {
                                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                          transform: 'scale(1.1)'
                                        }
                                      }}
                                    >
                                      <RefreshIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                    No items found
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Try adjusting your filters or sync your catalog to see items
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination Controls */}
                    {getFilteredData().length > 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 2,
                          borderTop: '1px solid #e0e0e0'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                            {Math.min(currentPage * itemsPerPage, getFilteredData().length)} of {getFilteredData().length} items
                          </Typography>
                          <FormControl size="small" sx={{ minWidth: 80 }}>
                            <Select value={itemsPerPage.toString()} onChange={handleItemsPerPageChange} displayEmpty>
                              <MenuItem value={5}>5</MenuItem>
                              <MenuItem value={10}>10</MenuItem>
                              <MenuItem value={25}>25</MenuItem>
                              <MenuItem value={50}>50</MenuItem>
                            </Select>
                          </FormControl>
                          <Typography variant="body2" color="text.secondary">
                            per page
                          </Typography>
                        </Box>
                        <Pagination
                          count={getTotalPages()}
                          page={currentPage}
                          onChange={handlePageChange}
                          color="primary"
                          showFirstButton
                          showLastButton
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <SquareAccountMapper
                catalog={catalog}
                locations={locations}
                mappings={mappings}
                loading={loading.mappings || loading.allData}
                onSave={handleSaveMappings}
                onRefresh={() => {
                  if (currentCompanyId) {
                    dispatch(fetchSquareAllData(currentCompanyId) as any);
                  }
                }}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <SquareSyncHistory
                events={webhookEvents}
                meta={webhookEventsMeta}
                loading={loading.webhookEvents}
                onRefresh={handleWebhookRefresh}
              />
            </TabPanel>
          </Card>
        </Box>
      </Box>

      {/* Item Detail Modal */}
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
              {selectedItem?.name || 'Item Details'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedItem?.name} • ID: {selectedItem?.id}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={selectedItem?.is_deleted ? 'Inactive' : 'Active'}
              color={selectedItem?.is_deleted ? 'error' : 'success'}
              size="small"
              icon={selectedItem?.is_deleted ? <IconX size={16} /> : <IconCheck size={16} />}
            />
            <IconButton onClick={handleCloseModal} size="small">
              <IconX size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {selectedItem && (
            <Box>
              {/* Basic Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
                  Basic Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Item Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.name || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      SKU
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.sku || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Type
                    </Typography>
                    <Chip
                      label={selectedItem.type || 'N/A'}
                      color={selectedItem.type === 'ITEM' ? 'success' : selectedItem.type === 'SERVICE' ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Status
                    </Typography>
                    <Chip
                      label={selectedItem.is_deleted ? 'Inactive' : 'Active'}
                      color={selectedItem.is_deleted ? 'error' : 'success'}
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Pricing & Inventory */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
                  Pricing & Inventory
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Unit Price
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.unit_price ? `$${selectedItem.unit_price}` : 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Quantity on Hand
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.quantity_on_hand || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.description || 'No description available'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Category
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.category_name || 'Uncategorized'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Additional Details */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
                  Additional Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Square ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {selectedItem.id || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Last Updated
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.updated_at ? new Date(selectedItem.updated_at).toLocaleString() : 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Created At
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Visibility
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedItem.is_deleted ? 'Hidden' : 'Visible'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={handleCloseModal} variant="outlined">
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<IconRefresh size={16} />}
            onClick={() => {
              if (currentCompanyId) {
                dispatch(fetchSquareAllData(currentCompanyId) as any);
              }
              handleCloseModal();
            }}
          >
            Refresh Data
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
};

export default SquareIntegration;
