# Square Integration for Allyvia

This module provides comprehensive integration with Square's POS system to fetch and display financial, employee, and inventory data in Allyvia.

## Features

- **OAuth Authentication**: Connect to Square using personal access tokens
- **Webhook Support**: Real-time data updates via Square webhooks
- **Comprehensive Data Sync**: Financial, employee, inventory, and order data
- **Location Management**: Sync and manage multiple Square locations
- **Financial Summaries**: Generate daily, weekly, and monthly financial reports
- **Real-time Data**: Sync data on-demand or automatically via webhooks
- **Error Handling**: Comprehensive error handling and logging
- **Multi-location Support**: Handle data from multiple Square locations
- **Dashboard Analytics**: Comprehensive dashboard with aggregated data
- **Employee Performance Tracking**: Track employee sales and performance
- **Inventory Management**: Monitor stock levels and alerts
- **Order Management**: Track orders and order items

## API Endpoints

### Connection Management

#### Connect to Square
```
POST /api/v1/square/connect/
```
**Request Body:**
```json
{
    "company_id": "uuid",
    "access_token": "your_square_access_token",
    "merchant_id": "optional_merchant_id",
    "environment": "sandbox" // or "production"
}
```

#### Disconnect from Square
```
DELETE /api/v1/square/connect/
```
**Request Body:**
```json
{
    "company_id": "uuid"
}
```

### Data Synchronization

#### Sync Square Data
```
POST /api/v1/square/sync/
```
**Request Body:**
```json
{
    "company_id": "uuid",
    "force_sync": false
}
```

### Financial Data

#### Get Financial Summaries
```
POST /api/v1/square/financial-summary/
```
**Request Body:**
```json
{
    "company_id": "uuid",
    "location_id": "optional_location_uuid",
    "period_type": "DAILY", // or "WEEKLY", "MONTHLY"
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
}
```

### Status and Data Retrieval

#### Get Integration Status
```
GET /api/v1/square/status/{company_id}/
```

#### Get Locations
```
GET /api/v1/square/locations/{company_id}/
```

#### Get Transactions
```
GET /api/v1/square/transactions/{company_id}/
```
**Query Parameters:**
- `location_id`: Filter by location UUID
- `status`: Filter by transaction status
- `limit`: Limit number of transactions returned

#### Get Employees
```
GET /api/v1/square/employees/{company_id}/
```
**Query Parameters:**
- `location_id`: Filter by location UUID
- `status`: Filter by status (ACTIVE, INACTIVE, TERMINATED)
- `limit`: Limit number of employees returned

#### Get Inventory Items
```
GET /api/v1/square/inventory/{company_id}/
```
**Query Parameters:**
- `location_id`: Filter by location UUID
- `item_type`: Filter by item type (ITEM, CATEGORY, MODIFIER, TAX)
- `is_available`: Filter by availability (true/false)
- `limit`: Limit number of items returned

#### Get Orders
```
GET /api/v1/square/orders/{company_id}/
```
**Query Parameters:**
- `location_id`: Filter by location UUID
- `status`: Filter by status (OPEN, COMPLETED, CANCELED, DRAFT)
- `employee_id`: Filter by employee UUID
- `limit`: Limit number of orders returned

#### Dashboard Data
```
GET /api/v1/square/dashboard/{company_id}/
```
**Query Parameters:**
- `location_id`: Filter by location UUID
- `period`: Time period (today, week, month, year)

#### Analytics Data
```
GET /api/v1/square/analytics/{company_id}/
```
**Query Parameters:**
- `location_id`: Filter by location UUID
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

#### Webhook Events
```
GET /api/v1/square/webhook-events/{company_id}/
```
**Query Parameters:**
- `event_type`: Filter by event type
- `processed`: Filter by processed status (true/false)
- `limit`: Limit number of events returned

#### Retry Webhook Event
```
POST /api/v1/square/webhook-retry/{event_id}/
```
Retry processing a failed webhook event.

## Database Schema

### SquareIntegration
- `company`: OneToOne relationship with Company
- `square_access_token`: Encrypted access token
- `square_merchant_id`: Square merchant ID
- `square_environment`: 'sandbox' or 'production'
- `is_connected`: Connection status
- `last_sync`: Last sync timestamp
- `sync_frequency_hours`: How often to sync data

### SquareLocation
- `company`: ForeignKey to Company
- `square_id`: Square location ID
- `name`: Location name
- `address`: Location address
- `phone`: Phone number
- `website`: Website URL
- `is_active`: Active status

### SquareTransaction
- `company`: ForeignKey to Company
- `square_id`: Square transaction ID
- `location`: ForeignKey to SquareLocation
- `amount`: Transaction amount
- `currency`: Currency code
- `status`: Transaction status
- `payment_method`: Payment method used
- `receipt_url`: Receipt URL
- `source_type`: Payment source type
- `order_id`: Associated order ID
- `transaction_date`: Transaction timestamp

