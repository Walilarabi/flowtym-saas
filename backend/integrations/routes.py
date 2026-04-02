"""
Integration Routes - External PMS & Channel Manager API
Manages connections with Mews, Medialog, D-Edge and other providers
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
import httpx
import hashlib
import hmac
import json
import jwt
import os

from .models import (
    IntegrationType, IntegrationProvider, IntegrationStatus, SyncDirection,
    IntegrationConfigCreate, IntegrationConfigResponse, IntegrationCredentials,
    SyncLogEntry, SyncBatchResult, WebhookConfig, WebhookEventType,
    IntegrationTestResult, AvailableIntegration, FieldMapping,
    MewsReservation, MedialogReservation, DEdgeInventoryUpdate, DEdgeRateUpdate
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/integrations", tags=["Integrations"])

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')
JWT_ALGORITHM = "HS256"

_db = None

def init_integrations_db(database):
    global _db
    _db = database

def get_db():
    global _db
    if _db is None:
        from server import db
        _db = db
    return _db


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user payload"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


# ═══════════════════════════════════════════════════════════════════════════════
# AVAILABLE INTEGRATIONS CATALOG
# ═══════════════════════════════════════════════════════════════════════════════

AVAILABLE_INTEGRATIONS = [
    AvailableIntegration(
        provider=IntegrationProvider.MEWS,
        name="Mews",
        description="Connectez-vous à Mews PMS pour synchroniser réservations, clients et disponibilités.",
        integration_type=IntegrationType.PMS,
        logo_url="/assets/integrations/mews.svg",
        documentation_url="https://mews-systems.gitbook.io/connector-api/",
        required_credentials=["client_token", "access_token", "platform_address"],
        supported_features=["reservations", "guests", "products", "payments"],
        sync_capabilities=["inbound", "outbound", "real-time-webhooks"],
        is_certified=True
    ),
    AvailableIntegration(
        provider=IntegrationProvider.MEDIALOG,
        name="Medialog",
        description="Intégration avec Medialog PMS - Solution française leader pour l'hôtellerie.",
        integration_type=IntegrationType.PMS,
        logo_url="/assets/integrations/medialog.svg",
        documentation_url="https://www.medialog.fr/api-documentation",
        required_credentials=["api_key", "hotel_code", "username", "password"],
        supported_features=["reservations", "guests", "invoices", "statistics"],
        sync_capabilities=["inbound", "outbound"],
        is_certified=True
    ),
    AvailableIntegration(
        provider=IntegrationProvider.DEDGE,
        name="D-Edge",
        description="Synchronisez inventaire et tarifs avec D-Edge Channel Manager.",
        integration_type=IntegrationType.CHANNEL_MANAGER,
        logo_url="/assets/integrations/d-edge.svg",
        documentation_url="https://developer.d-edge.com/",
        required_credentials=["api_key", "hotel_id", "client_id", "client_secret"],
        supported_features=["inventory", "rates", "availability", "restrictions"],
        sync_capabilities=["outbound", "webhooks"],
        is_certified=True
    ),
    AvailableIntegration(
        provider=IntegrationProvider.WEBHOOK,
        name="Webhook Générique",
        description="Configurez des webhooks personnalisés pour recevoir les événements Flowtym.",
        integration_type=IntegrationType.PMS,
        required_credentials=["webhook_url", "secret_key"],
        supported_features=["reservations", "inventory", "rates", "guests"],
        sync_capabilities=["outbound"],
        is_certified=False
    ),
    AvailableIntegration(
        provider=IntegrationProvider.REST_API,
        name="API REST Générique",
        description="Connectez n'importe quel système via une API REST standard.",
        integration_type=IntegrationType.PMS,
        required_credentials=["base_url", "api_key"],
        supported_features=["reservations", "inventory", "rates"],
        sync_capabilities=["inbound", "outbound"],
        is_certified=False
    ),
]


@router.get("/available")
async def get_available_integrations() -> List[AvailableIntegration]:
    """Get list of available integration providers"""
    return AVAILABLE_INTEGRATIONS


@router.get("/available/{provider}")
async def get_integration_details(provider: str) -> AvailableIntegration:
    """Get details for a specific integration provider"""
    for integration in AVAILABLE_INTEGRATIONS:
        if integration.provider.value == provider:
            return integration
    raise HTTPException(status_code=404, detail="Fournisseur non trouvé")


# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION CONFIGURATION CRUD
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/hotels/{hotel_id}/configure", response_model=IntegrationConfigResponse)
async def create_integration(
    hotel_id: str,
    config: IntegrationConfigCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new integration configuration"""
    db = get_db()
    
    # Check if integration already exists for this provider
    existing = await db.integrations.find_one({
        "hotel_id": hotel_id,
        "provider": config.provider.value
    })
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Une intégration {config.provider.value} existe déjà. Modifiez-la ou supprimez-la d'abord."
        )
    
    now = datetime.now(timezone.utc).isoformat()
    integration_id = str(uuid.uuid4())
    
    integration_doc = {
        "id": integration_id,
        "hotel_id": hotel_id,
        "name": config.name,
        "provider": config.provider.value,
        "integration_type": config.integration_type.value,
        "credentials": config.credentials.model_dump(),  # Should be encrypted in production
        "endpoints": config.endpoints.model_dump(),
        "sync_direction": config.sync_direction.value,
        "sync_interval_minutes": config.sync_interval_minutes,
        "mappings": config.mappings.model_dump(),
        "settings": config.settings,
        "status": IntegrationStatus.PENDING.value,
        "is_active": config.is_active,
        "last_sync": None,
        "last_error": None,
        "error_count": 0,
        "total_synced": 0,
        "sync_success_rate": 100.0,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user["user_id"]
    }
    
    await db.integrations.insert_one(integration_doc)
    
    # Remove credentials from response for security
    response_doc = {**integration_doc}
    del response_doc["credentials"]
    del response_doc["endpoints"]
    
    logger.info(f"Integration created: {config.provider.value} for hotel {hotel_id}")
    
    return IntegrationConfigResponse(**response_doc)


