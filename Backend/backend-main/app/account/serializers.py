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


class AccountSummarySerializer(serializers.Serializer):
    """
    Serializer for account summary data from QuickBooks
    """
    total_accounts = serializers.IntegerField()
    total_balance = serializers.DecimalField(max_digits=15, decimal_places=2)
    period = serializers.CharField(max_length=100)


class AccountDetailSerializer(serializers.Serializer):
    """
    Serializer for detailed account information
    """
    id = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=255)
    account_type = serializers.CharField(max_length=100)
    account_subtype = serializers.CharField(max_length=100, required=False)
    balance = serializers.DecimalField(max_digits=15, decimal_places=2)
    is_active = serializers.BooleanField()


class AccountBalanceTrendSerializer(serializers.Serializer):
    """
    Serializer for account balance trends over time
    """
    account_id = serializers.CharField(max_length=50)
    account_name = serializers.CharField(max_length=255)
    balance_history = serializers.ListField(child=serializers.DictField())
