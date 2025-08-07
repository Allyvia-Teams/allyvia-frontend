from django.db import models
from django.utils import timezone
import uuid
import secrets


def generate_token():
    """Generate a secure token for signup links"""
    return secrets.token_urlsafe(32)


def get_expiry_date():
    """Get the expiry date (7 days from now)"""
    return timezone.now() + timezone.timedelta(days=7)


class SignupLink(models.Model):
    """Model for storing signup links generated from Wix payments"""
    PLAN_CHOICES = [
        ('basic', 'Basic'),
        ('pro', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    
    email = models.EmailField()
    token = models.CharField(max_length=64, unique=True, default=generate_token)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES)
    wix_order_id = models.CharField(max_length=100, unique=True)
    wix_payment_id = models.CharField(max_length=100, blank=True, null=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(default=get_expiry_date)
    
    class Meta:
        db_table = 'signup_links'
        verbose_name = 'Signup Link'
        verbose_name_plural = 'Signup Links'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email']),
            models.Index(fields=['wix_order_id']),
        ]
    
    def __str__(self):
        return f"Signup link for {self.email} ({self.plan})"
    
    def is_expired(self):
        """Check if the signup link has expired"""
        return timezone.now() > self.expires_at
    
    def mark_as_used(self):
        """Mark the signup link as used"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save()
    
    def get_signup_url(self, base_url):
        """Generate the signup URL for this link"""
        return f"{base_url}/signup?token={self.token}"
    
    def is_valid(self):
        """Check if the signup link is valid and can be used"""
        return not self.is_used and not self.is_expired()


class WixWebhookLog(models.Model):
    """Model for logging Wix webhook events"""
    EVENT_TYPES = [
        ('payment.succeeded', 'Payment Succeeded'),
        ('payment.failed', 'Payment Failed'),
        ('order.created', 'Order Created'),
        ('order.updated', 'Order Updated'),
    ]
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    wix_order_id = models.CharField(max_length=100)
    wix_payment_id = models.CharField(max_length=100, blank=True, null=True)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'wix_webhook_logs'
        verbose_name = 'Wix Webhook Log'
        verbose_name_plural = 'Wix Webhook Logs'
    
    def __str__(self):
        return f"{self.event_type} - {self.wix_order_id}"
