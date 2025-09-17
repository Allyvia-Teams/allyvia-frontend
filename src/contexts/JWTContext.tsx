import React, { createContext, useEffect, useReducer } from 'react';

// third party
import { jwtDecode } from 'jwt-decode';

// reducer - state management
import { LOGIN, LOGOUT } from 'store/actions';
import accountReducer from 'store/accountReducer';

// project imports
import Loader from 'ui-component/Loader';
import { getRefreshToken, getAccessToken, setTokens, clearTokens, clearQBUrlAndState, setRoleId, setCompanyId, clearRoleId, clearCompanyId } from 'utils/authStorage';
import axiosServices from 'utils/axios';

// types
import { InitialLoginContextProps, JWTContextType } from 'types/auth';

// constant
const initialState: InitialLoginContextProps = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

function verifyToken(token: string): boolean {
  try {
    const { exp } = jwtDecode<{ exp: number }>(token);
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// ==============================|| JWT CONTEXT & PROVIDER ||============================== //

const JWTContext = createContext<JWTContextType | null>(null);

export function JWTProvider({ children }: { children: React.ReactElement }) {
  const [state, dispatch] = useReducer(accountReducer, initialState);

  const setSession = (access?: string | null, refresh?: string | null): void => {
    if (access && refresh) {
      setTokens(access, refresh);
      axiosServices.defaults.headers.common.Authorization = `Bearer ${access}`;
    } else {
      clearTokens();
      delete axiosServices.defaults.headers.common.Authorization;
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const { data } = await axiosServices.post('/auth/refresh', { refresh: refreshToken });
      const { access, refresh } = data;

      setSession(access, refresh);
      return access;
    } catch (err) {
      console.log('Token refresh failed', err);
      logout();
      return null;
    }
  };

  const init = async () => {
    try {
      const access = getAccessToken();

      if (access && verifyToken(access)) {
        setSession(access, getRefreshToken());
        const { data } = await axiosServices.get('/user/profile/');
        dispatch({ type: LOGIN, payload: { isLoggedIn: true, user: data } });
      } else {
        const newAccess = await refreshToken();
        if (newAccess) {
          const { data } = await axiosServices.get('/user/profile/');
          dispatch({ type: LOGIN, payload: { isLoggedIn: true, user: data } });
        } else {
          dispatch({ type: LOGOUT });
        }
      }
    } catch (err) {
      console.error('Auth init failed:', err);
      dispatch({ type: LOGOUT });
    }
  };

  useEffect(() => {
    init();
  }, []);



  const login = async (email: string, password: string) => {
    const response = await axiosServices.post('/auth/login/', { email, password });
    const { access, refresh, user_id, email: userEmail, role_id, role_type, company_id, company_name } = response.data;
    setSession(access, refresh);
    
    // Store role and company information
    if (role_id) {
      setRoleId(role_id);
    }
    if (company_id) {
      setCompanyId(company_id);
    }
    
    dispatch({
      type: LOGIN,
      payload: {
        isLoggedIn: true,
        user: {
          id: user_id,
          email: userEmail,
          role_id,
          role_type,
          company_id,
          company_name
        }
      }
    });
  };

  const register = async (email: string, password: string, confirmPassword: string, firstName: string, lastName: string) => {
    const { data } = await axiosServices.post('/auth/register/', {
      email,
      password,
      password_confirm: confirmPassword,
      first_name: firstName,
      last_name: lastName
    });

    setSession(data.access, data.refresh);
    dispatch({ type: LOGIN, payload: { isLoggedIn: true, user: data } });
  };

  const logout = () => {
    setSession(null, null);
    dispatch({ type: LOGOUT });
    clearQBUrlAndState();
    clearRoleId();
    clearCompanyId();
  };

  const resetPassword = async (email: string) => {};

  const updateProfile = () => {};

  if (!state.isInitialized) {
    return <Loader />;
  }

  return <JWTContext value={{ ...state, login, logout, register, resetPassword, updateProfile }}>{children}</JWTContext>;
}

export default JWTContext;
