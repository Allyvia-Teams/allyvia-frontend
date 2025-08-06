from django.test import TestCase
from django.contrib.auth import get_user_model
from company.models import Company
from role.models import Role
from .models import SquareIntegration, SquareLocation, SquareTransaction, SquareFinancialSummary
from .services import SquareService

User = get_user_model()


class SquareIntegrationTestCase(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create test company
        self.company = Company.objects.create(
            name='Test Company'
        )
        
        # Create admin role for user
        self.role = Role.objects.create(
            user=self.user,
            company=self.company,
            is_admin=True
        )
    
    def test_square_integration_creation(self):
        """Test creating a Square integration"""
        integration = SquareIntegration.objects.create(
            company=self.company,
            square_access_token='test_token',
            square_merchant_id='test_merchant',
            square_environment='sandbox',
            is_connected=True
        )
        
        self.assertEqual(integration.company, self.company)
        self.assertTrue(integration.is_connected)
        self.assertEqual(integration.square_environment, 'sandbox')
    
    def test_square_location_creation(self):
        """Test creating a Square location"""
        location = SquareLocation.objects.create(
            company=self.company,
            square_id='test_location_id',
            name='Test Location',
            address='123 Test St',
            phone='555-1234',
            is_active=True
        )
        
        self.assertEqual(location.company, self.company)
        self.assertEqual(location.name, 'Test Location')
        self.assertTrue(location.is_active)
    
    def test_square_transaction_creation(self):
        """Test creating a Square transaction"""
        location = SquareLocation.objects.create(
            company=self.company,
            square_id='test_location_id',
            name='Test Location'
        )
        
        transaction = SquareTransaction.objects.create(
            company=self.company,
            square_id='test_transaction_id',
            location=location,
            amount=100.00,
            currency='USD',
            status='COMPLETED',
            payment_method='CARD',
            source_type='CARD'
        )
        
        self.assertEqual(transaction.company, self.company)
        self.assertEqual(transaction.location, location)
        self.assertEqual(transaction.amount, 100.00)
        self.assertEqual(transaction.status, 'COMPLETED')
    
    def test_square_financial_summary_creation(self):
        """Test creating a Square financial summary"""
        summary = SquareFinancialSummary.objects.create(
            company=self.company,
            period_type='DAILY',
            total_sales=1000.00,
            net_revenue=950.00,
            total_refunds=50.00,
            transaction_count=10,
            refund_count=1,
            currency='USD'
        )
        
        self.assertEqual(summary.company, self.company)
        self.assertEqual(summary.period_type, 'DAILY')
        self.assertEqual(summary.total_sales, 1000.00)
        self.assertEqual(summary.net_revenue, 950.00)
    
    def test_square_service_connection_test(self):
        """Test Square service connection test (with invalid token)"""
        result = SquareService.test_connection('invalid_token', 'sandbox')
        
        # Should fail with invalid token
        self.assertFalse(result['success'])
        self.assertIn('message', result)
    
    def test_square_service_disconnect(self):
        """Test disconnecting a company from Square"""
        # Create an integration first
        integration = SquareIntegration.objects.create(
            company=self.company,
            square_access_token='test_token',
            is_connected=True
        )
        
        # Test disconnect
        result = SquareService.disconnect_company(self.company.id)
        
        self.assertTrue(result['success'])
        
        # Refresh from database
        integration.refresh_from_db()
        self.assertFalse(integration.is_connected)
    
    def test_square_service_disconnect_no_integration(self):
        """Test disconnecting a company that has no Square integration"""
        result = SquareService.disconnect_company(self.company.id)
        
        self.assertTrue(result['success'])
        self.assertIn('No Square integration found', result['message']) 