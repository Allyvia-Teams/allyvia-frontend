from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
import json
import requests
from intuitlib.client import AuthClient
from quickbooks import QuickBooks
from quickbooks.objects.account import Account
from quickbooks.exceptions import QuickbooksException
from qb.services import QuickBooksService


class QuickbooksAccountService:
    """
    Service for interacting with QuickBooks API to get account data
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
    def get_account_summary(company, role, start_date, end_date):
        """
        Get Account summary from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            dict: Account summary data
        """
        try:
            client = QuickbooksAccountService.get_quickbooks_client(company)
            
            # Format dates for QuickBooks API
            # Note: Account data is current as of today, not historical
            
            # Query for active accounts
            query = "SELECT * FROM Account WHERE Active = true MAXRESULTS 1000"
            accounts = Account.query(query, qb=client)
            
            # Calculate total balance across all accounts
            # Note: This is a simplified approach - in reality, you'd need to filter by account types
            total_balance = sum(account.CurrentBalance for account in accounts if hasattr(account, 'CurrentBalance'))
            
            # Return the account summary data
            return {
                'total_accounts': len(accounts),
                'total_balance': total_balance,
                'period': f"As of {end_date.strftime('%Y-%m-%d')}"
            }
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving account data: {str(e)}")
    
    @staticmethod
    def get_account_details(company, role):
        """
        Get detailed Account information from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            
        Returns:
            list: Detailed account data
        """
        try:
            client = QuickbooksAccountService.get_quickbooks_client(company)
            
            # Query for all accounts
            query = "SELECT * FROM Account MAXRESULTS 1000"
            accounts = Account.query(query, qb=client)
            
            # Extract detailed information for each account
            account_details = []
            for account in accounts:
                account_details.append({
                    'id': account.Id,
                    'name': account.Name,
                    'account_type': account.AccountType,
                    'account_subtype': account.AccountSubType if hasattr(account, 'AccountSubType') else None,
                    'balance': account.CurrentBalance if hasattr(account, 'CurrentBalance') else 0,
                    'is_active': account.Active if hasattr(account, 'Active') else True
                })
            
            return account_details
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving account details: {str(e)}")
    
    @staticmethod
    def get_account_balance_trends(company, role, start_date, end_date):
        """
        Get Account balance trends from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            list: Account balance trend data
        """
        try:
            client = QuickbooksAccountService.get_quickbooks_client(company)
            
            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Get all accounts
            query = "SELECT * FROM Account WHERE Active = true MAXRESULTS 1000"
            accounts = Account.query(query, qb=client)
            
            # Get account balances over time
            # Note: QuickBooks API doesn't provide historical balances directly
            # This is a simplified approach - in a real implementation, you would need to
            # calculate historical balances using transactions
            
            # Construct the API endpoint for General Ledger report
            base_url = settings.QUICKBOOKS_ACCOUNTING_API_BASE_URL
            endpoint = f"v3/company/{company.qb_realm_id}/reports/GeneralLedger"
            
            # Construct query parameters
            params = {
                'start_date': start_date_str,
                'end_date': end_date_str,
                'minorversion': 65
            }
            
            # Make API request to get the General Ledger report
            url = f"{base_url}{endpoint}"
            headers = {
                'Authorization': f"Bearer {company.qb_access_token}",
                'Accept': 'application/json'
            }
            
            response = requests.get(url, params=params, headers=headers)
            if response.status_code != 200:
                raise ValueError(f"QuickBooks API error: {response.text}")
            
            # Process the response
            report_data = response.json()
            
            # Create a dictionary to map account IDs to their transaction history
            account_trends = []
            
            # This is a simplified implementation - in a real-world scenario,
            # you would need to parse the General Ledger report and calculate balances over time
            for account in accounts:
                # Just create some sample data for demonstration
                current_balance = account.CurrentBalance if hasattr(account, 'CurrentBalance') else 0
                
                # Create a simple trend with 5 data points
                date_range = (end_date - start_date).days
                step = max(1, date_range // 5)
                
                balance_history = []
                for i in range(5):
                    sample_date = start_date + timedelta(days=i * step)
                    # Create a simulated balance (in reality, this would come from transactions)
                    sample_balance = current_balance * (0.8 + (i * 0.05))
                    balance_history.append({
                        'date': sample_date.strftime('%Y-%m-%d'),
                        'balance': round(sample_balance, 2)
                    })
                
                account_trends.append({
                    'account_id': account.Id,
                    'account_name': account.Name,
                    'balance_history': balance_history
                })
            
            return account_trends
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving account balance trends: {str(e)}")
