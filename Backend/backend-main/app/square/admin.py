from django.contrib import admin
from .models import (
    SquareIntegration, SquareTransaction, SquareLocation, SquareEmployee,
    SquareInventoryItem, SquareOrder, SquareOrderItem, SquareWebhookEvent,
    SquareFinancialSummary
)

@admin.register(SquareIntegration)
class SquareIntegrationAdmin(admin.ModelAdmin):
    list_display = ['company', 'is_connected', 'last_sync', 'created_at']
    list_filter = ['is_connected', 'created_at']
    search_fields = ['company__name']

@admin.register(SquareTransaction)
class SquareTransactionAdmin(admin.ModelAdmin):
    list_display = ['square_id', 'company', 'amount', 'currency', 'status', 'created_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['square_id', 'company__name']

@admin.register(SquareLocation)
class SquareLocationAdmin(admin.ModelAdmin):
    list_display = ['square_id', 'company', 'name', 'address', 'created_at']
    list_filter = ['created_at']
    search_fields = ['square_id', 'name', 'company__name']

@admin.register(SquareEmployee)
class SquareEmployeeAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'company', 'location', 'status', 'role', 'created_at']
    list_filter = ['status', 'role', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'company__name']

@admin.register(SquareInventoryItem)
class SquareInventoryItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'location', 'item_type', 'price', 'stock_quantity', 'is_available']
    list_filter = ['item_type', 'is_available', 'created_at']
    search_fields = ['name', 'description', 'company__name']

@admin.register(SquareOrder)
class SquareOrderAdmin(admin.ModelAdmin):
    list_display = ['square_id', 'company', 'location', 'status', 'total_amount', 'currency', 'order_date']
    list_filter = ['status', 'currency', 'order_date']
    search_fields = ['square_id', 'customer_name', 'customer_email', 'company__name']

@admin.register(SquareOrderItem)
class SquareOrderItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'order', 'quantity', 'unit_price', 'total_price']
    list_filter = ['created_at']
    search_fields = ['name', 'order__square_id']

@admin.register(SquareFinancialSummary)
class SquareFinancialSummaryAdmin(admin.ModelAdmin):
    list_display = ['company', 'location', 'period_type', 'total_sales', 'net_revenue', 'transaction_count']
    list_filter = ['period_type', 'currency', 'created_at']
    search_fields = ['company__name', 'location__name']

@admin.register(SquareWebhookEvent)
class SquareWebhookEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'company', 'square_id', 'processed', 'created_at']
    list_filter = ['event_type', 'processed', 'created_at']
    search_fields = ['square_id', 'company__name']
    readonly_fields = ['event_data'] 