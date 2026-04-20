export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: ThemePreference;
  dashboard_layout: Record<string, unknown>;
  email_notifications: boolean;
  sms_notifications: boolean;
  marketing_opt_in: boolean;
}

export interface UserSettingsProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
  preferences: UserPreferences;
}

export type UpdateUserProfilePayload = Partial<{
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  avatar_url: string;
  preferences: Partial<UserPreferences>;
}>;

export type UpdateUserPreferencesPayload = Partial<UserPreferences>;
