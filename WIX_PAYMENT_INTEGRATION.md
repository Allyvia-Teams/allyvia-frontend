# Wix Payment Integration - Post-Payment Onboarding Flow

This document describes the complete post-payment onboarding flow for Allyvia, which integrates with Wix Payments to automatically send secure signup links to customers after successful payments.

## 🏗️ System Architecture

### Backend (Django)
- **Models**: `SignupLink`, `WixWebhookLog`
- **Services**: `WixWebhookService`, `EmailService`, `SignupLinkService`
- **API Endpoints**: Webhook handler, signup link management
- **Database**: PostgreSQL with Django ORM

### Frontend (React + TypeScript)
- **Components**: `SignupWithToken`, `EmailInvitation`
- **Routing**: Token-based signup flow
- **UI**: Material-UI with modern design

## 📋 Business Flow

1. **Customer purchases on Wix** → Payment processed via Wix Payments
2. **Wix sends webhook** → Our backend receives payment confirmation
3. **Backend generates signup link** → Secure token with customer data
4. **Email sent automatically** → Customer receives welcome email with signup link
5. **Customer clicks link** → Frontend validates token and shows signup form
6. **Account creation** → Token marked as used, user account created

## 🔧 Technical Implementation

### Database Models

#### SignupLink
```python
class SignupLink(models.Model):
    email = models.EmailField()
    token = models.CharField(max_length=64, unique=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES)
    wix_order_id = models.CharField(max_length=100, unique=True)
    wix_payment_id = models.CharField(max_length=100, blank=True, null=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(default=7 days from creation)
```

#### WixWebhookLog
```python
class WixWebhookLog(models.Model):
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    wix_order_id = models.CharField(max_length=100)
    wix_payment_id = models.CharField(max_length=100, blank=True, null=True)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
```

### API Endpoints

#### Webhook Handler
```
POST /api/v1/invitation/webhook/wix/
```
- Receives Wix payment webhooks
- Validates webhook signature (optional)
- Processes payment.succeeded events
- Creates signup links automatically
- Sends welcome emails

#### Signup Link Management
```
POST /api/v1/invitation/create/          # Create signup link manually
GET  /api/v1/invitation/validate/{token}/ # Validate signup link
POST /api/v1/invitation/use/{token}/      # Mark link as used
GET  /api/v1/invitation/details/{token}/  # Get link details
GET  /api/v1/invitation/webhook/logs/     # View webhook logs
```

### Frontend Routes

```
/signup?token=xyz     # Token-based signup page
/invitation/create    # Manual invitation creation (testing)
```

## 🚀 Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=allyviateam@gmail.com
EMAIL_HOST_PASSWORD= sqaw fjyu ohve qqwv
DEFAULT_FROM_EMAIL=allyviateam@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Wix Webhook Secret (optional)
WIX_WEBHOOK_SECRET=your-webhook-secret
```

### 2. Database Migration

```bash
cd Backend/backend-main/app
python manage.py makemigrations invitation
python manage.py migrate
```

### 3. Email Setup

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_HOST_PASSWORD`

### 4. Wix Webhook Configuration

In your Wix dashboard:
1. Go to Developer Tools → Webhooks
2. Create a new webhook
3. Set the URL to: `https://your-domain.com/api/v1/invitation/webhook/wix/`
4. Select events: `payment.succeeded`, `payment.failed`
5. Configure retry settings (recommended: 3 retries, 5-minute intervals)

## 🧪 Testing

### Manual Testing

1. **Create Test Invitation**:
   - Visit `/invitation/create`
   - Enter email and select plan
   - Generate signup link

2. **Test Signup Flow**:
   - Click the generated signup URL
   - Complete the signup form
   - Verify account creation

### Webhook Testing

1. **Simulate Wix Webhook**:
```bash
curl -X POST http://localhost:8000/api/v1/invitation/webhook/wix/ \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "payment.succeeded",
    "orderId": "test-order-123",
    "paymentId": "test-payment-456",
    "customerEmail": "test@example.com",
    "plan": "pro"
  }'
```

