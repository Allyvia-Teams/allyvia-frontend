from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .models import Company
from .serializers import (
    CompanySerializer,
    CompanyCreateSerializer
)


class CompanyListCreateView(APIView):
    """
    API view for listing and creating Company instances
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="List companies that the user has access to",
        responses={200: CompanySerializer(many=True)}
    )
    def get(self, request):
        """
        List companies that the user has access to through roles
        """
        from role.models import Role
        user_companies = Role.objects.filter(
            user=request.user
        ).values_list('company', flat=True)
        
        companies = Company.objects.filter(id__in=user_companies)
        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_description="Create a new company",
        request_body=CompanyCreateSerializer,
        responses={201: CompanySerializer()}
    )
    def post(self, request):
        """
        Create a new company
        """
        serializer = CompanyCreateSerializer(data=request.data)
        if serializer.is_valid():
            company = serializer.save()
            
            # Create admin role for the user
            from role.models import Role, RoleType
            Role.objects.create(
                user=request.user, 
                company=company, 
                role_type=RoleType.admin
            )
            
            response_serializer = CompanySerializer(company)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompanyDetailView(APIView):
    """
    API view for retrieving, updating and deleting a Company instance
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_company(self, request, pk):
        """
        Helper method to get company and check user has access
        """
        company = get_object_or_404(Company, pk=pk)
        
        from role.models import Role
        user_role = Role.objects.filter(
            user=request.user,
            company=company
        ).first()
        
        if not user_role:
            return None
        
        return company, user_role
    
    @swagger_auto_schema(
        operation_description="Retrieve a company by ID",
        responses={200: CompanySerializer()}
    )
    def get(self, request, pk):
        """
        Retrieve a company by ID
        """
        result = self.get_company(request, pk)
        if not result:
            return Response({"detail": "Company not found or you don't have access"}, status=status.HTTP_404_NOT_FOUND)
        
        company, _ = result
        serializer = CompanySerializer(company)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_description="Update a company by ID",
        request_body=CompanySerializer,
        responses={200: CompanySerializer()}
    )
    def put(self, request, pk):
        """
        Update a company by ID
        """
        result = self.get_company(request, pk)
        if not result:
            return Response({"detail": "Company not found or you don't have access"}, status=status.HTTP_404_NOT_FOUND)
        
        company, user_role = result
        if not user_role.is_admin:
            return Response({"detail": "Only admins can update company details"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CompanySerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            response_serializer = CompanySerializer(company)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_description="Delete a company by ID",
        responses={204: "No content"}
    )
    def delete(self, request, pk):
        """
        Delete a company by ID
        """
        result = self.get_company(request, pk)
        if not result:
            return Response({"detail": "Company not found or you don't have access"}, status=status.HTTP_404_NOT_FOUND)
        
        company, user_role = result
        if not user_role.is_admin:
            return Response({"detail": "Only admins can delete a company"}, status=status.HTTP_403_FORBIDDEN)
        
        company.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
