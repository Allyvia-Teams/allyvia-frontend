from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'is_connected_to_quickbooks')
    search_fields = ('name', 'qb_realm_id')
    readonly_fields = ('id', 'created_at', 'updated_at', 
                      'is_connected_to_quickbooks', 'is_qb_access_token_valid', 
                      'is_qb_refresh_token_valid')
    fieldsets = (
        (None, {
            'fields': ('id', 'name', 'created_at', 'updated_at')
        }),
        ('QuickBooks Integration', {
            'fields': ('qb_realm_id', 'qb_last_auth', 'is_connected_to_quickbooks',
                      'is_qb_access_token_valid', 'is_qb_refresh_token_valid'),
            'classes': ('collapse',),
        }),
    )
    
    def is_connected_to_quickbooks(self, obj):
        return obj.is_connected_to_quickbooks
    is_connected_to_quickbooks.boolean = True
    is_connected_to_quickbooks.short_description = 'Connected to QuickBooks'
    
    def is_qb_access_token_valid(self, obj):
        return obj.is_qb_access_token_valid
    is_qb_access_token_valid.boolean = True
    is_qb_access_token_valid.short_description = 'QB Access Token Valid'
    
    def is_qb_refresh_token_valid(self, obj):
        return obj.is_qb_refresh_token_valid
    is_qb_refresh_token_valid.boolean = True
    is_qb_refresh_token_valid.short_description = 'QB Refresh Token Valid'
