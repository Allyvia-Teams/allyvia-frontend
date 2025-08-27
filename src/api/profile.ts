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
    // Merge local overrides (e.g., phone) for mock mode
    const overridden = { ...(data as MyProfile) };
    try {
      const localOverridesRaw = localStorage.getItem('myProfileOverrides');
      if (localOverridesRaw) {
        const localOverrides = JSON.parse(localOverridesRaw);
        return { ...overridden, ...localOverrides } as MyProfile;
      }
    } catch {}
    return overridden as MyProfile;
  }

  const { data } = await axiosServices.get('/user/profile/');
  // Merge local-only overrides (e.g., phone) without changing backend
  const merged = { ...(data as MyProfile) };
  try {
    const localOverridesRaw = localStorage.getItem('myProfileOverrides');
    if (localOverridesRaw) {
      const localOverrides = JSON.parse(localOverridesRaw);
      return { ...merged, ...localOverrides } as MyProfile;
    }
  } catch {}
  return merged as MyProfile;
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
  const updatedFromServer = data as MyProfile;

  // Persist local-only fields such as phone to localStorage and return merged
  try {
    const overrides: Partial<MyProfile> = {};
    if (payload.phone !== undefined) {
      overrides.phone = String(payload.phone);
    }
    if (Object.keys(overrides).length > 0) {
      localStorage.setItem('myProfileOverrides', JSON.stringify(overrides));
      return { ...updatedFromServer, ...overrides } as MyProfile;
    }
  } catch {}

  return updatedFromServer;
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
