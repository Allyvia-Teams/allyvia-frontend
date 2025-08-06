from rest_framework import serializers
from .models import Role, RoleType


class RoleTypeSerializer(serializers.Serializer):
    """
    Serializer for role types
    """
    value = serializers.CharField()
    display_name = serializers.CharField(source='label')


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for the Role model
    """
    company_name = serializers.CharField(source='company.name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    role_display = serializers.CharField(source='get_role_type_display', read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'user', 'company', 'role_type', 'company_name', 
                 'user_email', 'role_display', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserRoleSerializer(serializers.ModelSerializer):
    """
    Simplified Role serializer for displaying a user's roles
    """
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_id = serializers.UUIDField(source='company.id', read_only=True)
    role_display = serializers.CharField(source='get_role_type_display', read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'company_id', 'company_name', 'role_type', 'role_display']


class CompanyRoleSerializer(serializers.ModelSerializer):
    """
    Simplified Role serializer for displaying company roles
    """
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    role_display = serializers.CharField(source='get_role_type_display', read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'user_id', 'user_email', 'user_name', 'role_type', 'role_display', 'created_at']
