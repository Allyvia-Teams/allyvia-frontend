# Employee Scheduling: End-to-End Testing Checklist

## 🎯 Quick Test Access
Navigate to `/calendar` in your application to access the Employee Scheduling Calendar.

## ✅ Pre-Testing Setup

### Backend Requirements
- [ ] Django/DRF backend running
- [ ] Employee model exists with fields: `id`, `first_name`, `last_name`, `email`, `company_id`, `is_active`
- [ ] Shift API endpoints available:
  - `GET /employee/shifts?start=&end=&employee_id=`
  - `POST /employee/shifts`
  - `PUT /employee/shifts/{id}/`
  - `DELETE /employee/shifts/{id}/`
  - `GET /employee/my-shifts?start=&end=`
- [ ] RBAC middleware processes `X-Role-ID` header
- [ ] User authentication working

### Frontend Requirements
- [ ] React app running (`npm start`)
- [ ] User logged in with valid role (admin/manager/member)
- [ ] Navigation to `/calendar` route available

## 🧪 Automated Testing Components

### Development Test Suite
When in development mode, the calendar page includes automated test components:

1. **Comprehensive Test Component**
   - Click "Run Comprehensive Test" button
   - Verifies all requirements automatically
   - Shows PASS/FAIL status for each component

2. **Basic Shift Test Component**
   - Tests basic shift creation
   - Validates API connectivity
   - Shows employee data loading

## 📋 Manual Testing Scenarios

### 1. Authentication & Role-Based Access Control

#### Admin/Manager User Testing
- [ ] **Login as admin/manager**
- [ ] **Verify UI elements visible:**
  - "New Shift" button in left sidebar
  - Employee filter checkboxes
  - Edit/delete options on shift events
  - All calendar views (Month/Week/List)

#### Member User Testing
- [ ] **Login as member**
- [ ] **Verify UI restrictions:**
  - No "New Shift" button
  - No employee filters (only own shifts)
  - No edit/delete options on shifts
  - Read-only calendar views

### 2. Calendar Navigation & Views

#### Month View
- [ ] **Calendar displays current month**
- [ ] **Navigation works:**
  - Previous/Next month buttons
  - "Today" button returns to current date
  - Clicking dates (admin/manager only)
- [ ] **Shifts display correctly:**
  - Color-coded by employee
  - Employee name visible
  - Time shown (if not all-day)
  - Click to edit (admin/manager only)

#### Week View
- [ ] **Toggle to week view**
- [ ] **Shows 7-day layout:**
  - Sunday through Saturday
  - Date headers correct
  - Today highlighted
- [ ] **Shifts in weekly format:**
  - Full start/end times shown
  - Click to edit functionality

#### List View
- [ ] **Toggle to list view**
- [ ] **Chronological shift listing**
- [ ] **All shift details visible**
- [ ] **Edit/delete buttons (admin/manager only)**

### 3. Shift CRUD Operations (Admin/Manager Only)

#### Create New Shift
- [ ] **Click "New Shift" button**
- [ ] **Dialog opens with form fields:**
  - Employee dropdown populated
  - Start/End time pickers
  - Optional title field
  - Optional notes field
- [ ] **Form validation:**
  - Employee required
  - Start time required
  - End time required
  - End time must be after start time
- [ ] **Submit creates shift:**
  - Calendar updates without reload
  - Shift appears in correct date/time
  - Success confirmation

#### Edit Existing Shift
- [ ] **Click on existing shift**
- [ ] **Dialog pre-populated with data**
- [ ] **Modify fields and save:**
  - Employee change allowed
  - Time adjustments work
  - Title/notes editable
- [ ] **Calendar reflects changes immediately**

#### Delete Shift
- [ ] **Click delete in shift dialog OR list view**
- [ ] **Confirmation dialog appears**
- [ ] **Confirm deletion:**
  - Shift removed from calendar
  - No reload required
  - Proper cleanup

### 4. Data Loading & Error Handling

