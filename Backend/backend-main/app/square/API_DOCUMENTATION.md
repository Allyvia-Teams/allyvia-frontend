# Square Integration API Documentation

## Overview

The Square integration provides endpoints to connect Allyvia with Square's POS system, sync financial data, and generate reports.

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Connect to Square

**POST** `/api/v1/square/connect/`

Connect a company to Square using an access token.

**Request Body:**
```json
{
    "company_id": "uuid",
    "access_token": "your_square_access_token",
    "merchant_id": "optional_merchant_id",
    "environment": "sandbox"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Square connected successfully",
    "integration": {
        "id": "uuid",
        "company": "uuid",
        "is_connected": true,
        "last_sync": null,
        "sync_frequency_hours": 24,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
}
```

### 2. Disconnect from Square

**DELETE** `/api/v1/square/connect/`

Disconnect a company from Square.

**Request Body:**
```json
{
    "company_id": "uuid"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Square disconnected successfully"
}
```

### 3. Sync Square Data

**POST** `/api/v1/square/sync/`

Sync locations and transactions from Square.

**Request Body:**
```json
{
    "company_id": "uuid",
    "force_sync": false
}
```

**Response:**
```json
{
    "success": true,
    "message": "Sync completed. Successfully synced 2 locations Successfully synced 15 transactions",
    "locations_synced": 2,
    "transactions_synced": 15
}
```

### 4. Get Financial Summary

**POST** `/api/v1/square/financial-summary/`

Generate financial summaries for a specified period.

**Request Body:**
```json
{
    "company_id": "uuid",
    "location_id": "optional_location_uuid",
    "period_type": "DAILY",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Financial summary generated successfully",
    "summaries": [
        {
            "id": "uuid",
            "company": "uuid",
            "location": "uuid",
            "location_name": "Main Store",
            "period_type": "DAILY",
            "period_start": "2024-01-01T00:00:00Z",
            "period_end": "2024-01-01T23:59:59Z",
            "total_sales": 1500.00,
            "net_revenue": 1425.00,
            "total_refunds": 75.00,
            "transaction_count": 25,
            "refund_count": 2,
            "currency": "USD",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    ],
    "total_sales": 46500.00,
    "total_net_revenue": 44175.00,
    "total_refunds": 2325.00,
    "total_transactions": 775,
    "total_refund_count": 31
}
```

### 5. Get Integration Status

**GET** `/api/v1/square/status/{company_id}/`

Get the Square integration status for a company.

**Response:**
```json
{
    "id": "uuid",
    "company": "uuid",
    "is_connected": true,
    "last_sync": "2024-01-01T12:00:00Z",
    "sync_frequency_hours": 24,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
}
```

### 6. Get Locations

**GET** `/api/v1/square/locations/{company_id}/`

Get all Square locations for a company.

**Response:**
```json
[
    {
        "id": "uuid",
        "company": "uuid",
        "square_id": "location_square_id",
        "name": "Main Store",
        "address": "123 Main St",
        "phone": "555-1234",
        "website": "https://example.com",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
]
```

### 7. Get Transactions

**GET** `/api/v1/square/transactions/{company_id}/`

Get Square transactions for a company with optional filtering.

**Query Parameters:**
- `location_id`: Filter by location UUID
- `status`: Filter by transaction status (PENDING, COMPLETED, FAILED, CANCELED, REFUNDED)
- `limit`: Limit number of transactions returned

**Response:**
```json
[
    {
        "id": "uuid",
        "company": "uuid",
        "square_id": "transaction_square_id",
        "location": "uuid",
        "location_name": "Main Store",
        "amount": 150.00,
        "currency": "USD",
        "status": "COMPLETED",
        "payment_method": "CARD",
        "receipt_url": "https://receipt.url",
        "source_type": "CARD",
        "order_id": "order_id",
        "transaction_date": "2024-01-01T10:30:00Z",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
]
```

## Error Responses

All endpoints return consistent error responses:

```json
{
    "success": false,
    "message": "Error description"
}
```

Common HTTP status codes:
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

The Square API has rate limits:
- 100 requests per second for most endpoints
- 1000 requests per minute for payment endpoints

The service includes appropriate error handling for rate limit responses.

## Data Types

### Period Types
- `DAILY`: Daily summaries
- `WEEKLY`: Weekly summaries
- `MONTHLY`: Monthly summaries

### Transaction Status
- `PENDING`: Transaction is pending
- `COMPLETED`: Transaction completed successfully
- `FAILED`: Transaction failed
- `CANCELED`: Transaction was canceled
- `REFUNDED`: Transaction was refunded

### Environments
- `sandbox`: Square sandbox environment
- `production`: Square production environment

## Examples

### Connect to Square
```bash
curl -X POST http://localhost:8000/api/v1/square/connect/ \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "company-uuid",
    "access_token": "your_square_access_token",
    "environment": "sandbox"
  }'
```

### Get Financial Summary
```bash
curl -X POST http://localhost:8000/api/v1/square/financial-summary/ \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "company-uuid",
    "period_type": "DAILY",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }'
```

### Get Transactions
```bash
curl -X GET "http://localhost:8000/api/v1/square/transactions/company-uuid/?status=COMPLETED&limit=10" \
  -H "Authorization: Bearer <your_jwt_token>"
``` 