import logging
import requests
from datetime import datetime, timedelta
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from company.models import Company
from .models import (
    SquareIntegration, SquareLocation, SquareTransaction, SquareFinancialSummary,
    SquareEmployee, SquareInventoryItem, SquareOrder, SquareOrderItem
)
from django.db import models

logger = logging.getLogger(__name__)


class SquareService:
    """Service for handling Square API operations"""
    
    # Square API endpoints
    SANDBOX_BASE_URL = "https://connect.squareupsandbox.com"
    PRODUCTION_BASE_URL = "https://connect.squareup.com"
    
    @staticmethod
    def get_base_url(environment='sandbox'):
        """Get the appropriate Square API base URL"""
        return SquareService.SANDBOX_BASE_URL if environment == 'sandbox' else SquareService.PRODUCTION_BASE_URL
    
    @staticmethod
    def get_headers(access_token):
        """Get headers for Square API requests"""
        return {
            'Square-Version': '2024-01-17',  # Use latest API version
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
    
    @staticmethod
    def test_connection(access_token, environment='sandbox'):
        """
        Test Square API connection and get merchant info
        """
        try:
            base_url = SquareService.get_base_url(environment)
            headers = SquareService.get_headers(access_token)
            
            # Test connection by getting merchant info
            response = requests.get(
                f"{base_url}/v2/merchants/me",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                merchant_data = response.json()
                return {
                    'success': True,
                    'merchant_id': merchant_data.get('merchant', {}).get('id'),
                    'merchant_name': merchant_data.get('merchant', {}).get('business_name'),
                    'environment': environment
                }
            else:
                logger.error(f"Square API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'Square API error: {response.status_code} - {response.text}'
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Square API request error: {str(e)}")
            return {
                'success': False,
                'message': f'Square API request error: {str(e)}'
            }
        except Exception as e:
            logger.error(f"Error testing Square connection: {str(e)}")
            return {
                'success': False,
                'message': f'Error testing Square connection: {str(e)}'
            }
    
    @staticmethod
    def connect_company(company_id, access_token, merchant_id=None, environment='sandbox'):
        """
        Connect a company to Square
        """
        try:
            company = Company.objects.get(id=company_id)
            
            # Test the connection first
            test_result = SquareService.test_connection(access_token, environment)
            if not test_result['success']:
                return test_result
            
            # Get or create Square integration
            integration, created = SquareIntegration.objects.get_or_create(
                company=company,
                defaults={
                    'square_access_token': access_token,
                    'square_merchant_id': merchant_id or test_result.get('merchant_id'),
                    'square_environment': environment,
                    'is_connected': True
                }
            )
            
            if not created:
                # Update existing integration
                integration.update_connection_status(
                    is_connected=True,
                    access_token=access_token,
                    merchant_id=merchant_id or test_result.get('merchant_id')
                )
            
            return {
                'success': True,
                'message': 'Square connected successfully',
                'integration': integration
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False,
                'message': 'Company not found'
            }
        except Exception as e:
            logger.error(f"Error connecting to Square: {str(e)}")
            return {
                'success': False,
                'message': f'Error connecting to Square: {str(e)}'
            }
    
    @staticmethod
    def disconnect_company(company_id):
        """
        Disconnect a company from Square
        """
        try:
            company = Company.objects.get(id=company_id)
            
            try:
                integration = SquareIntegration.objects.get(company=company)
                integration.update_connection_status(is_connected=False)
                return {
                    'success': True,
                    'message': 'Square disconnected successfully'
                }
            except SquareIntegration.DoesNotExist:
                return {
                    'success': True,
                    'message': 'No Square integration found'
                }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False,
                'message': 'Company not found'
            }
        except Exception as e:
            logger.error(f"Error disconnecting from Square: {str(e)}")
            return {
                'success': False,
                'message': f'Error disconnecting from Square: {str(e)}'
            }
    
    @staticmethod
    def sync_locations(company_id):
        """
        Sync Square locations for a company
        """
        try:
            company = Company.objects.get(id=company_id)
            integration = SquareIntegration.objects.get(company=company)
            
            if not integration.is_connected:
                return {
                    'success': False,
                    'message': 'Square integration not connected'
                }
            
            base_url = SquareService.get_base_url(integration.square_environment)
            headers = SquareService.get_headers(integration.square_access_token)
            
            # Get locations from Square API
            response = requests.get(
                f"{base_url}/v2/locations",
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"Square locations API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'Square locations API error: {response.status_code}'
                }
            
            locations_data = response.json().get('locations', [])
            synced_count = 0
            
            with transaction.atomic():
                for location_data in locations_data:
                    square_id = location_data.get('id')
                    if not square_id:
                        continue
                    
                    # Get or create location
                    location, created = SquareLocation.objects.get_or_create(
                        company=company,
                        square_id=square_id,
                        defaults={
                            'name': location_data.get('name', 'Unknown Location'),
                            'address': location_data.get('address', {}).get('address_line_1', ''),
                            'phone': location_data.get('phone_number'),
                            'website': location_data.get('website_url'),
                            'is_active': location_data.get('status') == 'ACTIVE'
                        }
                    )
                    
                    if not created:
                        # Update existing location
                        location.name = location_data.get('name', location.name)
                        location.address = location_data.get('address', {}).get('address_line_1', location.address)
                        location.phone = location_data.get('phone_number', location.phone)
                        location.website = location_data.get('website_url', location.website)
                        location.is_active = location_data.get('status') == 'ACTIVE'
                        location.save()
                    
                    synced_count += 1
            
            return {
                'success': True,
                'message': f'Successfully synced {synced_count} locations',
                'locations_synced': synced_count
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False,
                'message': 'Company not found'
            }
        except SquareIntegration.DoesNotExist:
            logger.error(f"Square integration not found for company {company_id}")
            return {
                'success': False,
                'message': 'Square integration not found'
            }
        except Exception as e:
            logger.error(f"Error syncing Square locations: {str(e)}")
            return {
                'success': False,
                'message': f'Error syncing Square locations: {str(e)}'
            }
    
    @staticmethod
    def sync_transactions(company_id, days_back=30):
        """
        Sync Square transactions for a company
        """
        try:
            company = Company.objects.get(id=company_id)
            integration = SquareIntegration.objects.get(company=company)
            
            if not integration.is_connected:
                return {
                    'success': False,
                    'message': 'Square integration not connected'
                }
            
            base_url = SquareService.get_base_url(integration.square_environment)
            headers = SquareService.get_headers(integration.square_access_token)
            
            # Calculate date range
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days_back)
            
            # Get payments from Square API
            params = {
                'begin_time': start_date.isoformat(),
                'end_time': end_date.isoformat(),
                'limit': 1000  # Maximum limit
            }
            
            response = requests.get(
                f"{base_url}/v2/payments",
                headers=headers,
                params=params,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"Square payments API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'Square payments API error: {response.status_code}'
                }
            
            payments_data = response.json().get('payments', [])
            synced_count = 0
            
            with transaction.atomic():
                for payment_data in payments_data:
                    square_id = payment_data.get('id')
                    if not square_id:
                        continue
                    
                    # Check if transaction already exists
                    if SquareTransaction.objects.filter(square_id=square_id).exists():
                        continue
                    
                    # Get location if available
                    location = None
                    location_id = payment_data.get('location_id')
                    if location_id:
                        try:
                            location = SquareLocation.objects.get(
                                company=company,
                                square_id=location_id
                            )
                        except SquareLocation.DoesNotExist:
                            pass
                    
                    # Parse amount
                    amount_data = payment_data.get('amount_money', {})
                    amount = Decimal(amount_data.get('amount', 0)) / 100  # Convert from cents
                    currency = amount_data.get('currency', 'USD')
                    
                    # Parse transaction date
                    created_at = payment_data.get('created_at')
                    if created_at:
                        transaction_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        transaction_date = timezone.now()
                    
                    # Create transaction
                    SquareTransaction.objects.create(
                        company=company,
                        square_id=square_id,
                        location=location,
                        amount=amount,
                        currency=currency,
                        status=payment_data.get('status', 'PENDING'),
                        payment_method=payment_data.get('source_type'),
                        receipt_url=payment_data.get('receipt_url'),
                        source_type=payment_data.get('source_type'),
                        order_id=payment_data.get('order_id'),
                        transaction_date=transaction_date
                    )
                    
                    synced_count += 1
            
            # Update last sync time
            integration.last_sync = timezone.now()
            integration.save(update_fields=['last_sync', 'updated_at'])
            
            return {
                'success': True,
                'message': f'Successfully synced {synced_count} transactions',
                'transactions_synced': synced_count
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False,
                'message': 'Company not found'
            }
        except SquareIntegration.DoesNotExist:
            logger.error(f"Square integration not found for company {company_id}")
            return {
                'success': False,
                'message': 'Square integration not found'
            }
        except Exception as e:
            logger.error(f"Error syncing Square transactions: {str(e)}")
            return {
                'success': False,
                'message': f'Error syncing Square transactions: {str(e)}'
            }
    
    @staticmethod
    def sync_employees(company_id):
        """
        Sync Square employees for a company
        """
        try:
            company = Company.objects.get(id=company_id)
            integration = SquareIntegration.objects.get(company=company)
            
            if not integration.is_connected:
                return {
                    'success': False,
                    'message': 'Square integration not connected'
                }
            
            base_url = SquareService.get_base_url(integration.square_environment)
            headers = SquareService.get_headers(integration.square_access_token)
            
            # Get employees from Square API
            response = requests.get(
                f"{base_url}/v2/employees",
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"Square employees API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'Square employees API error: {response.status_code}'
                }
            
            employees_data = response.json().get('employees', [])
            synced_count = 0
            
            with transaction.atomic():
                for employee_data in employees_data:
                    square_id = employee_data.get('id')
                    if not square_id:
                        continue
                    
                    # Get location if available
                    location = None
                    location_ids = employee_data.get('location_ids', [])
                    if location_ids:
                        try:
                            location = SquareLocation.objects.get(
                                company=company,
                                square_id=location_ids[0]
                            )
                        except SquareLocation.DoesNotExist:
                            pass
                    
                    # Get or create employee
                    employee, created = SquareEmployee.objects.get_or_create(
                        company=company,
                        square_id=square_id,
                        defaults={
                            'location': location,
                            'first_name': employee_data.get('first_name', ''),
                            'last_name': employee_data.get('last_name', ''),
                            'email': employee_data.get('email'),
                            'phone': employee_data.get('phone_number'),
                            'status': employee_data.get('status', 'ACTIVE'),
                            'role': employee_data.get('role'),
                            'permissions': employee_data.get('permissions', {})
                        }
                    )
                    
                    if not created:
                        # Update existing employee
                        employee.location = location
                        employee.first_name = employee_data.get('first_name', employee.first_name)
                        employee.last_name = employee_data.get('last_name', employee.last_name)
                        employee.email = employee_data.get('email', employee.email)
                        employee.phone = employee_data.get('phone_number', employee.phone)
                        employee.status = employee_data.get('status', employee.status)
                        employee.role = employee_data.get('role', employee.role)
                        employee.permissions = employee_data.get('permissions', employee.permissions)
                        employee.save()
                    
                    synced_count += 1
            
            return {
                'success': True,
                'message': f'Successfully synced {synced_count} employees',
                'employees_synced': synced_count
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False,
                'message': 'Company not found'
            }
        except SquareIntegration.DoesNotExist:
            logger.error(f"Square integration not found for company {company_id}")
            return {
                'success': False,
                'message': 'Square integration not found'
            }
        except Exception as e:
            logger.error(f"Error syncing Square employees: {str(e)}")
            return {
                'success': False,
                'message': f'Error syncing Square employees: {str(e)}'
            }
    
    @staticmethod
    def sync_inventory(company_id):
        """
        Sync Square inventory items for a company
        """
        try:
            company = Company.objects.get(id=company_id)
            integration = SquareIntegration.objects.get(company=company)
            
            if not integration.is_connected:
                return {
                    'success': False,
                    'message': 'Square integration not connected'
                }
            
            base_url = SquareService.get_base_url(integration.square_environment)
            headers = SquareService.get_headers(integration.square_access_token)
            
            # Get catalog items from Square API
            response = requests.get(
                f"{base_url}/v2/catalog/search",
                headers=headers,
                json={
                    "object_types": ["ITEM"],
                    "include_deleted_objects": False
                },
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"Square catalog API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'Square catalog API error: {response.status_code}'
                }
            
            catalog_data = response.json()
            items_data = catalog_data.get('objects', [])
            synced_count = 0
            
            with transaction.atomic():
                for item_data in items_data:
                    square_id = item_data.get('id')
                    if not square_id:
                        continue
                    
                    # Get location if available
                    location = None
                    present_at_locations = item_data.get('present_at_location_ids', [])
                    if present_at_locations:
                        try:
                            location = SquareLocation.objects.get(
                                company=company,
                                square_id=present_at_locations[0]
                            )
                        except SquareLocation.DoesNotExist:
                            pass
                    
                    # Parse item data
                    item_info = item_data.get('item_data', {})
                    
                    # Parse price from variations
                    price = None
                    if item_info.get('variations'):
                        for variation in item_info['variations']:
                            if variation.get('item_variation_data', {}).get('pricing_type') == 'FIXED_PRICING':
                                price_money = variation['item_variation_data'].get('price_money', {})
                                if price_money:
                                    price = Decimal(price_money.get('amount', 0)) / 100
                                break
                    
                    # Get or create inventory item
                    inventory_item, created = SquareInventoryItem.objects.get_or_create(
                        company=company,
                        square_id=square_id,
                        defaults={
                            'location': location,
                            'name': item_info.get('name', ''),
                            'description': item_info.get('description'),
                            'item_type': 'ITEM',
                            'category_id': item_info.get('category_id'),
                            'price': price,
                            'currency': 'USD',
                            'stock_quantity': 0,  # Will be updated by inventory count sync
                            'low_stock_threshold': 0,
                            'is_available': True,
                            'variations': item_info.get('variations', []),
                            'tax_ids': item_info.get('tax_ids', [])
                        }
                    )
                    
                    if not created:
                        # Update existing item
                        inventory_item.location = location
                        inventory_item.name = item_info.get('name', inventory_item.name)
                        inventory_item.description = item_info.get('description', inventory_item.description)
                        inventory_item.category_id = item_info.get('category_id', inventory_item.category_id)
                        inventory_item.price = price
                        inventory_item.variations = item_info.get('variations', inventory_item.variations)
                        inventory_item.tax_ids = item_info.get('tax_ids', inventory_item.tax_ids)
                        inventory_item.save()
                    
                    synced_count += 1
            
            return {
                'success': True,
                'message': f'Successfully synced {synced_count} inventory items',
                'inventory_items_synced': synced_count
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False,
                'message': 'Company not found'
            }
        except SquareIntegration.DoesNotExist:
            logger.error(f"Square integration not found for company {company_id}")
            return {
                'success': False,
                'message': 'Square integration not found'
            }
        except Exception as e:
            logger.error(f"Error syncing Square inventory: {str(e)}")
            return {
                'success': False,
                'message': f'Error syncing Square inventory: {str(e)}'
            }
    
    @staticmethod
    def sync_orders(company_id, days_back=30):
        """
        Sync Square orders for a company
        """
        try:
            company = Company.objects.get(id=company_id)
            integration = SquareIntegration.objects.get(company=company)
            
            if not integration.is_connected:
                return {
                    'success': False,
                    'message': 'Square integration not connected'
                }
            
            base_url = SquareService.get_base_url(integration.square_environment)
            headers = SquareService.get_headers(integration.square_access_token)
            
            # Calculate date range
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days_back)
            
            # Get orders from Square API
            params = {
                'location_ids': 'all',
                'begin_time': start_date.isoformat(),
                'end_time': end_date.isoformat(),
                'limit': 1000
            }
            
            response = requests.get(
                f"{base_url}/v2/orders/search",
                headers=headers,
                json={
                    "location_ids": ["all"],
                    "date_time_filter": {
                        "created_at": {
                            "start_at": start_date.isoformat(),
                            "end_at": end_date.isoformat()
                        }
                    },
                    "limit": 1000
                },
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"Square orders API error: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'Square orders API error: {response.status_code}'
                }
            
            orders_data = response.json().get('orders', [])
            synced_count = 0
            
            with transaction.atomic():
                for order_data in orders_data:
                    square_id = order_data.get('id')
                    if not square_id:
                        continue
                    
                    # Check if order already exists
                    if SquareOrder.objects.filter(square_id=square_id).exists():
                        continue
                    
                    # Get location
                    location = None
                    location_id = order_data.get('location_id')
                    if location_id:
                        try:
                            location = SquareLocation.objects.get(
                                company=company,
                                square_id=location_id
                            )
                        except SquareLocation.DoesNotExist:
                            pass
                    
                    # Get employee
                    employee = None
                    employee_id = order_data.get('employee_id')
                    if employee_id:
                        try:
                            employee = SquareEmployee.objects.get(
                                company=company,
                                square_id=employee_id
                            )
                        except SquareEmployee.DoesNotExist:
                            pass
                    
                    # Parse amount
                    total_money = order_data.get('total_money', {})
                    total_amount = Decimal(total_money.get('amount', 0)) / 100
                    currency = total_money.get('currency', 'USD')
                    
                    # Parse order date
                    created_at = order_data.get('created_at')
                    if created_at:
                        order_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        order_date = timezone.now()
                    
                    # Create order
                    order = SquareOrder.objects.create(
                        company=company,
                        square_id=square_id,
                        location=location,
                        employee=employee,
                        status=order_data.get('state', 'OPEN'),
                        total_amount=total_amount,
                        currency=currency,
                        customer_id=order_data.get('customer_id'),
                        customer_name=order_data.get('customer_id'),  # Would need customer lookup
                        fulfillment_type=order_data.get('fulfillment_type'),
                        note=order_data.get('note'),
                        order_date=order_date
                    )
                    
                    # Create order items
                    for line_item in order_data.get('line_items', []):
                        SquareService._create_order_item(order, line_item)
                    
                    synced_count += 1
            
            return {
                'success': True,
                'message': f'Successfully synced {synced_count} orders',
                'orders_synced': synced_count
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False,
                'message': 'Company not found'
            }
        except SquareIntegration.DoesNotExist:
            logger.error(f"Square integration not found for company {company_id}")
            return {
                'success': False,
                'message': 'Square integration not found'
            }
        except Exception as e:
            logger.error(f"Error syncing Square orders: {str(e)}")
            return {
                'success': False,
                'message': f'Error syncing Square orders: {str(e)}'
            }
    
    @staticmethod
    def _create_order_item(order, line_item_data):
        """Create a new order item record"""
        from decimal import Decimal
        
        # Get inventory item
        inventory_item = None
        catalog_object_id = line_item_data.get('catalog_object_id')
        if catalog_object_id:
            try:
                inventory_item = SquareInventoryItem.objects.get(
                    company_id=order.company_id,
                    square_id=catalog_object_id
                )
            except SquareInventoryItem.DoesNotExist:
                pass
        
        # Parse amounts
        base_price_money = line_item_data.get('base_price_money', {})
        unit_price = Decimal(base_price_money.get('amount', 0)) / 100
        
        total_money = line_item_data.get('total_money', {})
        total_price = Decimal(total_money.get('amount', 0)) / 100
        
        SquareOrderItem.objects.create(
            order=order,
            inventory_item=inventory_item,
            name=line_item_data.get('name', ''),
            quantity=line_item_data.get('quantity', 1),
            unit_price=unit_price,
            total_price=total_price,
            variations=line_item_data.get('variation_name', ''),
            modifiers=line_item_data.get('modifiers', [])
        )
    
    @staticmethod
    def generate_financial_summary(company_id, location_id=None, period_type='DAILY', start_date=None, end_date=None):
        """
        Generate financial summary for a company
        """
        try:
            company = Company.objects.get(id=company_id)
            
            # Set default date range if not provided
            if not end_date:
                end_date = timezone.now().date()
            if not start_date:
                if period_type == 'DAILY':
                    start_date = end_date - timedelta(days=7)
                elif period_type == 'WEEKLY':
                    start_date = end_date - timedelta(weeks=4)
                else:  # MONTHLY
                    start_date = end_date - timedelta(days=90)
            
            # Convert dates to datetime
            start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
            
            # Get transactions in the date range
            transactions = SquareTransaction.objects.filter(
                company=company,
                transaction_date__gte=start_datetime,
                transaction_date__lte=end_datetime,
                status='COMPLETED'
            )
            
            if location_id:
                transactions = transactions.filter(location_id=location_id)
            
            # Calculate summaries
            total_sales = transactions.aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')
            
            # For now, assume net revenue is same as total sales (fees calculation would need more complex logic)
            net_revenue = total_sales
            
            # Get refunds
            refunds = transactions.filter(status='REFUNDED')
            total_refunds = refunds.aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')
            
            transaction_count = transactions.count()
            refund_count = refunds.count()
            
            # Create or update summary
            summary, created = SquareFinancialSummary.objects.get_or_create(
                company=company,
                location_id=location_id,
                period_type=period_type,
                period_start=start_datetime,
                period_end=end_datetime,
                defaults={
                    'total_sales': total_sales,
                    'net_revenue': net_revenue,
                    'total_refunds': total_refunds,
                    'transaction_count': transaction_count,
                    'refund_count': refund_count,
                    'currency': 'USD'
                }
            )
            
            if not created:
                summary.total_sales = total_sales
                summary.net_revenue = net_revenue
                summary.total_refunds = total_refunds
                summary.transaction_count = transaction_count
                summary.refund_count = refund_count
                summary.save()
            
            return {
                'success': True,
                'message': 'Financial summary generated successfully',
                'summary': summary
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False,
                'message': 'Company not found'
            }
        except Exception as e:
            logger.error(f"Error generating financial summary: {str(e)}")
            return {
                'success': False,
                'message': f'Error generating financial summary: {str(e)}'
            } 