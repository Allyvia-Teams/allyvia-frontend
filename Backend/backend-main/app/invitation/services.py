import logging
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import SignupLink, WixWebhookLog
from .serializers import SignupLinkCreateSerializer

logger = logging.getLogger(__name__)


class WixWebhookService:
    """Service for handling Wix webhook events"""
    
    @staticmethod
    def process_payment_succeeded(webhook_data):
        """
        Process a successful payment webhook from Wix
        
        Args:
            webhook_data (dict): The webhook payload from Wix
            
        Returns:
            tuple: (success: bool, message: str, signup_link: SignupLink or None)
        """
        try:
            # Log the webhook event
            webhook_log = WixWebhookLog.objects.create(
                event_type='payment.succeeded',
                wix_order_id=webhook_data.get('uuid_field') or webhook_data.get('string_field'),
                wix_payment_id=webhook_data.get('uuid_field'),
                payload=webhook_data
            )
            
            # Extract data from webhook using the serializer
            from .serializers import WixWebhookSerializer
            serializer = WixWebhookSerializer(data=webhook_data)
            
            if not serializer.is_valid():
                error_msg = f"Invalid webhook data: {serializer.errors}"
                webhook_log.error_message = error_msg
                webhook_log.save()
                return False, error_msg, None
            
            # Get extracted data from serializer
            validated_data = serializer.validated_data
            email = validated_data.get('extracted_email')
            order_id = validated_data.get('extracted_order_id')
            payment_id = validated_data.get('extracted_payment_id')
            plan = validated_data.get('extracted_plan', 'basic')
            
            # Validate required fields
            if not all([order_id, email]):
                error_msg = "Missing required fields: order ID or email"
                webhook_log.error_message = error_msg
                webhook_log.save()
                return False, error_msg, None
            
            # Check if signup link already exists for this order
            existing_link = SignupLink.objects.filter(wix_order_id=order_id).first()
            if existing_link:
                webhook_log.processed = True
                webhook_log.processed_at = timezone.now()
                webhook_log.save()
                return True, "Signup link already exists for this order", existing_link
            
            # Create signup link
            signup_link_data = {
                'email': email,
                'plan': plan,
                'wix_order_id': order_id,
                'wix_payment_id': payment_id
            }
            
            signup_serializer = SignupLinkCreateSerializer(data=signup_link_data)
            if signup_serializer.is_valid():
                signup_link = signup_serializer.save()
                
                # Send welcome email with signup link
                EmailService.send_welcome_email(signup_link)
                
                # Mark webhook as processed
                webhook_log.processed = True
                webhook_log.processed_at = timezone.now()
                webhook_log.save()
                
                logger.info(f"Successfully created signup link for {email} (Order: {order_id})")
                return True, "Signup link created successfully", signup_link
            else:
                error_msg = f"Invalid signup link data: {signup_serializer.errors}"
                webhook_log.error_message = error_msg
                webhook_log.save()
                return False, error_msg, None
                
        except Exception as e:
            error_msg = f"Error processing webhook: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            # Log the error
            if 'webhook_log' in locals():
                webhook_log.error_message = error_msg
                webhook_log.save()
            
            return False, error_msg, None


class EmailService:
    """Service for sending emails"""
    
    @staticmethod
    def send_welcome_email(signup_link):
        """
        Send welcome email with signup link
        
        Args:
            signup_link (SignupLink): The signup link object
        """
        try:
            subject = "Welcome to Allyvia! Complete Your Account Setup"
            
            # Get the signup URL
            base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            signup_url = signup_link.get_signup_url(base_url)
            
            # Email template
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Allyvia! 🎉</h2>
                
                <p>Thank you for choosing Allyvia! Your payment has been confirmed and your account is ready to be set up.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Your Plan: {signup_link.get_plan_display()}</h3>
                    <p>You've selected the <strong>{signup_link.get_plan_display()}</strong> plan.</p>
                </div>
                
                <p>To complete your account setup, please click the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{signup_url}" 
                       style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Complete Account Setup
                    </a>
                </div>
                
                <p><strong>Important:</strong> This link will expire in 7 days and can only be used once.</p>
                
                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                
                <p>Best regards,<br>The Allyvia Team</p>
            </div>
            """
            
            # Send email
            send_mail(
                subject=subject,
                message=f"Welcome to Allyvia! Click here to complete your account setup: {signup_url}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[signup_link.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Welcome email sent to {signup_link.email}")
            
        except Exception as e:
            logger.error(f"Error sending welcome email to {signup_link.email}: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def send_test_email(email_address):
        """
        Send a test email to verify email configuration
        
        Args:
            email_address (str): Email address to send test to
        """
        try:
            subject = "Allyvia Email Test"
            
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Test Successful! ✅</h2>
                
                <p>This is a test email from your Allyvia application.</p>
                
                <p>If you received this email, your email configuration is working correctly.</p>
                
                <p>Best regards,<br>The Allyvia Team</p>
            </div>
            """
            
            # Send email
            send_mail(
                subject=subject,
                message="This is a test email from Allyvia. If you received this, your email configuration is working!",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email_address],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Test email sent to {email_address}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending test email to {email_address}: {str(e)}", exc_info=True)
            raise


class SignupLinkService:
    """Service for managing signup links"""
    
    @staticmethod
    def validate_token(token):
        """
        Validate a signup link token
        
        Args:
            token (str): The token to validate
            
        Returns:
            tuple: (valid: bool, signup_link: SignupLink or None, error_message: str or None)
        """
        try:
            signup_link = SignupLink.objects.get(token=token)
            
            if signup_link.is_used:
                return False, None, "This signup link has already been used."
            
            if signup_link.is_expired():
                return False, None, "This signup link has expired."
            
            return True, signup_link, None
            
        except SignupLink.DoesNotExist:
            return False, None, "Invalid signup link token."
    
    @staticmethod
    def mark_as_used(token):
        """
        Mark a signup link as used
        
        Args:
            token (str): The token to mark as used
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            signup_link = SignupLink.objects.get(token=token)
            signup_link.mark_as_used()
            logger.info(f"Signup link marked as used for {signup_link.email}")
            return True
        except SignupLink.DoesNotExist:
            return False 