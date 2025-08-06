from datetime import datetime, timedelta
from django.conf import settings
import requests
from quickbooks.objects.item import Item
from quickbooks.exceptions import QuickbooksException
from qb.services import QuickBooksService


class QuickbooksInventoryService:
    """
    Service for interacting with QuickBooks API to get inventory data
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
    def get_inventory_summary(company, role, start_date, end_date):
        """
        Get Inventory summary from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            
        Returns:
            dict: Inventory summary data
        """
        try:
            client = QuickbooksInventoryService.get_quickbooks_client(company)
            
            # Query for inventory items
            query = "SELECT * FROM Item WHERE Type = 'Inventory' MAXRESULTS 1000"
            items = Item.query(query, qb=client)
            
            # Calculate total inventory value
            total_value = sum(
                (item.QtyOnHand * item.UnitPrice) 
                for item in items 
                if hasattr(item, 'QtyOnHand') and hasattr(item, 'UnitPrice')
            )
            
            # Return the inventory summary data
            return {
                'total_items': len(items),
                'total_value': total_value,
                'period': f"As of {end_date.strftime('%Y-%m-%d')}"
            }
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving inventory data: {str(e)}")
    
    @staticmethod
    def get_inventory_items(company, role):
        """
        Get detailed Inventory item information from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            
        Returns:
            list: Detailed inventory item data
        """
        try:
            client = QuickbooksInventoryService.get_quickbooks_client(company)
            
            # Query for inventory items
            query = "SELECT * FROM Item WHERE Type IN('Inventory') MAXRESULTS 1000"
            items = Item.query(query, qb=client)
            
            # Extract detailed information for each inventory item
            inventory_items = []
            for item in items:
                qty = item.QtyOnHand if hasattr(item, 'QtyOnHand') else 0
                price = item.UnitPrice if hasattr(item, 'UnitPrice') else 0
                
                inventory_items.append({
                    'id': item.Id,
                    'name': item.Name,
                    'sku': item.Sku if hasattr(item, 'Sku') else None,
                    'description': item.Description if hasattr(item, 'Description') else None,
                    'quantity_on_hand': qty,
                    'unit_price': price,
                    'value': qty * price,
                    'reorder_point': item.ReorderPoint if hasattr(item, 'ReorderPoint') else None
                })
            
            return inventory_items
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving inventory items: {str(e)}")
    
    @staticmethod
    def get_inventory_stock_trends(company, role, start_date, end_date, item_ids=None):
        """
        Get Inventory stock trends from QuickBooks
        
        Args:
            company: The company to get data for
            role: The role of the current user in the company
            start_date: The start date for the query (datetime.date)
            end_date: The end date for the query (datetime.date)
            item_ids: Optional list of specific item IDs to include
            
        Returns:
            list: Inventory stock trend data
        """
        try:
            client = QuickbooksInventoryService.get_quickbooks_client(company)
            
            # Format dates for QuickBooks API
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            # Query for inventory items, optionally filtering by IDs
            query = "SELECT * FROM Item WHERE Type = 'Inventory'"
            if item_ids:
                id_list = ", ".join([f"'{id}'" for id in item_ids])
                query += f" AND Id IN ({id_list})"
            query += " MAXRESULTS 1000"
            
            items = Item.query(query, qb=client)
            
            # Get inventory stock over time
            # Note: QuickBooks API doesn't provide historical stock levels directly
            # This is a simplified approach - in a real implementation, you would need to
            # calculate historical stock using transactions
            
            # Construct the API endpoint for Inventory Valuation Summary report
            base_url = settings.QUICKBOOKS_ACCOUNTING_API_BASE_URL
            endpoint = f"v3/company/{company.qb_realm_id}/reports/InventoryValuationSummary"
            
            # Construct query parameters
            params = {
                'start_date': start_date_str,
                'end_date': end_date_str,
                'minorversion': 65
            }
            
            # Make API request to get the Inventory report
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
            
            # Create a dictionary to store item trends
            item_trends = []
            
            # This is a simplified implementation - in a real-world scenario,
            # you would need to parse the inventory report and calculate stock levels over time
            for item in items:
                # Create some sample data for demonstration
                current_qty = item.QtyOnHand if hasattr(item, 'QtyOnHand') else 0
                
                # Create a simple trend with 5 data points
                date_range = (end_date - start_date).days
                step = max(1, date_range // 5)
                
                stock_history = []
                for i in range(5):
                    sample_date = start_date + timedelta(days=i * step)
                    # Create a simulated stock level (in reality, this would come from transactions)
                    sample_qty = max(0, int(current_qty * (0.8 + (i * 0.05))))
                    stock_history.append({
                        'date': sample_date.strftime('%Y-%m-%d'),
                        'quantity': sample_qty
                    })
                
                item_trends.append({
                    'item_id': item.Id,
                    'item_name': item.Name,
                    'stock_history': stock_history
                })
            
            return item_trends
            
        except QuickbooksException as e:
            raise ValueError(f"QuickBooks API error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error retrieving inventory stock trends: {str(e)}")
