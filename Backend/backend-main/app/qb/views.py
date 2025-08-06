from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from company.models import Company
from role.models import Role
from .serializers import (
    QuickBooksAuthUrlRequest,
    QuickBooksGenericSerializer,
    QuickBooksAuthUrlSerializer,
    QuickBooksCallbackForCompanySerializer,
    QuickBooksConnectionStatusSerializer,
    QuickBooksTokenRefreshSerializer,
    QuickBooksRevokeSerializer
)
from .services import QuickBooksService


class AdminRoleRequiredMixin:
    """
    Mixin to ensure user has admin role for a company
    """
    def check_admin_role(self, request, company_id):
        company = get_object_or_404(Company, id=company_id)
        user_role = Role.objects.filter(
            user=request.user,
            company=company
        ).first()
        
        if not user_role or not user_role.is_admin:
            return False, {
                "detail": "Admin role required for this company"
            }
            
        return True, company


class QuickBooksAuthUrlView(AdminRoleRequiredMixin, APIView):
    """
    API view to get QuickBooks authorization URL
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get QuickBooks authorization URL",
        query_serializer=QuickBooksAuthUrlRequest(),
        responses={200: QuickBooksAuthUrlSerializer()}
    )
    def get(self, request):
        """
        Get QuickBooks authorization URL
        """
        # request data
        serializer = QuickBooksAuthUrlRequest(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        has_admin_role, result = self.check_admin_role(request, serializer.data['company_id'])
        if not has_admin_role:
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        # Get authorization URL and state token
        auth_url, state_token = QuickBooksService.get_authorization_url()
        serializer = QuickBooksAuthUrlSerializer({
            'auth_url': auth_url,
            'state': state_token
        })
        return Response(serializer.data)


class QuickBooksCallbackView(AdminRoleRequiredMixin, APIView):
    """
    API view to handle QuickBooks OAuth callback
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Handle QuickBooks OAuth callback",
        request_body=QuickBooksCallbackForCompanySerializer,
        responses={200: QuickBooksGenericSerializer()}
    )
    def post(self, request):
        """
        Handle QuickBooks OAuth callback
        """
        serializer = QuickBooksCallbackForCompanySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        company_id = serializer.validated_data['company_id']
        has_admin_role, result = self.check_admin_role(request, company_id)
        if not has_admin_role:
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        # Process callback
        result = QuickBooksService.process_callback_for_company(
            code=serializer.validated_data['code'],
            state=serializer.validated_data['state'],
            realm_id=serializer.validated_data['realm_id'],
            company_id=company_id
        )
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class QuickBooksRefreshTokenView(AdminRoleRequiredMixin, APIView):
    """
    API view to refresh QuickBooks tokens
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Refresh QuickBooks tokens for a company",
        request_body=QuickBooksTokenRefreshSerializer,
        responses={200: QuickBooksTokenRefreshSerializer()}
    )
    def post(self, request):
        """
        Refresh QuickBooks tokens for a company
        """
        serializer = QuickBooksTokenRefreshSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        company_id = serializer.validated_data['company_id']
        has_admin_role, result = self.check_admin_role(request, company_id)
        if not has_admin_role:
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        # Refresh tokens
        result = QuickBooksService.refresh_tokens(company_id)
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class QuickBooksRevokeView(AdminRoleRequiredMixin, APIView):
    """
    API view to revoke QuickBooks tokens
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Revoke QuickBooks tokens for a company",
        request_body=QuickBooksRevokeSerializer,
        responses={200: QuickBooksRevokeSerializer()}
    )
    def post(self, request):
        """
        Revoke QuickBooks tokens for a company
        """
        serializer = QuickBooksRevokeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        company_id = serializer.validated_data['company_id']
        has_admin_role, result = self.check_admin_role(request, company_id)
        if not has_admin_role:
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        # Revoke tokens
        result = QuickBooksService.revoke_tokens(company_id)
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class QuickBooksConnectionStatusView(AdminRoleRequiredMixin, APIView):
    """
    API view to get QuickBooks connection status
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get QuickBooks connection status for a company",
        responses={200: QuickBooksConnectionStatusSerializer()}
    )
    def get(self, request, pk):
        """
        Get QuickBooks connection status for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        serializer = QuickBooksConnectionStatusSerializer({
            'company_id': company.id,
            'is_connected': company.is_connected_to_quickbooks,
            'access_token_valid': company.is_qb_access_token_valid,
            'refresh_token_valid': company.is_qb_refresh_token_valid,
            'last_auth': company.qb_last_auth,
            'realm_id': company.qb_realm_id or ''
        })
        
        return Response(serializer.data)
