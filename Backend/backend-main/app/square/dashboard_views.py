from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from company.models import Company
from role.models import Role
from .models import (
    SquareIntegration, SquareLocation, SquareTransaction, SquareEmployee,
    SquareInventoryItem, SquareOrder, SquareFinancialSummary
)
from .serializers import (
    SquareLocationSerializer, SquareTransactionSerializer, SquareEmployeeSerializer,
    SquareInventoryItemSerializer, SquareOrderSerializer, SquareFinancialSummarySerializer
)


class AdminRoleRequiredMixin:
    """
    Mixin to ensure user has admin role for a company
    """
    def check_admin_role(self, request, company_id):
        company = get_object_or_404(Company, id=company_id)
        user_role = Role.objects.filter(
            user=request.user,
            company=company
        ).first()
        
        if not user_role or not user_role.is_admin:
            return False, {
                "detail": "Admin role required for this company"
            }
            
        return True, company


class SquareDashboardView(AdminRoleRequiredMixin, APIView):
    """
    API view to get comprehensive dashboard data for Square integration
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get comprehensive Square dashboard data",
        manual_parameters=[
            openapi.Parameter('location_id', openapi.IN_QUERY, description="Filter by location ID", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, required=False),
            openapi.Parameter('period', openapi.IN_QUERY, description="Time period (today, week, month, year)", type=openapi.TYPE_STRING, required=False),
        ],
        responses={200: openapi.Response(
            description="Dashboard data",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'financial_summary': openapi.Schema(type=openapi.TYPE_OBJECT),
                    'recent_transactions': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                    'top_products': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                    'employee_performance': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                    'inventory_alerts': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                    'location_summary': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_OBJECT)),
                }
            )
        )}
    )
    def get(self, request, pk):
        """
        Get comprehensive Square dashboard data for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        location_id = request.query_params.get('location_id')
        period = request.query_params.get('period', 'week')
        
        # Calculate date range based on period
        end_date = timezone.now()
        if period == 'today':
            start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            start_date = end_date - timedelta(days=7)
        elif period == 'month':
            start_date = end_date - timedelta(days=30)
        elif period == 'year':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=7)
        
        # Base filters
        base_filters = {'company': company}
        if location_id:
            base_filters['location_id'] = location_id
        
        # Financial Summary
        financial_summary = self._get_financial_summary(company, location_id, start_date, end_date)
        
        # Recent Transactions
        recent_transactions = self._get_recent_transactions(company, location_id, limit=10)
        
        # Top Products (by sales)
        top_products = self._get_top_products(company, location_id, start_date, end_date, limit=10)
        
        # Employee Performance
        employee_performance = self._get_employee_performance(company, location_id, start_date, end_date)
        
        # Inventory Alerts
        inventory_alerts = self._get_inventory_alerts(company, location_id)
        
        # Location Summary
        location_summary = self._get_location_summary(company)
        
        # Sales Trends
        sales_trends = self._get_sales_trends(company, location_id, start_date, end_date)
        
        response_data = {
            'financial_summary': financial_summary,
            'recent_transactions': recent_transactions,
            'top_products': top_products,
            'employee_performance': employee_performance,
            'inventory_alerts': inventory_alerts,
            'location_summary': location_summary,
            'sales_trends': sales_trends,
            'period': period,
            'date_range': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
        }
        
        return Response(response_data)
    
    def _get_financial_summary(self, company, location_id, start_date, end_date):
        """Get financial summary for the period"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        # Get completed transactions
        transactions = SquareTransaction.objects.filter(
            **filters,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date,
            status='COMPLETED'
        )
        
        # Calculate totals
        total_sales = transactions.aggregate(total=Sum('amount'))['total'] or 0
        total_transactions = transactions.count()
        avg_transaction = transactions.aggregate(avg=Avg('amount'))['avg'] or 0
        
        # Get refunds
        refunds = transactions.filter(status='REFUNDED')
        total_refunds = refunds.aggregate(total=Sum('amount'))['total'] or 0
        
        # Net revenue (sales - refunds)
        net_revenue = total_sales - total_refunds
        
        return {
            'total_sales': float(total_sales),
            'net_revenue': float(net_revenue),
            'total_refunds': float(total_refunds),
            'transaction_count': total_transactions,
            'average_transaction': float(avg_transaction),
            'refund_count': refunds.count()
        }
    
    def _get_recent_transactions(self, company, location_id, limit=10):
        """Get recent transactions"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        transactions = SquareTransaction.objects.filter(**filters).order_by('-transaction_date')[:limit]
        return SquareTransactionSerializer(transactions, many=True).data
    
    def _get_top_products(self, company, location_id, start_date, end_date, limit=10):
        """Get top selling products"""
        filters = {'order__company': company}
        if location_id:
            filters['order__location_id'] = location_id
        
        # Get order items in the date range
        order_items = SquareOrderItem.objects.filter(
            **filters,
            order__order_date__gte=start_date,
            order__order_date__lte=end_date,
            order__status='COMPLETED'
        )
        
        # Group by inventory item and sum quantities
        from django.db.models import Sum
        top_products = order_items.values(
            'inventory_item__name',
            'inventory_item__square_id'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum('total_price')
        ).order_by('-total_revenue')[:limit]
        
        return list(top_products)
    
    def _get_employee_performance(self, company, location_id, start_date, end_date):
        """Get employee performance metrics"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        # Get orders in the date range
        orders = SquareOrder.objects.filter(
            **filters,
            order_date__gte=start_date,
            order_date__lte=end_date,
            status='COMPLETED'
        )
        
        # Group by employee
        employee_performance = orders.values(
            'employee__first_name',
            'employee__last_name',
            'employee__square_id'
        ).annotate(
            total_orders=Count('id'),
            total_sales=Sum('total_amount'),
            avg_order_value=Avg('total_amount')
        ).order_by('-total_sales')
        
        return list(employee_performance)
    
    def _get_inventory_alerts(self, company, location_id):
        """Get inventory items that need attention"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        # Get items with low stock
        from django.db import models
        low_stock_items = SquareInventoryItem.objects.filter(
            **filters,
            stock_quantity__lte=models.F('low_stock_threshold'),
            stock_quantity__gt=0
        )
        
        # Get out of stock items
        out_of_stock_items = SquareInventoryItem.objects.filter(
            **filters,
            stock_quantity=0,
            is_available=True
        )
        
        alerts = []
        for item in low_stock_items:
            alerts.append({
                'type': 'low_stock',
                'item_name': item.name,
                'current_stock': item.stock_quantity,
                'threshold': item.low_stock_threshold,
                'location': item.location.name if item.location else 'Unknown'
            })
        
        for item in out_of_stock_items:
            alerts.append({
                'type': 'out_of_stock',
                'item_name': item.name,
                'current_stock': item.stock_quantity,
                'location': item.location.name if item.location else 'Unknown'
            })
        
        return alerts
    
    def _get_location_summary(self, company):
        """Get summary data by location"""
        locations = SquareLocation.objects.filter(company=company)
        location_summary = []
        
        for location in locations:
            # Get transactions for this location
            transactions = SquareTransaction.objects.filter(
                company=company,
                location=location,
                status='COMPLETED'
            )
            
            # Get recent transactions (last 30 days)
            recent_transactions = transactions.filter(
                transaction_date__gte=timezone.now() - timedelta(days=30)
            )
            
            total_sales = transactions.aggregate(total=Sum('amount'))['total'] or 0
            recent_sales = recent_transactions.aggregate(total=Sum('amount'))['total'] or 0
            
            location_summary.append({
                'location_id': location.id,
                'location_name': location.name,
                'total_sales': float(total_sales),
                'recent_sales': float(recent_sales),
                'total_transactions': transactions.count(),
                'recent_transactions': recent_transactions.count(),
                'address': location.address,
                'is_active': location.is_active
            })
        
        return location_summary
    
    def _get_sales_trends(self, company, location_id, start_date, end_date):
        """Get sales trends over time"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        # Get daily sales for the period
        daily_sales = SquareTransaction.objects.filter(
            **filters,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date,
            status='COMPLETED'
        ).extra(
            select={'date': 'DATE(transaction_date)'}
        ).values('date').annotate(
            total_sales=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('date')
        
        return list(daily_sales)


class SquareAnalyticsView(AdminRoleRequiredMixin, APIView):
    """
    API view to get detailed analytics data
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get detailed Square analytics data",
        manual_parameters=[
            openapi.Parameter('location_id', openapi.IN_QUERY, description="Filter by location ID", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, required=False),
            openapi.Parameter('start_date', openapi.IN_QUERY, description="Start date (YYYY-MM-DD)", type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('end_date', openapi.IN_QUERY, description="End date (YYYY-MM-DD)", type=openapi.TYPE_STRING, required=False),
        ],
        responses={200: openapi.Response(
            description="Analytics data",
            schema=openapi.Schema(type=openapi.TYPE_OBJECT)
        )}
    )
    def get(self, request, pk):
        """
        Get detailed Square analytics data for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        location_id = request.query_params.get('location_id')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Parse dates
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        else:
            start_date = timezone.now() - timedelta(days=30)
        
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        else:
            end_date = timezone.now()
        
        # Base filters
        base_filters = {'company': company}
        if location_id:
            base_filters['location_id'] = location_id
        
        # Sales by payment method
        payment_method_sales = self._get_sales_by_payment_method(company, location_id, start_date, end_date)
        
        # Sales by hour of day
        hourly_sales = self._get_hourly_sales(company, location_id, start_date, end_date)
        
        # Sales by day of week
        daily_sales = self._get_daily_sales(company, location_id, start_date, end_date)
        
        # Customer analysis
        customer_analysis = self._get_customer_analysis(company, location_id, start_date, end_date)
        
        # Product performance
        product_performance = self._get_product_performance(company, location_id, start_date, end_date)
        
        response_data = {
            'payment_method_sales': payment_method_sales,
            'hourly_sales': hourly_sales,
            'daily_sales': daily_sales,
            'customer_analysis': customer_analysis,
            'product_performance': product_performance,
            'date_range': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
        }
        
        return Response(response_data)
    
    def _get_sales_by_payment_method(self, company, location_id, start_date, end_date):
        """Get sales breakdown by payment method"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        transactions = SquareTransaction.objects.filter(
            **filters,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date,
            status='COMPLETED'
        )
        
        payment_method_sales = transactions.values('payment_method').annotate(
            total_sales=Sum('amount'),
            transaction_count=Count('id'),
            avg_transaction=Avg('amount')
        ).order_by('-total_sales')
        
        return list(payment_method_sales)
    
    def _get_hourly_sales(self, company, location_id, start_date, end_date):
        """Get sales by hour of day"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        transactions = SquareTransaction.objects.filter(
            **filters,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date,
            status='COMPLETED'
        )
        
        hourly_sales = transactions.extra(
            select={'hour': 'EXTRACT(hour FROM transaction_date)'}
        ).values('hour').annotate(
            total_sales=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('hour')
        
        return list(hourly_sales)
    
    def _get_daily_sales(self, company, location_id, start_date, end_date):
        """Get sales by day of week"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        transactions = SquareTransaction.objects.filter(
            **filters,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date,
            status='COMPLETED'
        )
        
        daily_sales = transactions.extra(
            select={'day_of_week': 'EXTRACT(dow FROM transaction_date)'}
        ).values('day_of_week').annotate(
            total_sales=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('day_of_week')
        
        return list(daily_sales)
    
    def _get_customer_analysis(self, company, location_id, start_date, end_date):
        """Get customer analysis data"""
        filters = {'company': company}
        if location_id:
            filters['location_id'] = location_id
        
        orders = SquareOrder.objects.filter(
            **filters,
            order_date__gte=start_date,
            order_date__lte=end_date,
            status='COMPLETED'
        )
        
        # Customer frequency analysis
        customer_frequency = orders.values('customer_id').annotate(
            order_count=Count('id'),
            total_spent=Sum('total_amount'),
            avg_order_value=Avg('total_amount')
        ).order_by('-total_spent')
        
        return {
            'customer_frequency': list(customer_frequency),
            'total_customers': customer_frequency.count(),
            'repeat_customers': customer_frequency.filter(order_count__gt=1).count()
        }
    
    def _get_product_performance(self, company, location_id, start_date, end_date):
        """Get product performance analysis"""
        filters = {'order__company': company}
        if location_id:
            filters['order__location_id'] = location_id
        
        order_items = SquareOrderItem.objects.filter(
            **filters,
            order__order_date__gte=start_date,
            order__order_date__lte=end_date,
            order__status='COMPLETED'
        )
        
        product_performance = order_items.values(
            'inventory_item__name',
            'inventory_item__square_id'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum('total_price'),
            avg_unit_price=Avg('unit_price'),
            order_count=Count('order', distinct=True)
        ).order_by('-total_revenue')
        
        return list(product_performance) 