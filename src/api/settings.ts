import axiosServices from 'utils/axios';
import {
  UserSettingsProfile,
  UserPreferences,
  UpdateUserProfilePayload,
  UpdateUserPreferencesPayload
} from 'types/settings';

export async function getUserProfile(): Promise<UserSettingsProfile> {
  const { data } = await axiosServices.get<UserSettingsProfile>('/user/profile/');
  return data;
}

export async function updateUserProfile(payload: UpdateUserProfilePayload): Promise<UserSettingsProfile> {
  const { data } = await axiosServices.post<UserSettingsProfile>('/user/profile/', payload);
  return data;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const { data } = await axiosServices.get<UserPreferences>('/user/preferences/');
  return data;
}

export async function updateUserPreferences(payload: UpdateUserPreferencesPayload): Promise<UserPreferences> {
  const { data } = await axiosServices.patch<UserPreferences>('/user/preferences/', payload);
  return data;
}
