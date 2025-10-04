// third party
import { combineReducers } from 'redux';

// project imports
import snackbarReducer from './slices/snackbar';
import userReducer from './slices/user';
import authReducer from './slices/auth';
import employeeReducer from './slices/employee';
import profileReducer from './profileSlice';
import financeReducer from './slices/finance';
import integrationsReducer from './slices/integrations';
import inventoryReducer from './slices/Inventory';
import qbEntitiesReducer from './slices/qbEntities';
import syncProgressReducer from './slices/syncProgress';

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
  auth: authReducer,
  snackbar: snackbarReducer,
  user: userReducer,
  employee: employeeReducer,
  profile: profileReducer,
  finance: financeReducer,
  integrations: integrationsReducer,
  inventory: inventoryReducer,
  qbEntities: qbEntitiesReducer,
  syncProgress: syncProgressReducer
});

export default reducer;
