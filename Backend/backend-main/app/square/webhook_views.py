import json
import logging
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .webhook_handler import SquareWebhookHandler
from .models import SquareIntegration

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def square_webhook(request):
    """
    Webhook endpoint for Square events
    """
    try:
        # Get request body
        body = request.body.decode('utf-8')
        
        # Get signature from headers
        signature = request.headers.get('X-Square-Signature')
        if not signature:
            logger.error("Missing Square signature header")
            return HttpResponse(status=400)
        
        # Parse webhook data
        try:
            webhook_data = json.loads(body)
        except json.JSONDecodeError:
            logger.error("Invalid JSON in webhook body")
            return HttpResponse(status=400)
        
        # Extract event information
        event_type = webhook_data.get('type')
        event_data = webhook_data.get('data', {})
        
        if not event_type:
            logger.error("Missing event type in webhook data")
            return HttpResponse(status=400)
        
        # Get location ID from event data
        location_id = None
        if event_data.get('object', {}).get('location_id'):
            location_id = event_data['object']['location_id']
        
        # Find company by location ID or process for all companies
        companies_to_process = []
        
        if location_id:
            # Find company by location
            integrations = SquareIntegration.objects.filter(
                is_connected=True,
                square_locations__square_id=location_id
            ).distinct()
            companies_to_process = [integration.company_id for integration in integrations]
        else:
            # Process for all connected companies
            integrations = SquareIntegration.objects.filter(is_connected=True)
            companies_to_process = [integration.company_id for integration in integrations]
        
        if not companies_to_process:
            logger.warning("No connected companies found for webhook event")
            return HttpResponse(status=200)  # Return 200 to acknowledge receipt
        
        # Process event for each company
        success_count = 0
        for company_id in companies_to_process:
            try:
                success = SquareWebhookHandler.process_webhook_event(
                    company_id=company_id,
                    event_type=event_type,
                    event_data=event_data,
                    location_id=location_id
                )
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"Error processing webhook for company {company_id}: {str(e)}")
        
        if success_count > 0:
            logger.info(f"Successfully processed webhook event {event_type} for {success_count} company(ies)")
            return HttpResponse(status=200)
        else:
            logger.error(f"Failed to process webhook event {event_type} for any company")
            return HttpResponse(status=500)
            
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return HttpResponse(status=500)


class SquareWebhookEventView(APIView):
    """
    API view to get webhook events for a company
    """
    
    def get(self, request, company_id):
        """
        Get webhook events for a company
        """
        from .models import SquareWebhookEvent
        from .serializers import SquareWebhookEventSerializer
        
        # Check if user has access to this company
        # This would typically involve role checking
        try:
            events = SquareWebhookEvent.objects.filter(
                company_id=company_id
            ).order_by('-created_at')
            
            # Apply filters
            event_type = request.query_params.get('event_type')
            if event_type:
                events = events.filter(event_type=event_type)
            
            processed = request.query_params.get('processed')
            if processed is not None:
                processed_bool = processed.lower() == 'true'
                events = events.filter(processed=processed_bool)
            
            # Apply limit
            limit = request.query_params.get('limit')
            if limit:
                try:
                    limit = int(limit)
                    events = events[:limit]
                except ValueError:
                    pass
            
            serializer = SquareWebhookEventSerializer(events, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error getting webhook events: {str(e)}")
            return Response(
                {'error': 'Failed to get webhook events'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SquareWebhookRetryView(APIView):
    """
    API view to retry processing failed webhook events
    """
    
    def post(self, request, event_id):
        """
        Retry processing a failed webhook event
        """
        from .models import SquareWebhookEvent
        
        try:
            event = SquareWebhookEvent.objects.get(id=event_id)
            
            # Check if event is already processed
            if event.processed:
                return Response(
                    {'error': 'Event is already processed'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Retry processing
            success = SquareWebhookHandler.process_webhook_event(
                company_id=event.company_id,
                event_type=event.event_type,
                event_data=event.event_data,
                location_id=event.location_id
            )
            
            if success:
                return Response({'message': 'Event processed successfully'})
            else:
                return Response(
                    {'error': 'Failed to process event'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except SquareWebhookEvent.DoesNotExist:
            return Response(
                {'error': 'Event not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error retrying webhook event: {str(e)}")
            return Response(
                {'error': 'Failed to retry event'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 