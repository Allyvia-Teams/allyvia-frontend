import { useCallback } from 'react';
import { useSelector, useDispatch } from 'store';
import { loginAsync, logoutAsync, registerAsync, verifyTwoFactorLoginAsync } from 'store/slices/auth';

export default function useAuth() {
  const dispatch = useDispatch();
  const { isLoggedIn, isInitialized, isLoading, user, roles, currentRole, error, mustChangePassword, pending2fa } = useSelector(
    (state) => state.auth
  );

  const login = useCallback(
    async (email: string, password: string) => {
      return dispatch(loginAsync({ email, password })).unwrap();
    },
    [dispatch]
  );

  const verifyTwoFactor = useCallback(
    async (twofaToken: string, code: string) => {
      return dispatch(verifyTwoFactorLoginAsync({ twofaToken, code })).unwrap();
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    return dispatch(logoutAsync()).unwrap();
  }, [dispatch]);

  const register = useCallback(
    async (
      email: string,
      password: string,
      confirmPassword: string,
      firstName: string,
      lastName: string,
      companyName: string,
      locationLat?: number,
      locationLng?: number,
      address?: {
        address_line1?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      }
    ) => {
      return dispatch(
        registerAsync({
          email,
          password,
          passwordConfirm: confirmPassword,
          firstName,
          lastName,
          companyName,
          locationLat,
          locationLng,
          addressLine1: address?.address_line1,
          city: address?.city,
          state: address?.state,
          postalCode: address?.postal_code,
          country: address?.country
        })
      ).unwrap();
    },
    [dispatch]
  );

  const resetPassword = useCallback(async (email: string) => {
    console.log('Reset password not implemented');
    throw new Error('Reset password not implemented');
  }, []);

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
    mustChangePassword,
    pending2fa,
    login,
    logout,
    register,
    resetPassword,
    updateProfile,
    verifyTwoFactor
  };
}
