from django.urls import path
from . import views

app_name = 'invoice'

urlpatterns = [
    path('statistics/', views.InvoiceStatsView.as_view(), name='statistics')
]
