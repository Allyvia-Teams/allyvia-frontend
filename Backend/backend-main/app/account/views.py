from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from datetime import datetime, timedelta
from .services import QuickbooksAccountService
from role.parameters import PARAM_ROLE_HEADER, check_role_is_missing
from .serializers import (
    DateRangeSerializer, AccountSummarySerializer, AccountDetailSerializer,
    AccountBalanceTrendSerializer
)


class AccountSummaryView(APIView):
    """
    API endpoint to retrieve account summary from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: AccountSummarySerializer()},
        operation_summary="Retrieve account summary from QuickBooks for a specific date range",
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
            # Get account summary from QuickBooks
            account_data = QuickbooksAccountService.get_account_summary(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            result_serializer = AccountSummarySerializer(account_data)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccountDetailView(APIView):
    """
    API endpoint to retrieve detailed account information from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: AccountDetailSerializer(many=True)},
        operation_summary="Retrieve detailed account information from QuickBooks",
    )
    def get(self, request):
        # Check if role header is present
        if check_role_is_missing(request):
            return check_role_is_missing(request)
        
        try:
            # Get detailed account data from QuickBooks
            account_details = QuickbooksAccountService.get_account_details(
                company=request.current_company,
                role=request.current_role
            )
            
            # Serialize and return data
            result_serializer = AccountDetailSerializer(account_details, many=True)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccountBalanceTrendView(APIView):
    """
    API endpoint to retrieve account balance trends from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: AccountBalanceTrendSerializer(many=True)},
        operation_summary="Retrieve account balance trends from QuickBooks for a specific date range",
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
            # Get account balance trends from QuickBooks
            balance_trends = QuickbooksAccountService.get_account_balance_trends(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            result_serializer = AccountBalanceTrendSerializer(balance_trends, many=True)
            return Response(result_serializer.data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
