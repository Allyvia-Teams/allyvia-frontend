import logging
from django.conf import settings
from django.utils import timezone
from intuitlib.client import AuthClient
from intuitlib.enums import Scopes
from intuitlib.exceptions import AuthClientError
from company.models import Company
from django.contrib.auth import get_user_model
from quickbooks import QuickBooks

logger = logging.getLogger(__name__)
User = get_user_model()


class QuickBooksService:
    """Service for handling QuickBooks API operations"""
    
    @staticmethod
    def get_auth_client(state_token=None, access_token=None, refresh_token=None, realm_id=None):
        """
        Create and return a new AuthClient instance
        """
        return AuthClient(
            client_id=settings.QUICKBOOKS_CLIENT_ID,
            client_secret=settings.QUICKBOOKS_CLIENT_SECRET,
            redirect_uri=settings.QUICKBOOKS_REDIRECT_URI,
            environment=settings.QUICKBOOKS_ENVIRONMENT,
            state_token=state_token,
            access_token=access_token,
            refresh_token=refresh_token,
            realm_id=realm_id
        )

    @staticmethod
    def get_auth_client_for_company(company: Company, refresh_if_needed=True):
        """
		Get an authenticated AuthClient for a company
		Optionally refresh the token if it's expired
		"""
        if not company.is_connected_to_quickbooks:
            raise ValueError("Company is not connected to QuickBooks")

        # Check if access token is valid, if not, refresh it
        if not company.is_qb_access_token_valid and refresh_if_needed:
            refresh_result = QuickBooksService.refresh_tokens(company.id)
            if not refresh_result['success']:
                raise ValueError(f"Failed to refresh QuickBooks token: {refresh_result['message']}")

            # Get updated company instance
            company.refresh_from_db()

        # Return auth client with tokens
        return QuickBooksService.get_auth_client(
            access_token=company.qb_access_token,
            refresh_token=company.qb_refresh_token,
            realm_id=company.qb_realm_id
        )

    @staticmethod
    def get_quickbooks_api_client(company: Company):
        """
		Create a QuickBooks API Library Client for the given company
		"""
        auth_client = QuickBooksService.get_auth_client_for_company(company)
        return QuickBooks(
            auth_client=auth_client,
            refresh_token=company.qb_refresh_token,
            access_token=company.qb_access_token,
            company_id=company.qb_realm_id,
            minorversion=65,  # Use the latest minor version
            sandbox=settings.QUICKBOOKS_ENVIRONMENT == 'sandbox'
        )
    
    @staticmethod
    def get_authorization_url():
        """
        Get QuickBooks authorization URL and state token
        """
        auth_client = QuickBooksService.get_auth_client()
        scopes = [
            Scopes.ACCOUNTING,
            Scopes.OPENID,
            Scopes.EMAIL,
            Scopes.PROFILE
        ]
        auth_url = auth_client.get_authorization_url(scopes)
        return auth_url, auth_client.state_token

    @staticmethod
    def process_callback_for_user_only(code, state, realm_id):
        """
		Process OAuth callback and get user details using OpenID
		"""
        try:
            # Get auth client
            auth_client = QuickBooksService.get_auth_client(state_token=state)

            # Get bearer token
            auth_client.get_bearer_token(code, realm_id=realm_id)

            user_info = auth_client.get_user_info()
            user_info = user_info.json()

            email = user_info.get('email')
            email_verified = user_info.get('emailVerified')
            first_name = user_info.get('givenName')
            last_name = user_info.get('familyName')
            sub = user_info.get('sub')  # Quickbooks user ID

            if not email_verified or str(email_verified).lower() != 'true':
                return {
                    'success': False,
                    'message': f'User not allowed to login using OpenID oAuth'
                }

            if not email:
                return {
                    'success': False,
                    'message': f'Email not provided by Quickbooks'
                }

            # Check if user exists
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'qb_user_id': sub,
                    'is_active': True
                }
            )

            return {
                'success': True,
                'message': 'User Login Successful',
                'user': user
            }

        except AuthClientError as e:
            logger.error(f"QuickBooks Auth error: {e.status_code} - {e.content}")
            return {
                'success': False,
                'message': f'QuickBooks authentication error: {e.content}'
            }
        except Exception as e:
            logger.error(f"Error processing QuickBooks callback: {str(e)}")
            return {
                'success': False,
                'message': f'Error processing QuickBooks callback: {str(e)}'
            }
    
    @staticmethod
    def process_callback_for_company(code, state, realm_id, company_id):
        """
        Process OAuth callback and save tokens to company
        """
        try:
            # Get company
            company = Company.objects.get(id=company_id)

            # ensure we don't merge two different companies from QB
            if company.qb_realm_id and company.qb_realm_id != realm_id:
                return {
                    'success': False,
                    'message': 'Company ID is not matching'
                }
            
            # Get auth client
            auth_client = QuickBooksService.get_auth_client(state_token=state)
            
            # Verify state token (this would be done in the view)
            
            # Get bearer token
            auth_client.get_bearer_token(code, realm_id=realm_id)
            
            # Update company with tokens
            company.update_quickbooks_tokens(
                access_token=auth_client.access_token,
                refresh_token=auth_client.refresh_token,
                access_expires_in=auth_client.expires_in,
                refresh_expires_in=auth_client.x_refresh_token_expires_in,
                realm_id=realm_id
            )
            
            return {
                'success': True, 
                'message': 'QuickBooks connected successfully'
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False, 
                'message': 'Company not found'
            }
        except AuthClientError as e:
            logger.error(f"QuickBooks Auth error: {e.status_code} - {e.content}")
            return {
                'success': False, 
                'message': f'QuickBooks authentication error: {e.content}'
            }
        except Exception as e:
            logger.error(f"Error processing QuickBooks callback: {str(e)}")
            return {
                'success': False, 
                'message': f'Error processing QuickBooks callback: {str(e)}'
            }
    
    @staticmethod
    def refresh_tokens(company_id):
        """
        Refresh QuickBooks tokens for a company
        """
        try:
            # Get company
            company = Company.objects.get(id=company_id)
            
            if not company.qb_refresh_token or not company.is_qb_refresh_token_valid:
                return {
                    'success': False, 
                    'message': 'No valid refresh token available'
                }
            
            # Get auth client with refresh token
            auth_client = QuickBooksService.get_auth_client(
                refresh_token=company.qb_refresh_token,
                realm_id=company.qb_realm_id
            )
            
            # Refresh tokens
            auth_client.refresh()
            
            # Update company with new tokens
            company.update_quickbooks_tokens(
                access_token=auth_client.access_token,
                refresh_token=auth_client.refresh_token,
                access_expires_in=auth_client.expires_in,
                refresh_expires_in=auth_client.x_refresh_token_expires_in,
            )
            
            return {
                'success': True, 
                'message': 'QuickBooks tokens refreshed successfully'
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False, 
                'message': 'Company not found'
            }
        except AuthClientError as e:
            logger.error(f"QuickBooks refresh error: {e.status_code} - {e.content}")
            return {
                'success': False, 
                'message': f'QuickBooks refresh error: {e.content}'
            }
        except Exception as e:
            logger.error(f"Error refreshing QuickBooks tokens: {str(e)}")
            return {
                'success': False, 
                'message': f'Error refreshing QuickBooks tokens: {str(e)}'
            }
    
    @staticmethod
    def revoke_tokens(company_id):
        """
        Revoke QuickBooks tokens for a company
        """
        try:
            # Get company
            company = Company.objects.get(id=company_id)
            
            if not company.qb_access_token:
                # Just clear the tokens if no access token is available
                company.qb_access_token = ""
                company.qb_refresh_token = ""
                company.qb_realm_id = ""
                company.qb_last_auth = None
                company.save(update_fields=['qb_access_token', 'qb_refresh_token', 
                                          'qb_realm_id', 'qb_last_auth', 'updated_at'])
                return {
                    'success': True, 
                    'message': 'QuickBooks disconnected successfully'
                }
            
            # Get auth client with access token
            auth_client = QuickBooksService.get_auth_client(
                access_token=company.qb_access_token,
                refresh_token=company.qb_refresh_token
            )
            
            # Revoke tokens
            auth_client.revoke()
            
            # Clear tokens from company
            company.qb_access_token = ""
            company.qb_refresh_token = ""
            company.qb_realm_id = ""
            company.qb_last_auth = None
            company.save(update_fields=['qb_access_token', 'qb_refresh_token', 
                                      'qb_realm_id', 'qb_last_auth', 'updated_at'])
            
            return {
                'success': True, 
                'message': 'QuickBooks disconnected successfully'
            }
            
        except Company.DoesNotExist:
            logger.error(f"Company with ID {company_id} not found")
            return {
                'success': False, 
                'message': 'Company not found'
            }
        except AuthClientError as e:
            logger.error(f"QuickBooks revoke error: {e.status_code} - {e.content}")
            # Still clear the tokens even if revoke fails
            try:
                company = Company.objects.get(id=company_id)
                company.qb_access_token = ""
                company.qb_refresh_token = ""
                company.qb_realm_id = ""
                company.qb_last_auth = None
                company.save(update_fields=['qb_access_token', 'qb_refresh_token', 
                                          'qb_realm_id', 'qb_last_auth', 'updated_at'])
            except:
                pass
            
            return {
                'success': False, 
                'message': f'QuickBooks revoke error: {e.content}'
            }
        except Exception as e:
            logger.error(f"Error revoking QuickBooks tokens: {str(e)}")
            # Still clear the tokens even if revoke fails
            try:
                company = Company.objects.get(id=company_id)
                company.qb_access_token = ""
                company.qb_refresh_token = ""
                company.qb_realm_id = ""
                company.qb_last_auth = None
                company.save(update_fields=['qb_access_token', 'qb_refresh_token', 
                                          'qb_realm_id', 'qb_last_auth', 'updated_at'])
            except:
                pass
            
            return {
                'success': False, 
                'message': f'Error revoking QuickBooks tokens: {str(e)}'
            }
