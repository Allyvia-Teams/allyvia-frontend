import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True, primary_key=True)
    email = models.EmailField(_('email address'), unique=True, db_index=True)
    first_name = models.CharField(_('first name'), max_length=150)
    last_name = models.CharField(_('last name'), max_length=150)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    # Quickbooks specific field
    qb_user_id = models.CharField(max_length=255, blank=True, null=True)

    # internal control for user privilege (admin)
    is_staff = models.BooleanField(_('staff status'), default=False, help_text=_('user can log into the admin site'))
    is_active = models.BooleanField(_('active'), default=True, help_text=_('active accounts can make login'))
    is_superuser = models.BooleanField(_('django admin superuser'), default=False, help_text='backend control')

    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def save(self, *args, **kwargs):
        self.clean()
        # ensure email is always lowercase
        if self._state.adding:
            self.email = self.email.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name
        
    def get_role_in_company(self, company):
        """
        Get the user's role in a specific company
        """
        try:
            from role.models import Role
            return Role.objects.get(user=self, company=company)
        except Role.DoesNotExist:
            return None
    
    def has_role_permission(self, company, permission_level):
        """
        Check if the user has a specified permission level in a company
        Permission levels: 'admin', 'manager', 'member', 'viewer'
        """
        role = self.get_role_in_company(company)
        if not role:
            return False
        return role.has_permission(permission_level)
