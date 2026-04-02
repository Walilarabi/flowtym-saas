"""
Flowtym Data Hub - Stripe Payment Connector (MOCKED)

This connector integrates with Stripe for payment processing.
Currently returns mocked data for development and testing.

Real implementation would use: https://stripe.com/docs/api
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import random
import uuid

from ..base import BaseConnector, register_connector
from ...models import (
    ConnectorConfig,
    ConnectorType,
    SourceSystem,
    UniversalTransaction,
    PaymentStatus,
    TransactionType,
)


@register_connector
class StripeConnector(BaseConnector):
    """
    Stripe Payment Connector
    
    Stripe is a leading payment processing platform.
    This connector handles:
    - Payment processing (charges)
    - Refunds
    - Payment intents
    - Transaction history
    
    STATUS: MOCKED - Returns realistic fake data
    """
    
    CONNECTOR_NAME = "stripe"
    CONNECTOR_TYPE = ConnectorType.PAYMENT
    DISPLAY_NAME = "Stripe Payments"
    SOURCE_SYSTEM = SourceSystem.STRIPE
    VERSION = "1.0.0"
    
    async def connect(self) -> bool:
        """Connect to Stripe API (mocked)."""
        self.logger.info(f"[MOCK] Connecting to Stripe")
        
        if not self.config.auth.api_key:
            self._last_error = "Stripe API key not configured"
            return False
        
        self._is_connected = True
        self.logger.info("[MOCK] Connected to Stripe successfully")
        return True
    
    async def disconnect(self) -> bool:
        """Disconnect from Stripe API."""
        self._is_connected = False
        return True
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Stripe connection."""
        return {
            "success": True,
            "message": "[MOCK] Stripe connection test successful",
            "account_id": "acct_mock123456",
            "livemode": False,
            "features": ["charges", "refunds", "payment_intents", "webhooks"]
        }
    
    async def create_payment_intent(
        self,
        amount: float,
        currency: str = "EUR",
        reservation_id: Optional[str] = None,
        customer_email: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Create a payment intent (mocked)."""
        self.logger.info(f"[MOCK] Creating payment intent for {amount} {currency}")
        
        return {
            "id": f"pi_{uuid.uuid4().hex[:24]}",
            "object": "payment_intent",
            "amount": int(amount * 100),  # Stripe uses cents
            "amount_received": 0,
            "currency": currency.lower(),
            "status": "requires_payment_method",
            "client_secret": f"pi_{uuid.uuid4().hex[:24]}_secret_{uuid.uuid4().hex[:24]}",
            "metadata": {
                "reservation_id": reservation_id,
                "customer_email": customer_email,
                **(metadata or {})
            },
            "created": int(datetime.utcnow().timestamp()),
            "livemode": False
        }
    
    async def capture_payment(
        self,
        payment_intent_id: str,
        amount: Optional[float] = None
    ) -> Dict[str, Any]:
        """Capture a payment (mocked)."""
        self.logger.info(f"[MOCK] Capturing payment {payment_intent_id}")
        
        return {
            "id": payment_intent_id,
            "object": "payment_intent",
            "status": "succeeded",
            "amount_received": int((amount or 100) * 100),
            "charge_id": f"ch_{uuid.uuid4().hex[:24]}",
            "captured": True,
            "captured_at": int(datetime.utcnow().timestamp())
        }
    
    async def process_refund(
        self,
        charge_id: str,
        amount: Optional[float] = None,
        reason: str = "requested_by_customer"
    ) -> Dict[str, Any]:
        """Process a refund (mocked)."""
        self.logger.info(f"[MOCK] Processing refund for charge {charge_id}")
        
        return {
            "id": f"re_{uuid.uuid4().hex[:24]}",
            "object": "refund",
            "amount": int((amount or 100) * 100),
            "charge": charge_id,
            "currency": "eur",
            "reason": reason,
            "status": "succeeded",
            "created": int(datetime.utcnow().timestamp())
        }
    
    async def fetch_transactions(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Fetch transaction history (mocked)."""
        self.logger.info(f"[MOCK] Fetching Stripe transactions")
        
        transactions = []
        
        for i in range(min(limit, random.randint(5, 30))):
            amount = random.randint(100, 1000) * 100  # In cents
            tx_type = random.choice(["charge", "refund"])
            
            transactions.append({
                "id": f"txn_{uuid.uuid4().hex[:24]}",
                "object": "balance_transaction",
                "type": tx_type,
                "amount": amount if tx_type == "charge" else -amount,
                "currency": "eur",
                "status": "available",
                "fee": int(amount * 0.029 + 25) if tx_type == "charge" else 0,  # 2.9% + 0.25€
                "net": amount - int(amount * 0.029 + 25) if tx_type == "charge" else -amount,
                "source": f"ch_{uuid.uuid4().hex[:24]}" if tx_type == "charge" else f"re_{uuid.uuid4().hex[:24]}",
                "description": f"Reservation payment" if tx_type == "charge" else "Refund",
                "created": int((datetime.utcnow() - timedelta(days=random.randint(0, 30))).timestamp()),
                "available_on": int((datetime.utcnow() + timedelta(days=2)).timestamp())
            })
        
        return {
            "data": transactions,
            "has_more": False,
            "total": len(transactions)
        }
    
    async def get_balance(self) -> Dict[str, Any]:
        """Get account balance (mocked)."""
        return {
            "object": "balance",
            "available": [
                {"amount": random.randint(10000, 100000), "currency": "eur"}
            ],
            "pending": [
                {"amount": random.randint(1000, 10000), "currency": "eur"}
            ],
            "livemode": False
        }
    
    def normalize_reservation(self, raw_data: Dict[str, Any]) -> None:
        """Stripe doesn't have reservations."""
        raise NotImplementedError("Stripe connector doesn't handle reservations")
    
    def normalize_transaction(self, raw_data: Dict[str, Any]) -> UniversalTransaction:
        """Transform Stripe transaction to universal format."""
        
        status_map = {
            "available": PaymentStatus.COMPLETED,
            "pending": PaymentStatus.PENDING,
            "failed": PaymentStatus.FAILED,
        }
        
        type_map = {
            "charge": TransactionType.CHARGE,
            "payment": TransactionType.PAYMENT,
            "refund": TransactionType.REFUND,
            "adjustment": TransactionType.ADJUSTMENT,
        }
        
        amount_cents = raw_data.get("amount", 0)
        amount = abs(amount_cents) / 100  # Convert from cents
        
        return UniversalTransaction(
            tenant_id=self.tenant_id,
            source_system=self.SOURCE_SYSTEM,
            source_id=raw_data["id"],
            source_raw_data=raw_data,
            
            transaction_type=type_map.get(raw_data.get("type"), TransactionType.CHARGE),
            
            amount=amount,
            currency=raw_data.get("currency", "EUR").upper(),
            
            status=status_map.get(raw_data.get("status"), PaymentStatus.PENDING),
            
            gateway="stripe",
            gateway_transaction_id=raw_data["id"],
            
            payment_method="card",
        )
