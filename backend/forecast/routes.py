"""
Flowtym — Module Prévisions (Budget & Forecast)
Revenue Priority 2 — Pilotage tarifaire

Endpoints :
  GET    /hotels/{h}/forecasts                  — liste des prévisions
  GET    /hotels/{h}/forecasts/{year}/{month}   — mois spécifique
  PUT    /hotels/{h}/forecasts/{year}/{month}   — saisir/mettre à jour budget
  GET    /hotels/{h}/forecasts/stats            — synthèse annuelle
  POST   /hotels/{h}/forecasts/generate         — générer forecast auto (N+1, N+2)
  GET    /hotels/{h}/forecasts/export           — export CSV
  GET    /hotels/{h}/dynamic-pricing            — règles de prix dynamiques
  POST   /hotels/{h}/dynamic-pricing            — créer une règle
  PUT    /hotels/{h}/dynamic-pricing/{id}       — modifier
  DELETE /hotels/{h}/dynamic-pricing/{id}       — supprimer
  POST   /hotels/{h}/dynamic-pricing/simulate   — simuler l'impact
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date
import uuid, jwt, os, io, csv

forecast_router = APIRouter()
security = HTTPBearer()

JWT_SECRET = os.environ.get("JWT_SECRET", "flowtym-secret-key-2024")


# ── Auth ──────────────────────────────────────────────────────────────────────

def verify_token(credentials: HTTPAuthorizationCredentials):
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


# ── Models ────────────────────────────────────────────────────────────────────

class ForecastUpdate(BaseModel):
    """Saisie / mise à jour d'un mois de prévision."""
    budget_revenue: Optional[float] = None
    budget_occupation: Optional[float] = None   # %
    budget_adr: Optional[float] = None
    forecast_revenue: Optional[float] = None
    forecast_occupation: Optional[float] = None
    forecast_adr: Optional[float] = None
    notes: Optional[str] = None


class ForecastGenerate(BaseModel):
    """Paramètres de génération automatique du forecast."""
    year: int
    months: List[int] = list(range(1, 13))      # tous les mois par défaut
    base_occupation: float = 70.0               # % de base
    growth_rate: float = 3.0                    # % de croissance annuelle
    base_adr: float = 120.0
    seasonality: Dict[int, float] = {           # coefficients saisonniers
        1: 0.70, 2: 0.75, 3: 0.85, 4: 0.90,
        5: 0.95, 6: 1.00, 7: 1.20, 8: 1.25,
        9: 1.05, 10: 0.95, 11: 0.80, 12: 0.85,
    }


class DynamicPricingRule(BaseModel):
    room_type_code: str
    rule_name: str
    occupancy_threshold: int = Field(..., ge=0, le=100)  # si occupation > X%
    multiplier: float = Field(..., ge=0.5, le=5.0)       # ex: 1.20 = +20%
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    is_active: bool = True
    applies_to_days: List[int] = []   # 0=lun…6=dim; vide=tous


class DynamicPricingUpdate(BaseModel):
    rule_name: Optional[str] = None
    occupancy_threshold: Optional[int] = None
    multiplier: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    is_active: Optional[bool] = None
    applies_to_days: Optional[List[int]] = None


class SimulateRequest(BaseModel):
    base_price: float
    current_occupation: float        # %
    day_of_week: Optional[int] = None   # 0=lun


# ── Helpers ───────────────────────────────────────────────────────────────────

def _variance(actual: Optional[float], budget: Optional[float]) -> Optional[float]:
    if actual is None or budget is None or budget == 0:
        return None
    return round((actual - budget) / budget * 100, 1)


def _apply_rule(rule: dict, base_price: float, occupation: float,
                day_of_week: Optional[int]) -> float:
    if not rule.get("is_active", True):
        return base_price
    days = rule.get("applies_to_days", [])
    if days and day_of_week is not None and day_of_week not in days:
        return base_price
    if occupation >= rule["occupancy_threshold"]:
        price = base_price * rule["multiplier"]
        if rule.get("min_price"):
            price = max(price, rule["min_price"])
        if rule.get("max_price"):
            price = min(price, rule["max_price"])
        return round(price, 2)
    return base_price


# ═══════════════════════════════════════════════════════════════════════════════
# PRÉVISIONS (BUDGET & FORECAST)
# ═══════════════════════════════════════════════════════════════════════════════

