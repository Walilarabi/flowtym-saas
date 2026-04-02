"""
Hoptym RMS - API Routes
Complete REST API for Revenue Management System
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import uuid

from .models import (
    RMSConfig, StrategyConfiguration, WeightConfiguration, Strategy, StrategyType,
    WeightFactor, Recommendation, RecommendationStatus, RecommendationHistoryEntry,
    PricingCalendar, DailyPricing, DemandLevel, MarketData, EngineRun, RMSKPIs,
    ConnectorConfigurations, LighthouseConfig, DEdgeConfig,
    UpdateWeightsRequest, UpdateStrategyRequest, ApplyRecommendationRequest,
    UpdatePricingRequest, RunEngineRequest, ConnectorSyncRequest, WebhookPayload
)
from .engine import PricingEngine, get_default_strategies
from .integrations.lighthouse import create_lighthouse_connector
from .integrations.dedge import create_dedge_connector
from .integrations.flowtym_connectors import (
    create_pms_connector, create_channel_manager_connector, create_booking_engine_connector
)

# Import shared ConfigService for Configuration integration
try:
    from shared.config_service import get_config_service
    HAS_CONFIG_SERVICE = True
except ImportError:
    HAS_CONFIG_SERVICE = False

router = APIRouter(prefix="/rms", tags=["RMS - Revenue Management"])


# ═══════════════════════════════════════════════════════════════════════════════
# DEPENDENCY - Database Access
# ═══════════════════════════════════════════════════════════════════════════════

# Global db reference - will be set by main app
_db = None

def set_db(database):
    """Set database instance from main app"""
    global _db
    _db = database

async def get_db():
    """Get database instance"""
    global _db
    if _db is None:
        # Fallback: try to import from server
        try:
            from server import db
            _db = db
        except ImportError:
            raise RuntimeError("Database not initialized. Call set_db() first.")
    return _db


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/config")
async def get_rms_config(hotel_id: str, db=Depends(get_db)):
    """
    Get complete RMS configuration for a hotel
    """
    config = await db.rms_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    
    if not config:
        # Create default configuration
        default_strategies = get_default_strategies()
        
        config = {
            "hotel_id": hotel_id,
            "is_enabled": True,
            "is_trial": True,
            "trial_ends_at": (datetime.utcnow() + timedelta(days=14)).isoformat(),
            "strategy_config": {
                "hotel_id": hotel_id,
                "active_strategy": "balanced",
                "strategies": [s.dict() for s in default_strategies],
                "autopilot_enabled": False,
                "autopilot_confidence_threshold": 0.75,
                "autopilot_max_price_change_pct": 0.15,
                "updated_at": datetime.utcnow().isoformat()
            },
            "weight_config": {
                "hotel_id": hotel_id,
                "factors": [
                    {"factor_id": "demand", "label": "Demande", "value": 25, "color": "#4f46e5"},
                    {"factor_id": "competition", "label": "Concurrence", "value": 20, "color": "#0891b2"},
                    {"factor_id": "events", "label": "Événements", "value": 15, "color": "#059669"},
                    {"factor_id": "seasonality", "label": "Saisonnalité", "value": 20, "color": "#d97706"},
                    {"factor_id": "historical", "label": "Historique", "value": 20, "color": "#dc2626"},
                ],
                "updated_at": datetime.utcnow().isoformat()
            },
            "connector_config": {
                "hotel_id": hotel_id,
                "lighthouse": {"enabled": False, "sync_interval_minutes": 60},
                "dedge": {"enabled": False, "sync_interval_minutes": 30},
                "pms": {"enabled": True, "sync_interval_minutes": 5},
                "channel_manager": {"enabled": True, "sync_interval_minutes": 15},
                "booking_engine": {"enabled": True, "sync_interval_minutes": 10},
                "updated_at": datetime.utcnow().isoformat()
            },
            "auto_run_enabled": False,
            "auto_run_schedule": "0 6 * * *",
            "notification_emails": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.rms_config.insert_one({**config, "hotel_id": hotel_id})
    
    return config


@router.put("/hotels/{hotel_id}/config")
async def update_rms_config(
    hotel_id: str,
    updates: Dict,
    db=Depends(get_db)
):
    """
    Update RMS configuration
    """
    updates["updated_at"] = datetime.utcnow().isoformat()
    
    result = await db.rms_config.update_one(
        {"hotel_id": hotel_id},
        {"$set": updates},
        upsert=True
    )
    
    return {"status": "success", "modified": result.modified_count > 0}


# ═══════════════════════════════════════════════════════════════════════════════
# STRATEGY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/strategy")
async def get_strategy_config(hotel_id: str, db=Depends(get_db)):
    """
    Get strategy configuration
    """
    config = await db.rms_config.find_one(
        {"hotel_id": hotel_id},
        {"_id": 0, "strategy_config": 1}
    )
    
    if not config or "strategy_config" not in config:
        # Return defaults
        default_strategies = get_default_strategies()
        return {
            "hotel_id": hotel_id,
            "active_strategy": "balanced",
            "strategies": [s.dict() for s in default_strategies],
            "autopilot_enabled": False,
            "autopilot_confidence_threshold": 0.75,
            "autopilot_max_price_change_pct": 0.15
        }
    
    return config["strategy_config"]


@router.put("/hotels/{hotel_id}/strategy")
async def update_strategy_config(
    hotel_id: str,
    request: UpdateStrategyRequest,
    db=Depends(get_db)
):
    """
    Update strategy configuration (active strategy, autopilot settings)
    """
    updates = {"strategy_config.updated_at": datetime.utcnow().isoformat()}
    
    if request.active_strategy is not None:
        updates["strategy_config.active_strategy"] = request.active_strategy.value
    
    if request.autopilot_enabled is not None:
        updates["strategy_config.autopilot_enabled"] = request.autopilot_enabled
    
    if request.autopilot_confidence_threshold is not None:
        updates["strategy_config.autopilot_confidence_threshold"] = request.autopilot_confidence_threshold
    
    if request.autopilot_max_price_change_pct is not None:
        updates["strategy_config.autopilot_max_price_change_pct"] = request.autopilot_max_price_change_pct
    
    await db.rms_config.update_one(
        {"hotel_id": hotel_id},
        {"$set": updates}
    )
    
    return {"status": "success", "message": "Strategy configuration updated"}


# ═══════════════════════════════════════════════════════════════════════════════
# WEIGHTS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/weights")
async def get_weights(hotel_id: str, db=Depends(get_db)):
    """
    Get weight factor configuration
    """
    config = await db.rms_config.find_one(
        {"hotel_id": hotel_id},
        {"_id": 0, "weight_config": 1}
    )
    
    if not config or "weight_config" not in config:
        return {
            "hotel_id": hotel_id,
            "factors": [
                {"factor_id": "demand", "label": "Demande", "value": 25, "color": "#4f46e5"},
                {"factor_id": "competition", "label": "Concurrence", "value": 20, "color": "#0891b2"},
                {"factor_id": "events", "label": "Événements", "value": 15, "color": "#059669"},
                {"factor_id": "seasonality", "label": "Saisonnalité", "value": 20, "color": "#d97706"},
                {"factor_id": "historical", "label": "Historique", "value": 20, "color": "#dc2626"},
            ]
        }
    
    return config["weight_config"]


@router.put("/hotels/{hotel_id}/weights")
async def update_weights(
    hotel_id: str,
    request: UpdateWeightsRequest,
    db=Depends(get_db)
):
    """
    Update weight factors
    """
    # Validate total = 100
    total = sum(f.value for f in request.factors)
    if abs(total - 100) > 0.1:
        raise HTTPException(
            status_code=400,
            detail=f"Weight factors must sum to 100. Current sum: {total}"
        )
    
    await db.rms_config.update_one(
        {"hotel_id": hotel_id},
        {"$set": {
            "weight_config.factors": [f.dict() for f in request.factors],
            "weight_config.updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    return {"status": "success", "message": "Weight factors updated"}


# ═══════════════════════════════════════════════════════════════════════════════
# RECOMMENDATIONS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/recommendations")
async def get_recommendations(
    hotel_id: str,
    status: Optional[str] = None,
    limit: int = 20,
    db=Depends(get_db)
):
    """
    Get current recommendations
    """
    query = {"hotel_id": hotel_id}
    
    if status:
        query["status"] = status
    # No default filter - show all recommendations
    
    recommendations = await db.rms_recommendations.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {
        "hotel_id": hotel_id,
        "count": len(recommendations),
        "recommendations": recommendations
    }


@router.post("/hotels/{hotel_id}/recommendations/{recommendation_id}/apply")
async def apply_recommendation(
    hotel_id: str,
    recommendation_id: str,
    request: Optional[ApplyRecommendationRequest] = None,
    db=Depends(get_db)
):
    """
    Apply a recommendation
    """
    rec = await db.rms_recommendations.find_one({
        "id": recommendation_id,
        "hotel_id": hotel_id
    })
    
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    if rec.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Recommendation already processed")
    
    # Update recommendation status
    await db.rms_recommendations.update_one(
        {"id": recommendation_id},
        {"$set": {
            "status": "applied",
            "applied_at": datetime.utcnow().isoformat(),
            "applied_by": "user"  # Would be actual user_id
        }}
    )
    
    # Apply price changes to calendar
    for change in rec.get("price_changes", []):
        for date in rec.get("target_dates", []):
            await db.rms_pricing_calendar.update_one(
                {"hotel_id": hotel_id, f"days.{date}": {"$exists": True}},
                {"$set": {
                    f"days.{date}.final_price": change.get("recommended_price"),
                    f"days.{date}.recommended_price": change.get("recommended_price"),
                    f"days.{date}.updated_at": datetime.utcnow().isoformat(),
                    f"days.{date}.price_history": {
                        "price": change.get("recommended_price"),
                        "changed_at": datetime.utcnow().isoformat(),
                        "changed_by": "recommendation",
                        "recommendation_id": recommendation_id
                    }
                }},
                upsert=True
            )
    
    # Record in history
    await db.rms_recommendation_history.insert_one({
        "recommendation_id": recommendation_id,
        "hotel_id": hotel_id,
        "action": "applied",
        "action_by": "user",
        "action_at": datetime.utcnow().isoformat(),
        "recommendation_snapshot": rec
    })
    
    return {
        "status": "success",
        "message": "Recommendation applied",
        "recommendation_id": recommendation_id,
        "dates_updated": rec.get("target_dates", [])
    }


@router.post("/hotels/{hotel_id}/recommendations/{recommendation_id}/dismiss")
async def dismiss_recommendation(
    hotel_id: str,
    recommendation_id: str,
    reason: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Dismiss a recommendation
    """
    rec = await db.rms_recommendations.find_one({
        "id": recommendation_id,
        "hotel_id": hotel_id
    })
    
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    await db.rms_recommendations.update_one(
        {"id": recommendation_id},
        {"$set": {
            "status": "dismissed",
            "dismissed_at": datetime.utcnow().isoformat(),
            "dismissed_reason": reason
        }}
    )
    
    # Record in history
    await db.rms_recommendation_history.insert_one({
        "recommendation_id": recommendation_id,
        "hotel_id": hotel_id,
        "action": "dismissed",
        "action_by": "user",
        "action_at": datetime.utcnow().isoformat(),
        "reason": reason,
        "recommendation_snapshot": rec
    })
    
    return {"status": "success", "message": "Recommendation dismissed"}


