from django.urls import path
from .views import (
    QuickBooksAuthUrlView,
    QuickBooksCallbackView,
    QuickBooksRefreshTokenView,
    QuickBooksRevokeView,
    QuickBooksConnectionStatusView
)

app_name = 'qb'

urlpatterns = [
    path('redirect/', QuickBooksAuthUrlView.as_view(), name='redirect'),
    path('callback/', QuickBooksCallbackView.as_view(), name='callback'),
    path('refresh/', QuickBooksRefreshTokenView.as_view(), name='refresh'),
    path('revoke/', QuickBooksRevokeView.as_view(), name='revoke'),
    path('status/<uuid:pk>/', QuickBooksConnectionStatusView.as_view(), name='status'),
]
