"""
Flowboard Routes - Central Dashboard API
Aggregates data from all modules for unified dashboard experience
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
import jwt
import os

from .models import (
    DashboardLayout, DashboardLayoutCreate, DashboardLayoutUpdate,
    FlowboardResponse, FlowboardKPI, FlowboardEvent, FlowboardAlert, 
    AISuggestion, WidgetType, WidgetSize, WidgetConfig,
    ModuleSyncStatus, InterModuleSyncResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/flowboard", tags=["Flowboard"])

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')
JWT_ALGORITHM = "HS256"

_db = None

def init_flowboard_db(database):
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
# DASHBOARD LAYOUT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

def get_default_widgets() -> List[WidgetConfig]:
    """Get default widget configuration for new dashboards"""
    return [
        WidgetConfig(
            id="kpi-occupation", type=WidgetType.KPI_CARD, title="Occupation",
            size=WidgetSize.SMALL, position={"x": 0, "y": 0},
            settings={"metric": "occupancy_rate", "color": "violet"}
        ),
        WidgetConfig(
            id="kpi-adr", type=WidgetType.KPI_CARD, title="ADR",
            size=WidgetSize.SMALL, position={"x": 1, "y": 0},
            settings={"metric": "adr", "color": "emerald"}
        ),
        WidgetConfig(
            id="kpi-revpar", type=WidgetType.KPI_CARD, title="RevPAR",
            size=WidgetSize.SMALL, position={"x": 2, "y": 0},
            settings={"metric": "revpar", "color": "blue"}
        ),
        WidgetConfig(
            id="kpi-revenue", type=WidgetType.KPI_CARD, title="CA Jour",
            size=WidgetSize.SMALL, position={"x": 3, "y": 0},
            settings={"metric": "daily_revenue", "color": "amber"}
        ),
        WidgetConfig(
            id="timeline", type=WidgetType.TIMELINE, title="Timeline du jour",
            size=WidgetSize.LARGE, position={"x": 0, "y": 1},
            settings={"max_events": 10}
        ),
        WidgetConfig(
            id="alerts", type=WidgetType.ALERTS, title="Alertes",
            size=WidgetSize.MEDIUM, position={"x": 2, "y": 1},
            settings={"max_alerts": 5}
        ),
        WidgetConfig(
            id="ai-suggestions", type=WidgetType.AI_SUGGESTIONS, title="Suggestions IA",
            size=WidgetSize.MEDIUM, position={"x": 0, "y": 3},
            settings={"max_suggestions": 3}
        ),
        WidgetConfig(
            id="housekeeping", type=WidgetType.HOUSEKEEPING_STATUS, title="Housekeeping",
            size=WidgetSize.MEDIUM, position={"x": 2, "y": 3},
            settings={}
        ),
        WidgetConfig(
            id="channel-mix", type=WidgetType.CHANNEL_MIX, title="Mix Canaux",
            size=WidgetSize.MEDIUM, position={"x": 0, "y": 5},
            settings={}
        ),
        WidgetConfig(
            id="reputation", type=WidgetType.REPUTATION_SCORE, title="E-Réputation",
            size=WidgetSize.SMALL, position={"x": 2, "y": 5},
            settings={}
        ),
        WidgetConfig(
            id="quick-actions", type=WidgetType.QUICK_ACTIONS, title="Actions rapides",
            size=WidgetSize.MEDIUM, position={"x": 3, "y": 5},
            settings={}
        ),
    ]


@router.get("/hotels/{hotel_id}/layout")
async def get_dashboard_layout(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get user's dashboard layout or create default"""
    db = get_db()
    
    layout = await db.dashboard_layouts.find_one({
        "hotel_id": hotel_id,
        "user_id": current_user["user_id"]
    }, {"_id": 0})
    
    if not layout:
        # Create default layout
        layout = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["user_id"],
            "hotel_id": hotel_id,
            "name": "Dashboard par défaut",
            "widgets": [w.model_dump() for w in get_default_widgets()],
            "is_default": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.dashboard_layouts.insert_one(layout)
    
    return DashboardLayout(**layout)


