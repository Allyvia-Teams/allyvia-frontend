from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from user.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.serializers import RegisterSerializer


class JWTAuthenticationTests(TestCase):
    """Tests for JWT authentication endpoints"""
    
    def setUp(self):
        """Set up test case"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.login_url = reverse('authentication:login')
        self.refresh_url = reverse('authentication:refresh')
        # No user_info endpoint in this app
    
    def test_obtain_jwt_token_success(self):
        """Test successful JWT token acquisition"""
        response = self.client.post(
            self.login_url,
            {'email': 'test@example.com', 'password': 'testpass123'},
            format='json'
        )
        
        # Check response status and content
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_obtain_jwt_token_failure(self):
        """Test unsuccessful JWT token acquisition"""
        response = self.client.post(
            self.login_url,
            {'email': 'test@example.com', 'password': 'wrongpass'},
            format='json'
        )
        
        # Check response status
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_refresh_token_success(self):
        """Test successful token refresh"""
        # First get a token
        response = self.client.post(
            self.login_url,
            {'email': 'test@example.com', 'password': 'testpass123'},
            format='json'
        )
        
        # Check we have an access token
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        refresh_token = response.data['refresh']
        
        # Now try to refresh the token
        refresh_response = self.client.post(
            self.refresh_url, 
            {'refresh': refresh_token},
            format='json'
        )
        
        # Check we get a new access token
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)
    
    def test_refresh_token_invalid(self):
        """Test token refresh with invalid token"""
        response = self.client.post(
            self.refresh_url,
            {'refresh': 'invalidtoken'},
            format='json'
        )
        
        # Check response status
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_register_view(self):
        """Test user registration"""
        url = reverse('authentication:register')
        data = {
            'email': 'newuser@example.com',
            'password': 'securepassword123',
            'password_confirm': 'securepassword123',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())


class RegisterSerializerTests(TestCase):
    """Tests for RegisterSerializer"""
    
    def setUp(self):
        """Set up test case"""
        self.user_data = {
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'newpass123',
            'password_confirm': 'newpass123'
        }
        self.user = User.objects.create_user(
            email='existing@example.com',
            first_name='Existing',
            last_name='User',
            password='existingpass'
        )
        self.serializer = RegisterSerializer(data=self.user_data)
    
    def test_serializer_valid_data(self):
        """Test serializer with valid data"""
        self.assertTrue(self.serializer.is_valid())
    
    def test_serializer_create_method(self):
        """Test serializer create method"""
        self.assertTrue(self.serializer.is_valid())
        user = self.serializer.save()
        
        # Check if user was created correctly
        self.assertIsInstance(user, User)
        self.assertEqual(user.first_name, 'New')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertTrue(user.check_password('newpass123'))
    
    def test_serializer_validate_password_mismatch(self):
        """Test serializer validation when passwords don't match"""
        serializer = RegisterSerializer(data={
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'newpass123',
            'password_confirm': 'differentpass'
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('password_confirm', serializer.errors)
    
    def test_serializer_missing_fields(self):
        """Test serializer with missing required fields"""
        serializer = RegisterSerializer(data={'email': 'incomplete@example.com'})
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
        self.assertIn('password_confirm', serializer.errors)
