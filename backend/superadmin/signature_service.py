"""
Dropbox Sign (HelloSign) Electronic Signature Service
"""
import os
import hmac
import hashlib
import tempfile
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

# Check if dropbox_sign is available
try:
    from dropbox_sign import ApiClient, ApiException, Configuration, apis, models
    DROPBOX_SIGN_AVAILABLE = True
except ImportError:
    DROPBOX_SIGN_AVAILABLE = False
    logger.warning("dropbox-sign package not installed. Electronic signature features will be limited.")

class DropboxSignService:
    """Service for electronic signatures via Dropbox Sign (HelloSign)"""
    
    def __init__(self):
        self.api_key = os.environ.get('DROPBOX_SIGN_API_KEY')
        self.client_id = os.environ.get('DROPBOX_SIGN_CLIENT_ID', '')
        
        if DROPBOX_SIGN_AVAILABLE and self.api_key:
            self.configuration = Configuration(username=self.api_key)
        else:
            self.configuration = None
    
    def is_available(self) -> bool:
        """Check if service is properly configured"""
        return DROPBOX_SIGN_AVAILABLE and bool(self.api_key)
    
    def send_signature_request(
        self,
        pdf_bytes: bytes,
        filename: str,
        signer_email: str,
        signer_name: str,
        subject: str,
        message: str,
        test_mode: bool = True,
        cc_email_addresses: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Send a document for signature via email
        
        Returns signature request details including signature_request_id
        """
        if not self.is_available():
            raise Exception("Dropbox Sign service not configured")
        
        try:
            with ApiClient(self.configuration) as api_client:
                signature_request_api = apis.SignatureRequestApi(api_client)
                
                # Create signer
                signer = models.SubSignatureRequestSigner(
                    email_address=signer_email,
                    name=signer_name,
                    order=0
                )
                
                # Save PDF to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    tmp.write(pdf_bytes)
                    tmp_path = tmp.name
                
                try:
                    # Prepare request
                    with open(tmp_path, 'rb') as f:
                        data = models.SignatureRequestSendRequest(
                            files=[f],
                            title=subject,
                            subject=subject,
                            message=message,
                            signers=[signer],
                            cc_email_addresses=cc_email_addresses or [],
                            test_mode=test_mode
                        )
                        
                        response = signature_request_api.signature_request_send(
                            signature_request_send_request=data
                        )
                    
                    return response.to_dict()
                finally:
                    os.unlink(tmp_path)
        
        except ApiException as e:
            logger.error(f"Dropbox Sign API error: {e}")
            raise
    
    def create_embedded_signature_request(
        self,
        pdf_bytes: bytes,
        filename: str,
        signers: List[Dict[str, str]],
        subject: str,
        message: str,
        test_mode: bool = True
    ) -> Dict[str, Any]:
        """
        Create embedded signature request for iFrame integration
        """
        if not self.is_available():
            raise Exception("Dropbox Sign service not configured")
        
        try:
            with ApiClient(self.configuration) as api_client:
                signature_request_api = apis.SignatureRequestApi(api_client)
                
                # Create signers
                signer_objects = [
                    models.SubSignatureRequestSigner(
                        email_address=s['email'],
                        name=s['name'],
                        order=i
                    )
                    for i, s in enumerate(signers)
                ]
                
                # Signing options
                signing_options = models.SubSigningOptions(
                    draw=True,
                    type_field=True,
                    upload=False,
                    phone=False,
                    default_type="draw"
                )
                
                # Save PDF to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    tmp.write(pdf_bytes)
                    tmp_path = tmp.name
                
                try:
                    with open(tmp_path, 'rb') as f:
                        data = models.SignatureRequestCreateEmbeddedRequest(
                            client_id=self.client_id,
                            files=[f],
                            title=subject,
                            subject=subject,
                            message=message,
                            signers=signer_objects,
                            signing_options=signing_options,
                            test_mode=test_mode
                        )
                        
                        response = signature_request_api.signature_request_create_embedded(
                            signature_request_create_embedded_request=data
                        )
                    
                    return response.to_dict()
                finally:
                    os.unlink(tmp_path)
        
        except ApiException as e:
            logger.error(f"Dropbox Sign API error: {e}")
            raise
    
    def get_embedded_sign_url(self, signature_id: str) -> str:
        """Get the URL for embedded signing iFrame"""
        if not self.is_available():
            raise Exception("Dropbox Sign service not configured")
        
        try:
            with ApiClient(self.configuration) as api_client:
                embedded_api = apis.EmbeddedApi(api_client)
                response = embedded_api.embedded_sign_url(signature_id=signature_id)
                return response.to_dict()['embedded']['sign_url']
        
        except ApiException as e:
            logger.error(f"Error getting embedded sign URL: {e}")
            raise
    
    def get_signature_request_status(self, signature_request_id: str) -> Dict[str, Any]:
        """Get current status of a signature request"""
        if not self.is_available():
            raise Exception("Dropbox Sign service not configured")
        
        try:
            with ApiClient(self.configuration) as api_client:
                signature_request_api = apis.SignatureRequestApi(api_client)
                response = signature_request_api.signature_request_get(
                    signature_request_id=signature_request_id
                )
                return response.to_dict()
        
        except ApiException as e:
            logger.error(f"Error getting signature request status: {e}")
            raise
    
    def download_signed_document(self, signature_request_id: str) -> bytes:
        """Download the final signed document"""
        if not self.is_available():
            raise Exception("Dropbox Sign service not configured")
        
        try:
            with ApiClient(self.configuration) as api_client:
                signature_request_api = apis.SignatureRequestApi(api_client)
                response = signature_request_api.signature_request_files(
                    signature_request_id=signature_request_id,
                    file_type="pdf"
                )
                return response
        
        except ApiException as e:
            logger.error(f"Error downloading signed document: {e}")
            raise
    
    def cancel_signature_request(self, signature_request_id: str) -> bool:
        """Cancel a signature request"""
        if not self.is_available():
            raise Exception("Dropbox Sign service not configured")
        
        try:
            with ApiClient(self.configuration) as api_client:
                signature_request_api = apis.SignatureRequestApi(api_client)
                signature_request_api.signature_request_cancel(
                    signature_request_id=signature_request_id
                )
                return True
        
        except ApiException as e:
            logger.error(f"Error canceling signature request: {e}")
            raise
    
    @staticmethod
    def verify_webhook_signature(event_data: Dict, api_key: str) -> bool:
        """Verify webhook event authenticity using HMAC-SHA256"""
        try:
            event = event_data.get('event', {})
            event_time = str(event.get('event_time', ''))
            event_type = event.get('event_type', '')
            provided_hash = event.get('event_hash', '')
            
            if not all([event_time, event_type, provided_hash]):
                return False
            
            # Compute expected hash
            message = f"{event_time}{event_type}".encode('utf-8')
            expected_hash = hmac.new(
                api_key.encode('utf-8'),
                message,
                hashlib.sha256
            ).hexdigest()
            
            # Constant-time comparison
            return hmac.compare_digest(expected_hash, provided_hash)
        
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False


# Global service instance
dropbox_sign_service = DropboxSignService()
