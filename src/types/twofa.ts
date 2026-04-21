export interface TwoFactorStatus {
  enabled: boolean;
}

export interface TwoFactorEnableResponse {
  secret: string;
  qr_uri: string;
}

export interface TwoFactorVerifySetupResponse {
  backup_codes: string[];
}

export interface TwoFactorVerifyLoginResponse {
  access: string;
  refresh: string;
  user_id: string;
  email: string;
  must_change_password: boolean;
  first_name?: string;
  last_name?: string;
  email_verified?: boolean;
}