### SquareFinancialSummary
- `company`: ForeignKey to Company
- `location`: ForeignKey to SquareLocation (optional)
- `period_type`: 'DAILY', 'WEEKLY', or 'MONTHLY'
- `period_start`: Period start datetime
- `period_end`: Period end datetime
- `total_sales`: Total sales amount
- `net_revenue`: Net revenue after fees
- `total_refunds`: Total refunds amount
- `transaction_count`: Number of transactions
- `refund_count`: Number of refunds
- `currency`: Currency code

### SquareEmployee
- `company`: ForeignKey to Company
- `square_id`: Square employee ID
- `location`: ForeignKey to SquareLocation (optional)
- `first_name`: Employee first name
- `last_name`: Employee last name
- `email`: Employee email
- `phone`: Employee phone number
- `status`: Employee status (ACTIVE, INACTIVE, TERMINATED)
- `role`: Employee role
- `permissions`: Employee permissions (JSON)

### SquareInventoryItem
- `company`: ForeignKey to Company
- `square_id`: Square item ID
- `location`: ForeignKey to SquareLocation (optional)
- `name`: Item name
- `description`: Item description
- `item_type`: Item type (ITEM, CATEGORY, MODIFIER, TAX)
- `category_id`: Category ID
- `price`: Item price
- `currency`: Currency code
- `stock_quantity`: Current stock quantity
- `low_stock_threshold`: Low stock alert threshold
- `is_available`: Item availability
- `variations`: Item variations (JSON)
- `tax_ids`: Tax IDs (JSON)

### SquareOrder
- `company`: ForeignKey to Company
- `square_id`: Square order ID
- `location`: ForeignKey to SquareLocation
- `employee`: ForeignKey to SquareEmployee (optional)
- `status`: Order status (OPEN, COMPLETED, CANCELED, DRAFT)
- `total_amount`: Order total amount
- `currency`: Currency code
- `customer_id`: Customer ID
- `customer_name`: Customer name
- `customer_email`: Customer email
- `fulfillment_type`: Fulfillment type
- `note`: Order note
- `order_date`: Order date

### SquareOrderItem
- `order`: ForeignKey to SquareOrder
- `inventory_item`: ForeignKey to SquareInventoryItem
- `name`: Item name
- `quantity`: Item quantity
- `unit_price`: Unit price
- `total_price`: Total price
- `variations`: Item variations (JSON)
- `modifiers`: Item modifiers (JSON)

### SquareWebhookEvent
- `company`: ForeignKey to Company
- `event_type`: Webhook event type
- `square_id`: Square resource ID
- `location_id`: Location ID
- `event_data`: Raw webhook payload (JSON)
- `processed`: Processing status
- `processing_error`: Processing error message

## Setup Instructions

### 1. Install Dependencies
The required dependencies are already included in `requirements.txt`:
- `requests>=2.31.0` (for API calls)

### 2. Add to Django Settings
The Square app is already added to `INSTALLED_APPS` in `settings.py`.

### 3. Run Migrations
```bash
python manage.py makemigrations square
python manage.py migrate
```

### 4. Configure Square API
1. Create a Square Developer account
2. Create a new application in the Square Developer Dashboard
3. Generate a personal access token
4. Use the token to connect via the API

## Usage Examples

### Connecting to Square
```python
from square.services import SquareService

# Connect a company to Square
result = SquareService.connect_company(
    company_id="company-uuid",
    access_token="your_square_access_token",
    environment="sandbox"
)

if result['success']:
    print("Connected successfully!")
else:
    print(f"Connection failed: {result['message']}")
```

### Syncing Data
```python
# Sync locations and transactions
locations_result = SquareService.sync_locations("company-uuid")
transactions_result = SquareService.sync_transactions("company-uuid")
```

### Generating Financial Summaries
```python
from datetime import date

# Generate daily summary for the last week
result = SquareService.generate_financial_summary(
    company_id="company-uuid",
    period_type="DAILY",
    start_date=date(2024, 1, 1),
    end_date=date(2024, 1, 7)
)
```

## Management Commands

### Sync Square Data
```bash
# Sync all connected companies
python manage.py sync_square_data

# Sync specific company
python manage.py sync_square_data --company-id "company-uuid"

# Force sync (ignore frequency settings)
python manage.py sync_square_data --force
```

## Error Handling

The integration includes comprehensive error handling for:
- Invalid access tokens
- API rate limits
- Network connectivity issues
- Data parsing errors
- Database transaction failures

All errors are logged with appropriate context for debugging.

## Security Considerations

- Access tokens are stored encrypted in the database
- API calls use HTTPS
- Authentication is required for all endpoints
- Admin role verification for sensitive operations
- Input validation on all API endpoints

## Rate Limiting

Square API has rate limits:
- 100 requests per second for most endpoints
- 1000 requests per minute for payment endpoints

The service includes appropriate delays and error handling for rate limit responses.

## Monitoring

The integration provides:
- Last sync timestamps
- Sync frequency tracking
- Error logging
- Success/failure metrics
- Connection status monitoring

## Future Enhancements

- Webhook support for real-time updates
- Advanced fee calculation
- Product catalog integration
- Customer data sync
- Advanced reporting features
- Multi-currency support 