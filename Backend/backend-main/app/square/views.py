from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from company.models import Company
from role.models import Role
from .serializers import (
    SquareConnectionRequestSerializer,
    SquareConnectionResponseSerializer,
    SquareSyncRequestSerializer,
    SquareSyncResponseSerializer,
    SquareFinancialSummaryRequestSerializer,
    SquareFinancialSummaryResponseSerializer,
    SquareIntegrationSerializer,
    SquareLocationSerializer,
    SquareTransactionSerializer,
    SquareFinancialSummarySerializer,
    SquareEmployeeSerializer,
    SquareInventoryItemSerializer,
    SquareOrderSerializer,
    SquareWebhookEventSerializer
)
from .services import SquareService
from .models import SquareIntegration, SquareLocation, SquareTransaction, SquareFinancialSummary


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


class SquareConnectionView(AdminRoleRequiredMixin, APIView):
    """
    API view to connect/disconnect Square integration
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Connect company to Square",
        request_body=SquareConnectionRequestSerializer,
        responses={200: SquareConnectionResponseSerializer()}
    )
    def post(self, request):
        """
        Connect a company to Square
        """
        serializer = SquareConnectionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        company_id = serializer.validated_data['company_id']
        has_admin_role, result = self.check_admin_role(request, company_id)
        if not has_admin_role:
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        # Connect to Square
        result = SquareService.connect_company(
            company_id=company_id,
            access_token=serializer.validated_data['access_token'],
            merchant_id=serializer.validated_data.get('merchant_id'),
            environment=serializer.validated_data.get('environment', 'sandbox')
        )
        
        if result['success']:
            response_data = {
                'success': True,
                'message': result['message'],
                'integration': SquareIntegrationSerializer(result['integration']).data
            }
            return Response(response_data)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_description="Disconnect company from Square",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'company_id': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID)
            },
            required=['company_id']
        ),
        responses={200: SquareConnectionResponseSerializer()}
    )
    def delete(self, request):
        """
        Disconnect a company from Square
        """
        company_id = request.data.get('company_id')
        if not company_id:
            return Response({'detail': 'company_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        has_admin_role, result = self.check_admin_role(request, company_id)
        if not has_admin_role:
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        # Disconnect from Square
        result = SquareService.disconnect_company(company_id)
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class SquareSyncView(AdminRoleRequiredMixin, APIView):
    """
    API view to sync Square data
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Sync Square data for a company",
        request_body=SquareSyncRequestSerializer,
        responses={200: SquareSyncResponseSerializer()}
    )
    def post(self, request):
        """
        Sync Square data for a company
        """
        serializer = SquareSyncRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        company_id = serializer.validated_data['company_id']
        has_admin_role, result = self.check_admin_role(request, company_id)
        if not has_admin_role:
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        # Sync locations first
        locations_result = SquareService.sync_locations(company_id)
        if not locations_result['success']:
            return Response(locations_result, status=status.HTTP_400_BAD_REQUEST)
        
        # Sync employees
        employees_result = SquareService.sync_employees(company_id)
        if not employees_result['success']:
            return Response(employees_result, status=status.HTTP_400_BAD_REQUEST)
        
        # Sync inventory
        inventory_result = SquareService.sync_inventory(company_id)
        if not inventory_result['success']:
            return Response(inventory_result, status=status.HTTP_400_BAD_REQUEST)
        
        # Sync transactions
        transactions_result = SquareService.sync_transactions(company_id)
        if not transactions_result['success']:
            return Response(transactions_result, status=status.HTTP_400_BAD_REQUEST)
        
        # Sync orders
        orders_result = SquareService.sync_orders(company_id)
        if not orders_result['success']:
            return Response(orders_result, status=status.HTTP_400_BAD_REQUEST)
        
        # Combine results
        response_data = {
            'success': True,
            'message': f"Sync completed. {locations_result['message']} {employees_result['message']} {inventory_result['message']} {transactions_result['message']} {orders_result['message']}",
            'locations_synced': locations_result.get('locations_synced', 0),
            'employees_synced': employees_result.get('employees_synced', 0),
            'inventory_items_synced': inventory_result.get('inventory_items_synced', 0),
            'transactions_synced': transactions_result.get('transactions_synced', 0),
            'orders_synced': orders_result.get('orders_synced', 0)
        }
        
        return Response(response_data)


