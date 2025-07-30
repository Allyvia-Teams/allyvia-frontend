import React, { createContext, useEffect, useReducer } from 'react';

// third party
import { jwtDecode } from 'jwt-decode';

// reducer - state management
import { LOGIN, LOGOUT } from 'store/actions';
import accountReducer from 'store/accountReducer';

// project imports
import Loader from 'ui-component/Loader';
import axios from 'utils/axios';

// types
import { KeyedObject } from 'types';
import { InitialLoginContextProps, JWTContextType } from 'types/auth';

// constant
const initialState: InitialLoginContextProps = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

function verifyToken(accessToken: string): boolean {
  if (!accessToken) {
    return false;
  }

  const decoded: KeyedObject = jwtDecode(accessToken);

  // Ensure 'exp' exists and compare it to the current timestamp
  if (!decoded.exp) {
    throw new Error("Token does not contain 'exp' property.");
  }

  return decoded.exp > Date.now() / 1000;
}

function setSession(accessToken?: string | null): void {
  if (accessToken) {
    localStorage.setItem('access', accessToken);
    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  } else {
    localStorage.removeItem('access');
    delete axios.defaults.headers.common.Authorization;
  }
}

// ==============================|| JWT CONTEXT & PROVIDER ||============================== //

const JWTContext = createContext<JWTContextType | null>(null);

export function JWTProvider({ children }: { children: React.ReactElement }) {
  const [state, dispatch] = useReducer(accountReducer, initialState);

  useEffect(() => {
    const init = async () => {
      try {
        const accessToken = window.localStorage.getItem('access');
        if (accessToken && verifyToken(accessToken)) {
          setSession(accessToken);
          const response = await axios.get('/user/profile');
          dispatch({
            type: LOGIN,
            payload: {
              isLoggedIn: true,
              user: response.data
            }
          });
        } else {
          dispatch({
            type: LOGOUT
          });
        }
      } catch (err) {
        console.error(err);
        dispatch({
          type: LOGOUT
        });
      }
    };

    init();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post('/auth/login/', { email, password });
    const { access, user } = response.data;
    setSession(access);
    dispatch({
      type: LOGIN,
      payload: {
        isLoggedIn: true,
        user
      }
    });
  };

  const register = async (email: string, password: string, confirmPassword: string, firstName: string, lastName: string) => {
    // todo: this flow need to be recode as it not verified
    const response = await axios.post('/auth/register/', {
      email,
      password,
      password_confirm: confirmPassword,
      first_name: firstName,
      last_name: lastName
    });

    setSession(response.data.access);
    const user = response.data;
    dispatch({
      type: LOGIN,
      payload: {
        isLoggedIn: true,
        user
      }
    });
  };

  const logout = () => {
    setSession(null);
    dispatch({ type: LOGOUT });
  };

  const resetPassword = async (email: string) => {};

  const updateProfile = () => {};

  if (state.isInitialized !== undefined && !state.isInitialized) {
    return <Loader />;
  }

  return <JWTContext value={{ ...state, login, logout, register, resetPassword, updateProfile }}>{children}</JWTContext>;
}

export default JWTContext;