@router.get("/hotels/{hotel_id}/recommendations/history")
async def get_recommendation_history(
    hotel_id: str,
    limit: int = 50,
    db=Depends(get_db)
):
    """
    Get recommendation history for analytics and learning
    """
    history = await db.rms_recommendation_history.find(
        {"hotel_id": hotel_id},
        {"_id": 0}
    ).sort("action_at", -1).limit(limit).to_list(length=limit)
    
    return {
        "hotel_id": hotel_id,
        "count": len(history),
        "history": history
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PRICING CALENDAR ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/calendar")
async def get_pricing_calendar(
    hotel_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    room_type: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Get pricing calendar
    """
    if not from_date:
        from_date = datetime.utcnow().strftime("%Y-%m-%d")
    if not to_date:
        to_date = (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d")
    
    query = {"hotel_id": hotel_id}
    if room_type:
        query["room_type_id"] = room_type
    
    calendar = await db.rms_pricing_calendar.find_one(query, {"_id": 0})
    
    if not calendar:
        # Generate default calendar
        calendar = await _generate_default_calendar(hotel_id, from_date, to_date, db)
    
    # Filter to requested date range
    days = calendar.get("days", {})
    filtered_days = {
        k: v for k, v in days.items()
        if from_date <= k <= to_date
    }
    
    return {
        "hotel_id": hotel_id,
        "room_type": room_type,
        "period": {"from": from_date, "to": to_date},
        "days": filtered_days
    }


@router.put("/hotels/{hotel_id}/calendar/{date}")
async def update_pricing(
    hotel_id: str,
    date: str,
    request: UpdatePricingRequest,
    db=Depends(get_db)
):
    """
    Update pricing for a specific date
    """
    update_data = {
        f"days.{date}.final_price": request.price,
        f"days.{date}.is_manually_locked": request.lock,
        f"days.{date}.updated_at": datetime.utcnow().isoformat()
    }
    
    if request.lock:
        update_data[f"days.{date}.locked_by"] = "user"
        update_data[f"days.{date}.locked_at"] = datetime.utcnow().isoformat()
    
    # Add to price history
    history_entry = {
        "price": request.price,
        "changed_at": datetime.utcnow().isoformat(),
        "changed_by": "manual",
        "reason": request.reason
    }
    
    await db.rms_pricing_calendar.update_one(
        {"hotel_id": hotel_id},
        {
            "$set": update_data,
            "$push": {f"days.{date}.price_history": history_entry}
        },
        upsert=True
    )
    
    return {
        "status": "success",
        "date": date,
        "new_price": request.price,
        "locked": request.lock
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ENGINE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/hotels/{hotel_id}/engine/run")
async def run_engine(
    hotel_id: str,
    request: Optional[RunEngineRequest] = None,
    background_tasks: BackgroundTasks = None,
    db=Depends(get_db)
):
    """
    Trigger pricing engine calculation
    """
    # Get configuration
    config = await get_rms_config(hotel_id, db)
    
    # Create engine run record
    run_id = str(uuid.uuid4())
    engine_run = {
        "id": run_id,
        "hotel_id": hotel_id,
        "triggered_by": "user",
        "started_at": datetime.utcnow().isoformat(),
        "strategy_type": config["strategy_config"]["active_strategy"],
        "weights_snapshot": {
            f["factor_id"]: f["value"] / 100 
            for f in config["weight_config"]["factors"]
        },
        "status": "running"
    }
    
    await db.rms_engine_runs.insert_one(engine_run)
    
    # Run engine (synchronously for now, could be async)
    try:
        result = await _execute_engine(hotel_id, run_id, config, db)
        
        # Update run record
        await db.rms_engine_runs.update_one(
            {"id": run_id},
            {"$set": {
                "completed_at": datetime.utcnow().isoformat(),
                "status": "completed",
                "recommendations_generated": len(result.get("recommendations", [])),
                "pricing_updates_count": len(result.get("pricing_updates", {})),
                "output_summary": {
                    "kpis": result.get("kpis", {}),
                    "analysis": result.get("analysis_summary", "")
                }
            }}
        )
        
        return {
            "status": "success",
            "run_id": run_id,
            "recommendations_count": len(result.get("recommendations", [])),
            "pricing_updates": len(result.get("pricing_updates", {})),
            "analysis": result.get("analysis_summary", ""),
            "kpis": result.get("kpis", {})
        }
        
    except Exception as e:
        await db.rms_engine_runs.update_one(
            {"id": run_id},
            {"$set": {
                "completed_at": datetime.utcnow().isoformat(),
                "status": "failed",
                "error_message": str(e)
            }}
        )
        raise HTTPException(status_code=500, detail=f"Engine execution failed: {str(e)}")


@router.get("/hotels/{hotel_id}/engine/status")
async def get_engine_status(hotel_id: str, db=Depends(get_db)):
    """
    Get engine status and last run info
    """
    last_run = await db.rms_engine_runs.find_one(
        {"hotel_id": hotel_id},
        {"_id": 0},
        sort=[("started_at", -1)]
    )
    
    # Get pending recommendations count
    pending_count = await db.rms_recommendations.count_documents({
        "hotel_id": hotel_id,
        "status": "pending"
    })
    
    return {
        "hotel_id": hotel_id,
        "engine_status": "idle",
        "last_run": last_run,
        "pending_recommendations": pending_count
    }


@router.get("/hotels/{hotel_id}/engine/runs")
async def get_engine_runs(
    hotel_id: str,
    limit: int = 20,
    db=Depends(get_db)
):
    """
    Get engine run history
    """
    runs = await db.rms_engine_runs.find(
        {"hotel_id": hotel_id},
        {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(length=limit)
    
    return {
        "hotel_id": hotel_id,
        "count": len(runs),
        "runs": runs
    }


# ═══════════════════════════════════════════════════════════════════════════════
# KPIs ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/kpis")
async def get_kpis(hotel_id: str, db=Depends(get_db)):
    """
    Get current KPIs
    """
    # Get PMS connector data
    pms_config = {"enabled": True, "sync_interval_minutes": 5}
    pms = create_pms_connector(type('obj', (object,), pms_config)(), db)
    
    kpis = await pms.get_current_kpis(hotel_id)
    
    # Add targets (from config or defaults)
    config = await db.rms_config.find_one({"hotel_id": hotel_id})
    targets = config.get("targets", {}) if config else {}
    
    return {
        "hotel_id": hotel_id,
        "current": kpis,
        "targets": {
            "revpar": targets.get("revpar", kpis.get("revpar", 0) * 1.1),
            "adr": targets.get("adr", kpis.get("adr", 0) * 1.05),
            "occupancy": targets.get("occupancy", 82),
            "revenue": targets.get("revenue", kpis.get("total_revenue", 0) * 1.1)
        },
        "period": "today",
        "generated_at": datetime.utcnow().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MARKET DATA ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/market-data")
async def get_market_data(hotel_id: str, db=Depends(get_db)):
    """
    Get market data (competitors, demand, etc.)
    """
    # Check for cached data
    cached = await db.rms_market_data.find_one(
        {"hotel_id": hotel_id},
        {"_id": 0}
    )
    
    # If stale (>1 hour), refresh
    if cached:
        last_sync = datetime.fromisoformat(cached.get("last_sync_at", "2020-01-01T00:00:00"))
        if datetime.utcnow() - last_sync < timedelta(hours=1):
            return cached
    
    # Get fresh data
    config = await db.rms_config.find_one({"hotel_id": hotel_id})
    lighthouse_config = LighthouseConfig(**(config.get("connector_config", {}).get("lighthouse", {})))
    
    lighthouse = create_lighthouse_connector(lighthouse_config)
    market_data = await lighthouse.sync_all_data(hotel_id)
    
    # Cache it
    await db.rms_market_data.update_one(
        {"hotel_id": hotel_id},
        {"$set": market_data.dict()},
        upsert=True
    )
    
    return market_data.dict()


@router.get("/hotels/{hotel_id}/competitors")
async def get_competitors(
    hotel_id: str,
    date: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Get competitor rates
    """
    if not date:
        date = datetime.utcnow().strftime("%Y-%m-%d")
    
    market_data = await db.rms_market_data.find_one(
        {"hotel_id": hotel_id},
        {"_id": 0, "competitor_rates": 1}
    )
    
    if not market_data:
        # Fetch fresh
        config = await db.rms_config.find_one({"hotel_id": hotel_id})
        lighthouse_config = LighthouseConfig(**(config.get("connector_config", {}).get("lighthouse", {}) if config else {}))
        lighthouse = create_lighthouse_connector(lighthouse_config)
        rates = await lighthouse.get_competitor_rates(date)
        return {
            "hotel_id": hotel_id,
            "date": date,
            "competitors": [r.dict() for r in rates if r.date == date]
        }
    
    # Filter for requested date
    rates = [
        r for r in market_data.get("competitor_rates", [])
        if r.get("date") == date
    ]
    
    return {
        "hotel_id": hotel_id,
        "date": date,
        "competitors": rates
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CONNECTOR ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/connectors/status")
async def get_connectors_status(hotel_id: str, db=Depends(get_db)):
    """
    Get status of all connectors
    """
    config = await db.rms_config.find_one(
        {"hotel_id": hotel_id},
        {"_id": 0, "connector_config": 1}
    )
    
    connector_config = config.get("connector_config", {}) if config else {}
    
    # Build status for each connector
    statuses = {
        "pms": {
            "name": "PMS",
            "description": "Système de gestion hôtelière",
            "enabled": connector_config.get("pms", {}).get("enabled", True),
            "status": "connected",
            "last_sync": datetime.utcnow().isoformat(),
            "sync_interval": connector_config.get("pms", {}).get("sync_interval_minutes", 5)
        },
        "channel_manager": {
            "name": "Channel Manager",
            "description": "Distribution OTA",
            "enabled": connector_config.get("channel_manager", {}).get("enabled", True),
            "status": "connected",
            "last_sync": datetime.utcnow().isoformat(),
            "sync_interval": connector_config.get("channel_manager", {}).get("sync_interval_minutes", 15)
        },
        "booking_engine": {
            "name": "Booking Engine",
            "description": "Moteur de réservation directe",
            "enabled": connector_config.get("booking_engine", {}).get("enabled", True),
            "status": "connected",
            "last_sync": datetime.utcnow().isoformat(),
            "sync_interval": connector_config.get("booking_engine", {}).get("sync_interval_minutes", 10)
        },
        "lighthouse": {
            "name": "Lighthouse",
            "description": "Données de marché et benchmarking",
            "enabled": connector_config.get("lighthouse", {}).get("enabled", False),
            "status": "disconnected" if not connector_config.get("lighthouse", {}).get("api_token") else "connected",
            "requires_api_key": True,
            "last_sync": None
        },
        "dedge": {
            "name": "D-EDGE",
            "description": "Distribution et performance hôtelière",
            "enabled": connector_config.get("dedge", {}).get("enabled", False),
            "status": "disconnected" if not connector_config.get("dedge", {}).get("api_key") else "connected",
            "requires_api_key": True,
            "last_sync": None
        }
    }
    
    return {
        "hotel_id": hotel_id,
        "connectors": statuses
    }


@router.post("/hotels/{hotel_id}/connectors/{connector}/sync")
async def sync_connector(
    hotel_id: str,
    connector: str,
    db=Depends(get_db)
):
    """
    Trigger sync for a specific connector
    """
    valid_connectors = ["pms", "channel_manager", "booking_engine", "lighthouse", "dedge"]
    if connector not in valid_connectors:
        raise HTTPException(status_code=400, detail=f"Invalid connector: {connector}")
    
    config = await db.rms_config.find_one({"hotel_id": hotel_id})
    connector_config = config.get("connector_config", {}) if config else {}
    
    result = {"connector": connector, "status": "synced"}
    
    if connector == "lighthouse":
        lh_config = LighthouseConfig(**connector_config.get("lighthouse", {}))
        lh = create_lighthouse_connector(lh_config)
        market_data = await lh.sync_all_data(hotel_id)
        await db.rms_market_data.update_one(
            {"hotel_id": hotel_id},
            {"$set": market_data.dict()},
            upsert=True
        )
        result["data_points"] = len(market_data.competitor_rates) + len(market_data.demand_data)
        
    elif connector == "dedge":
        de_config = DEdgeConfig(**connector_config.get("dedge", {}))
        dedge = create_dedge_connector(de_config)
        inventory = await dedge.sync_inventory(hotel_id)
        result["inventory"] = inventory
        
    elif connector == "pms":
        pms_config = type('obj', (object,), connector_config.get("pms", {"enabled": True}))()
        pms = create_pms_connector(pms_config, db)
        kpis = await pms.get_current_kpis(hotel_id)
        result["kpis"] = kpis
        
    elif connector == "channel_manager":
        cm_config = type('obj', (object,), connector_config.get("channel_manager", {"enabled": True}))()
        cm = create_channel_manager_connector(cm_config, db)
        distribution = await cm.get_channel_distribution(hotel_id)
        result["channels"] = distribution
        
    elif connector == "booking_engine":
        be_config = type('obj', (object,), connector_config.get("booking_engine", {"enabled": True}))()
        be = create_booking_engine_connector(be_config, db)
        metrics = await be.get_direct_booking_metrics(hotel_id)
        result["metrics"] = metrics
    
    return result


@router.put("/hotels/{hotel_id}/connectors/{connector}/config")
async def update_connector_config(
    hotel_id: str,
    connector: str,
    config_update: Dict,
    db=Depends(get_db)
):
    """
    Update connector configuration (API keys, settings)
    """
    valid_connectors = ["lighthouse", "dedge", "pms", "channel_manager", "booking_engine"]
    if connector not in valid_connectors:
        raise HTTPException(status_code=400, detail=f"Invalid connector: {connector}")
    
    update_path = f"connector_config.{connector}"
    
    await db.rms_config.update_one(
        {"hotel_id": hotel_id},
        {"$set": {
            f"{update_path}.{k}": v for k, v in config_update.items()
        }}
    )
    
    return {"status": "success", "connector": connector, "updated_fields": list(config_update.keys())}


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION INTEGRATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/config-integration")
async def get_config_integration_data(
    hotel_id: str,
    db=Depends(get_db)
):
    """
    Get configuration data from the central Configuration module.
    
    This endpoint fetches:
    - Room types with base prices (from Configuration)
    - Rate plans with derivation rules (from Configuration)
    - Inventory summary (from Configuration)
    - Tax rules and settings (from Configuration)
    
    This data is used by RMS for:
    - Price calculations
    - Occupancy forecasting
    - Revenue optimization
    """
    if not HAS_CONFIG_SERVICE:
        raise HTTPException(
            status_code=501, 
            detail="Configuration service not available"
        )
    
    try:
        config_service = get_config_service()
        
        # Get all configuration data needed for RMS
        room_types = await config_service.get_room_types(hotel_id, include_room_count=True)
        rate_plans = await config_service.get_rate_plans(hotel_id)
        inventory = await config_service.get_inventory_summary(hotel_id)
        pricing_matrix = await config_service.get_pricing_matrix(hotel_id)
        settings = await config_service.get_advanced_settings(hotel_id)
        hotel_profile = await config_service.get_hotel_profile(hotel_id)
        
        return {
            "hotel_id": hotel_id,
            "source": "configuration_module",
            "hotel": {
                "name": hotel_profile.get("name") if hotel_profile else None,
                "currency": hotel_profile.get("currency", "EUR") if hotel_profile else "EUR",
                "timezone": hotel_profile.get("timezone", "Europe/Paris") if hotel_profile else "Europe/Paris"
            },
            "room_types": [
                {
                    "id": rt["id"],
                    "code": rt["code"],
                    "name": rt["name"],
                    "category": rt.get("category"),
                    "base_price": rt.get("base_price", 100),
                    "max_occupancy": rt.get("max_occupancy", 2),
                    "room_count": rt.get("room_count", 0)
                }
                for rt in room_types
            ],
            "rate_plans": [
                {
                    "id": rp["id"],
                    "code": rp["code"],
                    "name": rp["name"],
                    "rate_type": rp.get("rate_type"),
                    "is_derived": rp.get("is_derived", False),
                    "parent_rate_id": rp.get("parent_rate_id"),
                    "derivation_rule": rp.get("derivation_rule"),
                    "reference_price": rp.get("reference_price")
                }
                for rp in rate_plans
            ],
            "inventory": inventory,
            "pricing_matrix": pricing_matrix,
            "settings": {
                "overbooking_allowed": settings.get("overbooking_allowed", False),
                "overbooking_percentage": settings.get("overbooking_percentage", 0),
                "min_price_floor": settings.get("min_price_floor", 0),
                "round_prices_to": settings.get("round_prices_to", 1)
            },
            "synced_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")


@router.post("/hotels/{hotel_id}/sync-from-config")
async def sync_from_configuration(
    hotel_id: str,
    db=Depends(get_db)
):
    """
    Synchronize RMS with the latest Configuration data.
    
    This will:
    1. Update room type reference prices in RMS
    2. Update the pricing calendar base prices
    3. Apply any new rate plan derivation rules
    
    Call this after making changes in the Configuration module.
    """
    if not HAS_CONFIG_SERVICE:
        raise HTTPException(
            status_code=501, 
            detail="Configuration service not available"
        )
    
    try:
        config_service = get_config_service()
        
        # Get configuration data
        room_types = await config_service.get_room_types(hotel_id)
        pricing_matrix = await config_service.get_pricing_matrix(hotel_id)
        settings = await config_service.get_advanced_settings(hotel_id)
        
        # Build room type price map
        room_type_prices = {rt["code"]: rt.get("base_price", 100) for rt in room_types}
        
        # Calculate new base ADR (average of all room type base prices)
        if room_type_prices:
            new_base_adr = sum(room_type_prices.values()) / len(room_type_prices)
        else:
            new_base_adr = 150  # Default
        
        # Update RMS config with new base ADR and settings
        await db.rms_config.update_one(
            {"hotel_id": hotel_id},
            {"$set": {
                "base_adr": new_base_adr,
                "room_type_prices": room_type_prices,
                "pricing_matrix": pricing_matrix,
                "overbooking_config": {
                    "allowed": settings.get("overbooking_allowed", False),
                    "max_percentage": settings.get("overbooking_percentage", 0)
                },
                "price_settings": {
                    "min_floor": settings.get("min_price_floor", 0),
                    "round_to": settings.get("round_prices_to", 1)
                },
                "config_synced_at": datetime.utcnow().isoformat()
            }},
            upsert=True
        )
        
        # Update pricing calendar with new base prices
        calendar = await db.rms_pricing_calendar.find_one({"hotel_id": hotel_id})
        if calendar and calendar.get("days"):
            updates = {}
            for date_str, day_data in calendar["days"].items():
                if not day_data.get("is_manually_locked"):
                    # Update base price (but keep the manual final price if set)
                    updates[f"days.{date_str}.base_price"] = new_base_adr
            
            if updates:
                await db.rms_pricing_calendar.update_one(
                    {"hotel_id": hotel_id},
                    {"$set": updates}
                )
        
        return {
            "status": "success",
            "message": "RMS synchronized with Configuration module",
            "updates": {
                "base_adr": new_base_adr,
                "room_types_synced": len(room_type_prices),
                "rate_plans_in_matrix": len(pricing_matrix)
            },
            "synced_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/hotels/{hotel_id}/room-types-from-config")
async def get_room_types_from_config(
    hotel_id: str,
    db=Depends(get_db)
):
    """
    Get room types directly from Configuration module.
    Use this for dropdowns and selection lists in RMS UI.
    """
    if not HAS_CONFIG_SERVICE:
        # Fallback to hardcoded room types
        return {
            "hotel_id": hotel_id,
            "source": "fallback",
            "room_types": [
                {"code": "STD", "name": "Standard", "base_price": 120},
                {"code": "SUP", "name": "Supérieure", "base_price": 160},
                {"code": "DLX", "name": "Deluxe", "base_price": 220},
                {"code": "STE", "name": "Suite", "base_price": 350}
            ]
        }
    
    try:
        config_service = get_config_service()
        room_types = await config_service.get_room_types(hotel_id, include_room_count=True)
        
        return {
            "hotel_id": hotel_id,
            "source": "configuration_module",
            "room_types": [
                {
                    "id": rt["id"],
                    "code": rt["code"],
                    "name": rt["name"],
                    "base_price": rt.get("base_price", 100),
                    "room_count": rt.get("room_count", 0)
                }
                for rt in room_types
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/webhooks/receive")
async def receive_webhook(
    payload: WebhookPayload,
    background_tasks: BackgroundTasks,
    db=Depends(get_db)
):
    """
    Receive webhooks from external services (Lighthouse, D-EDGE, PMS)
    """
    # Log webhook
    await db.rms_webhook_logs.insert_one({
        "source": payload.source,
        "event_type": payload.event_type,
        "timestamp": payload.timestamp.isoformat(),
        "data": payload.data,
        "received_at": datetime.utcnow().isoformat()
    })
    
    # Process based on event type
    if payload.event_type == "rate_change":
        # Competitor rate change - might trigger recalculation
        pass
    elif payload.event_type == "booking_created":
        # New booking - update occupancy
        pass
    elif payload.event_type == "demand_update":
        # Demand forecast updated
        pass
    
    return {"status": "received", "event_type": payload.event_type}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def _generate_default_calendar(
    hotel_id: str,
    from_date: str,
    to_date: str,
    db
) -> Dict:
    """Generate default pricing calendar"""
    days = {}
    start = datetime.strptime(from_date, "%Y-%m-%d")
    end = datetime.strptime(to_date, "%Y-%m-%d")
    
    # Get base price from hotel or default
    base_adr = 180  # Default ADR
    
    current = start
    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        dow = current.weekday()
        
        # Apply day of week factor
        dow_factor = {0: 0.9, 1: 0.92, 2: 0.95, 3: 1.0, 4: 1.1, 5: 1.2, 6: 1.05}[dow]
        
        # Apply seasonality
        month = current.month
        season_factor = {
            1: 0.8, 2: 0.85, 3: 0.9, 4: 0.95, 5: 1.0, 6: 1.1,
            7: 1.2, 8: 1.2, 9: 1.05, 10: 0.95, 11: 0.85, 12: 1.0
        }[month]
        
        price = round(base_adr * dow_factor * season_factor, 0)
        
        # Estimate occupancy
        base_occ = 70 * season_factor
        if dow >= 4:  # Weekend
            base_occ += 10
        
        days[date_str] = {
            "date": date_str,
            "base_price": price,
            "final_price": price,
            "occupancy_forecast": min(95, max(30, base_occ + (dow * 2))),
            "demand_level": "high" if dow >= 4 else "medium",
            "is_event_day": False,
            "is_manually_locked": False,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        current += timedelta(days=1)
    
    calendar = {
        "hotel_id": hotel_id,
        "days": days,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Save to DB
    await db.rms_pricing_calendar.update_one(
        {"hotel_id": hotel_id},
        {"$set": calendar},
        upsert=True
    )
    
    return calendar


async def _execute_engine(
    hotel_id: str,
    run_id: str,
    config: Dict,
    db
) -> Dict:
    """Execute the pricing engine"""
    import time
    start_time = time.time()
    
    # Initialize engine
    engine = PricingEngine(hotel_id)
    
    # Get strategy
    strategy_config = config.get("strategy_config", {})
    active_strategy_type = strategy_config.get("active_strategy", "balanced")
    strategies = strategy_config.get("strategies", [])
    
    active_strategy = None
    for s in strategies:
        if s.get("strategy_type") == active_strategy_type:
            active_strategy = Strategy(**s)
            break
    
    if not active_strategy:
        default_strategies = get_default_strategies()
        active_strategy = next((s for s in default_strategies if s.strategy_type.value == active_strategy_type), default_strategies[1])
    
    # Get weights
    weights = {
        f["factor_id"]: f["value"] / 100
        for f in config.get("weight_config", {}).get("factors", [])
    }
    if not weights:
        weights = {"demand": 0.25, "competition": 0.20, "events": 0.15, "seasonality": 0.20, "historical": 0.20}
    
    # Get market data
    lighthouse_config = LighthouseConfig(**config.get("connector_config", {}).get("lighthouse", {}))
    lighthouse = create_lighthouse_connector(lighthouse_config)
    
    from_date = datetime.utcnow().strftime("%Y-%m-%d")
    competitor_rates = await lighthouse.get_competitor_rates(from_date, shop_length=90)
    demand_data = await lighthouse.get_market_demand(num_days=90)
    
    # Get PMS data
    pms_config = type('obj', (object,), config.get("connector_config", {}).get("pms", {"enabled": True}))()
    pms = create_pms_connector(pms_config, db)
    pms_kpis = await pms.get_current_kpis(hotel_id)
    historical = await pms.get_historical_data(hotel_id)
    
    # Calculate pricing for next 90 days
    pricing_results = []
    current_prices = {}
    
    # Get current calendar
    calendar = await db.rms_pricing_calendar.find_one({"hotel_id": hotel_id})
    if calendar:
        current_prices = {k: v.get("final_price", v.get("base_price", 180)) for k, v in calendar.get("days", {}).items()}
    
    for day_offset in range(90):
        calc_date = datetime.utcnow() + timedelta(days=day_offset)
        date_str = calc_date.strftime("%Y-%m-%d")
        
        # Find demand for this date
        day_demand = next((d for d in demand_data if d.date == date_str), None)
        
        # Get historical occupancy for this lead time
        hist_occ = 70  # Default
        if historical.get("history"):
            hist_occ = historical["history"][0].get("occupancy_avg", 70)
        
        result = engine.calculate_optimal_price(
            date_str=date_str,
            historical_adr=pms_kpis.get("adr", 180),
            demand_data=day_demand,
            competitor_rates=competitor_rates,
            current_occupancy=pms_kpis.get("occupancy_pct", 70),
            historical_occupancy=hist_occ,
            is_event_day=False,  # Would check events calendar
            event_importance=1.0,
            strategy=active_strategy,
            weights=weights
        )
        
        pricing_results.append(result)
    
    # Generate recommendations
    recommendations = engine.generate_recommendations(
        hotel_id=hotel_id,
        pricing_results=pricing_results,
        current_prices=current_prices,
        engine_run_id=run_id
    )
    
    # Save recommendations
    for rec in recommendations:
        await db.rms_recommendations.insert_one(rec.dict())
    
    # Auto-apply if autopilot enabled
    autopilot_enabled = strategy_config.get("autopilot_enabled", False)
    autopilot_threshold = strategy_config.get("autopilot_confidence_threshold", 0.75)
    auto_applied = 0
    
    if autopilot_enabled:
        for rec in recommendations:
            if rec.confidence_score >= autopilot_threshold:
                # Check price change limit
                for change in rec.price_changes:
                    if abs(change.change_percentage) <= strategy_config.get("autopilot_max_price_change_pct", 0.15) * 100:
                        # Auto-apply
                        await db.rms_recommendations.update_one(
                            {"id": rec.id},
                            {"$set": {
                                "status": "auto_applied",
                                "applied_at": datetime.utcnow().isoformat(),
                                "applied_by": "autopilot"
                            }}
                        )
                        auto_applied += 1
    
    # Update pricing calendar with new recommendations
    pricing_updates = {}
    for result in pricing_results:
        date_str = result["date"]
        pricing_updates[date_str] = {
            "date": date_str,
            "base_price": result["base_price"],
            "recommended_price": result["final_price"],
            "final_price": current_prices.get(date_str, result["final_price"]),
            "occupancy_forecast": 70,  # Would come from actual forecast
            "demand_level": result["demand_level"],
            "updated_at": datetime.utcnow().isoformat()
        }
    
    # Update calendar in DB
    for date_str, pricing in pricing_updates.items():
        await db.rms_pricing_calendar.update_one(
            {"hotel_id": hotel_id},
            {"$set": {f"days.{date_str}": pricing}},
            upsert=True
        )
    
    calculation_time = int((time.time() - start_time) * 1000)
    
    # Calculate summary KPIs
    avg_price_change = sum(r["price_change_pct"] for r in pricing_results) / len(pricing_results) if pricing_results else 0
    
    return {
        "recommendations": recommendations,
        "pricing_updates": pricing_updates,
        "kpis": {
            "revpar": pms_kpis.get("revpar", 0),
            "adr": pms_kpis.get("adr", 0),
            "occupancy": pms_kpis.get("occupancy_pct", 0),
            "avg_price_change_pct": round(avg_price_change, 2),
            "recommendations_count": len(recommendations),
            "auto_applied": auto_applied
        },
        "analysis_summary": f"Analyse complète de {len(pricing_results)} jours. {len(recommendations)} recommandations générées. {auto_applied} appliquées automatiquement.",
        "calculation_time_ms": calculation_time
    }