class SquareFinancialSummaryView(AdminRoleRequiredMixin, APIView):
    """
    API view to get financial summaries
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get Square financial summaries",
        request_body=SquareFinancialSummaryRequestSerializer,
        responses={200: SquareFinancialSummaryResponseSerializer()}
    )
    def post(self, request):
        """
        Get Square financial summaries for a company
        """
        serializer = SquareFinancialSummaryRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        company_id = serializer.validated_data['company_id']
        has_admin_role, result = self.check_admin_role(request, company_id)
        if not has_admin_role:
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        # Generate financial summary
        result = SquareService.generate_financial_summary(
            company_id=company_id,
            location_id=serializer.validated_data.get('location_id'),
            period_type=serializer.validated_data['period_type'],
            start_date=serializer.validated_data['start_date'],
            end_date=serializer.validated_data['end_date']
        )
        
        if result['success']:
            # Get all summaries for the period
            company = Company.objects.get(id=company_id)
            summaries = SquareFinancialSummary.objects.filter(
                company=company,
                period_type=serializer.validated_data['period_type'],
                period_start__gte=serializer.validated_data['start_date'],
                period_end__lte=serializer.validated_data['end_date']
            )
            
            if serializer.validated_data.get('location_id'):
                summaries = summaries.filter(location_id=serializer.validated_data['location_id'])
            
            # Calculate totals
            total_sales = sum(s.total_sales for s in summaries)
            total_net_revenue = sum(s.net_revenue for s in summaries)
            total_refunds = sum(s.total_refunds for s in summaries)
            total_transactions = sum(s.transaction_count for s in summaries)
            total_refund_count = sum(s.refund_count for s in summaries)
            
            response_data = {
                'success': True,
                'message': result['message'],
                'summaries': SquareFinancialSummarySerializer(summaries, many=True).data,
                'total_sales': total_sales,
                'total_net_revenue': total_net_revenue,
                'total_refunds': total_refunds,
                'total_transactions': total_transactions,
                'total_refund_count': total_refund_count
            }
            return Response(response_data)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class SquareIntegrationStatusView(AdminRoleRequiredMixin, APIView):
    """
    API view to get Square integration status
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get Square integration status for a company",
        responses={200: SquareIntegrationSerializer()}
    )
    def get(self, request, pk):
        """
        Get Square integration status for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        try:
            integration = SquareIntegration.objects.get(company=company)
            serializer = SquareIntegrationSerializer(integration)
            return Response(serializer.data)
        except SquareIntegration.DoesNotExist:
            return Response({
                'detail': 'Square integration not found for this company'
            }, status=status.HTTP_404_NOT_FOUND)


class SquareLocationsView(AdminRoleRequiredMixin, APIView):
    """
    API view to get Square locations
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get Square locations for a company",
        responses={200: SquareLocationSerializer(many=True)}
    )
    def get(self, request, pk):
        """
        Get Square locations for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        locations = SquareLocation.objects.filter(company=company)
        serializer = SquareLocationSerializer(locations, many=True)
        return Response(serializer.data)


class SquareTransactionsView(AdminRoleRequiredMixin, APIView):
    """
    API view to get Square transactions
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get Square transactions for a company",
        manual_parameters=[
            openapi.Parameter('location_id', openapi.IN_QUERY, description="Filter by location ID", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, required=False),
            openapi.Parameter('status', openapi.IN_QUERY, description="Filter by status", type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('limit', openapi.IN_QUERY, description="Number of transactions to return", type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={200: SquareTransactionSerializer(many=True)}
    )
    def get(self, request, pk):
        """
        Get Square transactions for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        transactions = SquareTransaction.objects.filter(company=company)
        
        # Apply filters
        location_id = request.query_params.get('location_id')
        if location_id:
            transactions = transactions.filter(location_id=location_id)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            transactions = transactions.filter(status=status_filter)
        
        # Apply limit
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                transactions = transactions[:limit]
            except ValueError:
                pass
        
        serializer = SquareTransactionSerializer(transactions, many=True)
        return Response(serializer.data)


class SquareEmployeesView(AdminRoleRequiredMixin, APIView):
    """
    API view to get Square employees
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get Square employees for a company",
        manual_parameters=[
            openapi.Parameter('location_id', openapi.IN_QUERY, description="Filter by location ID", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, required=False),
            openapi.Parameter('status', openapi.IN_QUERY, description="Filter by status", type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('limit', openapi.IN_QUERY, description="Number of employees to return", type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={200: SquareEmployeeSerializer(many=True)}
    )
    def get(self, request, pk):
        """
        Get Square employees for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        employees = SquareEmployee.objects.filter(company=company)
        
        # Apply filters
        location_id = request.query_params.get('location_id')
        if location_id:
            employees = employees.filter(location_id=location_id)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            employees = employees.filter(status=status_filter)
        
        # Apply limit
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                employees = employees[:limit]
            except ValueError:
                pass
        
        serializer = SquareEmployeeSerializer(employees, many=True)
        return Response(serializer.data)


class SquareInventoryView(AdminRoleRequiredMixin, APIView):
    """
    API view to get Square inventory items
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get Square inventory items for a company",
        manual_parameters=[
            openapi.Parameter('location_id', openapi.IN_QUERY, description="Filter by location ID", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, required=False),
            openapi.Parameter('item_type', openapi.IN_QUERY, description="Filter by item type", type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('is_available', openapi.IN_QUERY, description="Filter by availability", type=openapi.TYPE_BOOLEAN, required=False),
            openapi.Parameter('limit', openapi.IN_QUERY, description="Number of items to return", type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={200: SquareInventoryItemSerializer(many=True)}
    )
    def get(self, request, pk):
        """
        Get Square inventory items for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        inventory_items = SquareInventoryItem.objects.filter(company=company)
        
        # Apply filters
        location_id = request.query_params.get('location_id')
        if location_id:
            inventory_items = inventory_items.filter(location_id=location_id)
        
        item_type = request.query_params.get('item_type')
        if item_type:
            inventory_items = inventory_items.filter(item_type=item_type)
        
        is_available = request.query_params.get('is_available')
        if is_available is not None:
            is_available_bool = is_available.lower() == 'true'
            inventory_items = inventory_items.filter(is_available=is_available_bool)
        
        # Apply limit
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                inventory_items = inventory_items[:limit]
            except ValueError:
                pass
        
        serializer = SquareInventoryItemSerializer(inventory_items, many=True)
        return Response(serializer.data)


class SquareOrdersView(AdminRoleRequiredMixin, APIView):
    """
    API view to get Square orders
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get Square orders for a company",
        manual_parameters=[
            openapi.Parameter('location_id', openapi.IN_QUERY, description="Filter by location ID", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, required=False),
            openapi.Parameter('status', openapi.IN_QUERY, description="Filter by status", type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('employee_id', openapi.IN_QUERY, description="Filter by employee ID", type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, required=False),
            openapi.Parameter('limit', openapi.IN_QUERY, description="Number of orders to return", type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={200: SquareOrderSerializer(many=True)}
    )
    def get(self, request, pk):
        """
        Get Square orders for a company
        """
        has_admin_role, company = self.check_admin_role(request, pk)
        if not has_admin_role:
            return Response(company, status=status.HTTP_403_FORBIDDEN)
        
        orders = SquareOrder.objects.filter(company=company)
        
        # Apply filters
        location_id = request.query_params.get('location_id')
        if location_id:
            orders = orders.filter(location_id=location_id)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        employee_id = request.query_params.get('employee_id')
        if employee_id:
            orders = orders.filter(employee_id=employee_id)
        
        # Apply limit
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                orders = orders[:limit]
            except ValueError:
                pass
        
        serializer = SquareOrderSerializer(orders, many=True)
        return Response(serializer.data) 