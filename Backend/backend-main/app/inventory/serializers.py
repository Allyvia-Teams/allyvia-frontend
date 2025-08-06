from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta


class DateRangeSerializer(serializers.Serializer):
    """
    Serializer for date range inputs
    """
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, data):
        """
        Check that start_date is before end_date.
        Set default values if not provided.
        """
        # Set default end_date to today if not provided
        if 'end_date' not in data:
            data['end_date'] = timezone.now().date()

        # Set default start_date to 30 days before end_date if not provided
        if 'start_date' not in data:
            data['start_date'] = data['end_date'] - timedelta(days=30)

        # Validate start_date is before end_date
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("End date must be after start date")

        return data


class InventorySummarySerializer(serializers.Serializer):
    """
    Serializer for inventory summary data from QuickBooks
    """
    total_items = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    period = serializers.CharField(max_length=100)


class InventoryItemSerializer(serializers.Serializer):
    """
    Serializer for detailed inventory item information
    """
    id = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=255)
    sku = serializers.CharField(max_length=100, required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    quantity_on_hand = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=15, decimal_places=2)
    value = serializers.DecimalField(max_digits=15, decimal_places=2)
    reorder_point = serializers.IntegerField(required=False, allow_null=True)


class InventoryStockTrendSerializer(serializers.Serializer):
    """
    Serializer for inventory stock trends over time
    """
    item_id = serializers.CharField(max_length=50)
    item_name = serializers.CharField(max_length=255)
    stock_history = serializers.ListField(child=serializers.DictField())
