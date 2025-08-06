from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta


class RoleHeaderSerializer(serializers.Serializer):
    """
    Serializer for role header validation
    """
    role_id = serializers.UUIDField(required=True)
    
    
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


class ProfitAndLossSerializer(serializers.Serializer):
    """
    Serializer for Profit and Loss data from QuickBooks
    """
    net_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_operating_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    gross_profit = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    cost_of_goods_sold = serializers.DecimalField(max_digits=15, decimal_places=2)
    period = serializers.CharField(max_length=100)


class ProfitDetailSerializer(serializers.Serializer):
    """
    Serializer for detailed profit data
    """
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    date = serializers.DateField()
