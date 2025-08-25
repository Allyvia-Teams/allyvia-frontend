# Authentication & Role Management Documentation

## Ticket Reference

**FE-002**: Authentication & Authorization Interface  
**Status**: Complete  
**Implementation**: Live Django backend integration (not using mock API)

## Redux Store Structure

### Auth State (`store.auth`)

The authentication state is managed by Redux Toolkit and contains the following fields:

```typescript
{
  isLoading: boolean,       // Loading state for auth operations
  isLoggedIn: boolean,      // User authentication status
  isInitialized: boolean,   // Auth system initialization status
  user: {                   // User profile data
    id: string,
    email: string,
    first_name?: string,
    last_name?: string
  } | null,
  roles: [                   // Array of user roles across companies
    {
      id: string,            // UUID of the role (used for X-Role-ID)
      company_id: string,    // UUID of the company
      company_name: string,  // Display name of company
      role_type: 'admin' | 'manager' | 'member' | 'viewer',
      role_display: string   // Human-readable role name
    }
  ],
  currentRole: Role | null,  // Currently selected role
  error: string | null       // Error messages
}
```

### Local Storage Keys

```javascript
access; // JWT access token
refresh; // JWT refresh token
role_id; // Current role UUID (for X-Role-ID header)
currentRoleId; // Duplicate storage for role persistence
```

## Integrated API Endpoints

### Authentication Endpoints

| Endpoint                 | Method | Purpose              | Request Body                                                   | Response                              |
| ------------------------ | ------ | -------------------- | -------------------------------------------------------------- | ------------------------------------- |
| `/api/v1/auth/register/` | POST   | User registration    | `{ email, password, password_confirm, first_name, last_name }` | `{ access, refresh, user_id, email }` |
| `/api/v1/auth/login/`    | POST   | User login           | `{ email, password }`                                          | `{ access, refresh, user_id, email }` |
| `/api/v1/auth/refresh/`  | POST   | Refresh access token | `{ refresh }`                                                  | `{ access, refresh }`                 |

### User & Role Endpoints

| Endpoint                | Method | Purpose            | Headers                         | Response                          |
| ----------------------- | ------ | ------------------ | ------------------------------- | --------------------------------- |
| `/api/v1/user/profile/` | GET    | Fetch user profile | `Authorization: Bearer <token>` | User object                       |
| `/api/v1/role/`         | GET    | Fetch user's roles | `Authorization: Bearer <token>` | Array of Role objects (see below) |

#### GET /role/ Response Structure

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000", // UUID - This becomes X-Role-ID
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "company_name": "Acme Corporation",
    "role_type": "admin", // One of: admin, manager, member, viewer
    "role_display": "Admin" // Human-readable role name
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "company_id": "223e4567-e89b-12d3-a456-426614174001",
    "company_name": "Tech Solutions Inc",
    "role_type": "member",
    "role_display": "Member"
  }
]
```

## Role Assignment Flow

### Important: No Frontend Role Creation

- **Role Creation**: Roles are NOT created through the frontend UI
- **Backend Only**: Roles must be assigned via Django Admin or backend API
- **User Access**: Users can only select from roles already assigned to them

### How Role Selection Works

1. **After Login/Register**: Frontend calls `GET /role/` to fetch user's roles
2. **Automatic Selection**: First role in the array is automatically selected as `currentRole`
3. **Role ID Storage**: Selected role's `id` is stored in localStorage as `role_id`
4. **Header Attachment**: This `role_id` becomes the `X-Role-ID` header value

### Example Flow

```javascript
// 1. User logs in
// 2. Frontend fetches roles
GET /api/v1/role/
Response: [
  { id: "uuid-1", company_name: "Acme Corp", role_type: "admin" },
  { id: "uuid-2", company_name: "Tech Inc", role_type: "viewer" }
]

// 3. First role auto-selected
currentRole = { id: "uuid-1", ... }
localStorage.setItem('role_id', 'uuid-1')

// 4. All subsequent API calls include
Headers: {
  'Authorization': 'Bearer <token>',
  'X-Role-ID': 'uuid-1'  // The role.id from step 3
}
```

## X-Role-ID Header Implementation

### How It Works

1. **Source**: The `X-Role-ID` value comes from the `id` field in the `/role/` endpoint response
2. **Automatic Attachment**: Axios interceptor automatically adds `X-Role-ID` header to all API requests
3. **Backend Processing**: Django middleware (`role/middleware.py`) validates the role belongs to the authenticated user
4. **Context Setting**: Backend sets `request.current_role` and `request.current_company` for view-level access control

### Usage in Code

```javascript
// The header is automatically attached via axios interceptor
// Location: src/utils/axios.ts lines 38-42

