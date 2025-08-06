from django.urls import path
from . import views

app_name = 'expense'

urlpatterns = [
    path('summary/', views.ExpenseSummaryView.as_view(), name='summary'),
    path('by_category/', views.ExpenseByCategoryView.as_view(), name='by_category'),
    path('top/', views.TopExpensesView.as_view(), name='top'),
    path('trend/', views.ExpenseTrendView.as_view(), name='trend'),
    
    # Additional expense filter endpoints
    path('by_type/', views.ExpensesByTypeView.as_view(), name='by_type'),
    path('by_payee/', views.ExpensesByPayeeView.as_view(), name='by_payee'),
    path('bills/status/', views.BillsByStatusView.as_view(), name='bills_status'),
]
