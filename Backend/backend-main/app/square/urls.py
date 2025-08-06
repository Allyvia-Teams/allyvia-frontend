from django.urls import path
from .views import (
    SquareConnectionView,
    SquareSyncView,
    SquareFinancialSummaryView,
    SquareIntegrationStatusView,
    SquareLocationsView,
    SquareTransactionsView,
    SquareEmployeesView,
    SquareInventoryView,
    SquareOrdersView
)
from .webhook_views import square_webhook, SquareWebhookEventView, SquareWebhookRetryView
from .dashboard_views import SquareDashboardView, SquareAnalyticsView

app_name = 'square'

urlpatterns = [
    # Connection management
    path('connect/', SquareConnectionView.as_view(), name='connect'),
    
    # Data sync
    path('sync/', SquareSyncView.as_view(), name='sync'),
    
    # Financial summaries
    path('financial-summary/', SquareFinancialSummaryView.as_view(), name='financial-summary'),
    
    # Status and data retrieval
    path('status/<uuid:pk>/', SquareIntegrationStatusView.as_view(), name='status'),
    path('locations/<uuid:pk>/', SquareLocationsView.as_view(), name='locations'),
    path('transactions/<uuid:pk>/', SquareTransactionsView.as_view(), name='transactions'),
    path('employees/<uuid:pk>/', SquareEmployeesView.as_view(), name='employees'),
    path('inventory/<uuid:pk>/', SquareInventoryView.as_view(), name='inventory'),
    path('orders/<uuid:pk>/', SquareOrdersView.as_view(), name='orders'),
    
    # Webhook endpoints
    path('webhook/', square_webhook, name='webhook'),
    path('webhook-events/<uuid:company_id>/', SquareWebhookEventView.as_view(), name='webhook-events'),
    path('webhook-retry/<uuid:event_id>/', SquareWebhookRetryView.as_view(), name='webhook-retry'),
    
    # Dashboard endpoints
    path('dashboard/<uuid:pk>/', SquareDashboardView.as_view(), name='dashboard'),
    path('analytics/<uuid:pk>/', SquareAnalyticsView.as_view(), name='analytics'),
] 