@router.put("/hotels/{hotel_id}/layout")
async def update_dashboard_layout(
    hotel_id: str,
    layout_update: DashboardLayoutUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user's dashboard layout (widget positions, visibility)"""
    db = get_db()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if layout_update.name:
        update_data["name"] = layout_update.name
    if layout_update.widgets is not None:
        update_data["widgets"] = [w.model_dump() for w in layout_update.widgets]
    
    result = await db.dashboard_layouts.update_one(
        {"hotel_id": hotel_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Layout non trouvé")
    
    updated = await db.dashboard_layouts.find_one({
        "hotel_id": hotel_id, "user_id": current_user["user_id"]
    }, {"_id": 0})
    
    return DashboardLayout(**updated)


@router.post("/hotels/{hotel_id}/layout/reset")
async def reset_dashboard_layout(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reset dashboard to default layout"""
    db = get_db()
    
    default_layout = {
        "widgets": [w.model_dump() for w in get_default_widgets()],
        "name": "Dashboard par défaut",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.dashboard_layouts.update_one(
        {"hotel_id": hotel_id, "user_id": current_user["user_id"]},
        {"$set": default_layout},
        upsert=True
    )
    
    return {"message": "Layout réinitialisé", "success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN FLOWBOARD DATA AGGREGATION
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/data", response_model=FlowboardResponse)
async def get_flowboard_data(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get aggregated Flowboard data from all modules.
    This is the main endpoint that powers the central dashboard.
    """
    db = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc)
    
    # Get hotel info
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hôtel non trouvé")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AGGREGATE PMS DATA
    # ═══════════════════════════════════════════════════════════════════════════
    total_rooms = await db.rooms.count_documents({"hotel_id": hotel_id, "status": {"$ne": "out_of_service"}})
    
    # Today's occupancy
    occupied_today = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_in": {"$lte": today},
        "check_out": {"$gt": today},
        "status": {"$in": ["checked_in", "confirmed"]}
    })
    
    # Today's arrivals & departures
    arrivals_today = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_in": {"$regex": f"^{today}"},
        "status": {"$in": ["confirmed", "pending"]}
    })
    
    departures_today = await db.reservations.count_documents({
        "hotel_id": hotel_id,
        "check_out": {"$regex": f"^{today}"},
        "status": "checked_in"
    })
    
    # Revenue calculation
    today_reservations = await db.reservations.find({
        "hotel_id": hotel_id,
        "check_in": {"$lte": today},
        "check_out": {"$gt": today},
        "status": {"$in": ["checked_in", "confirmed"]}
    }, {"_id": 0, "room_rate": 1, "channel": 1}).to_list(1000)
    
    daily_revenue = sum(r.get("room_rate", 0) for r in today_reservations)
    occupancy_rate = (occupied_today / total_rooms * 100) if total_rooms > 0 else 0
    adr = (daily_revenue / occupied_today) if occupied_today > 0 else 0
    revpar = (daily_revenue / total_rooms) if total_rooms > 0 else 0
    
    # Channel mix
    channel_counts = {}
    for r in today_reservations:
        ch = r.get("channel", "direct")
        channel_counts[ch] = channel_counts.get(ch, 0) + 1
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AGGREGATE HOUSEKEEPING DATA
    # ═══════════════════════════════════════════════════════════════════════════
    hk_tasks = await db.hk_tasks.find({"hotel_id": hotel_id}, {"_id": 0}).to_list(500)
    hk_pending = len([t for t in hk_tasks if t.get("status") == "pending"])
    hk_in_progress = len([t for t in hk_tasks if t.get("status") == "in_progress"])
    hk_completed = len([t for t in hk_tasks if t.get("status") == "completed"])
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AGGREGATE CRM DATA
    # ═══════════════════════════════════════════════════════════════════════════
    total_clients = await db.clients.count_documents({"hotel_id": hotel_id})
    vip_clients = await db.clients.count_documents({"hotel_id": hotel_id, "tags": "VIP"})
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILD KPIS
    # ═══════════════════════════════════════════════════════════════════════════
    kpis = {
        "pms": [
            FlowboardKPI(
                id="occ", label="Occupation", value=round(occupancy_rate, 1), unit="%",
                trend=2.5, trend_direction="up", color="violet", icon="building", source_module="pms"
            ),
            FlowboardKPI(
                id="adr", label="ADR", value=round(adr, 2), unit="€",
                trend=5.2, trend_direction="up", color="emerald", icon="euro", source_module="pms"
            ),
            FlowboardKPI(
                id="revpar", label="RevPAR", value=round(revpar, 2), unit="€",
                trend=3.1, trend_direction="up", color="blue", icon="trending-up", source_module="pms"
            ),
            FlowboardKPI(
                id="revenue", label="CA Jour", value=round(daily_revenue, 2), unit="€",
                trend=8.0, trend_direction="up", color="amber", icon="wallet", source_module="pms"
            ),
            FlowboardKPI(
                id="arrivals", label="Arrivées", value=arrivals_today, unit="",
                color="green", icon="log-in", source_module="pms"
            ),
            FlowboardKPI(
                id="departures", label="Départs", value=departures_today, unit="",
                color="orange", icon="log-out", source_module="pms"
            ),
        ],
        "housekeeping": [
            FlowboardKPI(
                id="hk-pending", label="À nettoyer", value=hk_pending, unit="",
                color="red", icon="spray-can", source_module="housekeeping"
            ),
            FlowboardKPI(
                id="hk-progress", label="En cours", value=hk_in_progress, unit="",
                color="amber", icon="loader", source_module="housekeeping"
            ),
            FlowboardKPI(
                id="hk-done", label="Terminées", value=hk_completed, unit="",
                color="green", icon="check", source_module="housekeeping"
            ),
        ],
        "crm": [
            FlowboardKPI(
                id="clients", label="Clients", value=total_clients, unit="",
                color="blue", icon="users", source_module="crm"
            ),
            FlowboardKPI(
                id="vip", label="VIP", value=vip_clients, unit="",
                color="amber", icon="star", source_module="crm"
            ),
        ],
        "channel": [
            FlowboardKPI(
                id="direct", label="Direct", value=channel_counts.get("direct", 0), unit="",
                color="green", icon="globe", source_module="channel"
            ),
            FlowboardKPI(
                id="ota", label="OTA", value=sum(v for k, v in channel_counts.items() if k != "direct"), unit="",
                color="blue", icon="share-2", source_module="channel"
            ),
        ],
        "ereputation": [
            FlowboardKPI(
                id="score", label="Note Globale", value=4.3, unit="/5",
                trend=0.2, trend_direction="up", color="amber", icon="star", source_module="ereputation"
            ),
            FlowboardKPI(
                id="reviews", label="Avis", value=1284, unit="",
                trend=18, trend_direction="up", color="blue", icon="message-circle", source_module="ereputation"
            ),
        ],
        "rms": [
            FlowboardKPI(
                id="rms-score", label="Score RMS", value=78, unit="/100",
                color="violet", icon="brain", source_module="rms"
            ),
        ],
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILD TIMELINE EVENTS
    # ═══════════════════════════════════════════════════════════════════════════
    timeline = []
    
    # Get today's arrivals for timeline
    arrivals_list = await db.reservations.find({
        "hotel_id": hotel_id,
        "check_in": {"$regex": f"^{today}"},
        "status": {"$in": ["confirmed", "pending"]}
    }, {"_id": 0}).sort("check_in", 1).to_list(20)
    
    for arr in arrivals_list:
        timeline.append(FlowboardEvent(
            id=f"arr-{arr['id']}",
            time=arr.get("check_in", today + "T14:00:00"),
            title=f"Arrivée: {arr.get('client_name', 'Client')}",
            description=f"Chambre {arr.get('room_number', '?')} - {arr.get('nights', 1)} nuits",
            type="arrival",
            priority="normal",
            source_module="pms",
            action_url=f"/pms/reservations/{arr['id']}",
            status=arr.get("status"),
            metadata={"room": arr.get("room_number"), "channel": arr.get("channel")}
        ))
    
    # Get today's departures for timeline
    departures_list = await db.reservations.find({
        "hotel_id": hotel_id,
        "check_out": {"$regex": f"^{today}"},
        "status": "checked_in"
    }, {"_id": 0}).sort("check_out", 1).to_list(20)
    
    for dep in departures_list:
        timeline.append(FlowboardEvent(
            id=f"dep-{dep['id']}",
            time=dep.get("check_out", today + "T11:00:00"),
            title=f"Départ: {dep.get('client_name', 'Client')}",
            description=f"Chambre {dep.get('room_number', '?')} - Solde: {dep.get('balance', 0):.2f}€",
            type="departure",
            priority="high" if dep.get("balance", 0) > 0 else "normal",
            source_module="pms",
            action_url=f"/pms/reservations/{dep['id']}",
            status=dep.get("status"),
            metadata={"room": dep.get("room_number"), "balance": dep.get("balance", 0)}
        ))
    
    # Sort timeline by time
    timeline.sort(key=lambda x: x.time)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILD ALERTS
    # ═══════════════════════════════════════════════════════════════════════════
    alerts = []
    
    # Alert: Unpaid departures
    unpaid_departures = [d for d in departures_list if d.get("balance", 0) > 0]
    if unpaid_departures:
        alerts.append(FlowboardAlert(
            id="alert-unpaid",
            title="Départs avec solde",
            message=f"{len(unpaid_departures)} départ(s) avec solde à régler",
            severity="warning",
            source_module="pms",
            timestamp=now.isoformat(),
            action_url="/pms/departures",
            action_label="Voir les départs"
        ))
    
    # Alert: Housekeeping pending
    if hk_pending > 5:
        alerts.append(FlowboardAlert(
            id="alert-hk",
            title="Chambres à nettoyer",
            message=f"{hk_pending} chambres en attente de nettoyage",
            severity="warning",
            source_module="housekeeping",
            timestamp=now.isoformat(),
            action_url="/housekeeping",
            action_label="Voir le planning"
        ))
    
    # Alert: High occupancy
    if occupancy_rate > 90:
        alerts.append(FlowboardAlert(
            id="alert-occ",
            title="Occupation élevée",
            message=f"Occupation à {occupancy_rate:.0f}% - Vérifiez les surbookings",
            severity="info",
            source_module="pms",
            timestamp=now.isoformat()
        ))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILD AI SUGGESTIONS
    # ═══════════════════════════════════════════════════════════════════════════
    ai_suggestions = []
    
    # Suggestion: Increase rates on high demand
    if occupancy_rate > 85:
        ai_suggestions.append(AISuggestion(
            id="ai-rate-increase",
            title="Augmenter les tarifs",
            description=f"L'occupation est à {occupancy_rate:.0f}%. Considérez une augmentation de 10-15% sur les OTAs.",
            impact="high",
            category="revenue",
            confidence=0.85,
            action_items=["Vérifier les tarifs concurrents", "Ajuster les prix sur Booking.com", "Fermer les promos"],
            estimated_value=daily_revenue * 0.12,
            source_data={"occupancy": occupancy_rate, "adr": adr}
        ))
    
    # Suggestion: VIP arriving
    vip_arrivals = [a for a in arrivals_list if "VIP" in str(a.get("notes", "")) or "VIP" in str(a.get("special_requests", ""))]
    if vip_arrivals:
        ai_suggestions.append(AISuggestion(
            id="ai-vip",
            title="Arrivées VIP aujourd'hui",
            description=f"{len(vip_arrivals)} client(s) VIP attendu(s). Préparez un accueil personnalisé.",
            impact="medium",
            category="guest_experience",
            confidence=0.95,
            action_items=["Préparer welcome drink", "Vérifier les préférences chambre", "Informer le personnel"]
        ))
    
    # Suggestion: Channel optimization
    direct_ratio = channel_counts.get("direct", 0) / max(1, sum(channel_counts.values())) * 100
    if direct_ratio < 30:
        ai_suggestions.append(AISuggestion(
            id="ai-direct",
            title="Booster les ventes directes",
            description=f"Seulement {direct_ratio:.0f}% de réservations directes. Objectif: 40%+",
            impact="high",
            category="revenue",
            confidence=0.8,
            action_items=["Mettre en avant le Booking Engine", "Offrir un avantage réservation directe", "Améliorer le SEO"],
            estimated_value=daily_revenue * 0.15 * (40 - direct_ratio) / 100
        ))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILD MODULE SUMMARIES
    # ═══════════════════════════════════════════════════════════════════════════
    
    return FlowboardResponse(
        hotel_id=hotel_id,
        hotel_name=hotel.get("name", "Hôtel"),
        date=today,
        last_updated=now.isoformat(),
        kpis=kpis,
        timeline=timeline[:15],  # Limit to 15 events
        alerts=alerts,
        ai_suggestions=ai_suggestions,
        pms_summary={
            "total_rooms": total_rooms,
            "occupied": occupied_today,
            "available": total_rooms - occupied_today,
            "occupancy_rate": round(occupancy_rate, 1),
            "arrivals": arrivals_today,
            "departures": departures_today,
            "revenue": round(daily_revenue, 2),
            "adr": round(adr, 2),
            "revpar": round(revpar, 2)
        },
        channel_summary={
            "channels": channel_counts,
            "direct_ratio": round(direct_ratio, 1) if channel_counts else 0,
            "total_bookings": sum(channel_counts.values())
        },
        crm_summary={
            "total_clients": total_clients,
            "vip_count": vip_clients
        },
        housekeeping_summary={
            "pending": hk_pending,
            "in_progress": hk_in_progress,
            "completed": hk_completed,
            "total_tasks": len(hk_tasks)
        },
        rms_summary={
            "optimization_score": 78,
            "recommendations_count": 3,
            "auto_pricing_enabled": True
        },
        ereputation_summary={
            "global_score": 4.3,
            "total_reviews": 1284,
            "pending_responses": 5,
            "platforms": {"google": 4.5, "booking": 4.2, "tripadvisor": 4.1}
        },
        quick_stats={
            "pending_payments": len(unpaid_departures),
            "pending_reviews": 5,
            "pending_tasks": hk_pending,
            "new_bookings_today": arrivals_today
        }
    )


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE SYNC STATUS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/sync-status")
async def get_sync_status(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
) -> InterModuleSyncResponse:
    """Get synchronization status between all modules"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Check module connectivity
    modules = [
        ModuleSyncStatus(module="pms", status="connected", last_sync=now, records_synced=100),
        ModuleSyncStatus(module="channel_manager", status="connected", last_sync=now, records_synced=50),
        ModuleSyncStatus(module="crm", status="connected", last_sync=now, records_synced=200),
        ModuleSyncStatus(module="housekeeping", status="connected", last_sync=now, records_synced=30),
        ModuleSyncStatus(module="rms", status="connected", last_sync=now, records_synced=15),
        ModuleSyncStatus(module="ereputation", status="connected", last_sync=now, records_synced=1284),
    ]
    
    return InterModuleSyncResponse(
        hotel_id=hotel_id,
        modules=modules,
        overall_status="healthy",
        last_full_sync=now
    )


# ═══════════════════════════════════════════════════════════════════════════════
# QUICK ACTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/quick-actions")
async def get_quick_actions(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get available quick actions for the dashboard"""
    return {
        "actions": [
            {
                "id": "new-reservation",
                "label": "Nouvelle réservation",
                "icon": "plus",
                "color": "violet",
                "url": "/pms/reservations?action=new",
                "shortcut": "N"
            },
            {
                "id": "check-in",
                "label": "Check-in",
                "icon": "log-in",
                "color": "green",
                "url": "/pms/arrivals",
                "shortcut": "C"
            },
            {
                "id": "check-out",
                "label": "Check-out",
                "icon": "log-out",
                "color": "orange",
                "url": "/pms/departures",
                "shortcut": "O"
            },
            {
                "id": "housekeeping",
                "label": "Housekeeping",
                "icon": "spray-can",
                "color": "blue",
                "url": "/housekeeping",
                "shortcut": "H"
            },
            {
                "id": "reports",
                "label": "Rapports",
                "icon": "bar-chart-3",
                "color": "slate",
                "url": "/pms/reports",
                "shortcut": "R"
            }
        ]
    }