// Request headers will include:
{
  'Authorization': 'Bearer <access_token>',
  'X-Role-ID': '<current_role_uuid>'
}
```

## Role Management

### Role Hierarchy (will be changed once the backend is updated)

- **Admin**: Full access to all company resources
- **Manager**: Can manage users and most resources (includes Admin permissions)
- **Member**: Can access and modify resources (includes Manager permissions)
- **Viewer**: Read-only access (includes Member permissions)

### Switching Roles

```javascript
import { useDispatch, useSelector } from 'react-redux';
import { switchRole } from 'store/slices/auth';

// Get available roles from Redux store
const { roles } = useSelector((state) => state.auth);
// Example roles array:
// [
//   { id: "uuid-1", company_name: "Acme Corp", role_type: "admin" },
//   { id: "uuid-2", company_name: "Tech Inc", role_type: "viewer" }
// ]

// Switch to a different role (for multi-company users)
dispatch(switchRole('uuid-2')); // Switch to Tech Inc viewer role

// After switching, the axios interceptor automatically updates headers:
// All API requests will now include:
// Headers: {
//   'Authorization': 'Bearer <access_token>',
//   'X-Role-ID': 'uuid-2'  // New role ID from switchRole
// }
//
// Backend receives this and sets:
// - request.current_role = Role object for uuid-2
// - request.current_company = Tech Inc company object
```

### Accessing Current Role

```javascript
import { useSelector } from 'store';

const currentRole = useSelector((state) => state.auth.currentRole);
const isAdmin = currentRole?.role_type === 'admin';
const companyId = currentRole?.company_id;
```

## Authentication Flow

### Login/Registration Flow

1. User submits credentials
2. Backend returns JWT tokens (`access` & `refresh`)
3. Tokens stored in localStorage
4. Frontend fetches user profile from `/user/profile/`
5. Frontend fetches roles from `/role/`
6. First role set as `currentRole`
7. User redirected to dashboard

### Token Refresh Flow

1. Access token expires (1 hour in production)
2. Axios interceptor detects 401 response
3. Automatically calls `/auth/refresh/` with refresh token
4. New access token received and stored
5. Original request retried with new token
6. If refresh fails → user logged out

### Page Refresh Flow

1. App checks localStorage for tokens
2. If tokens exist → validates access token
3. If valid → fetches user profile and roles
4. If expired → attempts refresh
5. Redux store repopulated with user data

## Route Guards

### Protected Routes

- **AuthGuard**: Wraps routes requiring authentication
- **GuestGuard**: Wraps auth pages (login/register), redirects logged-in users to dashboard

### Usage Example

```javascript
// Protected route (MainRoutes.tsx)
element: <AuthGuard>
  <MainLayout />
</AuthGuard>;

// Guest route (RegistrationRoutes.tsx)
element: <GuestGuard>
  <MinimalLayout />
</GuestGuard>;
```

## Error Handling

### Registration Errors

- Password validation: Must not be common or entirely numeric
- Required fields: `first_name`, `last_name`, `email`, `password`, `password_confirm`
- Email must be unique

### Authentication Errors

- Invalid credentials → User shown error message
- Token expired → Automatic refresh attempt
- Refresh failed → User logged out and redirected to login

## Redux Actions

### Available Actions

```javascript
import {
  initializeAuth, // Check auth status on app load
  loginAsync, // Login user
  registerAsync, // Register new user
  logoutAsync, // Logout user
  refreshTokenAsync, // Manually refresh token
  switchRole, // Switch active role
  setCurrentRole, // Set current role
  clearError // Clear error messages
} from 'store/slices/auth';
```

## Security Considerations

1. **Token Storage**: Only tokens stored in localStorage, user data stays in memory (Redux)
2. **Automatic Cleanup**: Tokens cleared on logout or refresh failure
3. **Role Validation**: Backend validates X-Role-ID on every request
4. **Password Requirements**: Enforced by Django validators (no common passwords, not entirely numeric)
5. **CORS**: Backend configured for frontend origin
6. **Token Expiry**: Access token expires in 1 hour (production) / 48 hours (development)

## Implementation Notes

- **Redux vs Context**: Migrated from React Context to Redux for single source of truth
- **Mock API**: Available in codebase but currently using live backend
- **Retry Logic**: MAX_RETRY_ATTEMPTS = 2 to prevent infinite loops
- **Build Status**: No build errors, production ready
