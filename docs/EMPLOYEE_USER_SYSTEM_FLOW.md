# Employee User Creation System Flow

## Overview

This system enables admins to create employee records and automatically generate user accounts with password setup via email invitation. The system supports both creating user accounts during employee creation and adding user accounts to existing employees.

## System Flow

### 1. Employee Creation with User Account (During Creation)

**Admin Action:**

- Admin creates new employee via existing employee management form
- Admin checks "Create User Account" option (already implemented)
- System creates employee record AND user account simultaneously

### 1b. Employee User Account Creation (For Existing Employees)

**Admin Action:**

- Admin views employee details in the employee details modal
- Admin clicks "Create User Account" button (new UI element to be added)
- System creates user account for existing employee

**Backend Process (During Creation):**

```
POST /employee/?company_id={id}
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@company.com",
  "create_user_account": true
}
```

**Backend Process (For Existing Employee):**

```
PATCH /employee/{id}/?company_id={company_id}
{
  "create_user_account": true
}
```

**Backend Response:**

- Creates employee record
- Creates user account (inactive state)
- Generates password setup token (24-hour expiration)
- Sends welcome email with password setup link
- Returns employee data with user account status

### 2. Welcome Email Process

**Email Content:**

- Subject: "Welcome to Allyvia - Set up your password"
- Contains personalized greeting with employee name
- Includes secure password setup link: `https://app.allyvia.com/reset-password?token={setup_token}&auth=jwt`
- Link expires in 24 hours
- Clear instructions for password setup

**Email Template:**

```
Hi {first_name},

Welcome to Allyvia! Your account has been created.

To complete your account setup, please click the link below to set your password:

[Set Password Link]

This link will expire in 24 hours for security reasons.

If you have any questions, please contact your administrator.

Best regards,
The Allyvia Team
```

### 3. Employee Password Setup

**Employee Action:**

- Employee clicks email link
- Redirected to existing `/reset-password` page with token parameter
- Employee sets new password (using existing password reset flow)
- Password must meet security requirements

**Existing Flow Reuse:**

- Uses existing `AuthResetPassword` component
- Uses existing `/auth/reset-password/` API endpoint
- Uses existing password validation and strength indicators
- Uses existing success/error handling

### 4. Account Activation

**After Password Setup:**

- User account becomes active
- Employee can now login with email/password
- Employee has appropriate role permissions based on company settings

## Technical Implementation

### Frontend Changes Required ✅ COMPLETED

#### 1. Employee Form Enhancement ✅ COMPLETED

**File:** `src/ui-component/employee/employee-management/modals/EmployeeForm.tsx`

**Changes:**

- ✅ Add checkbox/toggle: "Create user account for this employee"
- ✅ Add explanatory text: "Employee will receive welcome email with password setup instructions"
- ✅ Update form data interface to include `create_user_account: boolean`

#### 2. Employee Types Update ✅ COMPLETED

**File:** `src/types/employee.ts`

**Changes:**

```typescript
export interface CreateEmployeeData {
  // ... existing fields
  create_user_account?: boolean; // Optional, defaults to false
}

export interface Employee {
  // ... existing fields
  has_user_account?: boolean;
  user_account_status?: 'active' | 'pending' | 'none';
}
```

#### 3. Employee Details Modal Enhancement ✅ COMPLETED

**File:** `src/ui-component/employee/employee-management/modals/EmployeeDetailsModal.tsx`

**Changes:**

- ✅ Add "Create User Account" button for employees without user accounts
- ✅ Add "Resend Welcome Email" button for employees with user accounts
- ✅ Display user account status in employee details
- ✅ Add API integration for creating user accounts for existing employees
- ✅ Add API integration for resending welcome emails
- ✅ Add success/error handling with snackbar notifications
- ✅ Dynamic button display based on user account status

#### 4. Employee API Enhancement ✅ COMPLETED

**File:** `src/api/employee.api.ts`

**Changes:**

- ✅ Add `createUserAccount` function for existing employees
- ✅ Add `resendWelcomeEmail` function (already implemented)

### Frontend Changes Required

#### 1. Employee Form Enhancement

**File:** `src/ui-component/employee/employee-management/modals/EmployeeForm.tsx`

**Changes:**

- Add checkbox/toggle: "Create user account for this employee"
- Add explanatory text: "Employee will receive welcome email with password setup instructions"
- Update form data interface to include `create_user_account: boolean`

#### 2. Employee Types Update

**File:** `src/types/employee.ts`

