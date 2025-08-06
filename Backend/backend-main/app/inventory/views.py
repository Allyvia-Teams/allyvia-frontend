from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from datetime import datetime, timedelta
from .services import QuickbooksInventoryService
from role.parameters import PARAM_ROLE_HEADER, check_role_is_missing
from .serializers import (
    DateRangeSerializer, InventorySummarySerializer, InventoryItemSerializer,
    InventoryStockTrendSerializer
)


class InventorySummaryView(APIView):
    """
    API endpoint to retrieve inventory summary from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: InventorySummarySerializer()},
        operation_summary="Retrieve inventory summary from QuickBooks for a specific date range",
    )
    def get(self, request):
        # Check if role header is present
        if check_role_is_missing(request):
            return check_role_is_missing(request)
            
        # Validate date range parameters
        serializer = DateRangeSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        
        try:
            # Get inventory summary from QuickBooks
            inventory_data = QuickbooksInventoryService.get_inventory_summary(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            result_serializer = InventorySummarySerializer(inventory_data)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InventoryItemsView(APIView):
    """
    API endpoint to retrieve detailed inventory item information from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: InventoryItemSerializer(many=True)},
        operation_summary="Retrieve detailed inventory item information from QuickBooks",
    )
    def get(self, request):
        # Check if role header is present
        if check_role_is_missing(request):
            return check_role_is_missing(request)
        
        try:
            # Get detailed inventory item data from QuickBooks
            inventory_items = QuickbooksInventoryService.get_inventory_items(
                company=request.current_company,
                role=request.current_role
            )
            
            # Serialize and return data
            result_serializer = InventoryItemSerializer(inventory_items, many=True)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InventoryStockTrendView(APIView):
    """
    API endpoint to retrieve inventory stock trends from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    item_ids_param = openapi.Parameter(
        'item_ids', 
        openapi.IN_QUERY,
        description="Comma-separated list of item IDs to include (optional)",
        type=openapi.TYPE_STRING,
        required=False
    )
    
    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER, item_ids_param],
        responses={200: InventoryStockTrendSerializer(many=True)},
        operation_summary="Retrieve inventory stock trends from QuickBooks for a specific date range",
    )
    def get(self, request):
        # Check if role header is present
        if check_role_is_missing(request):
            return check_role_is_missing(request)
            
        # Validate date range parameters
        serializer = DateRangeSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        
        # Check for optional item_ids parameter
        item_ids = None
        if 'item_ids' in request.query_params:
            item_ids = request.query_params['item_ids'].split(',')
        
        try:
            # Get inventory stock trends from QuickBooks
            stock_trends = QuickbooksInventoryService.get_inventory_stock_trends(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date,
                item_ids=item_ids
            )
            
            # Serialize and return data
            result_serializer = InventoryStockTrendSerializer(stock_trends, many=True)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
