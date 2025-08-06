import os
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from intuitlib.client import AuthClient
from intuitlib.enums import Scopes
from quickbooks import QuickBooks
from quickbooks.exceptions import AuthorizationException
from .serializers import RegisterSerializer, LoginSerializer, TokenResponseSerializer
from qb.services import QuickBooksService
from qb.serializers import QuickBooksAuthUrlSerializer, QuickBooksCallbackSerializer

User = get_user_model()


class RegisterView(APIView):
    """
    API endpoint for user registration.
    """
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        request_body=RegisterSerializer,
        responses={
            201: TokenResponseSerializer(),
            400: "Bad Request"
        },
        operation_summary="Register new user",
        operation_description="Register a new user with email, name, and password"
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens for the new user
            refresh = RefreshToken.for_user(user)
            response = TokenResponseSerializer({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_id': user.id,
                'email': user.email
            })
            return Response(response.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    API endpoint for user login.
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        request_body=LoginSerializer,
        responses={200: TokenResponseSerializer()},
        operation_summary="Login user",
        operation_description="Authenticate user with email and password and return JWT tokens"
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            response = TokenResponseSerializer({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_id': user.id,
                'email': user.email
            })
            return Response(response.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


class QuickBooksRedirectView(APIView):
    """
    API endpoint to initiate Quickbooks OAuth authentication.
    """
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_summary="Initialize Quickbooks OAuth",
        operation_description="Start the OAuth flow for Quickbooks integration",
        responses = {200: QuickBooksAuthUrlSerializer()}
    )
    def get(self, request):
        # Get authorization URL and state token
        auth_url, state_token = QuickBooksService.get_authorization_url()
        serializer = QuickBooksAuthUrlSerializer({
            'auth_url': auth_url,
            'state': state_token
        })
        return Response(serializer.data)


class QuickBooksCallbackView(APIView):
    """
    API view to handle QuickBooks OAuth callback
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Handle QuickBooks OAuth callback",
        request_body=QuickBooksCallbackSerializer,
        responses={200: TokenResponseSerializer()},
    )
    def post(self, request):
        serializer = QuickBooksCallbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Process callback
        result = QuickBooksService.process_callback_for_user_only(
            code=serializer.validated_data['code'],
            state=serializer.validated_data['state'],
            realm_id=serializer.validated_data['realm_id']
        )

        if not result['success']:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # return JWT Token
        user = result['user']
        refresh = RefreshToken.for_user(user)
        response = TokenResponseSerializer({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user_id': user.id,
            'email': user.email
        })
        return Response(response.data, status=status.HTTP_200_OK)
