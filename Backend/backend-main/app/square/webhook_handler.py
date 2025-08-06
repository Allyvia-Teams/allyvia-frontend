import logging
import json
import hashlib
import hmac
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from .models import (
    SquareWebhookEvent, SquareTransaction, SquareLocation, SquareEmployee,
    SquareInventoryItem, SquareOrder, SquareOrderItem, SquareIntegration
)
from .services import SquareService

logger = logging.getLogger(__name__)


class SquareWebhookHandler:
    """Handler for processing Square webhook events"""
    
    @staticmethod
    def verify_signature(request_body, signature, signature_key):
        """
        Verify the webhook signature to ensure it's from Square
        """
        try:
            # Create HMAC SHA256 hash
            expected_signature = hmac.new(
                signature_key.encode('utf-8'),
                request_body,
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False
    
    @staticmethod
    def process_webhook_event(company_id, event_type, event_data, location_id=None):
        """
        Process a webhook event and update the database accordingly
        """
        try:
            # Create webhook event record
            webhook_event = SquareWebhookEvent.objects.create(
                company_id=company_id,
                event_type=event_type,
                square_id=event_data.get('id'),
                location_id=location_id,
                event_data=event_data
            )
            
            # Process based on event type
            if event_type == 'payment.created' or event_type == 'payment.updated':
                SquareWebhookHandler._process_payment_event(company_id, event_data, webhook_event)
            
            elif event_type == 'order.created' or event_type == 'order.updated':
                SquareWebhookHandler._process_order_event(company_id, event_data, webhook_event)
            
            elif event_type == 'inventory.count.updated':
                SquareWebhookHandler._process_inventory_event(company_id, event_data, webhook_event)
            
            elif event_type == 'employee.created' or event_type == 'employee.updated':
                SquareWebhookHandler._process_employee_event(company_id, event_data, webhook_event)
            
            elif event_type == 'item.created' or event_type == 'item.updated':
                SquareWebhookHandler._process_item_event(company_id, event_data, webhook_event)
            
            elif event_type == 'location.created' or event_type == 'location.updated':
                SquareWebhookHandler._process_location_event(company_id, event_data, webhook_event)
            
            else:
                logger.warning(f"Unhandled webhook event type: {event_type}")
                webhook_event.processing_error = f"Unhandled event type: {event_type}"
                webhook_event.save()
            
            # Mark as processed
            webhook_event.processed = True
            webhook_event.processed_at = timezone.now()
            webhook_event.save()
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing webhook event {event_type}: {str(e)}")
            if 'webhook_event' in locals():
                webhook_event.processing_error = str(e)
                webhook_event.save()
            return False
    
    @staticmethod
    def _process_payment_event(company_id, event_data, webhook_event):
        """Process payment webhook events"""
        try:
            payment_data = event_data.get('data', {}).get('object', {})
            payment_id = payment_data.get('id')
            
            if not payment_id:
                return
            
            # Check if transaction already exists
            if SquareTransaction.objects.filter(square_id=payment_id).exists():
                # Update existing transaction
                transaction = SquareTransaction.objects.get(square_id=payment_id)
                SquareWebhookHandler._update_transaction(transaction, payment_data)
            else:
                # Create new transaction
                SquareWebhookHandler._create_transaction(company_id, payment_data)
                
        except Exception as e:
            logger.error(f"Error processing payment event: {str(e)}")
            raise
    
    @staticmethod
    def _process_order_event(company_id, event_data, webhook_event):
        """Process order webhook events"""
        try:
            order_data = event_data.get('data', {}).get('object', {})
            order_id = order_data.get('id')
            
            if not order_id:
                return
            
            # Check if order already exists
            if SquareOrder.objects.filter(square_id=order_id).exists():
                # Update existing order
                order = SquareOrder.objects.get(square_id=order_id)
                SquareWebhookHandler._update_order(order, order_data)
            else:
                # Create new order
                SquareWebhookHandler._create_order(company_id, order_data)
                
        except Exception as e:
            logger.error(f"Error processing order event: {str(e)}")
            raise
    
    @staticmethod
    def _process_inventory_event(company_id, event_data, webhook_event):
        """Process inventory webhook events"""
        try:
            inventory_data = event_data.get('data', {}).get('object', {})
            item_id = inventory_data.get('catalog_object_id')
            
            if not item_id:
                return
            
            # Update inventory item if it exists
            if SquareInventoryItem.objects.filter(square_id=item_id).exists():
                item = SquareInventoryItem.objects.get(square_id=item_id)
                SquareWebhookHandler._update_inventory_item(item, inventory_data)
                
        except Exception as e:
            logger.error(f"Error processing inventory event: {str(e)}")
            raise
    
    @staticmethod
    def _process_employee_event(company_id, event_data, webhook_event):
        """Process employee webhook events"""
        try:
            employee_data = event_data.get('data', {}).get('object', {})
            employee_id = employee_data.get('id')
            
            if not employee_id:
                return
            
            # Check if employee already exists
            if SquareEmployee.objects.filter(square_id=employee_id).exists():
                # Update existing employee
                employee = SquareEmployee.objects.get(square_id=employee_id)
                SquareWebhookHandler._update_employee(employee, employee_data)
            else:
                # Create new employee
                SquareWebhookHandler._create_employee(company_id, employee_data)
                
        except Exception as e:
            logger.error(f"Error processing employee event: {str(e)}")
            raise
    
    @staticmethod
    def _process_item_event(company_id, event_data, webhook_event):
        """Process item webhook events"""
        try:
            item_data = event_data.get('data', {}).get('object', {})
            item_id = item_data.get('id')
            
            if not item_id:
                return
            
            # Check if item already exists
            if SquareInventoryItem.objects.filter(square_id=item_id).exists():
                # Update existing item
                item = SquareInventoryItem.objects.get(square_id=item_id)
                SquareWebhookHandler._update_inventory_item(item, item_data)
            else:
                # Create new item
                SquareWebhookHandler._create_inventory_item(company_id, item_data)
                
        except Exception as e:
            logger.error(f"Error processing item event: {str(e)}")
            raise
    
    @staticmethod
    def _process_location_event(company_id, event_data, webhook_event):
        """Process location webhook events"""
        try:
            location_data = event_data.get('data', {}).get('object', {})
            location_id = location_data.get('id')
            
            if not location_id:
                return
            
            # Check if location already exists
            if SquareLocation.objects.filter(square_id=location_id).exists():
                # Update existing location
                location = SquareLocation.objects.get(square_id=location_id)
                SquareWebhookHandler._update_location(location, location_data)
            else:
                # Create new location
                SquareWebhookHandler._create_location(company_id, location_data)
                
        except Exception as e:
            logger.error(f"Error processing location event: {str(e)}")
            raise
    
    # Helper methods for creating/updating records
    @staticmethod
    def _create_transaction(company_id, payment_data):
        """Create a new transaction record"""
        from decimal import Decimal
        
        # Get location
        location = None
        location_id = payment_data.get('location_id')
        if location_id:
            try:
                location = SquareLocation.objects.get(
                    company_id=company_id,
                    square_id=location_id
                )
            except SquareLocation.DoesNotExist:
                pass
        
        # Parse amount
        amount_data = payment_data.get('amount_money', {})
        amount = Decimal(amount_data.get('amount', 0)) / 100
        currency = amount_data.get('currency', 'USD')
        
        # Parse transaction date
        created_at = payment_data.get('created_at')
        if created_at:
            from datetime import datetime
            transaction_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        else:
            transaction_date = timezone.now()
        
        SquareTransaction.objects.create(
            company_id=company_id,
            square_id=payment_data.get('id'),
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
    
    @staticmethod
    def _update_transaction(transaction, payment_data):
        """Update an existing transaction record"""
        from decimal import Decimal
        
        # Update amount if changed
        amount_data = payment_data.get('amount_money', {})
        if amount_data:
            amount = Decimal(amount_data.get('amount', 0)) / 100
            transaction.amount = amount
            transaction.currency = amount_data.get('currency', 'USD')
        
        # Update status
        if payment_data.get('status'):
            transaction.status = payment_data.get('status')
        
        transaction.save()
    
    @staticmethod
    def _create_order(company_id, order_data):
        """Create a new order record"""
        from decimal import Decimal
        
        # Get location
        location = None
        location_id = order_data.get('location_id')
        if location_id:
            try:
                location = SquareLocation.objects.get(
                    company_id=company_id,
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
                    company_id=company_id,
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
            from datetime import datetime
            order_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        else:
            order_date = timezone.now()
        
        order = SquareOrder.objects.create(
            company_id=company_id,
            square_id=order_data.get('id'),
            location=location,
            employee=employee,
            status=order_data.get('state', 'OPEN'),
            total_amount=total_amount,
            currency=currency,
            customer_id=order_data.get('customer_id'),
            fulfillment_type=order_data.get('fulfillment_type'),
            note=order_data.get('note'),
            order_date=order_date
        )
        
        # Create order items
        for line_item in order_data.get('line_items', []):
            SquareWebhookHandler._create_order_item(order, line_item)
    
    @staticmethod
    def _update_order(order, order_data):
        """Update an existing order record"""
        from decimal import Decimal
        
        # Update status
        if order_data.get('state'):
            order.status = order_data.get('state')
        
        # Update total amount
        total_money = order_data.get('total_money', {})
        if total_money:
            total_amount = Decimal(total_money.get('amount', 0)) / 100
            order.total_amount = total_amount
            order.currency = total_money.get('currency', 'USD')
        
        order.save()
    
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
    def _create_employee(company_id, employee_data):
        """Create a new employee record"""
        # Get location
        location = None
        location_id = employee_data.get('location_ids', [None])[0] if employee_data.get('location_ids') else None
        if location_id:
            try:
                location = SquareLocation.objects.get(
                    company_id=company_id,
                    square_id=location_id
                )
            except SquareLocation.DoesNotExist:
                pass
        
        SquareEmployee.objects.create(
            company_id=company_id,
            square_id=employee_data.get('id'),
            location=location,
            first_name=employee_data.get('first_name', ''),
            last_name=employee_data.get('last_name', ''),
            email=employee_data.get('email'),
            phone=employee_data.get('phone_number'),
            status=employee_data.get('status', 'ACTIVE'),
            role=employee_data.get('role'),
            permissions=employee_data.get('permissions', {})
        )
    
    @staticmethod
    def _update_employee(employee, employee_data):
        """Update an existing employee record"""
        if employee_data.get('first_name'):
            employee.first_name = employee_data.get('first_name')
        if employee_data.get('last_name'):
            employee.last_name = employee_data.get('last_name')
        if employee_data.get('email'):
            employee.email = employee_data.get('email')
        if employee_data.get('phone_number'):
            employee.phone = employee_data.get('phone_number')
        if employee_data.get('status'):
            employee.status = employee_data.get('status')
        if employee_data.get('role'):
            employee.role = employee_data.get('role')
        if employee_data.get('permissions'):
            employee.permissions = employee_data.get('permissions')
        
        employee.save()
    
    @staticmethod
    def _create_inventory_item(company_id, item_data):
        """Create a new inventory item record"""
        from decimal import Decimal
        
        # Get location
        location = None
        location_id = item_data.get('present_at_location_ids', [None])[0] if item_data.get('present_at_location_ids') else None
        if location_id:
            try:
                location = SquareLocation.objects.get(
                    company_id=company_id,
                    square_id=location_id
                )
            except SquareLocation.DoesNotExist:
                pass
        
        # Parse price
        price = None
        if item_data.get('item_data', {}).get('variations'):
            for variation in item_data['item_data']['variations']:
                if variation.get('item_variation_data', {}).get('pricing_type') == 'FIXED_PRICING':
                    price_money = variation['item_variation_data'].get('price_money', {})
                    if price_money:
                        price = Decimal(price_money.get('amount', 0)) / 100
                    break
        
        SquareInventoryItem.objects.create(
            company_id=company_id,
            square_id=item_data.get('id'),
            location=location,
            name=item_data.get('item_data', {}).get('name', ''),
            description=item_data.get('item_data', {}).get('description'),
            item_type='ITEM',
            category_id=item_data.get('item_data', {}).get('category_id'),
            price=price,
            currency='USD',
            stock_quantity=0,  # Will be updated by inventory count events
            is_available=True,
            variations=item_data.get('item_data', {}).get('variations', []),
            tax_ids=item_data.get('item_data', {}).get('tax_ids', [])
        )
    
    @staticmethod
    def _update_inventory_item(item, item_data):
        """Update an existing inventory item record"""
        if item_data.get('item_data', {}).get('name'):
            item.name = item_data['item_data']['name']
        if item_data.get('item_data', {}).get('description'):
            item.description = item_data['item_data']['description']
        if item_data.get('item_data', {}).get('variations'):
            item.variations = item_data['item_data']['variations']
        if item_data.get('item_data', {}).get('tax_ids'):
            item.tax_ids = item_data['item_data']['tax_ids']
        
        item.save()
    
    @staticmethod
    def _create_location(company_id, location_data):
        """Create a new location record"""
        SquareLocation.objects.create(
            company_id=company_id,
            square_id=location_data.get('id'),
            name=location_data.get('name', ''),
            address=location_data.get('address', {}).get('address_line_1', ''),
            phone=location_data.get('phone_number'),
            website=location_data.get('website_url'),
            is_active=location_data.get('status') == 'ACTIVE'
        )
    
    @staticmethod
    def _update_location(location, location_data):
        """Update an existing location record"""
        if location_data.get('name'):
            location.name = location_data.get('name')
        if location_data.get('address', {}).get('address_line_1'):
            location.address = location_data['address']['address_line_1']
        if location_data.get('phone_number'):
            location.phone = location_data.get('phone_number')
        if location_data.get('website_url'):
            location.website = location_data.get('website_url')
        if location_data.get('status'):
            location.is_active = location_data.get('status') == 'ACTIVE'
        
        location.save() 