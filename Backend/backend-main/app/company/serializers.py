from rest_framework import serializers
from .models import Company


class CompanyCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Company
    """
    class Meta:
        model = Company
        fields = ['name']


class CompanySerializer(serializers.ModelSerializer):
    """
    Detailed Company serializer with QuickBooks connection status
    """
    is_connected_to_quickbooks = serializers.BooleanField(read_only=True)
    is_qb_access_token_valid = serializers.BooleanField(read_only=True)
    is_qb_refresh_token_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'created_at', 'updated_at', 
            'is_connected_to_quickbooks', 'is_qb_access_token_valid', 
            'is_qb_refresh_token_valid', 'qb_last_auth', 'qb_realm_id'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_connected_to_quickbooks',
            'is_qb_access_token_valid', 'is_qb_refresh_token_valid',
            'qb_last_auth', 'qb_realm_id'
        ]
