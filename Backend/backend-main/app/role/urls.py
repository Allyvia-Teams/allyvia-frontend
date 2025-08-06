from django.urls import path
from .views import (
    RoleDetailView,
    RoleTypesView,
    UserRolesView,
    CompanyRolesView
)

app_name = 'role'

urlpatterns = [
    path('', UserRolesView.as_view(), name='user_roles'),
    path('<uuid:pk>/', RoleDetailView.as_view(), name='detail'),
    path('types/', RoleTypesView.as_view(), name='types'),

    # manage company roles
    path('company/<uuid:company_id>/', CompanyRolesView.as_view(), name='company_roles'),
]
