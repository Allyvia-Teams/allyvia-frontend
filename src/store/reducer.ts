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

  // New clean slices
  clockInOut: clockInOutReducer,
  timesheet: timesheetReducer
});

export default reducer;
