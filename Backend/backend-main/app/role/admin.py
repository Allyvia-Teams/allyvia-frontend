from django.contrib import admin
from .models import Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'company', 'role_type', 'created_at')
    list_filter = ('role_type', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'company__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    raw_id_fields = ('user', 'company')
    fieldsets = (
        (None, {
            'fields': ('id', 'user', 'company', 'role_type', 'created_at', 'updated_at')
        }),
    )
    fieldsets = (
        (None, {
            'fields': ('id', 'user', 'company', 'role_type')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
