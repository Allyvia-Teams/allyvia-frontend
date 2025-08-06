from django.urls import path
from . import views

app_name = 'profit'

urlpatterns = [
    path('profit_and_loss/', views.ProfitAndLossView.as_view(), name='profit_and_loss'),
]
