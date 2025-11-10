import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosServices from 'utils/axios';
import { jwtDecode } from 'jwt-decode';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, clearAllAuthStorage, setRoleId, clearRoleId } from 'utils/authStorage';

// Prefer "member" (case-insensitive). Fallback to the first role.
const pickDefaultRole = (roles: any[]) => roles?.find((r) => String(r.role_type).toLowerCase() === 'member') || roles?.[0] || null;

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  email_verified?: boolean;
}

export interface Role {
  id: string;
  company_id: string;
  company_name: string;
  role_type: 'admin' | 'manager' | 'member' | 'viewer';
  role_display: string;
  permissions?: string[];
}

interface AuthState {
  isLoading: boolean;
  isLoggedIn: boolean;
  isInitialized: boolean;
  user: User | null;
  roles: Role[];
  currentRole: Role | null;
  error: string | null;
  mustChangePassword: boolean;
}

const initialState: AuthState = {
  isLoading: false,
  isLoggedIn: false,
  isInitialized: false,
  user: null,
  roles: [],
  currentRole: null,
  error: null,
  mustChangePassword: false
};

function verifyToken(token: string): boolean {
  try {
    const { exp } = jwtDecode<{ exp: number }>(token);
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

async function fetchUserData() {
  const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  if (isMockMode) {
    // Mock API uses /auth/me/
    const { data } = await axiosServices.get('/auth/me/');
    const { roles = [], ...user } = data;
    return { user, roles: Array.isArray(roles) ? roles : [] };
  } else {
    // Real backend uses separate endpoints
    const [userResponse, rolesResponse] = await Promise.all([axiosServices.get('/user/profile/'), axiosServices.get('/role/')]);

    return {
      user: userResponse.data,
      roles: Array.isArray(rolesResponse.data) ? rolesResponse.data : []
    };
  }
}

export const initializeAuth = createAsyncThunk('auth/initialize', async (_, { rejectWithValue }) => {
  try {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    // If no refresh token, user is not authenticated
    if (!refreshToken) {
      // Fallback to cookie-based refresh for SSO flows (HttpOnly refresh cookie)
      try {
        const { data: refreshData } = await axiosServices.post('/auth/refresh-cookie/', null);
        if (refreshData?.access) {
          setTokens(refreshData.access, '');
          axiosServices.defaults.headers.common.Authorization = `Bearer ${refreshData.access}`;

          const { user, roles } = await fetchUserData();
          return { isAuthenticated: true, user, roles };
        }
      } catch (_) {
        // ignore and treat as unauthenticated
      }
      return { isAuthenticated: false };
    }

    // If we have refresh but no access token, try to refresh
    if (!accessToken) {
      try {
        const { data: refreshData } = await axiosServices.post('/auth/refresh/', {
          refresh: refreshToken
        });

        setTokens(refreshData.access, refreshData.refresh);
        axiosServices.defaults.headers.common.Authorization = `Bearer ${refreshData.access}`;

        // Now fetch user data with new token
        const { user, roles } = await fetchUserData();

        return {
          isAuthenticated: true,
          user,
          roles
        };
      } catch (refreshError) {
        // Refresh failed, user needs to login again
        clearAllAuthStorage();
        delete axiosServices.defaults.headers.common.Authorization;
        return { isAuthenticated: false };
      }
    }

    // We have both tokens, check if access token is valid
    const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true';
    const isTokenValid = isMockMode ? true : verifyToken(accessToken);

    if (isTokenValid) {
      axiosServices.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      const { user, roles } = await fetchUserData();

      return {
        isAuthenticated: true,
        user,
        roles
      };
    }

    // Access token is expired, try to refresh
    const { data: refreshData } = await axiosServices.post('/auth/refresh/', {
      refresh: refreshToken
    });

    setTokens(refreshData.access, refreshData.refresh);
    axiosServices.defaults.headers.common.Authorization = `Bearer ${refreshData.access}`;

    const { user, roles } = await fetchUserData();

    return {
      isAuthenticated: true,
      user,
      roles
    };
  } catch (error) {
    clearAllAuthStorage();
    delete axiosServices.defaults.headers.common.Authorization;
    return rejectWithValue('Authentication failed');
  }
});

export const registerAsync = createAsyncThunk(
  'auth/register',
  async (
    {
      email,
      password,
      passwordConfirm,
      firstName,
      lastName,
      companyName,
      recaptchaToken
    }: {
      email: string;
      password: string;
      passwordConfirm: string;
      firstName: string;
      lastName: string;
      companyName: string;
      recaptchaToken?: string | null;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data: registerData } = await axiosServices.post('/auth/register/', {
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        recaptcha_token: recaptchaToken
      });

      if (registerData.requires_verification) {
        if (registerData.viewer_credentials) {
          sessionStorage.setItem('viewer_credentials', JSON.stringify(registerData.viewer_credentials));
        }

        if (registerData.company) {
          sessionStorage.setItem('company_info', JSON.stringify(registerData.company));
        }

        return {
          requiresVerification: true,
          email: registerData.email,
          message: registerData.message,
          viewer_credentials: registerData.viewer_credentials,
          company: registerData.company,
          existingUnverified: registerData.existing_unverified || false
        };
      }

      const { access, refresh, viewer_credentials, company } = registerData;

      if (access && refresh) {
        setTokens(access, refresh);
        axiosServices.defaults.headers.common.Authorization = `Bearer ${access}`;

        if (viewer_credentials) {
          sessionStorage.setItem('viewer_credentials', JSON.stringify(viewer_credentials));
        }

        const { user, roles } = await fetchUserData();
        return { user, roles, company, viewer_credentials, requiresVerification: false };
      }

      throw new Error('Invalid registration response from server');
    } catch (error: any) {
      let errorMessage = 'Registration failed';

      // The error might be the response data itself (from fetchUserData rejection)
      if (error.non_field_errors) {
        errorMessage = Array.isArray(error.non_field_errors) ? error.non_field_errors.join(', ') : error.non_field_errors;
      } else if (error.response?.data) {
        // Standard axios error with response
        const data = error.response.data;

        if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(', ') : data.non_field_errors;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else {
          // Handle field-specific errors (e.g., {email: ["error"], password: ["error"]})
          const fieldErrors = Object.entries(data)
            .filter(([key, value]) => Array.isArray(value))
            .map(([key, errors]) => `${key}: ${(errors as string[]).join(', ')}`)
            .join('; ');

          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
      } else if (error.message) {
        // Network error or other non-response error
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle field-specific errors if error is the data object itself
        const fieldErrors = Object.entries(error)
          .filter(([key, value]) => Array.isArray(value))
          .map(([key, errors]) => `${key}: ${(errors as string[]).join(', ')}`)
          .join('; ');

        if (fieldErrors) {
          errorMessage = fieldErrors;
        }
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const loginAsync = createAsyncThunk(
  'auth/login',
  async ({ email, password, recaptchaToken }: { email: string; password: string; recaptchaToken?: string | null }, { rejectWithValue }) => {
    try {
      const { data: loginData } = await axiosServices.post('/auth/login/', {
        email,
        password,
        recaptcha_token: recaptchaToken
      });

      const { access, refresh } = loginData;

      if (!access || !refresh) {
        throw new Error('Invalid response: missing tokens');
      }

      setTokens(access, refresh);
      axiosServices.defaults.headers.common.Authorization = `Bearer ${access}`;

      // Handle the actual response structure from your backend
      const user = {
        id: loginData.user_id,
        email: loginData.email,
        first_name: loginData.first_name || '',
        last_name: loginData.last_name || '',
        email_verified: loginData.email_verified || false
      };

      // Fetch roles
      const { data: rolesData } = await axiosServices.get('/role/');

      return {
        user,
        roles: Array.isArray(rolesData) ? rolesData : [],
        mustChangePassword: loginData.must_change_password || false
      };
    } catch (error: any) {
      let errorMessage = 'Invalid email or password';

      // The error might be the response data itself
      if (error.non_field_errors) {
        errorMessage = Array.isArray(error.non_field_errors) ? error.non_field_errors.join(', ') : error.non_field_errors;
      } else if (error.response?.data) {
        const data = error.response.data;

        // Handle different error formats from Django
        if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(', ') : data.non_field_errors;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const changePasswordAsync = createAsyncThunk(
  'auth/changePassword',
  async ({ password, passwordConfirm }: { password: string; passwordConfirm: string }, { rejectWithValue }) => {
    try {
      const { data } = await axiosServices.post('/auth/change-password/', {
        password,
        password_confirm: passwordConfirm
      });

      return data;
    } catch (error: any) {
      let errorMessage = 'Failed to change password. Please try again.';

      if (error.response?.data) {
        const data = error.response.data;
        if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(', ') : data.non_field_errors;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const logoutAsync = createAsyncThunk('auth/logout', async () => {
  try {
    // Invalidate HttpOnly refresh cookie on the server
    await axiosServices.post('/auth/logout/');
  } catch (_) {
    // Best-effort: ignore network errors
  }
  clearAllAuthStorage();
  delete axiosServices.defaults.headers.common.Authorization;
  return null;
});

export const refreshTokenAsync = createAsyncThunk('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const { data } = await axiosServices.post('/auth/refresh/', {
      refresh: refreshToken
    });

    setTokens(data.access, data.refresh);
    axiosServices.defaults.headers.common.Authorization = `Bearer ${data.access}`;

    return {
      access: data.access,
      refresh: data.refresh
    };
  } catch (error) {
    clearAllAuthStorage();
    delete axiosServices.defaults.headers.common.Authorization;
    return rejectWithValue('Token refresh failed');
  }
});

export const switchRole = createAsyncThunk('auth/switchRole', async (roleId: string, { getState }) => {
  const state = getState() as { auth: AuthState };
  const role = state.auth.roles.find((r) => r.id === roleId);

  if (role) {
    setRoleId(role.id);
    localStorage.setItem('currentRoleId', role.id);
  }

  return role;
});

export const refreshRoles = createAsyncThunk('auth/refreshRoles', async (_, { getState, rejectWithValue }) => {
  try {
    const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true';

    if (isMockMode) {
      // Mock API uses /role/
      const { data } = await axiosServices.get('/role/');
      return data || [];
    } else {
      // Real backend uses /role/
      const { data } = await axiosServices.get('/role/');
      return data || [];
    }
  } catch (error: any) {
    let errorMessage = 'Failed to refresh roles';

    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return rejectWithValue(errorMessage);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCurrentRole: (state, action: PayloadAction<Role>) => {
      state.currentRole = action.payload;
      setRoleId(action.payload.id);
      localStorage.setItem('currentRoleId', action.payload.id);
    },
    clearError: (state) => {
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; roles: Role[]; access: string; refresh: string }>) => {
      state.isLoggedIn = true;
      state.user = action.payload.user;
      state.roles = action.payload.roles;
      state.isLoading = false;
      setTokens(action.payload.access, action.payload.refresh);
      axiosServices.defaults.headers.common.Authorization = `Bearer ${action.payload.access}`;

      if (action.payload.roles.length > 0) {
        const savedRoleId = localStorage.getItem('currentRoleId');
        const role = savedRoleId ? action.payload.roles.find((r) => r.id === savedRoleId) : null;
        state.currentRole = role || action.payload.roles[0];

        if (state.currentRole) {
          setRoleId(state.currentRole.id);
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;

        if (action.payload.isAuthenticated) {
          state.isLoggedIn = true;
          state.user = action.payload.user!;
          state.roles = action.payload.roles!;

          // Restore mustChangePassword from localStorage
          const storedMustChangePassword = localStorage.getItem('mustChangePassword') === 'true';
          state.mustChangePassword = storedMustChangePassword;

          // If must change password, don't set as logged in
          if (storedMustChangePassword) {
            state.isLoggedIn = false;
          }

          if (action.payload.roles && Array.isArray(action.payload.roles) && action.payload.roles.length > 0) {
            const roles = action.payload.roles as Role[];
            const storedRoleId = localStorage.getItem('currentRoleId');
            const storedRole = storedRoleId ? roles.find((r: Role) => r.id === storedRoleId) : null;

            // If we already had a stored role, keep it. Otherwise prefer "member".
            const chosen = storedRole || (pickDefaultRole(roles) as Role | null);

            state.currentRole = chosen;
            if (chosen) {
              localStorage.setItem('currentRoleId', chosen.id);
              setRoleId(chosen.id); // ensures axios sends X-Role-ID after refresh
            }
          }
        } else {
          state.isLoggedIn = false;
          state.user = null;
          state.roles = [];
          state.currentRole = null;
          state.mustChangePassword = false; // Reset only when not authenticated
          localStorage.removeItem('mustChangePassword'); // Clean up localStorage
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isLoggedIn = false;
        state.user = null;
        state.roles = [];
        state.currentRole = null;
        state.error = action.payload as string;
      })
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoggedIn = !action.payload.mustChangePassword; // Don't set logged in if must change password
        state.isInitialized = true;
        state.user = action.payload.user;
        state.roles = action.payload.roles;
        state.mustChangePassword = action.payload.mustChangePassword;

        // Store mustChangePassword in localStorage so it persists across app reloads
        if (action.payload.mustChangePassword) {
          localStorage.setItem('mustChangePassword', 'true');
        } else {
          localStorage.removeItem('mustChangePassword');
        }

        if (Array.isArray(action.payload.roles) && action.payload.roles.length > 0) {
          const chosen = pickDefaultRole(action.payload.roles) as Role | null;
          state.currentRole = chosen;
          if (chosen) {
            localStorage.setItem('currentRoleId', chosen.id);
            setRoleId(chosen.id);
          }
        }
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(changePasswordAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePasswordAsync.fulfilled, (state) => {
        state.isLoading = false;
        state.mustChangePassword = false;
        // Clear tokens and redirect to login
        clearAllAuthStorage();
        localStorage.removeItem('mustChangePassword'); // Clear the flag
        axiosServices.defaults.headers.common.Authorization = '';
        state.isLoggedIn = false;
        state.user = null;
        state.roles = [];
        state.currentRole = null;
      })
      .addCase(changePasswordAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(registerAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.isLoading = false;

        if (action.payload.requiresVerification) {
          state.isLoggedIn = false;
          state.isInitialized = true;
          state.user = null;
          state.roles = [];
          state.currentRole = null;
        } else {
          state.isLoggedIn = true;
          state.isInitialized = true;
          state.user = action.payload.user;
          state.roles = action.payload.roles || [];

          if (action.payload.roles && action.payload.roles.length > 0) {
            const chosen = pickDefaultRole(action.payload.roles) as Role | null;
            state.currentRole = chosen;
            if (chosen) {
              localStorage.setItem('currentRoleId', chosen.id);
              setRoleId(chosen.id);
            }
          }
        }
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.isLoading = false;
        state.isLoggedIn = false;
        state.user = null;
        state.roles = [];
        state.currentRole = null;
        state.error = null;
        localStorage.removeItem('currentRoleId');
        clearRoleId?.();
      })
      .addCase(refreshTokenAsync.rejected, (state) => {
        state.isLoggedIn = false;
        state.user = null;
        state.roles = [];
        state.currentRole = null;
      })
      .addCase(switchRole.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentRole = action.payload;
        }
      })
      .addCase(refreshRoles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshRoles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roles = action.payload;

        // Update current role if it still exists in the refreshed roles
        if (state.currentRole) {
          const updatedCurrentRole = action.payload.find((r: Role) => r.id === state.currentRole?.id);
          if (updatedCurrentRole) {
            state.currentRole = updatedCurrentRole;
          } else if (action.payload.length > 0) {
            // If current role no longer exists, switch to first available role
            state.currentRole = action.payload[0];
            localStorage.setItem('currentRoleId', action.payload[0].id);
            setRoleId(action.payload[0].id);
          }
        }
      })
      .addCase(refreshRoles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const { setCurrentRole, clearError, loginSuccess } = authSlice.actions;

export default authSlice.reducer;
