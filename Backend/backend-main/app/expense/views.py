from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from datetime import datetime, timedelta
from .services import QuickbooksExpenseService
from role.parameters import PARAM_ROLE_HEADER, check_role_is_missing
from .serializers import (
    DateRangeSerializer, ExpenseSummarySerializer, ExpenseByCategorySerializer,
    TopExpensesSerializer, ExpenseTrendSerializer, ExpenseByTypeSerializer, ExpenseByPayeeSerializer,
    BillStatusSerializer
)


class ExpenseSummaryView(APIView):
    """
    API endpoint to retrieve expense summary from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: ExpenseSummarySerializer()},
        operation_summary="Retrieve expense summary from QuickBooks for a specific date range",
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
            # Get expense summary from QuickBooks
            expense_data = QuickbooksExpenseService.get_expense_summary(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            summary_serializer = ExpenseSummarySerializer(data={
                'total_expenses': expense_data['total_expenses'],
                'period': expense_data['period']
            })
            summary_serializer.is_valid(raise_exception=True)
            
            # Return with expense categories
            return Response({
                **summary_serializer.validated_data,
                'expense_categories': expense_data['expense_categories']
            })
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving expense data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExpenseByCategoryView(APIView):
    """
    API endpoint to retrieve expenses by category from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: ExpenseByCategorySerializer(many=True)},
        operation_summary="Get Expenses by Category",
        operation_description="Retrieve expenses by category from QuickBooks for a specific date range"
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
            # Get expense summary from QuickBooks
            expense_data = QuickbooksExpenseService.get_expense_summary(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return just the categories
            categories_serializer = ExpenseByCategorySerializer(data=expense_data['expense_categories'], many=True)
            categories_serializer.is_valid(raise_exception=True)
            return Response(categories_serializer.validated_data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving expense categories: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TopExpensesView(APIView):
    """
    API endpoint to retrieve top expenses from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=DateRangeSerializer,
        manual_parameters=[
            *PARAM_ROLE_HEADER,
            openapi.Parameter(
                'limit',
                openapi.IN_QUERY,
                description="Maximum number of top expenses to retrieve",
                type=openapi.TYPE_INTEGER,
                required=False
            )
        ],
        responses={200: TopExpensesSerializer(many=True)},
        operation_summary="Get Top Expenses",
        operation_description="Retrieve top expenses from QuickBooks for a specific date range"
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
        
        # Get limit parameter (default to 10)
        try:
            limit = int(request.query_params.get('limit', 10))
            limit = min(max(1, limit), 50)  # Restrict between 1 and 50
        except ValueError:
            limit = 10
        
        try:
            # Get top expenses from QuickBooks
            top_expenses = QuickbooksExpenseService.get_top_expenses(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date,
                limit=limit
            )
            
            # Serialize and return data
            expenses_serializer = TopExpensesSerializer(data=top_expenses, many=True)
            expenses_serializer.is_valid(raise_exception=True)
            return Response(expenses_serializer.validated_data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving top expenses: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExpenseTrendView(APIView):
    """
    API endpoint to retrieve expense trend from QuickBooks
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        query_serializer=DateRangeSerializer,
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: ExpenseTrendSerializer(many=True)},
        operation_summary="Get Expense Trend",
        operation_description="Retrieve monthly expense trend from QuickBooks for a specific date range"
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
            # Get expense trend from QuickBooks
            expense_trend = QuickbooksExpenseService.get_expense_trend(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )
            
            # Serialize and return data
            trend_serializer = ExpenseTrendSerializer(data=expense_trend, many=True)
            trend_serializer.is_valid(raise_exception=True)
            return Response(trend_serializer.validated_data)
            
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving expense trend: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExpensesByTypeView(APIView):
    """
    API endpoint to retrieve expenses by type from QuickBooks
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: ExpenseByTypeSerializer(many=True)},
        operation_summary="Retrieve expenses by type from QuickBooks for a specific date range",
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
            # Get expenses by type from QuickBooks
            expense_data = QuickbooksExpenseService.get_expenses_by_type(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )

            # Serialize and return data
            result_serializer = ExpenseByTypeSerializer(expense_data, many=True)
            return Response(result_serializer.data)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExpensesByPayeeView(APIView):
    """
    API endpoint to retrieve expenses by payee (vendor) from QuickBooks
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: ExpenseByPayeeSerializer(many=True)},
        operation_summary="Retrieve expenses by payee from QuickBooks for a specific date range",
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
            # Get expenses by payee from QuickBooks
            expense_data = QuickbooksExpenseService.get_expenses_by_payee(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )

            # Serialize and return data
            result_serializer = ExpenseByPayeeSerializer(expense_data, many=True)
            return Response(result_serializer.data)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BillsByStatusView(APIView):
    """
    API endpoint to retrieve bills by payment status from QuickBooks
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        query_serializer=DateRangeSerializer(),
        manual_parameters=[*PARAM_ROLE_HEADER],
        responses={200: BillStatusSerializer(many=True)},
        operation_summary="Retrieve bills by payment status from QuickBooks for a specific date range",
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
            # Get bills by status from QuickBooks
            bill_data = QuickbooksExpenseService.get_bills_by_status(
                company=request.current_company,
                role=request.current_role,
                start_date=start_date,
                end_date=end_date
            )

            # Serialize and return data
            result_serializer = BillStatusSerializer(bill_data, many=True)
            return Response(result_serializer.data)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
