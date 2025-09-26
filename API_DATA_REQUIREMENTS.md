# Employee Analytics API Data Requirements

## Timeline Chart Data Requirements

### **GET** `/api/v1/analytics/employee/daily/`

**Required Parameters:**

- `start_date` (required): Start date (YYYY-MM-DD)
- `end_date` (required): End date (YYYY-MM-DD)

**Required Response Structure:**

```json
{
  "daily_breakdown": [
    {
      "day": "Monday",
      "date": "2025-09-18",
      "employees": [
        {
          "employee_id": "uuid-here",
          "employee_name": "John Doe",
          "hours": 8.5,
          "start_time": "2025-09-18T09:00:00Z",
          "end_time": "2025-09-18T17:30:00Z"
        },
        {
          "employee_id": "uuid-here-2",
          "employee_name": "Jane Smith",
          "hours": 6.25,
          "start_time": "2025-09-18T01:23:00Z",
          "end_time": "2025-09-18T06:28:00Z"
        }
      ]
    },
    {
      "day": "Tuesday",
      "date": "2025-09-19",
      "employees": [
        {
          "employee_id": "uuid-here",
          "employee_name": "John Doe",
          "hours": 7.0,
          "start_time": "2025-09-19T08:30:00Z",
          "end_time": "2025-09-19T15:30:00Z"
        }
      ]
    }
  ]
}
```

## Field Requirements

### **Daily Breakdown Object**

- `day` (string): Day name ("Monday", "Tuesday", etc.)
- `date` (string): ISO date (YYYY-MM-DD)
- `employees` (array): Array of employee data for that day

### **Employee Object**

- `employee_id` (string): Unique employee identifier
- `employee_name` (string): Employee display name
- `hours` (number): Total hours worked (for fallback calculations)
- `start_time` (string|null): ISO 8601 timestamp of clock-in
- `end_time` (string|null): ISO 8601 timestamp of clock-out

## Data Types Explained

### **Time Fields**

- **Format**: ISO 8601 timestamps (`2025-09-18T09:00:00Z`)
- **Timezone**: UTC (backend handles timezone conversion)
- **Null Values**: `start_time` or `end_time` can be null for open shifts

### **Hours Field**

- **Type**: Number (float)
- **Purpose**: Used for fallback when `start_time`/`end_time` are missing
- **Calculation**: `(end_time - start_time) / 3600` in seconds

### **Day Names**

- **Format**: Full day names ("Monday", "Tuesday", etc.)
- **Order**: Should match chronological order of `date` field

## Timeline Chart Usage

### **Frontend Processing**

1. **Real Times**: Uses `start_time` and `end_time` when available
2. **Fallback**: Simulates times based on `hours` field if times missing
3. **Week Filtering**: Filters by `date` field within selected week range
4. **Employee Selection**: Shows only selected employees from checkbox list

### **Chart Display**

- **X-Axis**: 24-hour timeline (12:00 AM to 11:59 PM)
- **Y-Axis**: Days of week (Sunday through Saturday)
- **Bars**: Show actual shift times (e.g., "9:00 AM - 5:30 PM")
- **Multiple Shifts**: Supports multiple shifts per employee per day

## Example API Calls

### **Single Week**

```bash
curl -X GET "http://localhost:8000/api/v1/analytics/employee/daily/?start_date=2025-09-18&end_date=2025-09-24" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Role-ID: YOUR_ROLE_ID"
```

### **Multiple Weeks**

```bash
curl -X GET "http://localhost:8000/api/v1/analytics/employee/daily/?start_date=2025-09-01&end_date=2025-09-30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Role-ID: YOUR_ROLE_ID"
```

## Edge Cases

### **Open Shifts**

```json
{
  "employee_id": "uuid-here",
  "employee_name": "John Doe",
  "hours": 4.5,
  "start_time": "2025-09-18T09:00:00Z",
  "end_time": null
}
```

### **Overnight Shifts**

```json
{
  "employee_id": "uuid-here",
  "employee_name": "Jane Smith",
  "hours": 8.0,
  "start_time": "2025-09-18T22:00:00Z",
  "end_time": "2025-09-19T06:00:00Z"
}
```

### **Multiple Shifts Per Day**

```json
{
  "day": "Monday",
  "date": "2025-09-18",
  "employees": [
    {
      "employee_id": "uuid-here",
      "employee_name": "John Doe",
      "hours": 4.0,
      "start_time": "2025-09-18T09:00:00Z",
      "end_time": "2025-09-18T13:00:00Z"
    },
    {
      "employee_id": "uuid-here",
      "employee_name": "John Doe",
      "hours": 4.0,
      "start_time": "2025-09-18T14:00:00Z",
      "end_time": "2025-09-18T18:00:00Z"
    }
  ]
}
```

## Frontend TypeScript Interface

```typescript
interface DailyBreakdown {
  day: string; // "Monday", "Tuesday", etc.
  date: string; // "2025-09-18"
  employees: DailyEmployeeData[];
}

interface DailyEmployeeData {
  employee_id: string;
  employee_name: string;
  hours: number;
  start_time?: string | null; // ISO 8601 timestamp
  end_time?: string | null; // ISO 8601 timestamp
}

interface EmployeeDailyResponse {
  daily_breakdown: DailyBreakdown[];
}
```

This structure ensures the timeline chart can display real shift times with proper week navigation and employee selection filtering.