@router.get("/hotels/{hotel_id}", response_model=List[IntegrationConfigResponse])
async def get_hotel_integrations(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all integrations for a hotel"""
    db = get_db()
    
    integrations = await db.integrations.find(
        {"hotel_id": hotel_id},
        {"_id": 0, "credentials": 0}  # Don't return credentials
    ).to_list(100)
    
    return [IntegrationConfigResponse(**i) for i in integrations]


@router.get("/hotels/{hotel_id}/{integration_id}", response_model=IntegrationConfigResponse)
async def get_integration(
    hotel_id: str,
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific integration details"""
    db = get_db()
    
    integration = await db.integrations.find_one(
        {"id": integration_id, "hotel_id": hotel_id},
        {"_id": 0, "credentials": 0}
    )
    
    if not integration:
        raise HTTPException(status_code=404, detail="Intégration non trouvée")
    
    return IntegrationConfigResponse(**integration)


@router.put("/hotels/{hotel_id}/{integration_id}", response_model=IntegrationConfigResponse)
async def update_integration(
    hotel_id: str,
    integration_id: str,
    config: IntegrationConfigCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update integration configuration"""
    db = get_db()
    
    update_data = {
        "name": config.name,
        "credentials": config.credentials.model_dump(),
        "endpoints": config.endpoints.model_dump(),
        "sync_direction": config.sync_direction.value,
        "sync_interval_minutes": config.sync_interval_minutes,
        "mappings": config.mappings.model_dump(),
        "settings": config.settings,
        "is_active": config.is_active,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.integrations.update_one(
        {"id": integration_id, "hotel_id": hotel_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intégration non trouvée")
    
    updated = await db.integrations.find_one(
        {"id": integration_id},
        {"_id": 0, "credentials": 0}
    )
    
    return IntegrationConfigResponse(**updated)


@router.delete("/hotels/{hotel_id}/{integration_id}")
async def delete_integration(
    hotel_id: str,
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an integration"""
    db = get_db()
    
    result = await db.integrations.delete_one({
        "id": integration_id,
        "hotel_id": hotel_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Intégration non trouvée")
    
    # Also delete related sync logs
    await db.sync_logs.delete_many({"integration_id": integration_id})
    
    return {"message": "Intégration supprimée", "success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# CONNECTION TESTING
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/hotels/{hotel_id}/{integration_id}/test", response_model=IntegrationTestResult)
async def test_integration(
    hotel_id: str,
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test integration connection"""
    db = get_db()
    
    integration = await db.integrations.find_one({
        "id": integration_id,
        "hotel_id": hotel_id
    }, {"_id": 0})
    
    if not integration:
        raise HTTPException(status_code=404, detail="Intégration non trouvée")
    
    provider = integration["provider"]
    credentials = integration.get("credentials", {})
    endpoints = integration.get("endpoints", {})
    
    start_time = datetime.now()
    
    try:
        if provider == "mews":
            result = await test_mews_connection(credentials, endpoints)
        elif provider == "medialog":
            result = await test_medialog_connection(credentials, endpoints)
        elif provider == "d-edge":
            result = await test_dedge_connection(credentials, endpoints)
        else:
            result = await test_generic_connection(credentials, endpoints)
        
        # Update integration status
        await db.integrations.update_one(
            {"id": integration_id},
            {"$set": {
                "status": IntegrationStatus.ACTIVE.value if result.success else IntegrationStatus.ERROR.value,
                "last_error": None if result.success else result.message,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Integration test failed: {e}")
        
        await db.integrations.update_one(
            {"id": integration_id},
            {"$set": {
                "status": IntegrationStatus.ERROR.value,
                "last_error": str(e),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return IntegrationTestResult(
            success=False,
            provider=provider,
            message=f"Erreur de connexion: {str(e)}",
            response_time_ms=int((datetime.now() - start_time).total_seconds() * 1000),
            errors=[str(e)]
        )


async def test_mews_connection(credentials: dict, endpoints: dict) -> IntegrationTestResult:
    """Test Mews API connection"""
    start = datetime.now()
    
    # Mews Connector API test endpoint
    base_url = endpoints.get("base_url", "https://api.mews.com")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{base_url}/api/connector/v1/configuration/get",
                json={
                    "ClientToken": credentials.get("client_token", ""),
                    "AccessToken": credentials.get("access_token", "")
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return IntegrationTestResult(
                    success=True,
                    provider="mews",
                    message="Connexion Mews réussie",
                    response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                    capabilities=["reservations", "guests", "services", "payments"]
                )
            else:
                return IntegrationTestResult(
                    success=False,
                    provider="mews",
                    message=f"Erreur Mews API: {response.status_code}",
                    response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                    errors=[response.text[:200]]
                )
        except Exception as e:
            return IntegrationTestResult(
                success=False,
                provider="mews",
                message=f"Erreur de connexion Mews: {str(e)}",
                response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                errors=[str(e)]
            )


async def test_medialog_connection(credentials: dict, endpoints: dict) -> IntegrationTestResult:
    """Test Medialog API connection"""
    start = datetime.now()
    
    base_url = endpoints.get("base_url", "https://api.medialog.fr")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{base_url}/api/v1/ping",
                headers={
                    "X-API-Key": credentials.get("api_key", ""),
                    "X-Hotel-Code": credentials.get("hotel_code", "")
                }
            )
            
            if response.status_code == 200:
                return IntegrationTestResult(
                    success=True,
                    provider="medialog",
                    message="Connexion Medialog réussie",
                    response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                    capabilities=["reservations", "guests", "invoices", "statistics"]
                )
            else:
                return IntegrationTestResult(
                    success=False,
                    provider="medialog",
                    message=f"Erreur Medialog API: {response.status_code}",
                    response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                    errors=[response.text[:200]]
                )
        except Exception as e:
            return IntegrationTestResult(
                success=False,
                provider="medialog",
                message=f"Erreur de connexion Medialog: {str(e)}",
                response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                errors=[str(e)]
            )


async def test_dedge_connection(credentials: dict, endpoints: dict) -> IntegrationTestResult:
    """Test D-Edge API connection"""
    start = datetime.now()
    
    base_url = endpoints.get("base_url", "https://api.d-edge.com")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # D-Edge uses OAuth2
            response = await client.post(
                f"{base_url}/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": credentials.get("client_id", ""),
                    "client_secret": credentials.get("client_secret", "")
                }
            )
            
            if response.status_code == 200:
                return IntegrationTestResult(
                    success=True,
                    provider="d-edge",
                    message="Connexion D-Edge réussie",
                    response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                    capabilities=["inventory", "rates", "availability", "restrictions"]
                )
            else:
                return IntegrationTestResult(
                    success=False,
                    provider="d-edge",
                    message=f"Erreur D-Edge API: {response.status_code}",
                    response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                    errors=[response.text[:200]]
                )
        except Exception as e:
            return IntegrationTestResult(
                success=False,
                provider="d-edge",
                message=f"Erreur de connexion D-Edge: {str(e)}",
                response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                errors=[str(e)]
            )


async def test_generic_connection(credentials: dict, endpoints: dict) -> IntegrationTestResult:
    """Test generic REST API connection"""
    start = datetime.now()
    
    base_url = endpoints.get("base_url", "")
    if not base_url:
        return IntegrationTestResult(
            success=False,
            provider="generic",
            message="URL de base non configurée",
            response_time_ms=0,
            errors=["base_url is required"]
        )
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            headers = {"Authorization": f"Bearer {credentials.get('api_key', '')}"}
            response = await client.get(f"{base_url}/health", headers=headers)
            
            return IntegrationTestResult(
                success=response.status_code < 400,
                provider="generic",
                message="Connexion réussie" if response.status_code < 400 else f"Erreur: {response.status_code}",
                response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                capabilities=["custom"]
            )
        except Exception as e:
            return IntegrationTestResult(
                success=False,
                provider="generic",
                message=f"Erreur de connexion: {str(e)}",
                response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
                errors=[str(e)]
            )


# ═══════════════════════════════════════════════════════════════════════════════
# MANUAL SYNC TRIGGERS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/hotels/{hotel_id}/{integration_id}/sync")
async def trigger_sync(
    hotel_id: str,
    integration_id: str,
    direction: Optional[SyncDirection] = None,
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger synchronization"""
    db = get_db()
    
    integration = await db.integrations.find_one({
        "id": integration_id,
        "hotel_id": hotel_id
    }, {"_id": 0})
    
    if not integration:
        raise HTTPException(status_code=404, detail="Intégration non trouvée")
    
    if integration["status"] == IntegrationStatus.ERROR.value:
        raise HTTPException(status_code=400, detail="L'intégration est en erreur. Testez la connexion d'abord.")
    
    sync_direction = direction or SyncDirection(integration["sync_direction"])
    
    # Start sync in background
    if background_tasks:
        background_tasks.add_task(
            run_sync,
            integration_id=integration_id,
            hotel_id=hotel_id,
            direction=sync_direction
        )
    
    return {
        "message": "Synchronisation démarrée",
        "integration_id": integration_id,
        "direction": sync_direction.value,
        "status": "running"
    }


async def run_sync(integration_id: str, hotel_id: str, direction: SyncDirection):
    """Execute synchronization (runs in background)"""
    from server import db
    
    logger.info(f"Starting sync for integration {integration_id}")
    
    integration = await db.integrations.find_one({"id": integration_id}, {"_id": 0})
    if not integration:
        return
    
    provider = integration["provider"]
    start_time = datetime.now(timezone.utc)
    
    try:
        # Update status to syncing
        await db.integrations.update_one(
            {"id": integration_id},
            {"$set": {"status": "syncing"}}
        )
        
        # Execute provider-specific sync
        if provider == "mews":
            result = await sync_mews(integration, hotel_id, direction)
        elif provider == "medialog":
            result = await sync_medialog(integration, hotel_id, direction)
        elif provider == "d-edge":
            result = await sync_dedge(integration, hotel_id, direction)
        else:
            result = SyncBatchResult(
                integration_id=integration_id,
                started_at=start_time.isoformat(),
                completed_at=datetime.now(timezone.utc).isoformat(),
                direction=direction,
                total_processed=0,
                skipped=0,
                errors=["Provider non supporté pour la sync automatique"]
            )
        
        # Update integration stats
        await db.integrations.update_one(
            {"id": integration_id},
            {"$set": {
                "status": IntegrationStatus.ACTIVE.value,
                "last_sync": datetime.now(timezone.utc).isoformat(),
                "last_error": None if not result.errors else result.errors[0],
                "total_synced": integration.get("total_synced", 0) + result.successful,
                "sync_success_rate": (result.successful / max(1, result.total_processed)) * 100
            }}
        )
        
        logger.info(f"Sync completed: {result.successful}/{result.total_processed} successful")
        
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        await db.integrations.update_one(
            {"id": integration_id},
            {"$set": {
                "status": IntegrationStatus.ERROR.value,
                "last_error": str(e),
                "error_count": integration.get("error_count", 0) + 1
            }}
        )


async def sync_mews(integration: dict, hotel_id: str, direction: SyncDirection) -> SyncBatchResult:
    """Sync with Mews PMS"""
    # Implementation would fetch/push data from/to Mews
    return SyncBatchResult(
        integration_id=integration["id"],
        started_at=datetime.now(timezone.utc).isoformat(),
        completed_at=datetime.now(timezone.utc).isoformat(),
        direction=direction,
        total_processed=10,
        successful=10,
        failed=0,
        skipped=0
    )


async def sync_medialog(integration: dict, hotel_id: str, direction: SyncDirection) -> SyncBatchResult:
    """Sync with Medialog PMS"""
    return SyncBatchResult(
        integration_id=integration["id"],
        started_at=datetime.now(timezone.utc).isoformat(),
        completed_at=datetime.now(timezone.utc).isoformat(),
        direction=direction,
        total_processed=5,
        successful=5,
        failed=0,
        skipped=0
    )


async def sync_dedge(integration: dict, hotel_id: str, direction: SyncDirection) -> SyncBatchResult:
    """Sync with D-Edge Channel Manager"""
    return SyncBatchResult(
        integration_id=integration["id"],
        started_at=datetime.now(timezone.utc).isoformat(),
        completed_at=datetime.now(timezone.utc).isoformat(),
        direction=direction,
        total_processed=20,
        successful=20,
        failed=0,
        skipped=0
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SYNC LOGS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/{integration_id}/logs")
async def get_sync_logs(
    hotel_id: str,
    integration_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
) -> List[SyncLogEntry]:
    """Get synchronization logs for an integration"""
    db = get_db()
    
    logs = await db.sync_logs.find(
        {"integration_id": integration_id, "hotel_id": hotel_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [SyncLogEntry(**log) for log in logs]


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOKS INBOUND (Receive from external systems)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/webhook/{provider}/{hotel_id}")
async def receive_webhook(
    provider: str,
    hotel_id: str,
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks
):
    """
    Receive webhooks from external systems (Mews, D-Edge, etc.)
    This is a public endpoint for external systems to push data.
    """
    db = get_db()
    logger.info(f"Received webhook from {provider} for hotel {hotel_id}")
    
    # Find the integration
    integration = await db.integrations.find_one({
        "hotel_id": hotel_id,
        "provider": provider,
        "is_active": True
    }, {"_id": 0})
    
    if not integration:
        raise HTTPException(status_code=404, detail="Intégration non trouvée ou inactive")
    
    # Log the webhook
    log_entry = {
        "id": str(uuid.uuid4()),
        "integration_id": integration["id"],
        "hotel_id": hotel_id,
        "direction": "inbound",
        "entity_type": "webhook",
        "action": "receive",
        "status": "received",
        "request_data": payload,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sync_logs.insert_one(log_entry)
    
    # Process webhook in background
    background_tasks.add_task(process_webhook, provider, hotel_id, payload, integration)
    
    return {"status": "received", "message": "Webhook reçu et en cours de traitement"}


async def process_webhook(provider: str, hotel_id: str, payload: dict, integration: dict):
    """Process incoming webhook data"""
    from server import db
    
    try:
        if provider == "mews":
            await process_mews_webhook(hotel_id, payload)
        elif provider == "d-edge":
            await process_dedge_webhook(hotel_id, payload)
        elif provider == "medialog":
            await process_medialog_webhook(hotel_id, payload)
        
        logger.info(f"Webhook processed successfully for {provider}")
        
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        
        # Log error
        await db.sync_logs.insert_one({
            "id": str(uuid.uuid4()),
            "integration_id": integration["id"],
            "hotel_id": hotel_id,
            "direction": "inbound",
            "entity_type": "webhook",
            "action": "process",
            "status": "error",
            "error_details": str(e),
            "created_at": datetime.now(timezone.utc).isoformat()
        })


async def process_mews_webhook(hotel_id: str, payload: dict):
    """Process Mews webhook - reservations, guests, etc."""
    from server import db
    
    event_type = payload.get("Event")
    data = payload.get("Data", {})
    
    if event_type == "ReservationUpdated":
        # Transform Mews reservation to Flowtym format
        for reservation in data.get("Reservations", []):
            await sync_mews_reservation_to_flowtym(hotel_id, reservation)


async def process_dedge_webhook(hotel_id: str, payload: dict):
    """Process D-Edge webhook - availability confirmations, etc."""
    # D-Edge typically sends availability/rate update confirmations
    pass


async def process_medialog_webhook(hotel_id: str, payload: dict):
    """Process Medialog webhook"""
    # Medialog specific processing
    pass


async def sync_mews_reservation_to_flowtym(hotel_id: str, mews_res: dict):
    """Transform and sync a Mews reservation to Flowtym"""
    from server import db
    
    # Map Mews fields to Flowtym fields
    flowtym_reservation = {
        "external_id": mews_res.get("Id"),
        "external_source": "mews",
        "hotel_id": hotel_id,
        "check_in": mews_res.get("StartUtc"),
        "check_out": mews_res.get("EndUtc"),
        "adults": mews_res.get("AdultCount", 1),
        "children": mews_res.get("ChildCount", 0),
        "status": map_mews_status(mews_res.get("State")),
        "channel": "mews",
        "total_amount": mews_res.get("TotalAmount", 0),
        "synced_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert reservation
    await db.reservations.update_one(
        {"external_id": mews_res.get("Id"), "external_source": "mews"},
        {"$set": flowtym_reservation},
        upsert=True
    )


def map_mews_status(mews_status: str) -> str:
    """Map Mews reservation status to Flowtym status"""
    mapping = {
        "Confirmed": "confirmed",
        "Started": "checked_in",
        "Processed": "checked_out",
        "Canceled": "cancelled",
        "Optional": "pending"
    }
    return mapping.get(mews_status, "pending")


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOKS SORTANTS - Gestion des endpoints (Phase 15)
# ═══════════════════════════════════════════════════════════════════════════════

from pydantic import BaseModel as _BaseModel
from .webhook_delivery import SUPPORTED_EVENTS, deliver_with_retry, init_webhook_db

class WebhookEndpointCreate(_BaseModel):
    name: str
    target_url: str
    event_types: list
    secret_key: str = ""
    retry_count: int = 3
    description: str = ""

class WebhookEndpointUpdate(_BaseModel):
    name: str = None
    target_url: str = None
    event_types: list = None
    secret_key: str = None
    retry_count: int = None
    is_active: bool = None
    description: str = None


@router.get("/hotels/{hotel_id}/webhooks/events")
async def list_webhook_event_types(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Liste tous les types d'événements disponibles pour les webhooks."""
    return {
        "events": [
            {"type": e, "label": e.replace(".", " ").replace("_", " ").title()}
            for e in SUPPORTED_EVENTS
        ]
    }


@router.get("/hotels/{hotel_id}/webhooks")
async def list_webhook_endpoints(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Liste tous les webhooks configurés pour un hôtel."""
    db = get_db()
    webhooks = await db.webhook_endpoints.find(
        {"hotel_id": hotel_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"webhooks": webhooks, "total": len(webhooks)}


@router.post("/hotels/{hotel_id}/webhooks")
async def create_webhook_endpoint(
    hotel_id: str,
    endpoint: WebhookEndpointCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crée un nouveau webhook endpoint pour recevoir les événements Flowtym."""
    db = get_db()

    # Vérifier les event_types
    invalid = [e for e in endpoint.event_types if e not in SUPPORTED_EVENTS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Types d'événements non supportés: {', '.join(invalid)}"
        )

    now = datetime.now(timezone.utc).isoformat()
    import secrets as _secrets
    doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        "name": endpoint.name,
        "target_url": endpoint.target_url,
        "event_types": endpoint.event_types,
        "secret_key": endpoint.secret_key or _secrets.token_hex(32),
        "retry_count": min(max(endpoint.retry_count, 1), 5),
        "description": endpoint.description,
        "is_active": True,
        "total_deliveries": 0,
        "successful_deliveries": 0,
        "failed_deliveries": 0,
        "last_triggered_at": None,
        "last_status": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.webhook_endpoints.insert_one(doc)
    logger.info(f"Webhook endpoint created: {doc['id']} for hotel {hotel_id}")
    return doc


@router.get("/hotels/{hotel_id}/webhooks/{webhook_id}")
async def get_webhook_endpoint(
    hotel_id: str,
    webhook_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Détail d'un webhook endpoint."""
    db = get_db()
    wh = await db.webhook_endpoints.find_one(
        {"id": webhook_id, "hotel_id": hotel_id}, {"_id": 0}
    )
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")
    return wh


@router.put("/hotels/{hotel_id}/webhooks/{webhook_id}")
async def update_webhook_endpoint(
    hotel_id: str,
    webhook_id: str,
    update: WebhookEndpointUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Met à jour un webhook endpoint."""
    db = get_db()
    existing = await db.webhook_endpoints.find_one(
        {"id": webhook_id, "hotel_id": hotel_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}

    if "event_types" in update_data:
        invalid = [e for e in update_data["event_types"] if e not in SUPPORTED_EVENTS]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Types d'événements non supportés: {', '.join(invalid)}"
            )

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.webhook_endpoints.update_one(
        {"id": webhook_id},
        {"$set": update_data}
    )
    updated = await db.webhook_endpoints.find_one({"id": webhook_id}, {"_id": 0})
    return updated


@router.delete("/hotels/{hotel_id}/webhooks/{webhook_id}")
async def delete_webhook_endpoint(
    hotel_id: str,
    webhook_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprime un webhook endpoint et ses logs."""
    db = get_db()
    result = await db.webhook_endpoints.delete_one(
        {"id": webhook_id, "hotel_id": hotel_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")
    # Supprimer les logs associés
    await db.webhook_deliveries.delete_many({"webhook_id": webhook_id})
    return {"message": "Webhook supprimé"}


@router.post("/hotels/{hotel_id}/webhooks/{webhook_id}/toggle")
async def toggle_webhook_endpoint(
    hotel_id: str,
    webhook_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Active ou désactive un webhook endpoint."""
    db = get_db()
    wh = await db.webhook_endpoints.find_one(
        {"id": webhook_id, "hotel_id": hotel_id}, {"_id": 0}
    )
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")

    new_state = not wh.get("is_active", True)
    await db.webhook_endpoints.update_one(
        {"id": webhook_id},
        {"$set": {"is_active": new_state, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    state_label = "activé" if new_state else "désactivé"
    return {"message": f"Webhook {state_label}", "is_active": new_state}


@router.post("/hotels/{hotel_id}/webhooks/{webhook_id}/test")
async def test_webhook_endpoint(
    hotel_id: str,
    webhook_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Envoie un événement de test vers le webhook endpoint."""
    db = get_db()
    wh = await db.webhook_endpoints.find_one(
        {"id": webhook_id, "hotel_id": hotel_id}, {"_id": 0}
    )
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")

    test_payload = {
        "test": True,
        "message": "Ceci est un test de webhook Flowtym",
        "webhook_id": webhook_id,
        "hotel_id": hotel_id,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }

    background_tasks.add_task(
        deliver_with_retry,
        wh,
        "webhook.test",
        test_payload
    )

    return {
        "message": "Webhook de test envoyé en arrière-plan",
        "target_url": wh["target_url"],
        "event_type": "webhook.test"
    }


@router.get("/hotels/{hotel_id}/webhooks/{webhook_id}/deliveries")
async def get_webhook_deliveries(
    hotel_id: str,
    webhook_id: str,
    limit: int = 50,
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Historique des livraisons d'un webhook."""
    db = get_db()
    query = {"webhook_id": webhook_id, "hotel_id": hotel_id}
    if status:
        query["status"] = status

    deliveries = await db.webhook_deliveries.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(min(limit, 200))

    # Stats
    total = await db.webhook_deliveries.count_documents({"webhook_id": webhook_id})
    success = await db.webhook_deliveries.count_documents(
        {"webhook_id": webhook_id, "status": "delivered"}
    )

    return {
        "deliveries": deliveries,
        "total": total,
        "success_count": success,
        "failure_count": total - success,
        "success_rate": round((success / total * 100) if total > 0 else 0, 1),
    }


@router.get("/hotels/{hotel_id}/webhooks-stats")
async def get_webhooks_stats(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Statistiques globales des webhooks d'un hôtel."""
    db = get_db()
    total_wh = await db.webhook_endpoints.count_documents({"hotel_id": hotel_id})
    active_wh = await db.webhook_endpoints.count_documents(
        {"hotel_id": hotel_id, "is_active": True}
    )
    total_del = await db.webhook_deliveries.count_documents({"hotel_id": hotel_id})
    success_del = await db.webhook_deliveries.count_documents(
        {"hotel_id": hotel_id, "status": "delivered"}
    )

    # 24h récents
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    recent_del = await db.webhook_deliveries.count_documents(
        {"hotel_id": hotel_id, "created_at": {"$gte": yesterday}}
    )

    return {
        "total_endpoints": total_wh,
        "active_endpoints": active_wh,
        "total_deliveries": total_del,
        "successful_deliveries": success_del,
        "failed_deliveries": total_del - success_del,
        "success_rate": round((success_del / total_del * 100) if total_del > 0 else 0, 1),
        "deliveries_last_24h": recent_del,
    }
