from django.urls import path
from .views import UserProfileView

app_name = 'user'

urlpatterns = [
    path('profile/', UserProfileView.as_view(), name='profile'),
]
