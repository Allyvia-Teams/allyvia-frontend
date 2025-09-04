import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CompanyWithRole, Company } from 'types/company';
import companyApi from 'api/company';
import roleApi from 'api/role';
import { refreshRoles } from 'store/slices/auth';

interface CompanyState {
  companies: CompanyWithRole[];
  selectedCompany: CompanyWithRole | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
}

const initialState: CompanyState = {
  companies: [],
  selectedCompany: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null
};

export const fetchCompanies = createAsyncThunk('company/fetchCompanies', async (_, { rejectWithValue }) => {
  try {
    // Fetch companies and roles in parallel
    const [allCompanies, roles] = await Promise.all([companyApi.getCompanies(), roleApi.getRoles()]);

    // Build sets/maps for quick lookup
    const userCompanyIds = new Set(roles.map((r) => r.company_id));
    const roleMap = new Map(roles.map((r) => [r.company_id, r.role_type]));

    // Filter to companies where user has any role, then attach simplified role
    const companiesWithRoles: CompanyWithRole[] = allCompanies
      .filter((company: Company) => userCompanyIds.has(company.id))
      .map((company: Company) => {
        const roleType = roleMap.get(company.id) || 'member';
        const userRole = roleType === 'admin' || roleType === 'manager' ? 'admin' : 'member';
        return { ...company, user_role: userRole } as CompanyWithRole;
      });

    return companiesWithRoles;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch companies');
  }
});

export const createCompany = createAsyncThunk('company/create', async (name: string, { rejectWithValue, dispatch }) => {
  try {
    const company = await companyApi.createCompany({ name });
    const companyWithRole: CompanyWithRole = { ...company, user_role: 'admin' };
    // Refresh roles so the new admin role is reflected
    dispatch(refreshRoles());

    return companyWithRole;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create company');
  }
});

export const updateCompany = createAsyncThunk(
  'company/update',
  async ({ id, name }: { id: string; name: string }, { rejectWithValue, getState, dispatch }) => {
    const state = getState() as { company: CompanyState };
    const existingCompany = state.company.companies.find((c) => c.id === id);
    if (!existingCompany) return rejectWithValue('Company not found');

    try {
      const updated = await companyApi.updateCompany(id, { name });
      const result = { ...updated, user_role: existingCompany.user_role } as CompanyWithRole;
      // Refresh roles so any derived role state stays in sync
      dispatch(refreshRoles());
      return result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update company');
    }
  }
);

export const deleteCompany = createAsyncThunk('company/delete', async (id: string, { rejectWithValue, dispatch }) => {
  try {
    await companyApi.deleteCompany(id);
    // Refresh roles to drop associated roles
    dispatch(refreshRoles());

    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete company');
  }
});

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setSelectedCompany: (state, action: PayloadAction<CompanyWithRole | null>) => {
      state.selectedCompany = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.companies = action.payload;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createCompany.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.isCreating = false;
        state.companies.push(action.payload);
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      .addCase(updateCompany.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.companies.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.companies[index] = action.payload;
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCompany.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.companies = state.companies.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload as string;
      });
  }
});

export const { setSelectedCompany, clearError } = companySlice.actions;
export default companySlice.reducer;