@forecast_router.get("/hotels/{hotel_id}/forecasts")
async def list_forecasts(
    hotel_id: str, db,
    year: Optional[int] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Liste toutes les prévisions d'un hôtel (par défaut : année en cours)."""
    verify_token(credentials)
    year = year or datetime.now().year
    docs = await db.forecasts.find(
        {"hotel_id": hotel_id, "year": year}, {"_id": 0}
    ).sort("month", 1).to_list(12)

    # Compléter les mois manquants avec des 0
    existing = {d["month"]: d for d in docs}
    result = []
    for m in range(1, 13):
        if m in existing:
            result.append(existing[m])
        else:
            result.append({
                "hotel_id": hotel_id, "year": year, "month": m,
                "budget_revenue": None, "budget_occupation": None, "budget_adr": None,
                "forecast_revenue": None, "forecast_occupation": None, "forecast_adr": None,
                "actual_revenue": None, "actual_occupation": None, "actual_adr": None,
                "variance_revenue": None, "variance_occupation": None,
                "notes": None,
            })
    return {"year": year, "hotel_id": hotel_id, "months": result}


@forecast_router.get("/hotels/{hotel_id}/forecasts/stats")
async def get_forecast_stats(
    hotel_id: str, db,
    year: Optional[int] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Synthèse annuelle : CA total budget vs actual, taux occupation moyen."""
    verify_token(credentials)
    year = year or datetime.now().year
    docs = await db.forecasts.find(
        {"hotel_id": hotel_id, "year": year}, {"_id": 0}
    ).to_list(12)

    total_budget_rev = sum(d.get("budget_revenue") or 0 for d in docs)
    total_actual_rev = sum(d.get("actual_revenue") or 0 for d in docs)
    total_forecast_rev = sum(d.get("forecast_revenue") or 0 for d in docs)
    avg_budget_occ = (
        sum(d.get("budget_occupation") or 0 for d in docs if d.get("budget_occupation")) /
        max(sum(1 for d in docs if d.get("budget_occupation")), 1)
    )
    avg_actual_occ = (
        sum(d.get("actual_occupation") or 0 for d in docs if d.get("actual_occupation")) /
        max(sum(1 for d in docs if d.get("actual_occupation")), 1)
    )

    return {
        "year": year,
        "hotel_id": hotel_id,
        "months_with_data": len(docs),
        "budget": {
            "total_revenue": round(total_budget_rev, 2),
            "avg_occupation": round(avg_budget_occ, 1),
        },
        "actual": {
            "total_revenue": round(total_actual_rev, 2),
            "avg_occupation": round(avg_actual_occ, 1),
        },
        "forecast": {
            "total_revenue": round(total_forecast_rev, 2),
        },
        "variance_revenue_pct": _variance(total_actual_rev, total_budget_rev),
        "variance_occupation_pct": _variance(avg_actual_occ, avg_budget_occ),
    }


@forecast_router.get("/hotels/{hotel_id}/forecasts/{year}/{month}")
async def get_forecast_month(
    hotel_id: str, year: int, month: int, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    doc = await db.forecasts.find_one(
        {"hotel_id": hotel_id, "year": year, "month": month}, {"_id": 0}
    )
    if not doc:
        return {
            "hotel_id": hotel_id, "year": year, "month": month,
            "budget_revenue": None, "budget_occupation": None, "budget_adr": None,
            "forecast_revenue": None, "forecast_occupation": None, "forecast_adr": None,
            "actual_revenue": None, "actual_occupation": None, "actual_adr": None,
        }
    return doc


@forecast_router.put("/hotels/{hotel_id}/forecasts/{year}/{month}")
async def upsert_forecast(
    hotel_id: str, year: int, month: int,
    data: ForecastUpdate, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Crée ou met à jour le budget/forecast d'un mois."""
    verify_token(credentials)
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="Mois invalide (1-12)")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Calculer les variances si actuel et budget sont présents
    existing = await db.forecasts.find_one(
        {"hotel_id": hotel_id, "year": year, "month": month}, {"_id": 0}
    ) or {}
    merged = {**existing, **updates}
    updates["variance_revenue"] = _variance(merged.get("actual_revenue"), merged.get("budget_revenue"))
    updates["variance_occupation"] = _variance(merged.get("actual_occupation"), merged.get("budget_occupation"))

    await db.forecasts.update_one(
        {"hotel_id": hotel_id, "year": year, "month": month},
        {"$set": {"hotel_id": hotel_id, "year": year, "month": month, **updates}},
        upsert=True,
    )
    doc = await db.forecasts.find_one(
        {"hotel_id": hotel_id, "year": year, "month": month}, {"_id": 0}
    )
    return doc


@forecast_router.post("/hotels/{hotel_id}/forecasts/generate")
async def generate_forecast(
    hotel_id: str, params: ForecastGenerate, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Génère automatiquement un forecast pour l'année demandée."""
    verify_token(credentials)
    now = datetime.now(timezone.utc).isoformat()
    created = 0

    for month in params.months:
        coeff = params.seasonality.get(month, 1.0)
        occ = round(min(params.base_occupation * coeff * (1 + params.growth_rate / 100), 100), 1)
        adr = round(params.base_adr * coeff * (1 + params.growth_rate / 100 / 2), 2)
        # Estimation CA : hypothèse 100 chambres × occupation × ADR × nb_jours_mois
        import calendar
        days = calendar.monthrange(params.year, month)[1]
        revenue = round(100 * (occ / 100) * adr * days, 2)

        await db.forecasts.update_one(
            {"hotel_id": hotel_id, "year": params.year, "month": month},
            {"$setOnInsert": {
                "hotel_id": hotel_id, "year": params.year, "month": month,
                "forecast_revenue": revenue, "forecast_occupation": occ, "forecast_adr": adr,
                "budget_revenue": None, "budget_occupation": None, "budget_adr": None,
                "actual_revenue": None, "actual_occupation": None, "actual_adr": None,
                "variance_revenue": None, "variance_occupation": None,
                "created_at": now, "updated_at": now,
            }},
            upsert=True,
        )
        created += 1

    return {
        "message": f"Forecast généré pour {created} mois",
        "year": params.year,
        "months": params.months,
    }


@forecast_router.get("/hotels/{hotel_id}/forecasts/export")
async def export_forecasts_csv(
    hotel_id: str, db,
    year: Optional[int] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Export CSV des prévisions de l'année."""
    verify_token(credentials)
    year = year or datetime.now().year
    docs = await db.forecasts.find(
        {"hotel_id": hotel_id, "year": year}, {"_id": 0}
    ).sort("month", 1).to_list(12)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "year", "month", "budget_revenue", "budget_occupation", "budget_adr",
        "forecast_revenue", "forecast_occupation", "forecast_adr",
        "actual_revenue", "actual_occupation", "actual_adr",
        "variance_revenue", "variance_occupation",
    ])
    writer.writeheader()
    for doc in docs:
        writer.writerow({k: doc.get(k, "") for k in writer.fieldnames})

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.read().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=forecast_{hotel_id}_{year}.csv"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# DYNAMIC PRICING RULES
# ═══════════════════════════════════════════════════════════════════════════════

@forecast_router.get("/hotels/{hotel_id}/dynamic-pricing")
async def list_pricing_rules(
    hotel_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    rules = await db.dynamic_pricing_rules.find(
        {"hotel_id": hotel_id}, {"_id": 0}
    ).sort("occupancy_threshold", -1).to_list(50)
    return {"rules": rules, "total": len(rules)}


@forecast_router.post("/hotels/{hotel_id}/dynamic-pricing", status_code=201)
async def create_pricing_rule(
    hotel_id: str, rule: DynamicPricingRule, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **rule.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    await db.dynamic_pricing_rules.insert_one(doc)
    doc.pop("_id", None)
    return doc


@forecast_router.put("/hotels/{hotel_id}/dynamic-pricing/{rule_id}")
async def update_pricing_rule(
    hotel_id: str, rule_id: str, data: DynamicPricingUpdate, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune donnée")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.dynamic_pricing_rules.update_one(
        {"id": rule_id, "hotel_id": hotel_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    return {"message": "Règle mise à jour", "rule_id": rule_id}


@forecast_router.delete("/hotels/{hotel_id}/dynamic-pricing/{rule_id}")
async def delete_pricing_rule(
    hotel_id: str, rule_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    result = await db.dynamic_pricing_rules.delete_one({"id": rule_id, "hotel_id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    return {"message": "Règle supprimée"}


@forecast_router.post("/hotels/{hotel_id}/dynamic-pricing/simulate")
async def simulate_pricing(
    hotel_id: str, request: SimulateRequest, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Simule l'application de toutes les règles actives sur un prix de base."""
    verify_token(credentials)
    rules = await db.dynamic_pricing_rules.find(
        {"hotel_id": hotel_id, "is_active": True}, {"_id": 0}
    ).to_list(50)

    price = request.base_price
    applied = []
    for rule in sorted(rules, key=lambda r: -r.get("occupancy_threshold", 0)):
        new_price = _apply_rule(rule, price, request.current_occupation, request.day_of_week)
        if new_price != price:
            applied.append({
                "rule_name": rule["rule_name"],
                "threshold": rule["occupancy_threshold"],
                "multiplier": rule["multiplier"],
                "price_before": price,
                "price_after": new_price,
            })
            price = new_price

    return {
        "base_price": request.base_price,
        "final_price": round(price, 2),
        "uplift_pct": round((price - request.base_price) / max(request.base_price, 0.01) * 100, 1),
        "rules_applied": applied,
        "rules_checked": len(rules),
    }
