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


class ExpenseSummarySerializer(serializers.Serializer):
    """
    Serializer for expense summary data from QuickBooks
    """
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    period = serializers.CharField(max_length=100)


class ExpenseByCategorySerializer(serializers.Serializer):
    """
    Serializer for expenses by category
    """
    category_name = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)


class ExpenseByTypeSerializer(serializers.Serializer):
    """
    Serializer for expenses by type
    """
    type = serializers.CharField(max_length=100)
    count = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class ExpenseByPayeeSerializer(serializers.Serializer):
    """
    Serializer for expenses by payee
    """
    payee_id = serializers.CharField(max_length=50)
    payee_name = serializers.CharField(max_length=255)
    count = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class BillStatusSerializer(serializers.Serializer):
    """
    Serializer for bill payment status
    """
    status = serializers.CharField(max_length=50)
    count = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class TopExpensesSerializer(serializers.Serializer):
    """
    Serializer for top expenses data
    """
    expense_name = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    date = serializers.DateField()
    vendor = serializers.CharField(max_length=255, required=False)
    category = serializers.CharField(max_length=255, required=False)


class ExpenseTrendSerializer(serializers.Serializer):
    """
    Serializer for expense trend data
    """
    period = serializers.CharField(max_length=50)  # e.g., "2025-06"
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
