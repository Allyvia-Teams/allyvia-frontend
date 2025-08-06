import requests
from django.conf import settings
from qb.services import QuickBooksService
from datetime import datetime, timedelta


class ProfitService:
    """
    Service for interacting with the QuickBooks API
    """
    
    @staticmethod
    def get_profit_and_loss(company, role, start_date, end_date):
        """
        Get Profit and Loss report data from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the user in the company
            start_date: The start date for the report (datetime.date)
            end_date: The end date for the report (datetime.date)
            
        Returns:
            dict: Profit and Loss data
        """
        
        try:
            # Ensure user has at least viewer permissions via role
            if not role.is_viewer:
                raise ValueError("You don't have permission to access profit data")

            # init qb to ensure tokens works
            client = QuickBooksService.get_quickbooks_api_client(company)

            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Construct the API endpoint for Profit and Loss report
            base_url = settings.QUICKBOOKS_ACCOUNTING_API_BASE_URL
            endpoint = f"v3/company/{company.qb_realm_id}/reports/ProfitAndLoss"
            
            # Construct query parameters
            params = {
                'start_date': start_date_str,
                'end_date': end_date_str,
                'accounting_method': 'Accrual',
                'minorversion': 65
            }
            
            # Make API request
            headers = {
                'Authorization': f'Bearer {company.qb_access_token}',
                'Accept': 'application/json'
            }
            
            response = requests.get(f"{base_url}{endpoint}", params=params, headers=headers)
            
            if response.status_code != 200:
                raise Exception(f"QuickBooks API error: {response.status_code} - {response.text}")
                
            data = response.json()

            # Extract relevant data from the response based on the QuickBooks ProfitAndLoss response schema
            rows = data.get('Rows', {}).get('Row', [])
            
            # Initialize values
            net_income = 0
            net_operating_income = 0
            gross_profit = 0
            total_income = 0
            total_expenses = 0
            cost_of_goods_sold = 0
            
            # Direct extraction function to get values from Summary sections
            def extract_value_from_summary(row, label_match=None):
                if not row.get('Summary', {}).get('ColData'):
                    return None
                
                col_data = row.get('Summary', {}).get('ColData', [])
                if len(col_data) < 2:
                    return None
                
                label = col_data[0].get('value', '')
                value_str = col_data[1].get('value', '0')
                
                # If label_match is provided, check if it matches
                if label_match and label_match not in label:
                    return None
                    
                # Convert value to float
                try:
                    return float(value_str.replace(',', '') if value_str else 0)
                except ValueError:
                    return 0
            
            # Scan through all rows to find the specific sections by group identifier
            for row in rows:
                group = row.get('group', '')
                
                if group == 'NetIncome':
                    value = extract_value_from_summary(row)
                    if value is not None:
                        net_income = value

                elif group == 'NetOperatingIncome':
                    value = extract_value_from_summary(row)
                    if value is not None:
                        net_operating_income = value

                elif group == 'GrossProfit':
                    value = extract_value_from_summary(row)
                    if value is not None:
                        gross_profit = value

                elif group == 'Income':
                    value = extract_value_from_summary(row)
                    if value is not None:
                        total_income = value

                elif group == 'Expenses':
                    value = extract_value_from_summary(row)
                    if value is not None:
                        total_expenses = value

                elif group == 'COGS':
                    value = extract_value_from_summary(row)
                    if value is not None:
                        cost_of_goods_sold = value

                # Also check for Summary sections with specific labels (as a backup)
                summary = extract_value_from_summary(row)
                if summary is not None:
                    label = row.get('Summary', {}).get('ColData', [{}])[0].get('value', '')
                    
                    if 'Net Income' in label and group != 'NetIncome':
                        net_income = summary
                    elif 'Net Operating Income' in label and group != 'NetOperatingIncome':
                        net_operating_income = summary
                    elif 'Gross Profit' in label and group != 'GrossProfit':
                        gross_profit = summary
                    elif 'Total Income' in label and group != 'Income':
                        total_income = summary
                    elif 'Total Expenses' in label and group != 'Expenses':
                        total_expenses = summary
                    elif 'Total Cost of Goods Sold' in label and group != 'COGS':
                        cost_of_goods_sold = summary

            # Return data
            period = f"{start_date_str} to {end_date_str}"
            result = {
                'net_income': net_income,
                'net_operating_income': net_operating_income,
                'gross_profit': gross_profit,
                'total_income': total_income,
                'total_expenses': total_expenses,
                'cost_of_goods_sold': cost_of_goods_sold,
                'period': period
            }
            return result
            
        except Exception as e:
            raise
