// third party
import { combineReducers } from 'redux';

// project imports
import snackbarReducer from './slices/snackbar';
import userReducer from './slices/user';
import authReducer from './slices/auth';
import companyReducer from './slices/company';

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
  auth: authReducer,
  company: companyReducer,
  snackbar: snackbarReducer,
  user: userReducer
});

export default reducer;
