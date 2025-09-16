// third party
import { createSlice } from '@reduxjs/toolkit';

// project imports
import { dispatch } from '../index';

// types
import { DefaultRootStateProps } from 'types';

// ==============================|| SLICE - AUTH ||============================== //

const initialState: DefaultRootStateProps['auth'] = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

const auth = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.user = action.payload;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.user = null;
    },
    initialize: (state, action) => {
      state.isInitialized = true;
      state.isLoggedIn = action.payload.isLoggedIn;
      state.user = action.payload.user;
    }
  }
});

export default auth.reducer;

export const { loginSuccess, logout, initialize } = auth.actions;
