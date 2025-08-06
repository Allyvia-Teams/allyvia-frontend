import uuid
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.contrib.auth.models import AnonymousUser
from role.models import Role
from rest_framework_simplejwt.authentication import JWTAuthentication


class RoleHeaderMiddleware(MiddlewareMixin):
    """
    Middleware that processes the X-Role-ID header for role-based access.
    Works with JWT Authentication.
    """
    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        Process the X-Role-ID header and add role and company to request.
        This is called after authentication middleware has run, so request.user will be populated.
        """
        # Initialize default values
        request.current_role = None
        request.current_company = None
        
        # Skip for non-API endpoints
        if not request.path.startswith('/api/'):
            return None
            
        role_id = request.headers.get('X-Role-ID')

        # If role_id header is not provided, don't restrict access yet
        # (individual views will handle authorization as needed)
        if not role_id:
            return None
        
        # If user is not authenticated, we cannot process role
        if request.user.is_anonymous:
            # Try to authenticate user with JWT if not already authenticated
            jwt_auth = JWTAuthentication()
            try:
                auth_result = jwt_auth.authenticate(request)
                if auth_result:
                    user, token = auth_result
                    request.user = user
                else:
                    # User still anonymous, can't process role
                    return None
            except Exception:
                # Authentication failed, but we'll let the view handle this
                return None
            
        try:
            # Validate UUID format
            role_uuid = uuid.UUID(role_id)
            
            # Get the role
            role = Role.objects.filter(
                id=role_uuid,
                user=request.user
            ).select_related('company').first()
            
            if role:
                # Add role and company to request for use in views
                request.current_role = role
                request.current_company = role.company
            # No 403 error here - we'll let the view decide how to handle invalid role IDs

        except ValueError:
            # Invalid UUID format - let the view handle this
            pass
        except Exception:
            # Other errors - let the view handle this
            pass
            
        return None
