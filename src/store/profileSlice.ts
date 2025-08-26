import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MyProfile, UpdateProfilePayload, getMyProfile, updateMyProfile, uploadAvatar } from 'api/profile';

type ProfileState = {
  isLoading: boolean;
  error: string | null;
  profile: MyProfile | null;
};

const initialState: ProfileState = {
  isLoading: false,
  error: null,
  profile: null
};

export const loadMyProfile = createAsyncThunk('profile/loadMyProfile', async (_, { rejectWithValue }) => {
  try {
    const data = await getMyProfile();
    return data;
  } catch (err: any) {
    const message = err?.detail || err?.error?.message || 'Failed to load profile';
    return rejectWithValue(message);
  }
});

export const updateProfileAsync = createAsyncThunk('profile/updateProfile', async (payload: UpdateProfilePayload, { rejectWithValue }) => {
  try {
    const data = await updateMyProfile(payload);
    return data;
  } catch (err: any) {
    const message = err?.detail || err?.error?.message || 'Failed to update profile';
    return rejectWithValue(message);
  }
});

export const uploadAvatarAsync = createAsyncThunk('profile/uploadAvatar', async (file: File, { rejectWithValue }) => {
  try {
    const data = await uploadAvatar(file);
    return data;
  } catch (err: any) {
    const message = err?.detail || err?.error?.message || 'Failed to upload avatar';
    return rejectWithValue(message);
  }
});

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMyProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadMyProfile.fulfilled, (state, action: PayloadAction<MyProfile>) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(loadMyProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProfileAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfileAsync.fulfilled, (state, action: PayloadAction<MyProfile>) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(updateProfileAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(uploadAvatarAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadAvatarAsync.fulfilled, (state, action: PayloadAction<MyProfile>) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(uploadAvatarAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearProfileError } = profileSlice.actions;

export default profileSlice.reducer;
