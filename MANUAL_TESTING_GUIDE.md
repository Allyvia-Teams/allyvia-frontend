# 🧪 Manual Testing Guide for Employee Scheduling

## ✅ Implementation Status: **COMPLETE AND READY FOR TESTING**

The automated test script confirms that all components are properly implemented. Here's how to manually test the Employee Scheduling system:

## 🚀 Quick Start Testing

### 1. Start the Development Server
```bash
# Try one of these commands:
npm start
# OR
yarn start
# OR
npx vite
```

The server should start on `http://localhost:5173` (or another port shown in terminal)

### 2. Navigate to Calendar
- Open your browser
- Go to `http://localhost:5173/calendar`
- You should see the Employee Scheduling Calendar

## 🎯 Testing Scenarios

### Scenario 1: Admin/Manager User Testing

#### Login as Admin/Manager
1. **Access the calendar page**
2. **Verify UI elements are visible:**
   - ✅ "New Shift" button in left sidebar
   - ✅ Employee filter checkboxes (click filter icon)
   - ✅ Month/Week/List view toggles
   - ✅ Previous/Next navigation buttons
   - ✅ "Today" button

#### Test Calendar Views
1. **Month View (Default):**
   - ✅ Calendar grid displays current month
   - ✅ Days are clickable (for creating shifts)
   - ✅ Today's date is highlighted
   - ✅ Navigation buttons work

2. **Week View:**
   - ✅ Click "Week" toggle
   - ✅ 7-day layout displays
   - ✅ Days show full start/end times
   - ✅ Clickable for shift creation

3. **List View:**
   - ✅ Click "List" toggle
   - ✅ Chronological shift listing
   - ✅ All shift details visible

#### Test Shift Creation (Admin/Manager Only)
1. **Click "New Shift" button**
2. **Shift Dialog should open with:**
   - ✅ Employee dropdown (populated with employees)
   - ✅ Start time picker (datetime-local)
   - ✅ End time picker (datetime-local)
   - ✅ Title field (optional)
   - ✅ Notes field (optional)
   - ✅ "Add Shift" button

3. **Fill out the form:**
   - Select an employee
   - Set start time (e.g., today 9:00 AM)
   - Set end time (e.g., today 5:00 PM)
   - Add title: "Test Shift"
   - Add notes: "Testing shift creation"

4. **Submit the form:**
   - ✅ Form validation works (try submitting empty)
   - ✅ End time must be after start time
   - ✅ Shift appears in calendar after creation
   - ✅ Calendar updates without page reload

#### Test Shift Editing
1. **Click on an existing shift**
2. **Edit dialog should open with:**
   - ✅ Pre-populated form data
   - ✅ All fields editable
   - ✅ "Update Shift" button
   - ✅ "Delete Shift" button

3. **Make changes and save:**
   - ✅ Changes reflect in calendar immediately
   - ✅ No page reload required

#### Test Shift Deletion
1. **Click "Delete Shift" in edit dialog**
2. **Confirmation dialog should appear**
3. **Confirm deletion:**
   - ✅ Shift removed from calendar
   - ✅ No page reload required

### Scenario 2: Member User Testing

#### Login as Member
1. **Access the calendar page**
2. **Verify UI restrictions:**
   - ❌ No "New Shift" button
   - ❌ No employee filters
   - ✅ Calendar views available (read-only)
   - ✅ Can navigate dates
   - ❌ Cannot click to create shifts
   - ❌ Cannot edit existing shifts

#### Test Read-Only Access
1. **View shifts:**
   - ✅ Only own shifts visible
   - ✅ Shift details display correctly
   - ❌ No edit/delete options

### Scenario 3: API Integration Testing

#### Test Data Loading
1. **Check browser console for:**
   - ✅ No 404 errors for API calls
   - ✅ Employee data loading
   - ✅ Shift data loading
   - ✅ Proper error handling

2. **Check Network tab:**
   - ✅ API calls to `/employee/employees/`
   - ✅ API calls to `/employee/shifts`
   - ✅ X-Role-ID header included in requests

#### Test Error Handling
1. **Disconnect from internet:**
   - ✅ Loading states display
   - ✅ Error messages show
   - ✅ Retry functionality works

### Scenario 4: Comprehensive Testing

#### Use Built-in Test Components
1. **Scroll down on calendar page**
2. **Find "Comprehensive Test" section**
3. **Click "Run Comprehensive Test"**
4. **Verify all tests pass:**
   - ✅ Authentication & Role Check
   - ✅ API Endpoints
   - ✅ CRUD Operations
   - ✅ RBAC (Role-Based Access Control)
   - ✅ Data Structure Validation
   - ✅ Timezone Safety

## 🐛 Common Issues & Solutions

### Issue 1: Server Won't Start
**Symptoms:** `npm start` fails or permission errors
**Solutions:**
```bash
# Fix permissions
chmod +x node_modules/.bin/*

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Try alternative start methods
npx vite
# OR
npx vite --host
```

### Issue 2: Calendar Not Loading
**Symptoms:** Blank page or errors on `/calendar`
**Solutions:**
- Check browser console for errors
- Verify route is configured in your router
- Check if user is authenticated

### Issue 3: API Errors
**Symptoms:** 404 errors in console
**Solutions:**
- Verify backend is running
- Check API URL in environment variables
- Ensure endpoints match specification

### Issue 4: Role Permissions Not Working
**Symptoms:** Admin can't create shifts or member sees admin features
**Solutions:**
- Check user role in authentication context
- Verify `canManageShifts()` function
- Check X-Role-ID header is being sent

## 📊 Expected Test Results

### ✅ Success Indicators
- Calendar loads and displays correctly
- All three views (Month/Week/List) work
- Role-based permissions enforced
- CRUD operations work for admin/manager
- Read-only access for members
- No console errors
- Responsive design works on mobile

### ❌ Failure Indicators
- Blank calendar page
- 404 API errors
- Permission errors
- JavaScript errors in console
- Non-responsive design
- Missing UI elements

## 🎯 Testing Checklist

### Core Functionality
- [ ] Calendar displays correctly
- [ ] Month/Week/List views work
- [ ] Navigation buttons work
- [ ] Date selection works
- [ ] Today highlighting works

### Role-Based Access
- [ ] Admin can create/edit/delete shifts
- [ ] Manager can create/edit/delete shifts
- [ ] Member can only view own shifts
- [ ] UI elements show/hide based on role

### Shift Management
- [ ] Create shift dialog works
- [ ] Form validation works
- [ ] Edit shift dialog works
- [ ] Delete confirmation works
- [ ] Calendar updates without reload

### API Integration
- [ ] Employee data loads
- [ ] Shift data loads
- [ ] CRUD operations work
- [ ] Error handling works
- [ ] Loading states display

### UI/UX
- [ ] Responsive design works
- [ ] Color coding for employees
- [ ] Hover effects work
- [ ] Form inputs work correctly
- [ ] Error messages are clear

## 🚀 Production Readiness

After all tests pass:
- [ ] Remove console.log statements
- [ ] Optimize bundle size
- [ ] Test with real backend
- [ ] Performance testing
- [ ] Security review
- [ ] User acceptance testing

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all files are in place using `node test-implementation.js`
3. Check the implementation documentation
4. Review the testing checklist

---

**Remember:** The comprehensive test component will automatically verify most functionality. Use it as your primary testing tool!

