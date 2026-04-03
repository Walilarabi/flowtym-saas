"""
Flowtym — Module Groups & Séminaires + Simulation & Offres
Backend FastAPI (MongoDB Motor)

Endpoints :
  Groups & Séminaires
    GET    /hotels/{h}/groups                        — liste allotements
    POST   /hotels/{h}/groups                        — créer allotement
    GET    /hotels/{h}/groups/{id}                   — détail
    PUT    /hotels/{h}/groups/{id}                   — modifier
    DELETE /hotels/{h}/groups/{id}                   — supprimer
    GET    /hotels/{h}/groups/{id}/rooming-list       — rooming list
    POST   /hotels/{h}/groups/{id}/rooming-list       — ajouter chambre
    PUT    /hotels/{h}/groups/{id}/rooming-list/{rid} — modifier entrée
    DELETE /hotels/{h}/groups/{id}/rooming-list/{rid} — supprimer entrée
    POST   /hotels/{h}/groups/{id}/rooming-list/import-csv — importer CSV
    GET    /hotels/{h}/groups/stats                  — stats

  Simulation & Offres (Devis)
    GET    /hotels/{h}/quotes                        — liste devis
    POST   /hotels/{h}/quotes                        — créer devis
    GET    /hotels/{h}/quotes/{id}                   — détail
    PUT    /hotels/{h}/quotes/{id}                   — modifier
    POST   /hotels/{h}/quotes/{id}/send              — envoyer par email
    POST   /hotels/{h}/quotes/{id}/convert           — convertir en réservation
    POST   /hotels/{h}/quotes/{id}/duplicate         — dupliquer
    GET    /hotels/{h}/quotes/stats                  — stats conversion
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date
import uuid
import jwt
import os
import csv
import io

groups_router = APIRouter()
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

class GroupAllocationCreate(BaseModel):
    group_name: str
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    block_start: str                      # YYYY-MM-DD
    block_end: str
    rooms_blocked: int
    room_type_code: Optional[str] = None
    rate_per_room: Optional[float] = None
    notes: Optional[str] = None
    status: str = "tentative"             # tentative | confirmed | cancelled


class GroupAllocationUpdate(BaseModel):
    group_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    block_start: Optional[str] = None
    block_end: Optional[str] = None
    rooms_blocked: Optional[int] = None
    rooms_released: Optional[int] = None
    rate_per_room: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class RoomingListEntry(BaseModel):
    guest_name: str
    room_number: Optional[str] = None
    room_type_code: Optional[str] = None
    check_in: str
    check_out: str
    adults: int = 1
    children: int = 0
    notes: Optional[str] = None


class QuoteCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_company: Optional[str] = None
    room_type_code: str
    check_in: str
    check_out: str
    adults: int = 2
    children: int = 0
    rate_plan_code: Optional[str] = "BAR"
    extras: List[Dict[str, Any]] = []     # [{name, unit_price, qty}]
    discount_pct: float = 0.0
    notes: Optional[str] = None
    valid_until: Optional[str] = None     # date d'expiration du devis


class QuoteUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    room_type_code: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    adults: Optional[int] = None
    extras: Optional[List[Dict[str, Any]]] = None
    discount_pct: Optional[float] = None
    notes: Optional[str] = None
    valid_until: Optional[str] = None
    status: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _nights(check_in: str, check_out: str) -> int:
    try:
        d1 = datetime.strptime(check_in, "%Y-%m-%d")
        d2 = datetime.strptime(check_out, "%Y-%m-%d")
        return max(1, (d2 - d1).days)
    except Exception:
        return 1


async def _get_room_type_price(db, hotel_id: str, room_type_code: str) -> float:
    """Récupère le prix de base depuis ConfigService ou config_room_types."""
    try:
        from shared.config_service import get_config_service
        config = get_config_service()
        rt = await config.get_room_type_by_code(hotel_id, room_type_code)
        if rt:
            return float(rt.get("base_price", rt.get("price", 100)))
    except Exception:
        pass
    # Fallback sur collection legacy
    rt = await db.room_types.find_one({"hotel_id": hotel_id, "code": room_type_code}, {"_id": 0})
    if rt:
        return float(rt.get("base_price", rt.get("price", 100)))
    return 100.0


def _compute_quote_total(base_price: float, nights: int, adults: int,
                          extras: list, discount_pct: float) -> Dict[str, float]:
    rooms_total = base_price * nights
    extras_total = sum(float(e.get("unit_price", 0)) * int(e.get("qty", 1)) for e in extras)
    subtotal = rooms_total + extras_total
    discount_amt = subtotal * (discount_pct / 100)
    total = subtotal - discount_amt
    return {
        "rooms_total": round(rooms_total, 2),
        "extras_total": round(extras_total, 2),
        "subtotal": round(subtotal, 2),
        "discount_amount": round(discount_amt, 2),
        "total_amount": round(total, 2),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# GROUPS & SÉMINAIRES
# ═══════════════════════════════════════════════════════════════════════════════

@groups_router.get("/hotels/{hotel_id}/groups")
async def list_group_allocations(
    hotel_id: str,
    db,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Liste les allotements groupes d'un hôtel."""
    verify_token(credentials)
    query: Dict[str, Any] = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    if from_date:
        query["block_start"] = {"$gte": from_date}
    if to_date:
        query.setdefault("block_end", {})
        query["block_end"]["$lte"] = to_date

    groups = await db.group_allocations.find(query, {"_id": 0}) \
        .sort("block_start", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.group_allocations.count_documents(query)

    return {"groups": groups, "total": total, "offset": offset, "limit": limit}


@groups_router.post("/hotels/{hotel_id}/groups", status_code=201)
async def create_group_allocation(
    hotel_id: str,
    data: GroupAllocationCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Crée un allotement groupe."""
    verify_token(credentials)
    now = datetime.now(timezone.utc).isoformat()
    nights = _nights(data.block_start, data.block_end)

    doc = {
        "id": str(uuid.uuid4()),
        "hotel_id": hotel_id,
        **data.model_dump(),
        "rooms_released": 0,
        "nights": nights,
        "total_rooms_revenue": round(
            (data.rate_per_room or 0) * data.rooms_blocked * nights, 2
        ),
        "created_at": now,
        "updated_at": now,
    }
    await db.group_allocations.insert_one(doc)
    doc.pop("_id", None)
    return doc


@groups_router.get("/hotels/{hotel_id}/groups/stats")
async def get_groups_stats(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """KPIs des groupes : total allotements, CA estimé, taux confirmation."""
    verify_token(credentials)
    pipeline = [
        {"$match": {"hotel_id": hotel_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "rooms": {"$sum": "$rooms_blocked"},
            "revenue": {"$sum": "$total_rooms_revenue"},
        }},
    ]
    by_status = await db.group_allocations.aggregate(pipeline).to_list(20)
    stats = {s["_id"]: {"count": s["count"], "rooms": s["rooms"], "revenue": s["revenue"]}
             for s in by_status}
    total = sum(s["count"] for s in by_status)
    confirmed = stats.get("confirmed", {}).get("count", 0)
    return {
        "hotel_id": hotel_id,
        "total_groups": total,
        "confirmed": stats.get("confirmed", {}),
        "tentative": stats.get("tentative", {}),
        "cancelled": stats.get("cancelled", {}),
        "confirmation_rate": round(confirmed / max(total, 1) * 100, 1),
    }


@groups_router.get("/hotels/{hotel_id}/groups/{group_id}")
async def get_group(
    hotel_id: str, group_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    group = await db.group_allocations.find_one(
        {"id": group_id, "hotel_id": hotel_id}, {"_id": 0}
    )
    if not group:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    # Injecter le rooming list
    rooming = await db.group_rooming_list.find(
        {"group_id": group_id}, {"_id": 0}
    ).sort("check_in", 1).to_list(500)
    group["rooming_list"] = rooming
    group["rooming_count"] = len(rooming)
    return group


@groups_router.put("/hotels/{hotel_id}/groups/{group_id}")
async def update_group(
    hotel_id: str, group_id: str, data: GroupAllocationUpdate, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune donnée à modifier")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.group_allocations.update_one(
        {"id": group_id, "hotel_id": hotel_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    return {"message": "Groupe mis à jour", "group_id": group_id}


@groups_router.delete("/hotels/{hotel_id}/groups/{group_id}")
async def delete_group(
    hotel_id: str, group_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    result = await db.group_allocations.delete_one({"id": group_id, "hotel_id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    await db.group_rooming_list.delete_many({"group_id": group_id})
    return {"message": "Groupe supprimé"}


# ── Rooming List ──────────────────────────────────────────────────────────────

@groups_router.get("/hotels/{hotel_id}/groups/{group_id}/rooming-list")
async def get_rooming_list(
    hotel_id: str, group_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    entries = await db.group_rooming_list.find(
        {"group_id": group_id}, {"_id": 0}
    ).sort("guest_name", 1).to_list(500)
    return {"group_id": group_id, "entries": entries, "total": len(entries)}


@groups_router.post("/hotels/{hotel_id}/groups/{group_id}/rooming-list", status_code=201)
async def add_rooming_entry(
    hotel_id: str, group_id: str, entry: RoomingListEntry, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    # Vérifier que le groupe existe
    group = await db.group_allocations.find_one({"id": group_id, "hotel_id": hotel_id})
    if not group:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "hotel_id": hotel_id,
        **entry.model_dump(),
        "nights": _nights(entry.check_in, entry.check_out),
        "created_at": now,
    }
    await db.group_rooming_list.insert_one(doc)
    doc.pop("_id", None)
    return doc


@groups_router.put("/hotels/{hotel_id}/groups/{group_id}/rooming-list/{entry_id}")
async def update_rooming_entry(
    hotel_id: str, group_id: str, entry_id: str, updates: Dict[str, Any], db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    updates.pop("id", None)
    updates.pop("group_id", None)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.group_rooming_list.update_one(
        {"id": entry_id, "group_id": group_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    return {"message": "Entrée mise à jour"}


@groups_router.delete("/hotels/{hotel_id}/groups/{group_id}/rooming-list/{entry_id}")
async def delete_rooming_entry(
    hotel_id: str, group_id: str, entry_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    result = await db.group_rooming_list.delete_one({"id": entry_id, "group_id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    return {"message": "Entrée supprimée"}


@groups_router.post("/hotels/{hotel_id}/groups/{group_id}/rooming-list/import-csv")
async def import_rooming_csv(
    hotel_id: str, group_id: str, db,
    csv_content: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Importe une rooming list depuis CSV.
    Colonnes attendues : guest_name, room_number, check_in, check_out, adults, children, notes
    """
    verify_token(credentials)
    group = await db.group_allocations.find_one({"id": group_id, "hotel_id": hotel_id})
    if not group:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")

    reader = csv.DictReader(io.StringIO(csv_content))
    now = datetime.now(timezone.utc).isoformat()
    created = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            doc = {
                "id": str(uuid.uuid4()),
                "group_id": group_id,
                "hotel_id": hotel_id,
                "guest_name": row.get("guest_name", "").strip(),
                "room_number": row.get("room_number", "").strip() or None,
                "check_in": row.get("check_in", group["block_start"]).strip(),
                "check_out": row.get("check_out", group["block_end"]).strip(),
                "adults": int(row.get("adults", 1)),
                "children": int(row.get("children", 0)),
                "notes": row.get("notes", "").strip() or None,
                "nights": _nights(
                    row.get("check_in", group["block_start"]),
                    row.get("check_out", group["block_end"]),
                ),
                "created_at": now,
            }
            if not doc["guest_name"]:
                errors.append({"row": i, "error": "guest_name vide"})
                continue
            await db.group_rooming_list.insert_one(doc)
            created += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return {
        "message": f"{created} entrée(s) importée(s)",
        "created": created,
        "errors": errors,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SIMULATION & OFFRES (DEVIS / PROFORMA)
# ═══════════════════════════════════════════════════════════════════════════════

@groups_router.get("/hotels/{hotel_id}/quotes")
async def list_quotes(
    hotel_id: str,
    db,
    status: Optional[str] = None,
    client_name: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Liste les devis d'un hôtel."""
    verify_token(credentials)
    query: Dict[str, Any] = {"hotel_id": hotel_id}
    if status:
        query["status"] = status
    if client_name:
        query["client_name"] = {"$regex": client_name, "$options": "i"}

    quotes = await db.quotes.find(query, {"_id": 0}) \
        .sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.quotes.count_documents(query)
    return {"quotes": quotes, "total": total, "offset": offset, "limit": limit}


@groups_router.post("/hotels/{hotel_id}/quotes", status_code=201)
async def create_quote(
    hotel_id: str,
    data: QuoteCreate,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Crée un devis avec calcul automatique du total."""
    verify_token(credentials)
    now = datetime.now(timezone.utc).isoformat()
    nights = _nights(data.check_in, data.check_out)

    # Prix de base depuis ConfigService
    base_price = await _get_room_type_price(db, hotel_id, data.room_type_code)
    pricing = _compute_quote_total(base_price, nights, data.adults, data.extras, data.discount_pct)

    # Numéro de devis lisible
    count = await db.quotes.count_documents({"hotel_id": hotel_id})
    quote_number = f"DEV-{datetime.now().year}-{count + 1:04d}"

    doc = {
        "id": str(uuid.uuid4()),
        "quote_number": quote_number,
        "hotel_id": hotel_id,
        **data.model_dump(),
        "base_price_per_night": base_price,
        "nights": nights,
        **pricing,
        "status": "draft",              # draft | sent | converted | expired | cancelled
        "reservation_id": None,
        "sent_at": None,
        "converted_at": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.quotes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@groups_router.get("/hotels/{hotel_id}/quotes/stats")
async def get_quotes_stats(
    hotel_id: str,
    db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """KPIs devis : taux de conversion, CA potentiel, délai moyen."""
    verify_token(credentials)
    pipeline = [
        {"$match": {"hotel_id": hotel_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_revenue": {"$sum": "$total_amount"},
        }},
    ]
    by_status = await db.quotes.aggregate(pipeline).to_list(10)
    stats = {s["_id"]: {"count": s["count"], "revenue": s["total_revenue"]} for s in by_status}
    total = sum(s["count"] for s in by_status)
    converted = stats.get("converted", {}).get("count", 0)
    sent = stats.get("sent", {}).get("count", 0)
    return {
        "hotel_id": hotel_id,
        "total_quotes": total,
        "conversion_rate": round(converted / max(sent + converted, 1) * 100, 1),
        "by_status": stats,
        "potential_revenue": round(
            sum(s.get("revenue", 0) for k, s in stats.items() if k in ("draft", "sent")), 2
        ),
    }


@groups_router.get("/hotels/{hotel_id}/quotes/{quote_id}")
async def get_quote(
    hotel_id: str, quote_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    quote = await db.quotes.find_one({"id": quote_id, "hotel_id": hotel_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return quote


@groups_router.put("/hotels/{hotel_id}/quotes/{quote_id}")
async def update_quote(
    hotel_id: str, quote_id: str, data: QuoteUpdate, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    verify_token(credentials)
    existing = await db.quotes.find_one({"id": quote_id, "hotel_id": hotel_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}

    # Recalculer le total si des champs tarifaires changent
    recalc_fields = {"room_type_code", "check_in", "check_out", "extras", "discount_pct"}
    if recalc_fields & set(updates.keys()):
        ci = updates.get("check_in", existing["check_in"])
        co = updates.get("check_out", existing["check_out"])
        rt = updates.get("room_type_code", existing["room_type_code"])
        extras = updates.get("extras", existing.get("extras", []))
        disc = updates.get("discount_pct", existing.get("discount_pct", 0))
        nights = _nights(ci, co)
        base = await _get_room_type_price(db, hotel_id, rt)
        pricing = _compute_quote_total(base, nights, existing.get("adults", 2), extras, disc)
        updates.update({"nights": nights, "base_price_per_night": base, **pricing})

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.quotes.update_one({"id": quote_id}, {"$set": updates})
    return {"message": "Devis mis à jour", "quote_id": quote_id}


@groups_router.post("/hotels/{hotel_id}/quotes/{quote_id}/send")
async def send_quote(
    hotel_id: str, quote_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Marque le devis comme envoyé (envoi email géré côté frontend / webhook)."""
    verify_token(credentials)
    now = datetime.now(timezone.utc).isoformat()
    result = await db.quotes.update_one(
        {"id": quote_id, "hotel_id": hotel_id, "status": {"$in": ["draft", "sent"]}},
        {"$set": {"status": "sent", "sent_at": now, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé ou déjà converti")
    return {"message": "Devis marqué comme envoyé", "sent_at": now}


@groups_router.post("/hotels/{hotel_id}/quotes/{quote_id}/convert")
async def convert_quote_to_reservation(
    hotel_id: str, quote_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Convertit le devis en réservation réelle."""
    verify_token(credentials)
    quote = await db.quotes.find_one({"id": quote_id, "hotel_id": hotel_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    if quote.get("status") == "converted":
        raise HTTPException(status_code=400, detail="Devis déjà converti")

    now = datetime.now(timezone.utc).isoformat()

    # Créer la réservation
    reservation_id = str(uuid.uuid4())
    reservation = {
        "id": reservation_id,
        "hotel_id": hotel_id,
        "quote_id": quote_id,
        "quote_number": quote.get("quote_number"),
        "guest_name": quote["client_name"],
        "guest_email": quote.get("client_email"),
        "guest_phone": quote.get("client_phone"),
        "room_type": quote["room_type_code"],
        "check_in": quote["check_in"],
        "check_out": quote["check_out"],
        "adults": quote.get("adults", 2),
        "children": quote.get("children", 0),
        "total_price": quote.get("total_amount", 0),
        "rate_plan": quote.get("rate_plan_code", "BAR"),
        "channel": "direct",
        "status": "confirmed",
        "source": "quote_conversion",
        "notes": quote.get("notes"),
        "created_at": now,
        "updated_at": now,
    }
    await db.reservations.insert_one(reservation)

    # Mettre à jour le devis
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "status": "converted",
            "reservation_id": reservation_id,
            "converted_at": now,
            "updated_at": now,
        }},
    )
    reservation.pop("_id", None)
    return {
        "message": "Devis converti en réservation",
        "reservation_id": reservation_id,
        "reservation": reservation,
    }


@groups_router.post("/hotels/{hotel_id}/quotes/{quote_id}/duplicate")
async def duplicate_quote(
    hotel_id: str, quote_id: str, db,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Duplique un devis (statut → draft, nouveau numéro)."""
    verify_token(credentials)
    original = await db.quotes.find_one({"id": quote_id, "hotel_id": hotel_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    now = datetime.now(timezone.utc).isoformat()
    count = await db.quotes.count_documents({"hotel_id": hotel_id})
    new_doc = {
        **original,
        "id": str(uuid.uuid4()),
        "quote_number": f"DEV-{datetime.now().year}-{count + 1:04d}",
        "status": "draft",
        "reservation_id": None,
        "sent_at": None,
        "converted_at": None,
        "created_at": now,
        "updated_at": now,
    }
    new_doc.pop("_id", None)
    await db.quotes.insert_one(new_doc)
    new_doc.pop("_id", None)
    return new_doc
