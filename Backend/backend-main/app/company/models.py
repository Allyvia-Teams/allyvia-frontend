import uuid
from django.db import models
from django.utils import timezone


class Company(models.Model):
    """
    Model representing a company that can be integrated with QuickBooks
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # QuickBooks integration fields
    qb_access_token = models.TextField(null=True, blank=True)
    qb_refresh_token = models.TextField(null=True, blank=True)
    qb_realm_id = models.CharField(max_length=255, null=True, blank=True)
    qb_access_expires_in = models.IntegerField(null=True, blank=True)  # Expiry time in seconds
    qb_refresh_expires_in = models.IntegerField(null=True, blank=True)  # Expiry time in seconds
    qb_last_auth = models.DateTimeField(null=True, blank=True)  # Last authentication time
    
    class Meta:
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    @property
    def is_connected_to_quickbooks(self):
        """
        Check if the company is connected to QuickBooks
        """
        return bool(self.qb_realm_id and self.qb_refresh_token)
    
    @property
    def is_qb_access_token_valid(self):
        """
        Check if the QuickBooks access token is still valid
        """
        if not self.qb_last_auth or not self.qb_access_expires_in:
            return False
        
        # Access token expires in 1 hour (3600 seconds)
        # We add a 5-minute buffer to ensure we don't use an almost-expired token
        expiry_time = self.qb_last_auth + timezone.timedelta(seconds=self.qb_access_expires_in - 300)
        return timezone.now() < expiry_time
    
    @property
    def is_qb_refresh_token_valid(self):
        """
        Check if the QuickBooks refresh token is still valid
        """
        if not self.qb_last_auth or not self.qb_refresh_expires_in:
            return False
        
        # Refresh token expires in 100 days (8640000 seconds)
        expiry_time = self.qb_last_auth + timezone.timedelta(seconds=self.qb_refresh_expires_in)
        return timezone.now() < expiry_time
    
    def update_quickbooks_tokens(self, access_token, refresh_token, access_expires_in, refresh_expires_in, realm_id=None):
        """
        Update the QuickBooks tokens
        """
        self.qb_access_token = access_token
        self.qb_refresh_token = refresh_token
        self.qb_access_expires_in = access_expires_in
        self.qb_refresh_expires_in = refresh_expires_in
        self.qb_last_auth = timezone.now()
        
        if realm_id:
            self.qb_realm_id = realm_id
            
        self.save(update_fields=[
            'qb_access_token', 'qb_refresh_token', 'qb_access_expires_in', 
            'qb_refresh_expires_in', 'qb_last_auth', 'qb_realm_id', 'updated_at'
        ])
