import uuid
from django.db import models
from django.utils import timezone
from company.models import Company


class SquareIntegration(models.Model):
    """
    Model representing Square integration settings for a company
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='square_integration')
    
    # Square API credentials
    square_access_token = models.TextField(null=True, blank=True)
    square_merchant_id = models.CharField(max_length=255, null=True, blank=True)
    square_environment = models.CharField(max_length=20, default='sandbox')  # 'sandbox' or 'production'
    
    # Integration status
    is_connected = models.BooleanField(default=False)
    last_sync = models.DateTimeField(null=True, blank=True)
    sync_frequency_hours = models.IntegerField(default=24)  # How often to sync data
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Square Integration'
        verbose_name_plural = 'Square Integrations'
    
    def __str__(self):
        return f"Square Integration for {self.company.name}"
    
    @property
    def is_token_valid(self):
        """
        Check if the Square access token is valid
        """
        return bool(self.square_access_token and self.is_connected)
    
    def update_connection_status(self, is_connected, access_token=None, merchant_id=None):
        """
        Update the Square connection status and tokens
        """
        self.is_connected = is_connected
        if access_token:
            self.square_access_token = access_token
        if merchant_id:
            self.square_merchant_id = merchant_id
        self.save(update_fields=['is_connected', 'square_access_token', 'square_merchant_id', 'updated_at'])


class SquareLocation(models.Model):
    """
    Model representing Square locations
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='square_locations')
    square_id = models.CharField(max_length=255, unique=True)
    
    # Location details
    name = models.CharField(max_length=255)
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    website = models.URLField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Square Location'
        verbose_name_plural = 'Square Locations'
        unique_together = ['company', 'square_id']
    
    def __str__(self):
        return f"{self.name} ({self.company.name})"


class SquareTransaction(models.Model):
    """
    Model representing Square transactions/payments
    """
    TRANSACTION_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELED', 'Canceled'),
        ('REFUNDED', 'Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='square_transactions')
    square_id = models.CharField(max_length=255, unique=True)
    location = models.ForeignKey(SquareLocation, on_delete=models.CASCADE, related_name='transactions', null=True, blank=True)
    
    # Transaction details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS_CHOICES, default='PENDING')
    
    # Payment details
    payment_method = models.CharField(max_length=50, null=True, blank=True)
    receipt_url = models.URLField(null=True, blank=True)
    
    # Metadata
    source_type = models.CharField(max_length=50, null=True, blank=True)  # 'CARD', 'CASH', etc.
    order_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Timestamps
    transaction_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Square Transaction'
        verbose_name_plural = 'Square Transactions'
        ordering = ['-transaction_date']
    
    def __str__(self):
        return f"Transaction {self.square_id} - {self.amount} {self.currency}"


class SquareFinancialSummary(models.Model):
    """
    Model for storing daily/weekly financial summaries
    """
    PERIOD_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='square_financial_summaries')
    location = models.ForeignKey(SquareLocation, on_delete=models.CASCADE, related_name='financial_summaries', null=True, blank=True)
    
    # Summary period
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Financial data
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_refunds = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transaction_count = models.IntegerField(default=0)
    refund_count = models.IntegerField(default=0)
    
    # Currency
    currency = models.CharField(max_length=3, default='USD')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Square Financial Summary'
        verbose_name_plural = 'Square Financial Summaries'
        unique_together = ['company', 'location', 'period_type', 'period_start', 'period_end']
        ordering = ['-period_start']
    
    def __str__(self):
        location_name = self.location.name if self.location else 'All Locations'
        return f"{location_name} - {self.period_type} Summary ({self.period_start.date()})"


