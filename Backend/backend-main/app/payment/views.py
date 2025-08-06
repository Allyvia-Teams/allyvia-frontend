from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from .services import QuickbooksPaymentService
from role.parameters import PARAM_ROLE_HEADER, check_role_is_missing
from . import serializers


class PaymentSummaryView(APIView):
    """
    API endpoint to retrieve payment summary from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=serializers.DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: serializers.PaymentSummarySerializer()},
        operation_summary="Retrieve payment summary from QuickBooks for a specific date range",
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
            # Get payment summary from QuickBooks
            payment_data = QuickbooksPaymentService.get_payment_summary(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            result_serializer = serializers.PaymentSummarySerializer(payment_data)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentTrendView(APIView):
    """
    API endpoint to retrieve payment trend data from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=serializers.DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: serializers.PaymentTrendSerializer(many=True)},
        operation_summary="Retrieve payment trends from QuickBooks for a specific date range",
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
            # Get payment trend data from QuickBooks
            payment_trends = QuickbooksPaymentService.get_payment_trends(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            result_serializer = serializers.PaymentTrendSerializer(payment_trends, many=True)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentDetailView(APIView):
    """
    API endpoint to retrieve detailed payment information from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=serializers.DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: serializers.PaymentDetailSerializer(many=True)},
        operation_summary="Retrieve detailed payment information from QuickBooks for a specific date range",
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
            # Get detailed payment data from QuickBooks
            payment_details = QuickbooksPaymentService.get_payment_details(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            result_serializer = serializers.PaymentDetailSerializer(payment_details, many=True)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
