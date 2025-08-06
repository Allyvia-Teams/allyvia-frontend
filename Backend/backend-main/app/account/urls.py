from django.urls import path
from . import views

app_name = 'account'

urlpatterns = [
    path('summary/', views.AccountSummaryView.as_view(), name='summary'),
    path('details/', views.AccountDetailView.as_view(), name='details'),
    path('trend/', views.AccountBalanceTrendView.as_view(), name='trend'),
]
