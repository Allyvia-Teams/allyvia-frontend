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

export type UpdateProfilePayload = Partial<Pick<MyProfile, 'first_name' | 'last_name' | 'email' | 'phone' | 'avatar' | 'preferences'>>;

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
    if (payload.preferences !== undefined) {
      overrides.preferences = payload.preferences;
    }
    if (payload.avatar !== undefined) {
      // If avatar is explicitly null, remove it from overrides; else persist string value
      if (payload.avatar === null) {
        const existingRaw = localStorage.getItem('myProfileOverrides');
        const existing = existingRaw ? (JSON.parse(existingRaw) as Partial<MyProfile>) : {};
        delete (existing as any).avatar;
        localStorage.setItem('myProfileOverrides', JSON.stringify(existing));
      } else {
        overrides.avatar = payload.avatar as any;
      }
    }
    if (Object.keys(overrides).length > 0) {
      const existingRaw = localStorage.getItem('myProfileOverrides');
      const existing = existingRaw ? (JSON.parse(existingRaw) as Partial<MyProfile>) : {};
      const mergedOverrides = { ...existing, ...overrides } as Partial<MyProfile>;
      localStorage.setItem('myProfileOverrides', JSON.stringify(mergedOverrides));
      return { ...updatedFromServer, ...mergedOverrides } as MyProfile;
    }
    // Even if we didn't update overrides now, include any existing overrides (e.g., avatar) in the returned object
    const existingRaw = localStorage.getItem('myProfileOverrides');
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as Partial<MyProfile>;
      return { ...updatedFromServer, ...existing } as MyProfile;
    }
  } catch {}

  return updatedFromServer;
}

export async function uploadAvatar(file: File): Promise<MyProfile> {
  // Convert the file to a data URL for local persistence
  const fileToDataURL = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const avatarDataUrl = await fileToDataURL(file);

  try {
    const existingRaw = localStorage.getItem('myProfileOverrides');
    const existing = existingRaw ? (JSON.parse(existingRaw) as Partial<MyProfile>) : {};
    const mergedOverrides = { ...existing, avatar: avatarDataUrl } as Partial<MyProfile>;
    localStorage.setItem('myProfileOverrides', JSON.stringify(mergedOverrides));
  } catch {}

  // Return the latest profile with overrides applied so UI updates immediately
  const latest = await getMyProfile();
  return { ...latest, avatar: avatarDataUrl } as MyProfile;
}
