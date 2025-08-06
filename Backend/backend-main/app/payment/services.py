from datetime import datetime
from django.utils import timezone
from django.conf import settings
import json
import requests
from intuitlib.client import AuthClient
from quickbooks import QuickBooks
from quickbooks.objects.payment import Payment
from quickbooks.exceptions import QuickbooksException
from qb.services import QuickBooksService


class QuickbooksPaymentService:
    """
    Service for interacting with QuickBooks API to get payment data
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
    def get_payment_summary(company, role, start_date, end_date):
        """
        Get Payment summary from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            dict: Payment summary data
        """
        try:
            client = QuickbooksPaymentService.get_quickbooks_client(company)
            
            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Query for payments in the date range
            query = f"SELECT * FROM Payment WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' AND TotalAmt > '0' MAXRESULTS 1000"
            payments = Payment.query(query, qb=client)
            
            # Calculate total payment amount and count
            total_amount = sum(payment.TotalAmt for payment in payments)
            payment_count = len(payments)
            
            # Return the payment summary data
            return {
                'total_payments': total_amount,
                'payment_count': payment_count,
                'period': f"{start_date_str} to {end_date_str}"
            }
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving payment data: {str(e)}")
    
    @staticmethod
    def get_payment_trends(company, role, start_date, end_date):
        """
        Get Payment trends from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            list: Payment trend data by day
        """
        try:
            client = QuickbooksPaymentService.get_quickbooks_client(company)
            
            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Query for payments in the date range
            query = f"SELECT * FROM Payment WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' AND TotalAmt > '0' MAXRESULTS 1000"
            payments = Payment.query(query, qb=client)
            
            # Organize payments by date
            payment_by_date = {}
            for payment in payments:
                txn_date = payment.TxnDate
                if txn_date not in payment_by_date:
                    payment_by_date[txn_date] = {'total_amount': 0, 'count': 0}
                payment_by_date[txn_date]['total_amount'] += payment.TotalAmt
                payment_by_date[txn_date]['count'] += 1
            
            # Convert to list format for serialization
            trend_data = [
                {
                    'date': date,
                    'total_amount': data['total_amount'],
                    'count': data['count']
                }
                for date, data in sorted(payment_by_date.items())
            ]
            
            return trend_data
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving payment trend data: {str(e)}")
    
    @staticmethod
    def get_payment_details(company, role, start_date, end_date):
        """
        Get detailed Payment information from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            list: Detailed payment data
        """
        try:
            client = QuickbooksPaymentService.get_quickbooks_client(company)
            
            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Query for payments in the date range
            query = f"SELECT * FROM Payment WHERE TxnDate >= '{start_date_str}' AND TxnDate <= '{end_date_str}' AND TotalAmt > '0' MAXRESULTS 1000"
            payments = Payment.query(query, qb=client)
            
            # Extract detailed information for each payment
            payment_details = []
            for payment in payments:
                applied_to = []
                if hasattr(payment, 'Line') and payment.Line:
                    for line in payment.Line:
                        if hasattr(line, 'LinkedTxn') and line.LinkedTxn:
                            for linked in line.LinkedTxn:
                                if hasattr(linked, 'TxnId'):
                                    applied_to.append(linked.TxnId)
                
                payment_details.append({
                    'id': payment.Id if hasattr(payment, 'Id') else None,
                    'customer_name': payment.CustomerRef.name if hasattr(payment, 'CustomerRef') else None,
                    'payment_date': payment.TxnDate if hasattr(payment, 'TxnDate') else None,
                    'amount': payment.TotalAmt,
                    'payment_method': payment.PaymentMethodRef.name if hasattr(payment, 'PaymentMethodRef') and payment.PaymentMethodRef else 'N/A',
                    'applied_to_invoices': applied_to,
                    'status': 'Completed'  # Most payments in QuickBooks are completed when recorded
                })
            
            return payment_details
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving payment details: {str(e)}")
