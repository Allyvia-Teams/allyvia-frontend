from django.urls import path
from . import views

app_name = 'invitation'

urlpatterns = [
    # Signup link management
    path('create/', views.create_signup_link, name='create_signup_link'),
    path('validate/<str:token>/', views.validate_signup_link, name='validate_signup_link'),
    path('use/<str:token>/', views.use_signup_link, name='use_signup_link'),
    path('details/<str:token>/', views.get_signup_link_details, name='get_signup_link_details'),
    
    # Email testing
    path('test-email/', views.send_test_email, name='send_test_email'),
    
    # Wix webhook
    path('webhook/wix/', views.WixWebhookView.as_view(), name='wix_webhook'),
    path('webhook/logs/', views.webhook_logs, name='webhook_logs'),
] 