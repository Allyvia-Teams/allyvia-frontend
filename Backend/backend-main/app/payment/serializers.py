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


class PaymentSummarySerializer(serializers.Serializer):
    """
    Serializer for payment summary data from QuickBooks
    """
    total_payments = serializers.DecimalField(max_digits=15, decimal_places=2)
    payment_count = serializers.IntegerField()
    period = serializers.CharField(max_length=100)


class PaymentTrendSerializer(serializers.Serializer):
    """
    Serializer for payment trends over time
    """
    date = serializers.DateField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    count = serializers.IntegerField()
    

class PaymentDetailSerializer(serializers.Serializer):
    """
    Serializer for detailed payment information
    """
    id = serializers.CharField(max_length=50)
    customer_name = serializers.CharField(max_length=255)
    payment_date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    payment_method = serializers.CharField(max_length=100)
    applied_to_invoices = serializers.ListField(child=serializers.CharField(), required=False)
    status = serializers.CharField(max_length=50)