2. **Check Webhook Logs**:
   - Visit `/api/v1/invitation/webhook/logs/`
   - Verify webhook processing

## 🔒 Security Features

### Token Security
- **Cryptographically secure**: Uses `secrets.token_urlsafe(32)`
- **One-time use**: Tokens are marked as used after signup
- **Time-limited**: Tokens expire after 7 days
- **Unique**: Each token is unique and non-guessable

### Webhook Security
- **Signature verification**: Optional HMAC signature validation
- **Idempotency**: Prevents duplicate processing
- **Error handling**: Comprehensive error logging
- **Retry logic**: Handles temporary failures

### Email Security
- **TLS encryption**: All emails sent over TLS
- **No sensitive data**: Tokens are secure URLs, not plain text
- **Professional templates**: Branded welcome emails

## 📊 Monitoring & Analytics

### Webhook Monitoring
- All webhook events are logged
- Processing status tracked
- Error messages captured
- Retry attempts logged

### Signup Analytics
- Token usage tracking
- Plan distribution
- Conversion rates
- Expiration tracking

## 🔄 Integration Points

### Wix Integration
- **Webhook endpoint**: Receives payment confirmations
- **Order tracking**: Links signup to Wix order ID
- **Plan mapping**: Maps Wix products to Allyvia plans

### Email Integration
- **Welcome emails**: Automatic after payment
- **Template system**: Professional HTML templates
- **Delivery tracking**: SMTP with error handling

### Frontend Integration
- **Token validation**: Real-time token checking
- **Form pre-filling**: Email from payment data
- **Plan display**: Shows selected plan during signup

## 🚨 Error Handling

### Webhook Errors
- **Invalid signature**: Rejected with 400 status
- **Missing data**: Logged with error details
- **Processing failures**: Retry with exponential backoff
- **Duplicate orders**: Handled gracefully

### Token Errors
- **Expired tokens**: Clear error message
- **Used tokens**: Prevents double signup
- **Invalid tokens**: Secure error handling
- **Network issues**: Retry mechanisms

### Email Errors
- **SMTP failures**: Logged for debugging
- **Invalid addresses**: Graceful handling
- **Template errors**: Fallback to plain text

## 🔮 Future Enhancements

### Planned Features
- **Analytics dashboard**: Track conversion rates
- **CRM integration**: Sync with customer data
- **Plan upgrades**: Handle plan changes
- **Bulk invitations**: Admin interface for multiple invites
- **Custom domains**: Branded signup URLs
- **A/B testing**: Test different email templates

### Advanced Features
- **Multi-language**: Internationalization support
- **Social login**: OAuth integration
- **Two-factor auth**: Enhanced security
- **API rate limiting**: Prevent abuse
- **Webhook retry queue**: Background processing

## 📞 Support

### Common Issues

1. **Emails not sending**:
   - Check SMTP settings
   - Verify app passwords
   - Check firewall settings

2. **Webhooks not received**:
   - Verify webhook URL
   - Check CORS settings
   - Test with curl

3. **Tokens not working**:
   - Check token expiration
   - Verify frontend URL
   - Check database connectivity

### Debug Tools
- **Webhook logs**: `/api/v1/invitation/webhook/logs/`
- **Database queries**: Django admin interface
- **Email testing**: Manual invitation creation
- **Token validation**: Direct API calls

## 📝 API Documentation

### Webhook Payload Format
```json
{
  "eventType": "payment.succeeded",
  "orderId": "wix-order-123",
  "paymentId": "wix-payment-456",
  "customerEmail": "customer@example.com",
  "plan": "pro",
  "amount": 99.99,
  "currency": "USD"
}
```

### Signup Link Response
```json
{
  "email": "customer@example.com",
  "plan": "pro",
  "token": "abc123...",
  "signup_url": "https://app.allyvia.com/signup?token=abc123...",
  "created_at": "2024-01-01T12:00:00Z",
  "expires_at": "2024-01-08T12:00:00Z",
  "is_used": false
}
```

This system provides a complete, secure, and scalable solution for post-payment onboarding that integrates seamlessly with Wix Payments and provides a smooth user experience. 