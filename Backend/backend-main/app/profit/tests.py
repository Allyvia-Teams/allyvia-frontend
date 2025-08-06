from unittest.mock import MagicMock, patch
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from profit.tests import BaseTestCase


class ProfitAndLossViewTests(BaseTestCase):
    """Tests for ProfitAndLossView"""
    
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # URL for profit and loss endpoint
        self.url = reverse('profit:profit_and_loss')
        
        # Sample date range
        self.start_date = '2025-01-01'
        self.end_date = '2025-06-30'
        
        # Load mock response data
        self.mock_profit_data = self.load_mock_data('profit_and_loss')
    
    def load_mock_data(self, data_type):
        """Load mock response data for QuickBooks API"""
        if data_type == 'profit_and_loss':
            return {
                'Header': {
                    'ReportName': 'Profit and Loss',
                    'Time': '2025-06-30',
                    'ReportBasis': 'Accrual'
                },
                'Rows': {
                    'Row': [
                        {
                            'group': 'Income',
                            'Summary': {
                                'ColData': [
                                    {'value': 'Income'},
                                    {'value': '150000.00'}
                                ]
                            }
                        },
                        {
                            'group': 'COGS',
                            'Summary': {
                                'ColData': [
                                    {'value': 'Cost of Goods Sold'},
                                    {'value': '50000.00'}
                                ]
                            }
                        },
                        {
                            'group': 'GrossProfit',
                            'Summary': {
                                'ColData': [
                                    {'value': 'Gross Profit'},
                                    {'value': '100000.00'}
                                ]
                            }
                        },
                        {
                            'group': 'Expenses',
                            'Summary': {
                                'ColData': [
                                    {'value': 'Expenses'},
                                    {'value': '70000.00'}
                                ]
                            }
                        },
                        {
                            'group': 'NetOperatingIncome',
                            'Summary': {
                                'ColData': [
                                    {'value': 'Net Operating Income'},
                                    {'value': '30000.00'}
                                ]
                            }
                        },
                        {
                            'group': 'NetIncome',
                            'Summary': {
                                'ColData': [
                                    {'value': 'Net Income'},
                                    {'value': '30000.00'}
                                ]
                            }
                        }
                    ]
                }
            }
        return {}
    
    def test_profit_and_loss_missing_role_header(self):
        """Test that role header is required"""
        response = self.client.get(
            self.url,
            {'start_date': self.start_date, 'end_date': self.end_date}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('X-Role-ID header is required', str(response.data))
    
    def test_profit_and_loss_invalid_dates(self):
        """Test validation for invalid dates"""
        response = self.client.get(
            self.url,
            {'start_date': 'invalid-date', 'end_date': self.end_date},
            HTTP_X_ROLE_ID=str(self.viewer_role.id)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_profit_and_loss_success(self):
        """Test successful profit and loss retrieval"""
        # Configure mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_profit_data
        self.mock_requests_get.return_value = mock_response
        
        # Make request
        response = self.client.get(
            self.url,
            {'start_date': self.start_date, 'end_date': self.end_date},
            HTTP_X_ROLE_ID=str(self.viewer_role.id)
        )
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_income'], 150000.00)
        self.assertEqual(response.data['gross_profit'], 100000.00)
        self.assertEqual(response.data['net_income'], 30000.00)
        self.assertEqual(response.data['total_expenses'], 70000.00)
    
    def test_profit_and_loss_quickbooks_error(self):
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
        self.assertIn('Error retrieving profit data', str(response.data))
    
    def test_profit_and_loss_no_permission(self):
        """Test that invalid roles are rejected"""
        # Create a role without viewer permissions
        with patch('role.models.Role.is_viewer', return_value=False):
            response = self.client.get(
                self.url,
                {'start_date': self.start_date, 'end_date': self.end_date},
                HTTP_X_ROLE_ID=str(self.viewer_role.id)
            )
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("You don't have permission to access profit data", str(response.data))
