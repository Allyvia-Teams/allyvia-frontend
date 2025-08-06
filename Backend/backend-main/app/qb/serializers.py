from rest_framework import serializers


class QuickBooksAuthUrlRequest(serializers.Serializer):
    """
    Serializer for getting QuickBooks authorization URL Request
    """
    company_id = serializers.UUIDField()


class QuickBooksAuthUrlSerializer(serializers.Serializer):
    """
    Serializer for getting QuickBooks authorization URL
    """
    auth_url = serializers.URLField()
    state = serializers.CharField()


class QuickBooksGenericSerializer(serializers.Serializer):
    """
    Serializer for refreshing QuickBooks tokens
    """
    success = serializers.BooleanField()
    message = serializers.CharField()


class QuickBooksCallbackSerializer(serializers.Serializer):
    """
    Serializer for handling QuickBooks OAuth callback
    """
    code = serializers.CharField(required=True)
    state = serializers.CharField(required=True)
    realm_id = serializers.CharField(required=True)


class QuickBooksCallbackForCompanySerializer(QuickBooksCallbackSerializer):
    company_id = serializers.UUIDField(required=True)


class QuickBooksConnectionStatusSerializer(serializers.Serializer):
    """
    Serializer for QuickBooks connection status
    """
    company_id = serializers.UUIDField()
    is_connected = serializers.BooleanField()
    access_token_valid = serializers.BooleanField()
    refresh_token_valid = serializers.BooleanField()
    last_auth = serializers.DateTimeField(allow_null=True)
    realm_id = serializers.CharField(allow_blank=True)


class QuickBooksTokenRefreshSerializer(serializers.Serializer):
    """
    Serializer for refreshing QuickBooks tokens
    """
    company_id = serializers.UUIDField(required=True)
    success = serializers.BooleanField(read_only=True)
    message = serializers.CharField(read_only=True)


class QuickBooksRevokeSerializer(serializers.Serializer):
    """
    Serializer for revoking QuickBooks tokens
    """
    company_id = serializers.UUIDField(required=True)
    success = serializers.BooleanField(read_only=True)
    message = serializers.CharField(read_only=True)
