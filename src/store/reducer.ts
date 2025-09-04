// third party
import { combineReducers } from 'redux';

// project imports
import snackbarReducer from './slices/snackbar';
import userReducer from './slices/user';
import authReducer from './slices/auth';
import financeReducer from './slices/finance';
import companyReducer from './slices/company';
import integrationsReducer from './slices/integrations';

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
  auth: authReducer,
  company: companyReducer,
  snackbar: snackbarReducer,
  user: userReducer,
  finance: financeReducer,
  integrations: integrationsReducer
});

export default reducer;
