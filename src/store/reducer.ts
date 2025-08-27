// third party
import { combineReducers } from 'redux';

// project imports
import snackbarReducer from './slices/snackbar';
import userReducer from './slices/user';
import authReducer from './slices/auth';
import financeReducer from './slices/finance';

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
  auth: authReducer,
  snackbar: snackbarReducer,
  user: userReducer,
  finance: financeReducer
});

export default reducer;