class SquareEmployee(models.Model):
    """
    Model representing Square employees
    """
    EMPLOYEE_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('TERMINATED', 'Terminated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='square_employees')
    square_id = models.CharField(max_length=255, unique=True)
    location = models.ForeignKey(SquareLocation, on_delete=models.CASCADE, related_name='employees', null=True, blank=True)
    
    # Employee details
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    status = models.CharField(max_length=20, choices=EMPLOYEE_STATUS_CHOICES, default='ACTIVE')
    
    # Role and permissions
    role = models.CharField(max_length=100, null=True, blank=True)
    permissions = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Square Employee'
        verbose_name_plural = 'Square Employees'
        unique_together = ['company', 'square_id']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.company.name})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class SquareInventoryItem(models.Model):
    """
    Model representing Square inventory items
    """
    ITEM_TYPE_CHOICES = [
        ('ITEM', 'Item'),
        ('CATEGORY', 'Category'),
        ('MODIFIER', 'Modifier'),
        ('TAX', 'Tax'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='square_inventory_items')
    square_id = models.CharField(max_length=255, unique=True)
    location = models.ForeignKey(SquareLocation, on_delete=models.CASCADE, related_name='inventory_items', null=True, blank=True)
    
    # Item details
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='ITEM')
    category_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    
    # Inventory tracking
    stock_quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    
    # Metadata
    variations = models.JSONField(default=list, blank=True)
    tax_ids = models.JSONField(default=list, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Square Inventory Item'
        verbose_name_plural = 'Square Inventory Items'
        unique_together = ['company', 'square_id']
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.company.name})"


class SquareOrder(models.Model):
    """
    Model representing Square orders
    """
    ORDER_STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('COMPLETED', 'Completed'),
        ('CANCELED', 'Canceled'),
        ('DRAFT', 'Draft'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='square_orders')
    square_id = models.CharField(max_length=255, unique=True)
    location = models.ForeignKey(SquareLocation, on_delete=models.CASCADE, related_name='orders')
    employee = models.ForeignKey(SquareEmployee, on_delete=models.SET_NULL, related_name='orders', null=True, blank=True)
    
    # Order details
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='OPEN')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Customer info
    customer_id = models.CharField(max_length=255, null=True, blank=True)
    customer_name = models.CharField(max_length=255, null=True, blank=True)
    customer_email = models.EmailField(null=True, blank=True)
    
    # Order metadata
    fulfillment_type = models.CharField(max_length=50, null=True, blank=True)  # PICKUP, DELIVERY, etc.
    note = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    order_date = models.DateTimeField()
    
    class Meta:
        verbose_name = 'Square Order'
        verbose_name_plural = 'Square Orders'
        ordering = ['-order_date']
    
    def __str__(self):
        return f"Order {self.square_id} - {self.total_amount} {self.currency}"


class SquareOrderItem(models.Model):
    """
    Model representing items within Square orders
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(SquareOrder, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(SquareInventoryItem, on_delete=models.CASCADE, related_name='order_items')
    
    # Item details
    name = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Variations and modifiers
    variations = models.JSONField(default=list, blank=True)
    modifiers = models.JSONField(default=list, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Square Order Item'
        verbose_name_plural = 'Square Order Items'
    
    def __str__(self):
        return f"{self.name} x{self.quantity} ({self.order.square_id})"


class SquareWebhookEvent(models.Model):
    """
    Model for tracking webhook events from Square
    """
    EVENT_TYPE_CHOICES = [
        ('payment.created', 'Payment Created'),
        ('payment.updated', 'Payment Updated'),
        ('order.created', 'Order Created'),
        ('order.updated', 'Order Updated'),
        ('inventory.count.updated', 'Inventory Count Updated'),
        ('employee.created', 'Employee Created'),
        ('employee.updated', 'Employee Updated'),
        ('item.created', 'Item Created'),
        ('item.updated', 'Item Updated'),
        ('location.created', 'Location Created'),
        ('location.updated', 'Location Updated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='square_webhook_events')
    
    # Webhook details
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    square_id = models.CharField(max_length=255)  # ID of the affected resource
    location_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Event data
    event_data = models.JSONField()  # Raw webhook payload
    processed = models.BooleanField(default=False)
    processing_error = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Square Webhook Event'
        verbose_name_plural = 'Square Webhook Events'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.event_type} - {self.square_id} ({self.company.name})" 