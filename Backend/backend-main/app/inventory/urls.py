from django.urls import path
from . import views

app_name = 'inventory'

urlpatterns = [
    path('summary/', views.InventorySummaryView.as_view(), name='summary'),
    path('items/', views.InventoryItemsView.as_view(), name='items'),
    path('trend/', views.InventoryStockTrendView.as_view(), name='trend'),
]
