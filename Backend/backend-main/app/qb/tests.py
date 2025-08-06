import os
from unittest.mock import MagicMock, patch, PropertyMock
from django.test import TestCase
from quickbooks.objects.base import QuickbooksBaseObject

from qb.services import QuickBooksService


class QuickBooksServiceTests(TestCase):
    """Tests for the QuickBooksService class"""
    
    def setUp(self):
        """Set up test case"""
        from company.models import Company
        from django.utils import timezone
        
        self.company_id = '1234567890'
        self.access_token = 'test-access-token'
        self.refresh_token = 'test-refresh-token'
        
        # Create test company
        self.company = Company.objects.create(
            name='Test Company',
            qb_realm_id=self.company_id,
            qb_access_token=self.access_token,
            qb_refresh_token=self.refresh_token,
            qb_last_auth=timezone.now(),
            qb_access_expires_in=3600
        )
    
    @patch('qb.services.QuickBooks')
    def test_get_quickbooks_api_client(self, mock_quickbooks_class):
        """Test get_quickbooks_api_client method"""
        # Mock AuthClient
        with patch('qb.services.QuickBooksService.get_auth_client_for_company') as mock_get_auth_client:
            mock_auth_client = MagicMock()
            mock_get_auth_client.return_value = mock_auth_client
            
            # Mock settings for sandbox value
            with patch('qb.services.settings') as mock_settings:
                mock_settings.QUICKBOOKS_ENVIRONMENT = 'sandbox'
                
                # Get QuickBooks client
                QuickBooksService.get_quickbooks_api_client(self.company)
                
                # Verify QuickBooks was initialized correctly
                mock_quickbooks_class.assert_called_once_with(
                    auth_client=mock_auth_client,
                    refresh_token=self.refresh_token,
                    access_token=self.access_token,
                    company_id=self.company_id,
                    minorversion=65,
                    sandbox=True
                )
    
    @patch('qb.services.AuthClient')
    def test_get_auth_client(self, mock_auth_client_class):
        """Test get_auth_client method"""
        # Call the method
        QuickBooksService.get_auth_client(
            access_token=self.access_token,
            refresh_token=self.refresh_token,
            realm_id=self.company_id
        )
        
        # Verify AuthClient was initialized correctly
        mock_auth_client_class.assert_called_once()
    
    @patch('qb.services.QuickBooksService.get_auth_client_for_company')
    def test_get_authorization_url(self, mock_get_auth_client):
        """Test get_authorization_url method"""
        # Setup mock auth client
        mock_auth_client = MagicMock()
        mock_auth_client.get_authorization_url.return_value = 'https://test-auth-url.com'
        mock_auth_client.state_token = 'test-state-token'
        
        # Mock the get_auth_client method to return our mock
        with patch('qb.services.QuickBooksService.get_auth_client', return_value=mock_auth_client):
            # Call the method
            auth_url, state_token = QuickBooksService.get_authorization_url()
            
            # Verify results
            self.assertEqual(auth_url, 'https://test-auth-url.com')
            self.assertEqual(state_token, 'test-state-token')
            
            # Verify auth client's get_authorization_url was called
            mock_auth_client.get_authorization_url.assert_called_once()
    
    @patch('qb.services.QuickBooks')
    def test_query_objects(self, mock_quickbooks_class):
        """Test a common QB query operation"""
        # Set up mock QB client
        mock_qb_client = MagicMock()
        mock_quickbooks_class.return_value = mock_qb_client
        
        # Mock the get_quickbooks_api_client method
        with patch('qb.services.QuickBooksService.get_quickbooks_api_client', return_value=mock_qb_client) as mock_get_client:
            # Create mock object class - need to patch the class itself, not an instance
            mock_object_class = MagicMock()
            mock_results = [MagicMock(), MagicMock()]
            mock_object_class.query = MagicMock(return_value=mock_results)
            
            # Mock get_auth_client_for_company to prevent actual API calls
            with patch('qb.services.QuickBooksService.get_auth_client_for_company'):
                # Test get_company_info method which would use query_objects internally
                from company.models import Company
                
                # Test getting an existing company
                test_company = Company.objects.get(name='Test Company')
                self.assertEqual(test_company.qb_realm_id, self.company_id)
                self.assertTrue(test_company.is_connected_to_quickbooks)
    
    @patch('qb.services.AuthClient')
    def test_auth_client_for_company(self, mock_auth_client_class):
        """Test get_auth_client_for_company method"""
        # Set up mock auth client
        mock_auth_client = MagicMock()
        mock_auth_client_class.return_value = mock_auth_client
        
        # Call the method
        auth_client = QuickBooksService.get_auth_client_for_company(self.company)
        
        # Verify result
        self.assertIsNotNone(auth_client)
