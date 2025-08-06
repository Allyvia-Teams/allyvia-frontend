from datetime import datetime
from django.utils import timezone
from django.conf import settings
import json
import requests
from intuitlib.client import AuthClient
from quickbooks import QuickBooks
from quickbooks.objects.invoice import Invoice
from quickbooks.exceptions import QuickbooksException
from qb.services import QuickBooksService


class QuickbooksInvoiceService:
    """
    Service for interacting with QuickBooks API to get invoice data
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
    def get_invoice_statistics(company, role, start_date, end_date):
        """
        Get Invoice statistics from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            dict: Invoice statistics
        """
        try:
            client = QuickbooksInvoiceService.get_quickbooks_client(company)
            
            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Construct query parameters for all invoices in date range
            # Note: We're using the QuickBooks Query Language (QBO)
            # Format: Select * FROM Invoice WHERE TxnDate >= '2025-06-01' AND TxnDate <= '2025-06-30'
            all_invoices_query = f"SELECT * FROM Invoice WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' MAXRESULTS 1000"
            
            # Initialize counters
            total_count = 0
            total_amount = 0.0
            unpaid_count = 0
            unpaid_amount = 0.0
            
            # Execute query through the python-quickbooks SDK
            try:
                invoices = Invoice.query(all_invoices_query, qb=client)
                
                # Process invoices
                for invoice in invoices:
                    total_count += 1
                    total_amount += float(invoice.TotalAmt)
                    
                    # Check if invoice is unpaid
                    # In QuickBooks, balance indicates the amount still due
                    if invoice.Balance and float(invoice.Balance) > 0:
                        unpaid_count += 1
                        unpaid_amount += float(invoice.Balance)
                
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
                    'query': all_invoices_query,
                    'minorversion': 65
                }
                
                response = requests.get(f"{base_url}{endpoint}", params=params, headers=headers)
                
                if response.status_code != 200:
                    raise Exception(f"QuickBooks API error: {response.status_code} - {response.text}")
                    
                data = response.json()
                
                # Extract invoices from the response
                invoices = data.get('QueryResponse', {}).get('Invoice', [])
                total_count = len(invoices)
                
                # Process invoices from API response
                for invoice in invoices:
                    amount = float(invoice.get('TotalAmt', 0))
                    total_amount += amount
                    
                    # Check if invoice is unpaid
                    balance = float(invoice.get('Balance', 0))
                    if balance > 0:
                        unpaid_count += 1
                        unpaid_amount += balance
            
            # Calculate unpaid percentage
            unpaid_percentage = (unpaid_amount / total_amount * 100) if total_amount > 0 else 0
            
            # Create period string
            period = f"{start_date_str} to {end_date_str}"
            
            # Return statistics
            result = {
                'total_count': total_count,
                'total_amount': round(total_amount, 2),
                'unpaid_count': unpaid_count,
                'unpaid_amount': round(unpaid_amount, 2),
                'unpaid_percentage': round(unpaid_percentage, 2),
                'period': period
            }
            
            return result
            
        except Exception as e:
            raise
