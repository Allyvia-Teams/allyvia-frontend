from unittest.mock import MagicMock, patch, ANY
from django.urls import reverse
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from user.models import User


class InvoiceStatsViewTests(TestCase):
    """Tests for InvoiceStatsView"""
    
    def setUp(self):
        from role.models import Role
        from company.models import Company
        
        super().setUp()
        # Create user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create company
        self.company = Company.objects.create(
            name='Test Company',
            qb_realm_id='1234567890',
            qb_access_token='test-access-token',
            qb_refresh_token='test-refresh-token',
            qb_last_auth=timezone.now(),
            qb_access_expires_in=3600
        )
        
        # Create role
        self.viewer_role = Role.objects.create(
            user=self.user,
            company=self.company,
            role_type='viewer'
        )
        
        # Setup API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Setup requests mock
        patcher = patch('requests.get')
        self.mock_requests_get = patcher.start()
        self.addCleanup(patcher.stop)
        
        # URL for invoice statistics endpoint
        self.url = reverse('invoice:statistics')
        
        # Sample date range
        self.start_date = '2025-01-01'
        self.end_date = '2025-06-30'
        
        # Mock invoice query response
        self.mock_invoices = self.get_mock_invoices()
    
    def get_mock_invoices(self):
        """Get mock Invoice objects for QuickBooks SDK"""
        # Create mock Invoice objects
        invoice1 = MagicMock()
        invoice1.TotalAmt = 10000.00
        invoice1.Balance = 10000.00  # Unpaid
        
        invoice2 = MagicMock()
        invoice2.TotalAmt = 8500.00
        invoice2.Balance = 0.00  # Paid
        
        invoice3 = MagicMock()
        invoice3.TotalAmt = 12000.00
        invoice3.Balance = 5000.00  # Partially paid
        
        invoice4 = MagicMock()
        invoice4.TotalAmt = 7000.00
        invoice4.Balance = 0.00  # Paid
        
        invoice5 = MagicMock()
        invoice5.TotalAmt = 9500.00
        invoice5.Balance = 9500.00  # Unpaid
        
        return [invoice1, invoice2, invoice3, invoice4, invoice5]
    
    def test_invoice_stats_missing_role_header(self):
        """Test that role header is required"""
        response = self.client.get(
            self.url,
            {'start_date': self.start_date, 'end_date': self.end_date}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('X-Role-ID header is required', str(response.data))
    
    def test_invoice_stats_invalid_dates(self):
        """Test validation for invalid dates"""
        response = self.client.get(
            self.url,
            {'start_date': 'invalid-date', 'end_date': self.end_date},
            HTTP_X_ROLE_ID=str(self.viewer_role.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    @patch('invoices.services.QuickbooksInvoiceService.get_invoice_statistics')
    def test_invoice_stats_success(self, mock_get_invoice_statistics):
        """Test successful invoice statistics retrieval using SDK"""
        # Set up mock return value for the service method
        mock_get_invoice_statistics.return_value = {
            'total_count': 5,
            'total_amount': 47000.0,
            'unpaid_count': 3,
            'unpaid_amount': 24500.0,
            'unpaid_percentage': 52.13,
            'period': f"{self.start_date} to {self.end_date}"
        }
        
        # Make request
        response = self.client.get(
            self.url,
            {'start_date': self.start_date, 'end_date': self.end_date},
            HTTP_X_ROLE_ID=str(self.viewer_role.id)
        )
            
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Total invoices
        self.assertEqual(response.data['total_count'], 5)
        self.assertEqual(response.data['total_amount'], 47000.0)
        
        # Unpaid invoices
        self.assertEqual(response.data['unpaid_count'], 3)  # 2 unpaid + 1 partially paid
        self.assertEqual(response.data['unpaid_amount'], 24500.0)  # 10000 + 9500 + 5000
        
        # Unpaid percentage
        self.assertAlmostEqual(response.data['unpaid_percentage'], 52.13, places=2)
        
        # Check that service method was called correctly
        mock_get_invoice_statistics.assert_called_once_with(
            company=ANY,
            role=ANY,
            start_date=ANY,
            end_date=ANY
        )
    
    def test_invoice_stats_api_fallback(self):
        """Test API fallback when SDK fails"""
        # Mock SDK to raise exception, forcing API fallback
        with patch('quickbooks.objects.invoice.Invoice.query', side_effect=Exception('SDK Error')):
            # Mock API response
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'QueryResponse': {
                    'Invoice': [
                        {'TotalAmt': 10000.00, 'Balance': 10000.00},  # Unpaid
                        {'TotalAmt': 8500.00, 'Balance': 0.00},       # Paid
                        {'TotalAmt': 12000.00, 'Balance': 5000.00}    # Partially paid
                    ]
                }
            }
            self.mock_requests_get.return_value = mock_response
            
            # Make request
            response = self.client.get(
                self.url,
                {'start_date': self.start_date, 'end_date': self.end_date},
                HTTP_X_ROLE_ID=str(self.viewer_role.id)
            )
            
            # Check response
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['total_count'], 3)
            self.assertEqual(response.data['total_amount'], 30500.0)
            self.assertEqual(response.data['unpaid_count'], 2)
            self.assertEqual(response.data['unpaid_amount'], 15000.0)
