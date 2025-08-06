from unittest.mock import MagicMock, patch
import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from company.models import Company
from role.models import Role, RoleType

User = get_user_model()


class QuickBooksTestMixin:
    """
    A mixin for test classes that need to mock QuickBooks API
    """
    
    def setUp(self):
        super().setUp()
        # Setup patches for QuickBooks services
        self.auth_client_patcher = patch('intuitlib.client.AuthClient')
        self.quickbooks_patcher = patch('quickbooks.QuickBooks')
        self.requests_patcher = patch('requests.get')
        
        # Start patches
        self.mock_auth_client = self.auth_client_patcher.start()
        self.mock_quickbooks = self.quickbooks_patcher.start()
        self.mock_requests_get = self.requests_patcher.start()
        
        # Setup default mock responses
        self.setup_default_mocks()
    
    def tearDown(self):
        # Stop all patches
        self.auth_client_patcher.stop()
        self.quickbooks_patcher.stop()
        self.requests_patcher.stop()
        super().tearDown()
    
    def setup_default_mocks(self):
        """Configure default mock responses for common QuickBooks API calls"""
        # Mock requests.get response
        mock_response = MagicMock()
        mock_response.status_code = 200
        # Default empty profit and loss response structure
        mock_response.json.return_value = {
            'Header': {'ReportName': 'Profit and Loss'},
            'Rows': {'Row': []}
        }
        self.mock_requests_get.return_value = mock_response
        
        # Mock AuthClient
        mock_auth_client_instance = MagicMock()
        mock_auth_client_instance.access_token = 'mock-access-token'
        mock_auth_client_instance.refresh_token = 'mock-refresh-token'
        mock_auth_client_instance.realm_id = 'mock-realm-id'
        self.mock_auth_client.return_value = mock_auth_client_instance


class BaseTestCase(TestCase, QuickBooksTestMixin):
    """Base test case for Allyvia API tests with user, company and role setup"""
    
    def setUp(self):
        super().setUp()
        self.create_test_user()
        self.create_test_company()
        self.create_test_roles()
    
    def create_test_user(self):
        """Create a test user"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpassword123',
            first_name='Test',
            last_name='User'
        )
    
    def create_test_company(self):
        """Create a test company with QuickBooks connection"""
        self.company = Company.objects.create(
            name='Test Company',
            qb_access_token='test-access-token',
            qb_refresh_token='test-refresh-token',
            qb_realm_id='test-realm-id',
            qb_token_expires_at=datetime.datetime.now() + datetime.timedelta(hours=1)
        )
    
    def create_test_roles(self):
        """Create test roles (admin, manager, viewer)"""
        # Create role types if they don't exist
        admin_type, _ = RoleType.objects.get_or_create(name='admin')
        manager_type, _ = RoleType.objects.get_or_create(name='manager')
        viewer_type, _ = RoleType.objects.get_or_create(name='viewer')
        
        # Create roles for the test user
        self.admin_role = Role.objects.create(
            user=self.user,
            company=self.company,
            role_type=admin_type,
            name='Test Admin Role'
        )
        
        self.manager_role = Role.objects.create(
            user=self.user,
            company=self.company,
            role_type=manager_type,
            name='Test Manager Role'
        )
        
        self.viewer_role = Role.objects.create(
            user=self.user,
            company=self.company,
            role_type=viewer_type,
            name='Test Viewer Role'
        )
