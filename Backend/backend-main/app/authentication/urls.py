from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, QuickBooksRedirectView, QuickBooksCallbackView
)

app_name = 'authentication'

urlpatterns = [
    # JWT authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='refresh'),
    
    # Quickbooks OAuth
    path('quickbooks/redirect/', QuickBooksRedirectView.as_view(), name='quickbooks_redirect'),
    path('quickbooks/callback/', QuickBooksCallbackView.as_view(), name='quickbooks_callback'),
]
