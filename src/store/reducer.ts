// third party
import { combineReducers } from 'redux';

// project imports
import snackbarReducer from './slices/snackbar';
import userReducer from './slices/user';
import authReducer from './slices/auth';
import integrationsReducer from './slices/integrations';

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
  snackbar: snackbarReducer,
  user: userReducer,
  auth: authReducer,
  integrations: integrationsReducer
});

export default reducer;
