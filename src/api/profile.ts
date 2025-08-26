import axiosServices from 'utils/axios';

export type UserPreferences = {
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications_email?: boolean;
  notifications_push?: boolean;
};

export type MyProfile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
  // Contact
  phone?: string | null;
  work_phone?: string | null;
  personal_phone?: string | null;
  work_email?: string | null;
  personal_email?: string | null;
  // Preferences
  preferences?: UserPreferences;
  // Read-only
  role?: string;
};

export async function getMyProfile(): Promise<MyProfile> {
  const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  if (isMockMode) {
    const { data } = await axiosServices.get('/user/profile/');
    return data as MyProfile;
  }

  const { data } = await axiosServices.get('/user/profile/');
  return data as MyProfile;
}

export type UpdateProfilePayload = Partial<Pick<MyProfile, 'first_name' | 'last_name' | 'email' | 'phone' | 'avatar'>>;

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<MyProfile> {
  const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  // Live backend currently accepts only first_name and last_name
  const dataToSend = isMockMode
    ? payload
    : {
        ...(payload.first_name !== undefined && String(payload.first_name).trim() !== ''
          ? { first_name: String(payload.first_name).trim() }
          : {}),
        ...(payload.last_name !== undefined && String(payload.last_name).trim() !== ''
          ? { last_name: String(payload.last_name).trim() }
          : {})
      };

  const { data } = await axiosServices.post('/user/profile/', dataToSend);
  return data as MyProfile;
}

export async function uploadAvatar(file: File): Promise<MyProfile> {
  const formData = new FormData();
  formData.append('avatar', file);

  const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  if (!isMockMode) {
    throw new Error('Avatar updates are not supported yet.');
  }

  const { data } = await axiosServices.post('/user/profile/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data as MyProfile;
}
