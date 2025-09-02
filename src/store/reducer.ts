// third party
import { combineReducers } from 'redux';

// project imports
import snackbarReducer from './slices/snackbar';
import userReducer from './slices/user';
import authReducer from './slices/auth';
import profileReducer from './profileSlice';
import financeReducer from './slices/finance';
import companyReducer from './slices/company';

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
  auth: authReducer,
  company: companyReducer,
  snackbar: snackbarReducer,
  user: userReducer,
  profile: profileReducer,
  finance: financeReducer
});

export default reducer;
