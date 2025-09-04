// Update your QuickBooks.tsx component:

// 1. Import the new thunk
import {
  fetchQBConnectionStatus,
  refreshQBToken,
  revokeQBConnection,
  initiateQBConnection,
  updateConnectionFromCompany,
  fetchChartOfAccounts,
  fetchAccountMappingsFromBackend, // NEW
  saveAccountMappingsToBackend,
  addSyncHistoryEntry
} from 'store/slices/integrations';

// 2. Update the useEffect to load mappings from backend
useEffect(() => {
  dispatch(fetchCompanies());
  // Don't use localStorage anymore
  // dispatch(loadAccountMapping()); // REMOVE THIS
}, [dispatch]);

useEffect(() => {
  if (firstCompany && companyId) {
    dispatch(fetchQBConnectionStatus(companyId));
    dispatch(updateConnectionFromCompany(firstCompany));

    // Load existing mappings from backend
    dispatch(fetchAccountMappingsFromBackend(companyId)); // NEW

    setCompanyId(companyId);
  }
}, [dispatch, firstCompany, companyId]);

// 3. Update the button display logic
// Instead of: {!quickbooks.mapping.lastFetched && (
// Use: {!quickbooks.mapping.hasSavedMappings && (
{
  !quickbooks.mapping.hasSavedMappings && (
    <AnimateButton>
      <Button
        variant="outlined"
        startIcon={<IconChartBar />}
        onClick={handleSyncAccounts}
        disabled={quickbooks.ui.isFetchingAccounts || quickbooks.ui.isRefreshing}
      >
        Fetch Accounts
      </Button>
    </AnimateButton>
  );
}

// 4. Update handleSyncAccounts to be smarter
const handleSyncAccounts = async () => {
  if (!companyId) return;

  // This will fetch from QuickBooks and update/create mappings
  await dispatch(fetchChartOfAccounts(companyId));

  // After fetching, also load the saved mappings
  await dispatch(fetchAccountMappingsFromBackend(companyId));

  dispatch(
    addSyncHistoryEntry({
      status: 'success',
      message: 'Chart of Accounts synced',
      recordsProcessed: quickbooks.mapping.accounts.length
    })
  );
};
