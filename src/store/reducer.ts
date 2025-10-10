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
import inventoryReducer from './slices/inventory';
import analyticsReducer from './slices/analytics';

// New clean slices
import clockInOutReducer from './slices/clock-in-out';
import timesheetReducer from './slices/timesheet';
import kioskReducer from './kioskSlice';
import inventoryReducer from './slices/inventory';
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
  analytics: analyticsReducer,
  clockInOut: clockInOutReducer,
  timesheet: timesheetReducer,
  kiosk: kioskReducer,
  qbEntities: qbEntitiesReducer,
  syncProgress: syncProgressReducer
});

export default reducer;
