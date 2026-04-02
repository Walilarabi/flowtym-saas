"""
Email Service for Payroll Reports (MOCKED)
Simulates sending emails with attachments to accountants
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import uuid

logger = logging.getLogger(__name__)


class MockedEmailService:
    """
    Service d'envoi d'emails MOCKE pour les rapports de paie.
    Simule l'envoi sans reellement envoyer d'emails.
    """
    
    def __init__(self):
        self.sent_emails: List[Dict[str, Any]] = []
    
    async def send_payroll_report(
        self,
        recipients: List[str],
        cc: List[str] = [],
        subject: str = "",
        body: str = "",
        attachments: List[Dict[str, Any]] = []
    ) -> Dict[str, Any]:
        """
        Simule l'envoi d'un email avec pieces jointes.
        
        Args:
            recipients: Liste des destinataires principaux
            cc: Liste des destinataires en copie
            subject: Sujet de l'email
            body: Corps du message
            attachments: Liste des pieces jointes [{"filename": str, "content": bytes, "type": str}]
        
        Returns:
            Dict avec le statut de l'envoi
        """
        email_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Simuler l'envoi (log + stockage)
        email_record = {
            "id": email_id,
            "recipients": recipients,
            "cc": cc,
            "subject": subject,
            "body": body,
            "attachments_count": len(attachments),
            "attachment_names": [a.get("filename", "unknown") for a in attachments],
            "total_size_bytes": sum(len(a.get("content", b"")) for a in attachments),
            "status": "sent",  # Simule toujours succes
            "sent_at": now,
            "is_mocked": True
        }
        
        self.sent_emails.append(email_record)
        
        logger.info(f"[MOCKED EMAIL] Envoi simule vers {recipients}")
        logger.info(f"[MOCKED EMAIL] Sujet: {subject}")
        logger.info(f"[MOCKED EMAIL] Pieces jointes: {email_record['attachment_names']}")
        logger.info(f"[MOCKED EMAIL] Taille totale: {email_record['total_size_bytes']} bytes")
        
        return {
            "success": True,
            "message_id": email_id,
            "status": "sent",
            "sent_at": now,
            "recipients": recipients,
            "cc": cc,
            "attachments_sent": len(attachments),
            "is_mocked": True,
            "note": "Ceci est un envoi simule. Pour activer l'envoi reel, configurez une cle API email (Resend, SendGrid, etc.)"
        }
    
    def get_sent_emails(self) -> List[Dict[str, Any]]:
        """Retourne l'historique des emails envoyes (mock)"""
        return self.sent_emails


# Instance globale du service
email_service = MockedEmailService()


async def send_payroll_email(
    recipients: List[str],
    cc: List[str] = [],
    subject: str = "",
    body: str = "",
    attachments: List[Dict[str, Any]] = []
) -> Dict[str, Any]:
    """
    Point d'entree pour l'envoi d'emails de paie.
    Utilise le service mocke par defaut.
    """
    return await email_service.send_payroll_report(
        recipients=recipients,
        cc=cc,
        subject=subject,
        body=body,
        attachments=attachments
    )
