from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from datetime import datetime, timedelta
from role.parameters import PARAM_ROLE_HEADER, check_role_is_missing
from . import serializers
from .services import ProfitService


class ProfitAndLossView(APIView):
    """
    API endpoint to retrieve Profit and Loss data from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=serializers.DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: serializers.ProfitAndLossSerializer()},
        operation_summary="Retrieve Profit and Loss data from QuickBooks for a specific date range"
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
            # Get Profit and Loss data from QuickBooks using company from the role
            profit_data = ProfitService.get_profit_and_loss(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            profit_serializer = serializers.ProfitAndLossSerializer(data=profit_data)
            profit_serializer.is_valid(raise_exception=True)
            return Response(profit_serializer.validated_data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving profit data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
