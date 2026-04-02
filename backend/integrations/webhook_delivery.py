"""
Flowtym - Webhook Delivery Engine (Phase 15)
Moteur de livraison de webhooks sortants avec :
- Signature HMAC-SHA256 (sécurité)
- Retry automatique avec backoff exponentiel
- Logs de livraison persistants
- Déclenchement sur événements PMS (réservation, check-in/out, etc.)
"""
import asyncio
import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# Base de données (injectée depuis server.py)
_db = None


def init_webhook_db(database):
    global _db
    _db = database


def get_db():
    global _db
    if _db is None:
        from server import db as server_db
        _db = server_db
    return _db


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTES
# ═══════════════════════════════════════════════════════════════════════════════

MAX_RETRIES = 3
RETRY_DELAYS = [30, 120, 600]          # 30s, 2min, 10min
HTTP_TIMEOUT_SECONDS = 10
MAX_RESPONSE_BODY_LENGTH = 500         # Tronquer les réponses longues

SUPPORTED_EVENTS = [
    "reservation.created",
    "reservation.updated",
    "reservation.cancelled",
    "reservation.checked_in",
    "reservation.checked_out",
    "reservation.no_show",
    "guest.created",
    "guest.updated",
    "room.status_changed",
    "payment.received",
    "invoice.created",
    "night_audit.completed",
]


# ═══════════════════════════════════════════════════════════════════════════════
# SIGNATURE HMAC
# ═══════════════════════════════════════════════════════════════════════════════

def sign_payload(payload_bytes: bytes, secret: str) -> str:
    """
    Génère la signature HMAC-SHA256 du payload.
    Retourne la signature au format 'sha256=<hex>'.
    Compatible avec la convention GitHub/Stripe.
    """
    sig = hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    return f"sha256={sig}"


def verify_signature(payload_bytes: bytes, secret: str, signature_header: str) -> bool:
    """Vérifie la signature d'un webhook reçu."""
    expected = sign_payload(payload_bytes, secret)
    return hmac.compare_digest(expected, signature_header)


# ═══════════════════════════════════════════════════════════════════════════════
# LIVRAISON D'UN WEBHOOK
# ═══════════════════════════════════════════════════════════════════════════════

