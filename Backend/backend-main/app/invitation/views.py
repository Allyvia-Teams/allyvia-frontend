import json
import hmac
import hashlib
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse
from .models import SignupLink, WixWebhookLog
from .serializers import (
    SignupLinkCreateSerializer,
    SignupLinkResponseSerializer,
    SignupLinkValidationSerializer,
    WixWebhookSerializer
)
from .services import WixWebhookService, SignupLinkService, EmailService
from django.utils import timezone


@api_view(['POST'])
@permission_classes([AllowAny])
def create_signup_link(request):
    """Create a new signup link manually (for testing)"""
    serializer = SignupLinkCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        signup_link = serializer.save()
        response_serializer = SignupLinkResponseSerializer(signup_link, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_signup_link(request, token):
    """Validate a signup link token"""
    valid, signup_link, error_message = SignupLinkService.validate_token(token)
    
    if not valid:
        return Response(
            {'error': error_message},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    response_serializer = SignupLinkResponseSerializer(signup_link, context={'request': request})
    return Response(response_serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def use_signup_link(request, token):
    """Mark a signup link as used"""
    valid, signup_link, error_message = SignupLinkService.validate_token(token)
    
    if not valid:
        return Response(
            {'error': error_message},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Mark as used
    success = SignupLinkService.mark_as_used(token)
    if not success:
        return Response(
            {'error': 'Failed to mark signup link as used'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    response_serializer = SignupLinkResponseSerializer(signup_link, context={'request': request})
    return Response(response_serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_signup_link_details(request, token):
    """Get signup link details by token"""
    try:
        signup_link = SignupLink.objects.get(token=token)
        response_serializer = SignupLinkResponseSerializer(signup_link, context={'request': request})
        return Response(response_serializer.data)
        
    except SignupLink.DoesNotExist:
        return Response(
            {'error': 'Invalid signup link token.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def send_test_email(request):
    """Send a test email to verify email configuration"""
    email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': 'Email address is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        EmailService.send_test_email(email)
        return Response({
            'message': f'Test email sent successfully to {email}',
            'status': 'success'
        })
    except Exception as e:
        return Response({
            'error': f'Failed to send test email: {str(e)}',
            'status': 'error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class WixWebhookView(View):
    """Handle Wix webhook events"""
    
    def post(self, request, *args, **kwargs):
        """Process incoming webhook from Wix"""
        try:
            # Get the raw body for signature verification
            body = request.body.decode('utf-8')
            webhook_data = json.loads(body)
            
            # Verify webhook signature (if Wix provides one)
            if not self._verify_webhook_signature(request, body):
                return JsonResponse(
                    {'error': 'Invalid webhook signature'},
                    status=400
                )
            
            # Validate webhook data
            serializer = WixWebhookSerializer(data=webhook_data)
            if not serializer.is_valid():
                return JsonResponse(
                    {'error': f'Invalid webhook data: {serializer.errors}'},
                    status=400
                )
            
            # Process the webhook (treat all webhooks as payment succeeded for now)
            # In a real implementation, you'd check the webhook type
            success, message, signup_link = WixWebhookService.process_payment_succeeded(webhook_data)
            
            if success:
                return JsonResponse({
                    'message': message,
                    'signup_link_id': signup_link.id if signup_link else None
                })
            else:
                return JsonResponse(
                    {'error': message},
                    status=500
                )
                
        except json.JSONDecodeError:
            return JsonResponse(
                {'error': 'Invalid JSON payload'},
                status=400
            )
        except Exception as e:
            return JsonResponse(
                {'error': f'Internal server error: {str(e)}'},
                status=500
            )
    
    def _verify_webhook_signature(self, request, body):
        """
        Verify webhook signature from Wix (if provided)
        
        Note: Wix may provide webhook signature verification.
        This is a placeholder for when you configure webhook signatures.
        """
        # Get webhook secret from settings
        webhook_secret = getattr(settings, 'WIX_WEBHOOK_SECRET', None)
        
        if not webhook_secret:
            # If no secret configured, accept all webhooks (for development)
            return True
        
        # Get signature from headers
        signature = request.headers.get('X-Wix-Signature')
        if not signature:
            return False
        
        # Verify signature
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)


@api_view(['GET'])
@permission_classes([AllowAny])
def webhook_logs(request):
    """Get webhook logs (for debugging)"""
    logs = WixWebhookLog.objects.all().order_by('-created_at')[:50]
    
    log_data = []
    for log in logs:
        log_data.append({
            'id': log.id,
            'event_type': log.event_type,
            'wix_order_id': log.wix_order_id,
            'wix_payment_id': log.wix_payment_id,
            'processed': log.processed,
            'error_message': log.error_message,
            'created_at': log.created_at,
            'processed_at': log.processed_at
        })
    
    return Response(log_data)