**Changes:**

```typescript
export interface CreateEmployeeData {
  // ... existing fields
  create_user_account?: boolean; // Optional, defaults to false
}

export interface Employee {
  // ... existing fields
  has_user_account?: boolean;
  user_account_active?: boolean;
  password_setup_sent?: boolean;
  password_setup_expires_at?: string;
}
```

### Backend API Requirements

#### 1. Enhanced Employee Creation Endpoint

**Endpoint:** `POST /employee/?company_id={id}`

**Request Body:**

```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string (optional)",
  "title": "string (optional)",
  "address": "string (optional)",
  "status": "active|inactive",
  "create_user_account": "boolean (optional)"
}
```

#### 1b. Employee Update Endpoint (for existing employees)

**Endpoint:** `PATCH /employee/{id}/?company_id={company_id}`

**Request Body:**

```json
{
  "create_user_account": true
}
```

**Response:**

```json
{
  "id": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  // ... other employee fields
  "has_user_account": "boolean",
  "user_account_active": "boolean",
  "password_setup_sent": "boolean",
  "password_setup_expires_at": "datetime"
}
```

#### 2. Password Setup Token Generation

**Process:**

- Generate secure random token
- Store token with employee ID and expiration (24 hours)
- Include token in password reset email
- Token can be used with existing `/auth/reset-password/` endpoint

#### 3. Email Service Integration

**Requirements:**

- Send welcome email with password setup link
- Use existing email service (SMTP/SendGrid/etc.)
- Include company branding and personalization
- Handle email delivery failures gracefully

### Database Schema Updates

#### Employee Table

```sql
ALTER TABLE employees ADD COLUMN has_user_account BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN user_account_active BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN password_setup_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN password_setup_expires_at TIMESTAMP NULL;
```

#### User Account Integration

- Link employee records to user accounts via email
- Ensure user accounts have appropriate role assignments
- Handle account activation/deactivation

## Security Considerations

### 1. Token Security

- Password setup tokens expire in 24 hours
- Tokens are single-use (invalidated after password setup)
- Tokens are cryptographically secure random strings
- Rate limiting on token generation

### 2. Email Security

- Email links use HTTPS
- Tokens are not logged in server logs
- Email delivery confirmation
- Fallback for email delivery failures

### 3. Account Security

- Password requirements enforced
- Account locked after multiple failed attempts
- Audit trail for account creation and activation

## User Experience Flow

### Admin Experience

1. **Create Employee:** Admin fills out employee form with user account option
2. **Confirmation:** System shows success message with user account status
3. **Management:** Admin can view user account status in employee list
4. **User Account Management:**
   - For employees without user accounts: Admin can click "Create User Account" button in employee details
   - For employees with user accounts: Admin can click "Resend Welcome Email" button in employee details
5. **Status Tracking:** Admin can see user account status (Active, Pending, None) in both employee list and details modal

### Employee Experience

1. **Receive Email:** Employee gets welcome email with setup link
2. **Set Password:** Employee clicks link and sets secure password
3. **Login:** Employee can now login to the system
4. **Access:** Employee has appropriate permissions based on role

## Error Handling

### Common Scenarios

1. **Email Delivery Failure:** Admin notification with retry option
2. **Token Expiration:** Clear error message with resend option
3. **Invalid Token:** Security-focused error message
4. **Duplicate Email:** Prevent creation with clear error message
5. **Network Issues:** Graceful degradation with retry mechanisms

### User Feedback

- Clear success/error messages
- Progress indicators for async operations
- Helpful error descriptions
- Action buttons for common recovery actions

## Implementation Priority

### Phase 1: Core Functionality

1. Update employee creation form with user account option
2. Enhance backend employee creation endpoint
3. Implement password setup token generation
4. Create welcome email template and sending logic

### Phase 2: Enhanced Features

1. Add user account management to employee list
2. Implement resend welcome email functionality
3. Add account activation/deactivation controls
4. Implement audit logging

### Phase 3: Advanced Features

1. Bulk employee creation with user accounts
2. Advanced email templates and personalization
3. Integration with existing role management
4. Advanced security features and monitoring

## Benefits

### For Admins

- Streamlined employee onboarding process
- Reduced manual account creation work
- Better visibility into user account status
- Automated email notifications

### For Employees

- Professional welcome experience
- Clear password setup process
- Immediate access after setup
- Consistent onboarding flow

### For System

- Reduced administrative overhead
- Better security with token-based setup
- Improved user experience
- Scalable onboarding process
