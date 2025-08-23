import { useCallback } from 'react';
import { useSelector, useDispatch } from 'store';
import { loginAsync, logoutAsync, initializeAuth, registerAsync } from 'store/slices/auth';

export default function useAuth() {
  const dispatch = useDispatch();
  const { 
    isLoggedIn, 
    isInitialized, 
    isLoading,
    user, 
    roles, 
    currentRole,
    error 
  } = useSelector((state) => state.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      return dispatch(loginAsync({ email, password })).unwrap();
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    return dispatch(logoutAsync()).unwrap();
  }, [dispatch]);

  const register = useCallback(
    async (email: string, password: string, confirmPassword: string, firstName: string, lastName: string) => {
      return dispatch(registerAsync({ 
        email, 
        password, 
        passwordConfirm: confirmPassword,
        firstName, 
        lastName 
      })).unwrap();
    },
    [dispatch]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      console.log('Reset password not implemented');
      throw new Error('Reset password not implemented');
    },
    []
  );

  const updateProfile = useCallback(() => {
    console.log('Update profile not implemented');
  }, []);

  return {
    isLoggedIn,
    isInitialized,
    isLoading,
    user,
    roles,
    currentRole,
    error,
    login,
    logout,
    register,
    resetPassword,
    updateProfile
  };
}