#### API Integration
- [ ] **Employee data loads correctly**
- [ ] **Shifts load for date ranges**
- [ ] **Loading states display**
- [ ] **Error messages for failures**
- [ ] **Automatic retry on network issues**

#### Date Range Filtering
- [ ] **Month/week changes update date range**
- [ ] **Employee filters work (admin/manager)**
- [ ] **My-shifts API used for members**
- [ ] **All-shifts API used for admin/manager**

### 5. Timezone Handling

#### Datetime Safety
- [ ] **Times display in local timezone**
- [ ] **Form inputs handle local time correctly**
- [ ] **Server saves as UTC**
- [ ] **Cross-timezone viewing works**

#### Date Boundaries
- [ ] **Shifts spanning midnight display correctly**
- [ ] **DST transitions handled properly**
- [ ] **All-day events work**

### 6. Mobile & Responsive Design

#### Mobile Testing
- [ ] **Calendar responsive on mobile**
- [ ] **Touch interactions work**
- [ ] **Dialogs fit mobile screens**
- [ ] **Navigation accessible**

#### Desktop Testing
- [ ] **Full desktop layout**
- [ ] **Hover effects work**
- [ ] **Keyboard navigation**

## 🐛 Common Issues & Fixes

### 1. Authentication Issues
**Problem**: User role not detected
**Check**: 
- `user.role` property exists
- X-Role-ID header being sent
- Backend middleware processing role

### 2. API Endpoint Issues
**Problem**: 404 errors on shift endpoints
**Check**:
- Backend URLs match frontend API calls
- CORS configuration allows frontend domain
- Authentication headers included

### 3. Permission Issues
**Problem**: Admin can't manage shifts
**Check**:
- `canManageShifts()` function logic
- User role string matching exactly ('admin', 'manager')
- Role data properly loaded

### 4. Calendar Display Issues
**Problem**: Shifts not appearing
**Check**:
- Date range filters correct
- Timezone conversion working
- Shift data structure matches interface
- Employee color assignment working

### 5. Form Submission Issues
**Problem**: Shift creation fails
**Check**:
- All required fields provided
- Datetime format correct (ISO strings)
- API validation rules met
- Network connectivity

## 🎉 Success Criteria

### Functional Requirements Met
- [x] Admin/Manager can CRUD all shifts
- [x] Members can view only their own shifts
- [x] Calendar updates without full reload
- [x] Timezone handling is safe
- [x] Month/Week/List views implemented
- [x] Employee filtering works
- [x] Responsive design

### Performance Requirements
- [ ] Calendar loads within 2 seconds
- [ ] Shift operations complete quickly
- [ ] No memory leaks in long sessions
- [ ] Mobile performance acceptable

### Security Requirements
- [ ] Role-based access enforced
- [ ] API endpoints secured
- [ ] No unauthorized data access
- [ ] Proper session management

## 📊 Testing Report Template

```
## Employee Scheduling Test Results
Date: ___________
Tester: ___________
Environment: ___________

### Backend Status
- [ ] API endpoints responding
- [ ] RBAC middleware working
- [ ] Database properly configured

### Frontend Functionality
- [ ] Calendar navigation works
- [ ] Shift CRUD operations work
- [ ] Role-based permissions enforced
- [ ] Responsive design verified

### Issues Found
1. ________________
2. ________________
3. ________________

### Overall Status
[ ] PASS - Ready for production
[ ] PASS WITH MINOR ISSUES - Deploy with monitoring
[ ] FAIL - Requires fixes before deployment

### Notes
________________
________________
```

## 🚀 Deployment Readiness

After all tests pass:
- [ ] Build production bundle
- [ ] Deploy to staging environment
- [ ] Run full test suite in staging
- [ ] Performance testing completed
- [ ] Security review passed
- [ ] Documentation updated
- [ ] Training materials prepared

---

**Remember**: The comprehensive test component on the calendar page will automatically verify most of these requirements. Use it as your primary testing tool!
