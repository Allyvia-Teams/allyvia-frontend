from unittest.mock import MagicMock, patch
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from expense.tests import BaseTestCase


class ExpenseSummaryViewTests(BaseTestCase):
    """Tests for ExpenseSummaryView"""
    
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # URL for expense summary endpoint
        self.url = reverse('expense:expense_summary')
        
        # Sample date range
        self.start_date = '2025-01-01'
        self.end_date = '2025-06-30'
        
        # Load mock response data
        self.mock_expense_data = self.load_mock_expense_data()
    
    def load_mock_expense_data(self):
        """Load mock response data for QuickBooks API"""
        return {
            'Header': {
                'ReportName': 'Profit and Loss',
                'Time': '2025-06-30',
                'ReportBasis': 'Accrual'
            },
            'Rows': {
                'Row': [
                    {
                        'group': 'Expenses',
                        'Summary': {
                            'ColData': [
                                {'value': 'Expenses'},
                                {'value': '70000.00'}
                            ]
                        },
                        'Rows': {
                            'Row': [
                                {
                                    'ColData': [
                                        {'value': 'Rent'},
                                        {'value': '20000.00'}
                                    ]
                                },
                                {
                                    'ColData': [
                                        {'value': 'Utilities'},
                                        {'value': '15000.00'}
                                    ]
                                },
                                {
                                    'ColData': [
                                        {'value': 'Payroll'},
                                        {'value': '35000.00'}
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }
        }
    
    def test_expense_summary_missing_role_header(self):
        """Test that role header is required"""
        response = self.client.get(
            self.url,
            {'start_date': self.start_date, 'end_date': self.end_date}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('X-Role-ID header is required', str(response.data))
    
    def test_expense_summary_invalid_dates(self):
        """Test validation for invalid dates"""
        response = self.client.get(
            self.url,
            {'start_date': 'invalid-date', 'end_date': self.end_date},
            HTTP_X_ROLE_ID=str(self.viewer_role.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_expense_summary_success(self):
        """Test successful expense summary retrieval"""
        # Configure mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_expense_data
        self.mock_requests_get.return_value = mock_response
        
        # Make request
        response = self.client.get(
            self.url,
            {'start_date': self.start_date, 'end_date': self.end_date},
            HTTP_X_ROLE_ID=str(self.viewer_role.id)
        )
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_expenses'], 70000.00)
        self.assertEqual(len(response.data['expense_categories']), 3)
        
        # Check expense categories
        categories = {cat['category_name']: cat['amount'] for cat in response.data['expense_categories']}
        self.assertEqual(categories['Rent'], 20000.00)
        self.assertEqual(categories['Utilities'], 15000.00)
        self.assertEqual(categories['Payroll'], 35000.00)
    
    def test_expense_summary_quickbooks_error(self):
        """Test handling of QuickBooks API errors"""
        # Configure mock response to simulate error
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        self.mock_requests_get.return_value = mock_response
        
        # Make request
        response = self.client.get(
            self.url,
            {'start_date': self.start_date, 'end_date': self.end_date},
            HTTP_X_ROLE_ID=str(self.viewer_role.id)
        )
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('Error retrieving expense data', str(response.data))


class TopExpensesViewTests(BaseTestCase):
    """Tests for TopExpensesView"""
    
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # URL for top expenses endpoint
        self.url = reverse('expense:top_expenses')
        
        # Sample date range
        self.start_date = '2025-01-01'
        self.end_date = '2025-06-30'
        
        # Mock purchase query response
        self.mock_purchases_data = self.get_mock_purchases()
    
    def get_mock_purchases(self):
        """Get mock Purchase objects for QuickBooks SDK"""
        # Create mock Purchase objects
        purchase1 = MagicMock()
        purchase1.TotalAmt = 5000.00
        purchase1.TxnDate = '2025-03-15'
        purchase1.Line = [MagicMock(Description='Office Equipment')]
        purchase1.EntityRef = MagicMock(name='Vendor A')
        
        purchase2 = MagicMock()
        purchase2.TotalAmt = 3500.00
        purchase2.TxnDate = '2025-02-10'
        purchase2.Line = [MagicMock(Description='Software Licenses')]
        purchase2.EntityRef = MagicMock(name='Vendor B')
        
        purchase3 = MagicMock()
        purchase3.TotalAmt = 2800.00
        purchase3.TxnDate = '2025-05-22'
        purchase3.Line = [MagicMock(Description='Marketing Materials')]
        purchase3.EntityRef = MagicMock(name='Vendor C')
        
        return [purchase1, purchase2, purchase3]
    
    def test_top_expenses_success(self):
        """Test successful top expenses retrieval using SDK"""
        # Mock Purchase.query method
        with patch('quickbooks.objects.purchase.Purchase.query', return_value=self.mock_purchases_data):
            # Make request
            response = self.client.get(
                self.url,
                {'start_date': self.start_date, 'end_date': self.end_date, 'limit': 3},
                HTTP_X_ROLE_ID=str(self.viewer_role.id)
            )
            
            # Check response
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data), 3)
            
            # Check sorted order (by amount, descending)
            self.assertEqual(response.data[0]['amount'], 5000.00)
            self.assertEqual(response.data[1]['amount'], 3500.00)
            self.assertEqual(response.data[2]['amount'], 2800.00)
            
            # Check expense names
            expenses = {exp['expense_name']: exp['amount'] for exp in response.data}
            self.assertEqual(expenses['Office Equipment'], 5000.00)
            self.assertEqual(expenses['Software Licenses'], 3500.00)
            self.assertEqual(expenses['Marketing Materials'], 2800.00)