async def deliver_single(
    webhook: dict,
    event_type: str,
    payload: dict,
    attempt_number: int = 1,
) -> dict:
    """
    Tente de livrer un webhook à l'URL cible.
    Retourne un dict avec le résultat de la livraison.
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    # Construction du body
    event_payload = {
        "id": str(uuid.uuid4()),
        "type": event_type,
        "hotel_id": webhook["hotel_id"],
        "timestamp": now.isoformat(),
        "attempt": attempt_number,
        "data": payload,
    }

    body_bytes = json.dumps(event_payload, ensure_ascii=False).encode("utf-8")
    signature = sign_payload(body_bytes, webhook.get("secret_key", ""))

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Flowtym-Webhook/1.0",
        "X-Flowtym-Event": event_type,
        "X-Flowtym-Signature-256": signature,
        "X-Flowtym-Delivery": event_payload["id"],
        "X-Flowtym-Hotel-Id": webhook["hotel_id"],
        "X-Flowtym-Timestamp": str(int(now.timestamp())),
    }

    status = "failed"
    response_code = None
    response_body = None
    error_message = None

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = await client.post(
                webhook["target_url"],
                content=body_bytes,
                headers=headers,
            )
            response_code = response.status_code
            response_body = response.text[:MAX_RESPONSE_BODY_LENGTH]

            if 200 <= response_code < 300:
                status = "delivered"
                logger.info(
                    f"Webhook delivered: {event_type} → {webhook['target_url']} "
                    f"[HTTP {response_code}]"
                )
            else:
                error_message = f"HTTP {response_code}: {response_body[:100]}"
                logger.warning(
                    f"Webhook failed: {event_type} → {webhook['target_url']} "
                    f"[HTTP {response_code}]"
                )

    except httpx.TimeoutException:
        error_message = f"Timeout after {HTTP_TIMEOUT_SECONDS}s"
        logger.warning(f"Webhook timeout: {webhook['target_url']}")
    except httpx.ConnectError as e:
        error_message = f"Connection refused: {str(e)[:100]}"
        logger.warning(f"Webhook connect error: {webhook['target_url']}")
    except Exception as e:
        error_message = f"Unexpected error: {str(e)[:100]}"
        logger.error(f"Webhook unexpected error: {e}")

    # Persister le log de livraison
    delivery_doc = {
        "id": event_payload["id"],
        "webhook_id": webhook["id"],
        "hotel_id": webhook["hotel_id"],
        "event_type": event_type,
        "target_url": webhook["target_url"],
        "payload_size_bytes": len(body_bytes),
        "attempt_number": attempt_number,
        "status": status,
        "response_code": response_code,
        "response_body": response_body,
        "error_message": error_message,
        "delivered_at": now.isoformat() if status == "delivered" else None,
        "created_at": now.isoformat(),
    }

    try:
        await db.webhook_deliveries.insert_one(delivery_doc)
        # Mettre à jour les stats du webhook
        update_fields = {
            "last_triggered_at": now.isoformat(),
            "total_deliveries": 1,       # $inc
        }
        if status == "delivered":
            await db.webhook_endpoints.update_one(
                {"id": webhook["id"]},
                {
                    "$set": {"last_triggered_at": now.isoformat(), "last_status": "success"},
                    "$inc": {"total_deliveries": 1, "successful_deliveries": 1},
                }
            )
        else:
            await db.webhook_endpoints.update_one(
                {"id": webhook["id"]},
                {
                    "$set": {"last_triggered_at": now.isoformat(), "last_status": "failed"},
                    "$inc": {"total_deliveries": 1, "failed_deliveries": 1},
                }
            )
    except Exception as e:
        logger.error(f"Error saving delivery log: {e}")

    return delivery_doc


async def deliver_with_retry(webhook: dict, event_type: str, payload: dict):
    """
    Livre un webhook avec retry automatique (backoff exponentiel).
    Exécuté en arrière-plan via BackgroundTasks.
    """
    max_retries = webhook.get("retry_count", MAX_RETRIES)

    for attempt in range(1, max_retries + 1):
        result = await deliver_single(webhook, event_type, payload, attempt)

        if result["status"] == "delivered":
            return

        # Pas de retry au-delà du maximum
        if attempt >= max_retries:
            logger.warning(
                f"Webhook {webhook['id']} ({event_type}) failed after "
                f"{max_retries} attempts. Giving up."
            )
            return

        # Attendre avant le prochain essai
        delay = RETRY_DELAYS[min(attempt - 1, len(RETRY_DELAYS) - 1)]
        logger.info(f"Webhook retry #{attempt + 1} in {delay}s...")
        await asyncio.sleep(delay)


# ═══════════════════════════════════════════════════════════════════════════════
# DÉCLENCHEUR D'ÉVÉNEMENTS
# ═══════════════════════════════════════════════════════════════════════════════

async def fire_event(hotel_id: str, event_type: str, payload: dict):
    """
    Déclenche tous les webhooks actifs d'un hôtel pour un événement donné.
    Appelé depuis les routes PMS lors d'événements métier.
    """
    db = get_db()

    # Récupérer tous les webhooks actifs abonnés à cet événement
    try:
        webhooks = await db.webhook_endpoints.find(
            {
                "hotel_id": hotel_id,
                "is_active": True,
                "event_types": event_type,
            },
            {"_id": 0}
        ).to_list(50)
    except Exception as e:
        logger.error(f"Error fetching webhooks for event {event_type}: {e}")
        return

    if not webhooks:
        return

    logger.info(
        f"Firing event '{event_type}' for hotel {hotel_id} "
        f"→ {len(webhooks)} webhook(s)"
    )

    # Livrer en parallèle (sans bloquer la requête principale)
    tasks = [
        deliver_with_retry(wh, event_type, payload)
        for wh in webhooks
    ]
    await asyncio.gather(*tasks, return_exceptions=True)
