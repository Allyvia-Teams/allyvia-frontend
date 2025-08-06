from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from role.parameters import PARAM_ROLE_HEADER, check_role_is_missing
from . import serializers
from .services import QuickbooksInvoiceService


class InvoiceStatsView(APIView):
    """
    API endpoint to retrieve Invoice statistics from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=serializers.DateRangeSerializer,
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: serializers.InvoiceStatsSerializer()},
        operation_summary="Get Invoice statistics",
        operation_description="Retrieve Invoice statistics from QuickBooks for a specific date range"
    )
    def get(self, request):
        # Check if role header is present
        if check_role_is_missing(request):
            return check_role_is_missing(request)
            
        # Validate date range parameters
        serializer = serializers.DateRangeSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        
        try:
            # Get Invoice statistics from QuickBooks
            invoice_stats = QuickbooksInvoiceService.get_invoice_statistics(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            stats_serializer = serializers.InvoiceStatsSerializer(data=invoice_stats)
            stats_serializer.is_valid(raise_exception=True)
            return Response(stats_serializer.validated_data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving invoice data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
