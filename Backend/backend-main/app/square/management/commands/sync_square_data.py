from django.core.management.base import BaseCommand
from django.utils import timezone
from square.models import SquareIntegration
from square.services import SquareService


class Command(BaseCommand):
    help = 'Sync Square data for all connected companies'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=str,
            help='Sync data for a specific company ID only'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force sync even if last sync was recent'
        )

    def handle(self, *args, **options):
        company_id = options.get('company_id')
        force = options.get('force')
        
        if company_id:
            # Sync specific company
            integrations = SquareIntegration.objects.filter(
                company_id=company_id,
                is_connected=True
            )
        else:
            # Sync all connected companies
            integrations = SquareIntegration.objects.filter(is_connected=True)
        
        if not integrations.exists():
            self.stdout.write(
                self.style.WARNING('No connected Square integrations found')
            )
            return
        
        self.stdout.write(f'Found {integrations.count()} connected Square integration(s)')
        
        for integration in integrations:
            self.stdout.write(f'Processing {integration.company.name}...')
            
            # Check if sync is needed (unless forced)
            if not force and integration.last_sync:
                hours_since_last_sync = (timezone.now() - integration.last_sync).total_seconds() / 3600
                if hours_since_last_sync < integration.sync_frequency_hours:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping {integration.company.name} - last sync was {hours_since_last_sync:.1f} hours ago'
                        )
                    )
                    continue
            
            try:
                # Sync locations
                locations_result = SquareService.sync_locations(integration.company.id)
                if locations_result['success']:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Synced {locations_result.get('locations_synced', 0)} locations for {integration.company.name}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to sync locations for {integration.company.name}: {locations_result['message']}"
                        )
                    )
                
                # Sync employees
                employees_result = SquareService.sync_employees(integration.company.id)
                if employees_result['success']:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Synced {employees_result.get('employees_synced', 0)} employees for {integration.company.name}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to sync employees for {integration.company.name}: {employees_result['message']}"
                        )
                    )
                
                # Sync inventory
                inventory_result = SquareService.sync_inventory(integration.company.id)
                if inventory_result['success']:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Synced {inventory_result.get('inventory_items_synced', 0)} inventory items for {integration.company.name}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to sync inventory for {integration.company.name}: {inventory_result['message']}"
                        )
                    )
                
                # Sync transactions
                transactions_result = SquareService.sync_transactions(integration.company.id)
                if transactions_result['success']:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Synced {transactions_result.get('transactions_synced', 0)} transactions for {integration.company.name}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to sync transactions for {integration.company.name}: {transactions_result['message']}"
                        )
                    )
                
                # Sync orders
                orders_result = SquareService.sync_orders(integration.company.id)
                if orders_result['success']:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Synced {orders_result.get('orders_synced', 0)} orders for {integration.company.name}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to sync orders for {integration.company.name}: {orders_result['message']}"
                        )
                    )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Error syncing data for {integration.company.name}: {str(e)}"
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS('Square data sync completed')
        ) 