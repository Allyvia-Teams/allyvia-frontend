// third party
import { combineReducers } from 'redux';

// project imports
import snackbarReducer from './slices/snackbar';
import userReducer from './slices/user';
import authReducer from './slices/auth';
import employeeReducer from './slices/employee';
import financeReducer from './slices/finance';
import companyReducer from './slices/company';

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
  auth: authReducer,
  company: companyReducer,
  snackbar: snackbarReducer,
  user: userReducer,
  employee: employeeReducer,
  finance: financeReducer
});

export default reducer;
