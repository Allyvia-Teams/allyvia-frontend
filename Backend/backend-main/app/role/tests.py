from unittest.mock import patch
from django.test import TestCase, RequestFactory
from django.http import HttpResponse
from user.models import User
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed

from role.middleware import RoleHeaderMiddleware
from role.models import Role


class RoleHeaderMiddlewareTests(TestCase):
    """Tests for RoleHeaderMiddleware"""
    
    def setUp(self):
        """Set up test case"""
        self.factory = RequestFactory()
        self.middleware = RoleHeaderMiddleware(get_response=lambda request: HttpResponse())
        
        # Create test user and role
        self.user = User.objects.create_user(email='testuser@example.com', password='testpass', first_name='Test', last_name='User')
        # Create company
        from company.models import Company
        from django.utils import timezone
        
        self.company = Company.objects.create(
            name='Test Company',
            qb_realm_id='1234567890',
            qb_access_token='test-access-token',
            qb_refresh_token='test-refresh-token',
            qb_last_auth=timezone.now(),
            qb_access_expires_in=3600
        )
        
        # Create role
        self.role = Role.objects.create(
            user=self.user,
            company=self.company,
            role_type='viewer'
        )
    
    def test_process_view_no_role_header(self):
        """Test middleware doesn't modify request without role header"""
        # Create request without role header
        request = self.factory.get('/api/test/')
        request.user = self.user
        
        # Call process_view
        response = self.middleware.process_view(
            request, 
            view_func=lambda request: HttpResponse(), 
            view_args=[], 
            view_kwargs={}
        )
        
        # Should return None to continue with view
        self.assertIsNone(response)
        
        # Request should have current_role and current_company set to None
        self.assertIsNone(request.current_role)
        self.assertIsNone(request.current_company)
    
    def test_process_view_with_role_header(self):
        """Test middleware sets role attributes with valid role header"""
        # Create request with role header
        request = self.factory.get('/api/test/', HTTP_X_ROLE_ID=str(self.role.id))
        request.user = self.user
        
        # Call process_view
        response = self.middleware.process_view(
            request, 
            view_func=lambda request: HttpResponse(), 
            view_args=[], 
            view_kwargs={}
        )
        
        # Should return None to continue with view
        self.assertIsNone(response)
        
        # Request should have current_role and current_company
        self.assertEqual(request.current_role, self.role)
        self.assertEqual(request.current_company, self.company)
    
    def test_process_view_invalid_role(self):
        """Test middleware handles invalid role ID"""
        # Create request with invalid role header
        request = self.factory.get('/api/test/', HTTP_X_ROLE_ID='invalid-uuid')
        request.user = self.user
        
        # Call process_view
        response = self.middleware.process_view(
            request, 
            view_func=lambda request: HttpResponse(), 
            view_args=[], 
            view_kwargs={}
        )
        
        # Should return None to continue to the view (which will handle the missing role)
        self.assertIsNone(response)
        
        # Role should be None since UUID is invalid
        self.assertIsNone(request.current_role)
        self.assertIsNone(request.current_company)
    
    def test_process_view_anonymous_user(self):
        """Test middleware with anonymous user"""
        # Create request with anonymous user
        request = self.factory.get('/api/test/', HTTP_X_ROLE_ID=str(self.role.id))
        request.user = AnonymousUser()
        
        # Call process_view
        response = self.middleware.process_view(
            request, 
            view_func=lambda request: HttpResponse(), 
            view_args=[], 
            view_kwargs={}
        )
        
        # Anonymous user should still be able to proceed if using JWT
        self.assertIsNone(response)
    
    @patch('role.middleware.JWTAuthentication')
    def test_process_view_jwt_fallback(self, mock_jwt_auth):
        """Test JWT authentication fallback for anonymous users"""
        # Set up JWT auth mock
        mock_jwt_auth_instance = mock_jwt_auth.return_value
        mock_jwt_auth_instance.authenticate.return_value = (self.user, None)
        
        # Create request with anonymous user and role header
        request = self.factory.get('/api/test/', HTTP_X_ROLE_ID=str(self.role.id))
        request.user = AnonymousUser()
        
        # Call process_view
        response = self.middleware.process_view(
            request, 
            view_func=lambda request: HttpResponse(), 
            view_args=[], 
            view_kwargs={}
        )
        
        # Should return None to continue with view
        self.assertIsNone(response)
        
        # User should be authenticated via JWT
        self.assertEqual(request.user, self.user)
        
        # Request should have role attributes
        self.assertEqual(request.current_role, self.role)
        self.assertEqual(request.current_company, self.company)
    
    @patch('role.middleware.JWTAuthentication')
    def test_process_view_jwt_auth_failed(self, mock_jwt_auth):
        """Test handling of JWT authentication failure"""
        # Set up JWT auth mock to fail
        mock_jwt_auth_instance = mock_jwt_auth.return_value
        mock_jwt_auth_instance.authenticate.side_effect = AuthenticationFailed('Invalid token')
        
        # Create request with anonymous user and role header
        request = self.factory.get('/api/test/', HTTP_X_ROLE_ID=str(self.role.id))
        request.user = AnonymousUser()
        
        # Call process_view
        response = self.middleware.process_view(
            request, 
            view_func=lambda request: HttpResponse(), 
            view_args=[], 
            view_kwargs={}
        )
        
        # Should continue to the view (middleware doesn't handle auth errors)
        self.assertIsNone(response)
        
        # User should still be anonymous
        self.assertTrue(request.user.is_anonymous)
