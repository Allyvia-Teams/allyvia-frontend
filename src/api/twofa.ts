import axiosServices from 'utils/axios';
import { TwoFactorStatus, TwoFactorEnableResponse, TwoFactorVerifySetupResponse, TwoFactorVerifyLoginResponse } from 'types/twofa';

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const { data } = await axiosServices.get<TwoFactorStatus>('/auth/2fa/status/');
  return data;
}

export async function enableTwoFactor(password: string): Promise<TwoFactorEnableResponse> {
  const { data } = await axiosServices.post<TwoFactorEnableResponse>('/auth/2fa/enable/', { password });
  return data;
}

export async function verifyTwoFactorSetup(code: string): Promise<TwoFactorVerifySetupResponse> {
  const { data } = await axiosServices.post<TwoFactorVerifySetupResponse>('/auth/2fa/verify-setup/', { code });
  return data;
}

export async function disableTwoFactor(password: string): Promise<{ detail: string }> {
  const { data } = await axiosServices.post<{ detail: string }>('/auth/2fa/disable/', { password });
  return data;
}

export async function verifyTwoFactorLogin(twofaToken: string, code: string): Promise<TwoFactorVerifyLoginResponse> {
  const { data } = await axiosServices.post<TwoFactorVerifyLoginResponse>('/auth/2fa/verify-login/', {
    '2fa_token': twofaToken,
    code
  });
  return data;
}
