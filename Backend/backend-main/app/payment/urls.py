from django.urls import path
from . import views

app_name = 'payment'

urlpatterns = [
    path('summary/', views.PaymentSummaryView.as_view(), name='summary'),
    path('trend/', views.PaymentTrendView.as_view(), name='trend'),
    path('details/', views.PaymentDetailView.as_view(), name='details'),
]
