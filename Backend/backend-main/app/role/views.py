from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .models import Role, RoleType
from .serializers import RoleSerializer, RoleTypeSerializer, UserRoleSerializer, CompanyRoleSerializer
from company.models import Company


class UserRolesView(APIView):
    """
    API view for getting all roles for the current user
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get all roles for the current user",
        responses={200: UserRoleSerializer(many=True)}
    )
    def get(self, request):
        """
        Return all roles for the current user
        """
        roles = Role.objects.filter(user=request.user)
        serializer = UserRoleSerializer(roles, many=True)
        return Response(serializer.data)


class RoleDetailView(APIView):
    """
    API view for retrieving, updating, and deleting Role instances
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_role(self, request, pk):
        """
        Helper method to get role and check user has access
        """
        role = get_object_or_404(Role, pk=pk)
        
        # Check if user is admin/manager in this company or the role belongs to the user
        if role.user == request.user:
            return None, None  # User's own role can't be deleted
        
        user_role = Role.objects.filter(
            user=request.user,
            company=role.company
        ).first()
        
        if not user_role or not user_role.is_manager:
            return None, None  # No access
        
        return role, user_role
    
    @swagger_auto_schema(
        operation_description="Retrieve a role by ID",
        responses={200: RoleSerializer()}
    )
    def get(self, request, pk):
        """
        Retrieve a role by ID
        """
        role, _ = self.get_role(request, pk) or (None, None)
        if not role:
            return Response({"detail": "You don't have permission"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = RoleSerializer(role)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_description="Update a role by ID",
        request_body=RoleSerializer,
        responses={200: RoleSerializer()}
    )
    def put(self, request, pk):
        """
        Update a role by ID
        """
        role, user_role = self.get_role(request, pk) or (None, None)
        if not role:
            return Response({"detail": "You don't have permission"}, status=status.HTTP_404_NOT_FOUND)
        
        # Only company admins can update roles
        if not user_role or not user_role.is_admin:
            return Response({"detail": "Only company admins can update roles"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = RoleSerializer(role, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_description="Delete a role by ID",
        responses={204: "No content"}
    )
    def delete(self, request, pk):
        """
        Delete a role by ID
        """
        role, user_role = self.get_role(request, pk) or (None, None)
        if not role:
            return Response({"detail": "You don't have permission"}, status=status.HTTP_404_NOT_FOUND)
        
        # Only company admins can delete roles
        if not user_role or not user_role.is_admin:
            return Response({"detail": "Only company admins can delete roles"}, status=status.HTTP_403_FORBIDDEN)
        
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoleTypesView(APIView):
    """
    API view for getting available role types
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get all available role types",
        responses={200: RoleTypeSerializer(many=True)}
    )
    def get(self, request):
        """
        Return all available role types
        """
        role_types = [{'value': r_type.value, 'label': r_type.label} for r_type in RoleType]
        serializer = RoleTypeSerializer(role_types, many=True)
        return Response(serializer.data)


class CompanyRolesView(APIView):
    """
    API view for getting all roles for a specific company
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get all roles for a specific company",
        responses={200: CompanyRoleSerializer(many=True)}
    )
    def get(self, request, company_id):
        """
        Return all roles for a specific company
        """
        company = get_object_or_404(Company, id=company_id)
        # Check if user has permission to view roles in this company
        user_role = Role.objects.filter(
            user=request.user, 
            company=company
        ).first()
        
        if not user_role or not user_role.is_manager:
            return Response(
                {"detail": "You don't have permission to view roles in this company"}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        roles = Role.objects.filter(company=company)
        serializer = CompanyRoleSerializer(roles, many=True)
        return Response(serializer.data)
