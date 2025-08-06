from rest_framework import serializers
from .models import (
    SquareIntegration, SquareLocation, SquareTransaction, SquareFinancialSummary,
    SquareEmployee, SquareInventoryItem, SquareOrder, SquareOrderItem, SquareWebhookEvent
)


class SquareIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SquareIntegration
        fields = [
            'id', 'company', 'is_connected', 'last_sync', 
            'sync_frequency_hours', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SquareLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SquareLocation
        fields = [
            'id', 'company', 'square_id', 'name', 'address', 
            'phone', 'website', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SquareTransactionSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = SquareTransaction
        fields = [
            'id', 'company', 'square_id', 'location', 'location_name',
            'amount', 'currency', 'status', 'payment_method', 'receipt_url',
            'source_type', 'order_id', 'transaction_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SquareFinancialSummarySerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = SquareFinancialSummary
        fields = [
            'id', 'company', 'location', 'location_name', 'period_type',
            'period_start', 'period_end', 'total_sales', 'net_revenue',
            'total_refunds', 'transaction_count', 'refund_count', 'currency',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SquareEmployeeSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = SquareEmployee
        fields = [
            'id', 'company', 'square_id', 'location', 'location_name',
            'first_name', 'last_name', 'full_name', 'email', 'phone',
            'status', 'role', 'permissions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SquareInventoryItemSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = SquareInventoryItem
        fields = [
            'id', 'company', 'square_id', 'location', 'location_name',
            'name', 'description', 'item_type', 'category_id', 'price',
            'currency', 'stock_quantity', 'low_stock_threshold', 'is_available',
            'variations', 'tax_ids', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SquareOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SquareOrderItem
        fields = [
            'id', 'order', 'inventory_item', 'name', 'quantity',
            'unit_price', 'total_price', 'variations', 'modifiers',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SquareOrderSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    items = SquareOrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = SquareOrder
        fields = [
            'id', 'company', 'square_id', 'location', 'location_name',
            'employee', 'employee_name', 'status', 'total_amount', 'currency',
            'customer_id', 'customer_name', 'customer_email', 'fulfillment_type',
            'note', 'items', 'created_at', 'updated_at', 'order_date'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SquareWebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SquareWebhookEvent
        fields = [
            'id', 'company', 'event_type', 'square_id', 'location_id',
            'event_data', 'processed', 'processing_error', 'created_at', 'processed_at'
        ]
        read_only_fields = ['id', 'created_at', 'processed_at']


# Request/Response serializers for API endpoints
class SquareConnectionRequestSerializer(serializers.Serializer):
    company_id = serializers.UUIDField()
    access_token = serializers.CharField()
    merchant_id = serializers.CharField(required=False, allow_blank=True)
    environment = serializers.ChoiceField(choices=[('sandbox', 'Sandbox'), ('production', 'Production')], default='sandbox')


class SquareConnectionResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    message = serializers.CharField()
    integration = SquareIntegrationSerializer(required=False)


class SquareSyncRequestSerializer(serializers.Serializer):
    company_id = serializers.UUIDField()
    force_sync = serializers.BooleanField(default=False)


class SquareSyncResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    message = serializers.CharField()
    transactions_synced = serializers.IntegerField(required=False)
    locations_synced = serializers.IntegerField(required=False)


class SquareFinancialSummaryRequestSerializer(serializers.Serializer):
    company_id = serializers.UUIDField()
    location_id = serializers.UUIDField(required=False, allow_null=True)
    period_type = serializers.ChoiceField(choices=[('DAILY', 'Daily'), ('WEEKLY', 'Weekly'), ('MONTHLY', 'Monthly')])
    start_date = serializers.DateField()
    end_date = serializers.DateField()


class SquareFinancialSummaryResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    message = serializers.CharField()
    summaries = SquareFinancialSummarySerializer(many=True, required=False)
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    total_net_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    total_refunds = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    total_transactions = serializers.IntegerField(required=False)
    total_refund_count = serializers.IntegerField(required=False) 