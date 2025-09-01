import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CompanyWithRole, Company } from 'types/company';
import companyApi from 'api/company';
import roleApi from 'api/role';

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
    // Fetch both companies and roles in parallel
    const [companies, roles] = await Promise.all([companyApi.getCompanies(), roleApi.getRoles()]);

    // Create a map of company_id to role_type for quick lookup
    const roleMap = new Map(roles.map((role) => [role.company_id, role.role_type]));

    // Merge role data with companies
    const companiesWithRoles: CompanyWithRole[] = companies.map((company: Company) => {
      const roleType = roleMap.get(company.id) || 'member';
      // Simplify roles: admin/manager -> 'admin', member/viewer -> 'member'
      const userRole = roleType === 'admin' || roleType === 'manager' ? 'admin' : 'member';

      return {
        ...company,
        user_role: userRole
      } as CompanyWithRole;
    });

    return companiesWithRoles;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch companies');
  }
});

export const createCompany = createAsyncThunk('company/create', async (name: string, { rejectWithValue }) => {
  try {
    const company = await companyApi.createCompany({ name });
    // When creating a company, user always becomes admin
    const companyWithRole: CompanyWithRole = {
      ...company,
      user_role: 'admin' // Creator is always admin
    };
    return companyWithRole;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create company');
  }
});

export const updateCompany = createAsyncThunk(
  'company/update',
  async ({ id, name }: { id: string; name: string }, { rejectWithValue, getState }) => {
    const state = getState() as { company: CompanyState };
    const existingCompany = state.company.companies.find((c) => c.id === id);

    if (!existingCompany) {
      return rejectWithValue('Company not found');
    }

    try {
      const updated = await companyApi.updateCompany(id, { name });
      // Preserve the existing role since update doesn't change it
      return {
        ...updated,
        user_role: existingCompany.user_role
      } as CompanyWithRole;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update company');
    }
  }
);

export const deleteCompany = createAsyncThunk('company/delete', async (id: string, { rejectWithValue }) => {
  try {
    await companyApi.deleteCompany(id);
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
        if (index !== -1) {
          state.companies[index] = action.payload;
        }
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
