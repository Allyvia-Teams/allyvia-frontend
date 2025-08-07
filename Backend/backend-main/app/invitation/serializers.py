from rest_framework import serializers
from .models import SignupLink, WixWebhookLog


class SignupLinkCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating signup links from Wix payments"""
    class Meta:
        model = SignupLink
        fields = ['email', 'plan', 'wix_order_id', 'wix_payment_id']
    
    def create(self, validated_data):
        """Create a new signup link"""
        email = validated_data['email']
        wix_order_id = validated_data['wix_order_id']
        
        # Check if signup link already exists for this order
        existing_link = SignupLink.objects.filter(wix_order_id=wix_order_id).first()
        if existing_link:
            return existing_link
        
        return SignupLink.objects.create(**validated_data)


class SignupLinkResponseSerializer(serializers.ModelSerializer):
    """Serializer for signup link responses"""
    signup_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SignupLink
        fields = ['email', 'plan', 'token', 'signup_url', 'created_at', 'expires_at', 'is_used']
    
    def get_signup_url(self, obj):
        """Generate the signup URL"""
        request = self.context.get('request')
        if request:
            base_url = request.build_absolute_uri('/').rstrip('/')
            return obj.get_signup_url(base_url)
        return None


class SignupLinkValidationSerializer(serializers.Serializer):
    """Serializer for validating signup link tokens"""
    token = serializers.CharField(max_length=64)
    
    def validate_token(self, value):
        """Validate the signup link token"""
        try:
            signup_link = SignupLink.objects.get(token=value)
            
            if signup_link.is_used:
                raise serializers.ValidationError("This signup link has already been used.")
            
            if signup_link.is_expired():
                raise serializers.ValidationError("This signup link has expired.")
            
            return value
        except SignupLink.DoesNotExist:
            raise serializers.ValidationError("Invalid signup link token.")


class WixWebhookSerializer(serializers.Serializer):
    """Serializer for Wix webhook payload validation"""
    # Standard Wix webhook fields
    string_field = serializers.CharField(required=False, allow_blank=True)
    uuid_field = serializers.CharField(required=False, allow_blank=True)
    number_field = serializers.IntegerField(required=False)
    dateTime_field = serializers.DateTimeField(required=False)
    date_field = serializers.DateField(required=False)
    time_field = serializers.TimeField(required=False)
    uri_field = serializers.URLField(required=False, allow_blank=True)
    boolean_field = serializers.BooleanField(required=False)
    email_field = serializers.EmailField(required=False, allow_blank=True)
    object_field = serializers.JSONField(required=False)
    array_field = serializers.ListField(required=False)
    
    # Additional fields that might be present in payment webhooks
    orderId = serializers.CharField(required=False, allow_blank=True)
    paymentId = serializers.CharField(required=False, allow_blank=True)
    customerEmail = serializers.EmailField(required=False, allow_blank=True)
    plan = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    currency = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """
        Custom validation to extract payment information from Wix webhook
        """
        # Extract email from various possible fields
        email = data.get('customerEmail') or data.get('email_field')
        if not email:
            raise serializers.ValidationError("Email is required but not found in webhook data")
        
        # Extract order ID from various possible fields
        order_id = data.get('orderId') or data.get('uuid_field') or data.get('string_field')
        if not order_id:
            raise serializers.ValidationError("Order ID is required but not found in webhook data")
        
        # Extract payment ID
        payment_id = data.get('paymentId') or data.get('uuid_field')
        
        # Extract plan from object_field or use default
        plan = data.get('plan', 'basic')
        if data.get('object_field') and isinstance(data['object_field'], dict):
            plan = data['object_field'].get('plan', plan)
        
        # Store extracted data for processing
        data['extracted_email'] = email
        data['extracted_order_id'] = order_id
        data['extracted_payment_id'] = payment_id
        data['extracted_plan'] = plan.lower()
        
        return data
    
    def validate_extracted_plan(self, value):
        """Validate the plan against available choices"""
        if value:
            valid_plans = [choice[0] for choice in SignupLink.PLAN_CHOICES]
            if value.lower() not in valid_plans:
                raise serializers.ValidationError(f"Invalid plan: {value}")
        return value.lower() if value else 'basic'


class WixWebhookLogSerializer(serializers.ModelSerializer):
    """Serializer for webhook log entries"""
    class Meta:
        model = WixWebhookLog
        fields = '__all__' 