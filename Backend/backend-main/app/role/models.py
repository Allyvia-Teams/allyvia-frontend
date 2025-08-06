import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class RoleType(models.TextChoices):
    """
    Types of roles that a user can have within a company
    """
    admin = 'admin', _('Admin')
    manager = 'manager', _('Manager')
    member = 'member', _('Member')
    viewer = 'viewer', _('Viewer')


class Role(models.Model):
    """
    Model representing a user's role within a company
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='roles')
    company = models.ForeignKey('company.Company', on_delete=models.CASCADE, related_name='roles')
    role_type = models.CharField(
        max_length=20,
        choices=RoleType.choices,
        default=RoleType.viewer,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'
        unique_together = ('user', 'company')  # A user can have only one role per company
        ordering = ['company', 'role_type']
    
    def __str__(self):
        return f"{self.user} - {self.company} - {self.get_role_type_display()}"
    
    @property
    def is_admin(self):
        return self.role_type == RoleType.admin
    
    @property
    def is_manager(self):
        return self.role_type == RoleType.manager or self.is_admin
    
    @property
    def is_member(self):
        return self.role_type == RoleType.member or self.is_manager
    
    @property
    def is_viewer(self):
        return self.role_type == RoleType.viewer or self.is_member
    
    def has_permission(self, permission_level):
        """
        Check if the role has the specified permission level
        Permission levels: 'admin', 'manager', 'member', 'viewer'
        """
        if permission_level == 'admin':
            return self.is_admin
        elif permission_level == 'manager':
            return self.is_manager
        elif permission_level == 'member':
            return self.is_member
        elif permission_level == 'viewer':
            return self.is_viewer
        return False
