from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="Allyvia Quickbooks API",
        default_version='v1',
        description="API for Allyvia Quickbooks APP"
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/', include([
        path('auth/', include('authentication.urls')),
        path('user/', include('user.urls')),
        path('role/', include('role.urls')),
        path('company/', include('company.urls')),

        # QB apps
        path('quickbooks/', include('qb.urls')),
        path('profit/', include('profit.urls')),
        path('expense/', include('expense.urls')),
        path('invoice/', include('invoice.urls')),
        path('payment/', include('payment.urls')),
        path('account/', include('account.urls')),
        path('inventory/', include('inventory.urls')),
        path('square/', include('square.urls')),
    ])),
    
    # Swagger Documentation
    path('swagger<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
