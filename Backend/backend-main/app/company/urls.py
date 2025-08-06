from django.urls import path
from .views import CompanyListCreateView, CompanyDetailView

app_name = 'company'

urlpatterns = [
    path('', CompanyListCreateView.as_view(), name='company_list_create'),
    path('<uuid:pk>/', CompanyDetailView.as_view(), name='company_detail'),
]
