from datetime import datetime
from django.utils import timezone
from django.conf import settings
import json
import requests
from intuitlib.client import AuthClient
from quickbooks import QuickBooks
from quickbooks.objects.purchase import Purchase
from quickbooks.objects.account import Account
from quickbooks.objects.vendor import Vendor
from quickbooks.exceptions import QuickbooksException
from qb.services import QuickBooksService
from quickbooks.objects.purchase import Purchase
from quickbooks.objects.bill import Bill
from quickbooks.objects.account import Account
from quickbooks.objects.vendor import Vendor


class QuickbooksExpenseService:
    """
    Service for interacting with QuickBooks API to get expense data
    """
    
    @staticmethod
    def get_quickbooks_client(company):
        """
        Create a QuickBooks client for the given company
        """
        if not company.is_connected_to_quickbooks:
            raise ValueError("Company is not connected to QuickBooks")
        
        # Use the QuickBooksService to get a client
        return QuickBooksService.get_quickbooks_api_client(company)
    
    @staticmethod
    def get_expense_summary(company, role, start_date, end_date):
        """
        Get expense summary from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            dict: Expense summary data
        """
        try:
            client = QuickbooksExpenseService.get_quickbooks_client(company)

            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Use the Profit and Loss report to get expense data
            # This provides more structured data than querying individual expenses
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
            
            # Extract expense data from the Profit and Loss report
            rows = data.get('Rows', {}).get('Row', [])
            total_expenses = 0
            expense_categories = []
            
            # Process rows to find expense section
            for row in rows:
                if row.get('group', '') == 'Expenses':
                    # Extract total expenses
                    if row.get('Summary', {}).get('ColData'):
                        col_data = row.get('Summary', {}).get('ColData', [])
                        if len(col_data) >= 2:
                            value_str = col_data[1].get('value', '0')
                            total_expenses = float(value_str.replace(',', '') if value_str else 0)
                    
                    # Extract expense categories
                    expense_rows = row.get('Rows', {}).get('Row', [])
                    for exp_row in expense_rows:
                        # Check if this is a category row
                        if exp_row.get('ColData') or (exp_row.get('Header', {}).get('ColData') and exp_row.get('Summary', {}).get('ColData')):
                            category_name = ""
                            amount = 0
                            
                            # Handle different row structures
                            if exp_row.get('ColData'):
                                # Simple category
                                col_data = exp_row.get('ColData', [])
                                if len(col_data) >= 2:
                                    category_name = col_data[0].get('value', '')
                                    value_str = col_data[1].get('value', '0')
                                    amount = float(value_str.replace(',', '') if value_str else 0)
                            elif exp_row.get('Header', {}).get('ColData') and exp_row.get('Summary', {}).get('ColData'):
                                # Category with subcategories
                                header_data = exp_row.get('Header', {}).get('ColData', [])
                                summary_data = exp_row.get('Summary', {}).get('ColData', [])
                                
                                if len(header_data) >= 1 and len(summary_data) >= 2:
                                    category_name = header_data[0].get('value', '')
                                    value_str = summary_data[1].get('value', '0')
                                    amount = float(value_str.replace(',', '') if value_str else 0)
                            
                            if category_name and amount != 0:
                                expense_categories.append({
                                    'category_name': category_name,
                                    'amount': amount,
                                    'percentage': round((amount / total_expenses * 100) if total_expenses else 0, 2)
                                })
            
            # Sort expense categories by amount (descending)
            expense_categories.sort(key=lambda x: x['amount'], reverse=True)
            
            # Create period string
            period = f"{start_date_str} to {end_date_str}"
            
            # Return data
            result = {
                'total_expenses': total_expenses,
                'expense_categories': expense_categories,
                'period': period
            }
            
            return result
            
        except Exception as e:
            raise
    
    @staticmethod
    def get_top_expenses(company, role, start_date, end_date, limit=10):
        """
        Get top individual expenses from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            limit: Maximum number of expenses to return
            
        Returns:
            list: List of top expenses
        """
        try:
            client = QuickbooksExpenseService.get_quickbooks_client(company)
            
            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Query for Purchase transactions (which include expenses)
            # Note: We're using the QuickBooks Query Language (QBO)
            query = f"SELECT * FROM Purchase WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' ORDERBY TotalAmt DESC MAXRESULTS {limit}"
            
            # Initialize list for top expenses
            top_expenses = []
            
            # Execute query through the python-quickbooks SDK
            try:
                purchases = Purchase.query(query, qb=client)
                
                # Process purchases
                for purchase in purchases:
                    # Check if this is an expense (not a bill or credit card payment)
                    if hasattr(purchase, 'TotalAmt') and purchase.TotalAmt:
                        expense_name = "Expense"
                        if hasattr(purchase, 'Line') and purchase.Line:
                            # Get description from the first line item
                            for line in purchase.Line:
                                if hasattr(line, 'Description') and line.Description:
                                    expense_name = line.Description
                                    break
                        
                        # Get vendor name if available
                        vendor_name = "Unknown"
                        if hasattr(purchase, 'EntityRef') and purchase.EntityRef:
                            try:
                                vendor = Vendor.get_by_id(purchase.EntityRef.value, qb=client)
                                vendor_name = vendor.DisplayName or "Unknown"
                            except:
                                vendor_name = purchase.EntityRef.name or "Unknown"
                        
                        # Add to top expenses
                        top_expenses.append({
                            'expense_name': expense_name,
                            'amount': float(purchase.TotalAmt),
                            'date': datetime.strptime(purchase.TxnDate, '%Y-%m-%d').date(),
                            'vendor': vendor_name
                        })
                
            except QuickbooksException as qbe:
                # Fallback to direct API call if SDK fails
                base_url = settings.QUICKBOOKS_ACCOUNTING_API_BASE_URL
                endpoint = f"v3/company/{company.qb_realm_id}/query"
                
                # Make API request
                headers = {
                    'Authorization': f'Bearer {company.qb_access_token}',
                    'Accept': 'application/json',
                    'Content-Type': 'application/text'
                }
                
                params = {
                    'query': query,
                    'minorversion': 65
                }
                
                response = requests.get(f"{base_url}{endpoint}", params=params, headers=headers)
                
                if response.status_code != 200:
                    raise Exception(f"QuickBooks API error: {response.status_code} - {response.text}")
                    
                data = response.json()
                
                # Extract purchases from the response
                purchases = data.get('QueryResponse', {}).get('Purchase', [])
                
                # Process purchases from API response
                for purchase in purchases:
                    expense_name = "Expense"
                    if 'Line' in purchase:
                        # Get description from the first line item
                        for line in purchase['Line']:
                            if 'Description' in line:
                                expense_name = line['Description']
                                break
                    
                    # Get vendor name if available
                    vendor_name = "Unknown"
                    if 'EntityRef' in purchase:
                        vendor_name = purchase['EntityRef'].get('name', 'Unknown')
                    
                    # Add to top expenses
                    top_expenses.append({
                        'expense_name': expense_name,
                        'amount': float(purchase.get('TotalAmt', 0)),
                        'date': datetime.strptime(purchase.get('TxnDate', end_date_str), '%Y-%m-%d').date(),
                        'vendor': vendor_name
                    })
            
            # Sort by amount (descending) and limit to requested number
            top_expenses.sort(key=lambda x: x['amount'], reverse=True)
            top_expenses = top_expenses[:limit]
            
            return top_expenses
            
        except Exception as e:
            raise
    
    @staticmethod
    def get_expense_trend(company, role, start_date, end_date):
        """
        Get monthly expense trend from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            list: Monthly expense data
        """
        try:
            client = QuickbooksExpenseService.get_quickbooks_client(company)

            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Use the Profit and Loss report with monthly columns
            base_url = settings.QUICKBOOKS_ACCOUNTING_API_BASE_URL
            endpoint = f"v3/company/{company.qb_realm_id}/reports/ProfitAndLoss"
            
            # Construct query parameters
            params = {
                'start_date': start_date_str,
                'end_date': end_date_str,
                'accounting_method': 'Accrual',
                'columns': 'monthly',
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
            
            # Extract expense data from the monthly report
            columns = data.get('Columns', {}).get('Column', [])
            rows = data.get('Rows', {}).get('Row', [])
            
            # Initialize monthly expense data
            monthly_expenses = []
            
            # Get column names (months)
            months = []
            for col in columns:
                if col.get('ColType') == 'Money':
                    months.append(col.get('ColTitle', ''))
            
            # Find expense row
            for row in rows:
                if row.get('group', '') == 'Expenses':
                    # Get summary data (total expenses by month)
                    summary = row.get('Summary', {}).get('ColData', [])
                    
                    # Skip the first column (it's the label "Total Expenses")
                    for i, col_data in enumerate(summary[1:], 1):
                        if i <= len(months):
                            month = months[i-1]
                            value_str = col_data.get('value', '0')
                            amount = float(value_str.replace(',', '') if value_str else 0)
                            
                            monthly_expenses.append({
                                'period': month,
                                'amount': amount
                            })
            
            # Return the expense trend data
            
            return monthly_expenses
            
        except Exception as e:
            raise

    @staticmethod
    def get_expenses_by_type(company, role, start_date, end_date):
        """
		Get expenses from QuickBooks grouped by type (Bill, Credit Card, Check, etc.)

		Args:
			company: The company to get data for
			role: The role of the current user in the company
			start_date: The start date for the query (datetime.date)
			end_date: The end date for the query (datetime.date)

		Returns:
			list: Expense data grouped by type
		"""
        try:
            client = QuickbooksExpenseService.get_quickbooks_client(company)

            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')

            # Get expenses from the Purchase object (for credit card expenses, checks, etc.)
            purchase_query = f"SELECT * FROM Purchase WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' MAXRESULTS 1000"
            purchases = Purchase.query(purchase_query, qb=client)

            # Get expenses from Bills
            bill_query = f"SELECT * FROM Bill WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' MAXRESULTS 1000"
            bills = Bill.query(bill_query, qb=client)

            # Initialize expense types
            expense_types = {
                'Bill': {'count': 0, 'total': 0},
                'Check': {'count': 0, 'total': 0},
                'CreditCard': {'count': 0, 'total': 0},
                'Cash': {'count': 0, 'total': 0},
                'Other': {'count': 0, 'total': 0}
            }

            # Process Purchase transactions
            for purchase in purchases:
                payment_type = purchase.PaymentType if hasattr(purchase, 'PaymentType') else 'Other'
                amount = purchase.TotalAmt if hasattr(purchase, 'TotalAmt') else 0

                if payment_type in expense_types:
                    expense_types[payment_type]['count'] += 1
                    expense_types[payment_type]['total'] += amount
                else:
                    expense_types['Other']['count'] += 1
                    expense_types['Other']['total'] += amount

            # Add Bills to the Bill type
            expense_types['Bill']['count'] += len(bills)
            expense_types['Bill']['total'] += sum(bill.TotalAmt for bill in bills if hasattr(bill, 'TotalAmt'))

            # Format the results for the API response
            result = []
            for expense_type, data in expense_types.items():
                if data['count'] > 0:
                    result.append({
                        'type': expense_type,
                        'count': data['count'],
                        'total': data['total'],
                        'percentage': 0  # Will be calculated after totaling
                    })

            # Calculate total amount across all types
            total_amount = sum(item['total'] for item in result)

            # Add percentage if total amount is greater than 0
            if total_amount > 0:
                for item in result:
                    item['percentage'] = round((item['total'] / total_amount) * 100, 2)

            return result

        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving expense data by type: {str(e)}")

    @staticmethod
    def get_expenses_by_payee(company, role, start_date, end_date):
        """
		Get expenses from QuickBooks grouped by payee (vendor)

		Args:
			company: The company to get data for
			role: The role of the current user in the company
			start_date: The start date for the query (datetime.date)
			end_date: The end date for the query (datetime.date)

		Returns:
			list: Expense data grouped by payee
		"""
        try:
            client = QuickbooksExpenseService.get_quickbooks_client(company)

            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')

            # Get expenses from the Purchase object (for credit card expenses, checks, etc.)
            purchase_query = f"SELECT * FROM Purchase WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' MAXRESULTS 1000"
            purchases = Purchase.query(purchase_query, qb=client)

            # Get expenses from Bills
            bill_query = f"SELECT * FROM Bill WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' MAXRESULTS 1000"
            bills = Bill.query(bill_query, qb=client)

            # Initialize dictionary to hold expenses by payee
            expenses_by_payee = {}

            # Process Purchase transactions
            for purchase in purchases:
                if not hasattr(purchase, 'EntityRef') or not purchase.EntityRef:
                    payee_id = 'Unknown'
                    payee_name = 'Unknown'
                else:
                    payee_id = purchase.EntityRef.value
                    payee_name = purchase.EntityRef.name

                amount = purchase.TotalAmt if hasattr(purchase, 'TotalAmt') else 0

                if payee_id not in expenses_by_payee:
                    expenses_by_payee[payee_id] = {
                        'payee_id': payee_id,
                        'payee_name': payee_name,
                        'count': 0,
                        'total': 0
                    }

                expenses_by_payee[payee_id]['count'] += 1
                expenses_by_payee[payee_id]['total'] += amount

            # Process Bill transactions
            for bill in bills:
                if not hasattr(bill, 'VendorRef') or not bill.VendorRef:
                    payee_id = 'Unknown'
                    payee_name = 'Unknown'
                else:
                    payee_id = bill.VendorRef.value
                    payee_name = bill.VendorRef.name

                amount = bill.TotalAmt if hasattr(bill, 'TotalAmt') else 0

                if payee_id not in expenses_by_payee:
                    expenses_by_payee[payee_id] = {
                        'payee_id': payee_id,
                        'payee_name': payee_name,
                        'count': 0,
                        'total': 0
                    }

                expenses_by_payee[payee_id]['count'] += 1
                expenses_by_payee[payee_id]['total'] += amount

            # Convert to list and sort by total amount
            result = list(expenses_by_payee.values())
            result.sort(key=lambda x: x['total'], reverse=True)

            # Calculate total amount across all payees
            total_amount = sum(item['total'] for item in result)

            # Add percentage if total amount is greater than 0
            if total_amount > 0:
                for item in result:
                    item['percentage'] = round((item['total'] / total_amount) * 100, 2)

            return result

        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving expense data by payee: {str(e)}")

    @staticmethod
    def get_expenses_by_category(company, role, start_date, end_date):
        """
		Get expenses from QuickBooks grouped by category (account)

		Args:
			company: The company to get data for
			role: The role of the current user in the company
			start_date: The start date for the query (datetime.date)
			end_date: The end date for the query (datetime.date)

		Returns:
			list: Expense data grouped by category
		"""
        try:
            client = QuickbooksExpenseService.get_quickbooks_client(company)

            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')

            # Initialize dictionary to hold expenses by category
            expenses_by_category = {}

            # We need to query the profit and loss report to get the expense categories
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

            # Find the Expenses section in the report
            expense_section = None
            if 'Rows' in data and 'Row' in data['Rows']:
                for row in data['Rows']['Row']:
                    if row.get('Header', {}).get('ColData', [{}])[0].get('value', '') == 'Expenses':
                        expense_section = row
                        break

            # If we found the Expenses section, extract the categories
            if expense_section and 'Rows' in expense_section and 'Row' in expense_section['Rows']:
                for row in expense_section['Rows']['Row']:
                    category_name = row.get('Header', {}).get('ColData', [{}])[0].get('value', 'Other')
                    if row.get('Summary', {}).get('ColData', []):
                        try:
                            amount = float(
                                row.get('Summary', {}).get('ColData', [{}])[0].get('value', '0').replace(',', ''))
                        except ValueError:
                            amount = 0

                        # Add to our dictionary
                        expenses_by_category[category_name] = {
                            'category': category_name,
                            'total': amount
                        }

            # Convert to list and sort by total amount
            result = list(expenses_by_category.values())
            result.sort(key=lambda x: x['total'], reverse=True)

            # Calculate total amount across all categories
            total_amount = sum(item['total'] for item in result)

            # Add percentage if total amount is greater than 0
            if total_amount > 0:
                for item in result:
                    item['percentage'] = round((item['total'] / total_amount) * 100, 2)

            return result

        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving expense data by category: {str(e)}")

    @staticmethod
    def get_bills_by_status(company, role, start_date, end_date):
        """
		Get bills from QuickBooks grouped by payment status

		Args:
			company: The company to get data for
			role: The role of the current user in the company
			start_date: The start date for the query (datetime.date)
			end_date: The end date for the query (datetime.date)

		Returns:
			list: Bill data grouped by payment status
		"""
        try:
            client = QuickbooksExpenseService.get_quickbooks_client(company)

            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')

            # Get all bills in the date range
            bill_query = f"SELECT * FROM Bill WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' MAXRESULTS 1000"
            bills = Bill.query(bill_query, qb=client)

            # Initialize status categories
            bill_status = {
                'Paid': {'count': 0, 'total': 0},
                'Unpaid': {'count': 0, 'total': 0},
                'Pending': {'count': 0, 'total': 0},
                'Other': {'count': 0, 'total': 0}
            }

            # Process Bills
            for bill in bills:
                status = 'Unpaid'  # Default status

                # Determine status based on balance due
                if hasattr(bill, 'Balance') and hasattr(bill, 'TotalAmt'):
                    if bill.Balance == 0:
                        status = 'Paid'
                    elif bill.Balance < bill.TotalAmt:
                        status = 'Pending'

                amount = bill.TotalAmt if hasattr(bill, 'TotalAmt') else 0

                bill_status[status]['count'] += 1
                bill_status[status]['total'] += amount

            # Format the results for the API response
            result = []
            for status, data in bill_status.items():
                if data['count'] > 0:
                    result.append({
                        'status': status,
                        'count': data['count'],
                        'total': data['total'],
                        'percentage': 0  # Will be calculated after totaling
                    })

            # Calculate total amount across all statuses
            total_amount = sum(item['total'] for item in result)
            total_count = sum(item['count'] for item in result)

            # Add percentage if total amount is greater than 0
            if total_amount > 0:
                for item in result:
                    item['percentage'] = round((item['total'] / total_amount) * 100, 2)

            # Add totals
            result.append({
                'status': 'Total',
                'count': total_count,
                'total': total_amount,
                'percentage': 100
            })

            return result

        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving bill data by status: {str(e)}")