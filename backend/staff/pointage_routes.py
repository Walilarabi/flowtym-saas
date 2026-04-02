"""
Staff Pointage Routes - Time Clock API
Système de pointage intelligent avec QR Code et intégration planning
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, time
import uuid
import logging
import jwt
import os
import hashlib
import secrets

from .pointage_models import (
    PointageSource, PointageStatus, OvertimeRate,
    PointageCreate, PointageCheckOut, PointageResponse, PointageManualCreate,
    OvertimeValidation, QRCodeConfig, QRCodeResponse,
    PointageStats, EmployeePointageSummary, PayrollExport, PointageAlert
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/staff/pointage", tags=["Staff Pointage"])

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'flowtym-secret-key-2024')
JWT_ALGORITHM = "HS256"

_db = None


def init_pointage_db(database):
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


def check_role_access(user: dict, allowed_roles: List[str]):
    """Check if user has required role"""
    if user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Accès non autorisé")


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_hours_between(start: str, end: str) -> float:
    """Calculate hours between two HH:MM times"""
    try:
        start_parts = start.split(":")
        end_parts = end.split(":")
        start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
        end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
        
        # Handle overnight shifts
        if end_minutes < start_minutes:
            end_minutes += 24 * 60
        
        return (end_minutes - start_minutes) / 60
    except:
        return 0.0


def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM to minutes from midnight"""
    try:
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except:
        return 0


def determine_pointage_status(pointage: dict, planning: Optional[dict], config: dict) -> str:
    """Determine the status of a pointage based on planning comparison"""
    
    if not pointage.get("check_out_time"):
        return PointageStatus.EN_COURS.value
    
    if not planning:
        return PointageStatus.CONFORME.value  # No planning = no comparison
    
    tolerance = config.get("late_tolerance_minutes", 5)
    
    # Check for late arrival
    planned_start = planning.get("start_time")
    actual_start = pointage.get("check_in_time")
    
    if planned_start and actual_start:
        planned_minutes = time_to_minutes(planned_start)
        actual_minutes = time_to_minutes(actual_start.split("T")[-1][:5] if "T" in actual_start else actual_start[:5])
        
        late_minutes = actual_minutes - planned_minutes
        
        if late_minutes > tolerance:
            return PointageStatus.RETARD.value
    
    # Check for overtime
    planned_hours = planning.get("worked_hours", 0)
    actual_hours = pointage.get("total_hours", 0)
    
    if actual_hours and actual_hours > planned_hours + 0.5:  # 30 min threshold
        return PointageStatus.DEPASSEMENT.value
    
    # Check for anomalies (very short or very long shifts)
    if actual_hours and (actual_hours < 1 or actual_hours > 16):
        return PointageStatus.ANOMALIE.value
    
    return PointageStatus.CONFORME.value


async def get_planning_for_employee_date(db, hotel_id: str, employee_id: str, date: str) -> Optional[dict]:
    """Get the planned shift for an employee on a specific date"""
    shift = await db.shifts.find_one({
        "hotel_id": hotel_id,
        "employee_id": employee_id,
        "date": date,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0})
    return shift


async def get_pointage_config(db, hotel_id: str) -> dict:
    """Get or create pointage configuration for hotel"""
    config = await db.pointage_config.find_one({"hotel_id": hotel_id}, {"_id": 0})
    
    if not config:
        # Create default config
        config = {
            "id": str(uuid.uuid4()),
            "hotel_id": hotel_id,
            "qr_code_enabled": True,
            "qr_code_secret": secrets.token_urlsafe(32),
            "geolocation_enabled": False,
            "geolocation_radius_meters": 100,
            "late_tolerance_minutes": 10,
            "manual_pointage_enabled": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.pointage_config.insert_one(config)
    
    return config


# ═══════════════════════════════════════════════════════════════════════════════
# QR CODE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/qr-code", response_model=QRCodeResponse)
async def get_qr_code(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get QR code for hotel pointage - Direction/RH/Admin only"""
    check_role_access(current_user, ["admin", "manager", "super_admin", "receptionist"])
    db = get_db()
    
    config = await get_pointage_config(db, hotel_id)
    
    if not config.get("qr_code_enabled"):
        raise HTTPException(status_code=400, detail="QR Code désactivé pour cet hôtel")
    
    # Build QR code URL for mobile pointage
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://flowtym.com")
    qr_url = f"{base_url}/pointage/mobile?hotel_id={hotel_id}&token={config['qr_code_secret']}"
    
    return QRCodeResponse(
        qr_code_url=qr_url,
        qr_code_data=f"{hotel_id}:{config['qr_code_secret']}",
        qr_code_image_url=None  # Can be generated client-side
    )


@router.post("/hotels/{hotel_id}/qr-code/regenerate")
async def regenerate_qr_code(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Regenerate QR code secret - Admin only"""
    check_role_access(current_user, ["admin", "super_admin"])
    db = get_db()
    
    new_secret = secrets.token_urlsafe(32)
    
    await db.pointage_config.update_one(
        {"hotel_id": hotel_id},
        {"$set": {
            "qr_code_secret": new_secret,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "QR Code régénéré avec succès", "success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# POINTAGE CHECK-IN / CHECK-OUT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/hotels/{hotel_id}/check-in", response_model=PointageResponse)
async def check_in(
    hotel_id: str,
    pointage: PointageCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Pointer l'arrivée d'un employé.
    - Vérifie qu'il n'y a pas de pointage ouvert
    - Enregistre l'heure d'arrivée
    - Lie au planning si existant
    """
    db = get_db()
    
    # Get employee info
    employee = await db.staff_employees.find_one({
        "id": pointage.employee_id,
        "hotel_id": hotel_id,
        "is_active": True
    }, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé ou inactif")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc)
    
    # Check for existing open pointage (no check-out)
    existing_open = await db.staff_pointage.find_one({
        "hotel_id": hotel_id,
        "employee_id": pointage.employee_id,
        "date": today,
        "check_out_time": None
    })
    
    if existing_open:
        raise HTTPException(
            status_code=400, 
            detail="Un pointage est déjà en cours. Veuillez d'abord pointer votre sortie."
        )
    
    # Get planning for comparison
    planning = await get_planning_for_employee_date(db, hotel_id, pointage.employee_id, today)
    config = await get_pointage_config(db, hotel_id)
    
    # Calculate late minutes if planning exists
    retard_minutes = 0
    if planning and planning.get("start_time"):
        planned_minutes = time_to_minutes(planning["start_time"])
        actual_minutes = now.hour * 60 + now.minute
        retard_minutes = max(0, actual_minutes - planned_minutes - config.get("late_tolerance_minutes", 5))
    
    # Create pointage
    pointage_id = str(uuid.uuid4())
    pointage_doc = {
        "id": pointage_id,
        "hotel_id": hotel_id,
        "employee_id": pointage.employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "department": employee.get("department", ""),
        "date": today,
        
        # Check-in
        "check_in_time": now.isoformat(),
        "check_out_time": None,
        "total_hours": None,
        
        # Planning reference
        "planned_start": planning.get("start_time") if planning else None,
        "planned_end": planning.get("end_time") if planning else None,
        "planned_hours": planning.get("worked_hours") if planning else None,
        "shift_id": planning.get("id") if planning else None,
        
        # Écarts
        "ecart_minutes": None,
        "retard_minutes": retard_minutes if retard_minutes > 0 else None,
        
        # Heures sup
        "overtime_hours": None,
        "overtime_validated": False,
        "overtime_rate": None,
        "overtime_validated_by": None,
        "overtime_validated_at": None,
        
        # Metadata
        "source": pointage.source.value,
        "status": PointageStatus.EN_COURS.value,
        "check_in_location": pointage.check_in_location,
        "check_out_location": None,
        
        # Manual info
        "manual_reason": pointage.manual_reason,
        "signature_data": pointage.signature_data,
        "signature_document_url": pointage.signature_document_url,
        
        # Audit
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": current_user.get("user_id")
    }
    
    await db.staff_pointage.insert_one(pointage_doc)
    
    logger.info(f"Check-in recorded: {employee['first_name']} {employee['last_name']} at {now.strftime('%H:%M')}")
    
    return PointageResponse(**pointage_doc)


@router.patch("/hotels/{hotel_id}/pointages/{pointage_id}/check-out", response_model=PointageResponse)
async def check_out(
    hotel_id: str,
    pointage_id: str,
    checkout: PointageCheckOut,
    current_user: dict = Depends(get_current_user)
):
    """
    Pointer la sortie d'un employé.
    - Complète le pointage existant
    - Calcule automatiquement les heures travaillées
    - Calcule l'écart avec le planning
    """
    db = get_db()
    
    # Find existing pointage
    pointage = await db.staff_pointage.find_one({
        "id": pointage_id,
        "hotel_id": hotel_id
    }, {"_id": 0})
    
    if not pointage:
        raise HTTPException(status_code=404, detail="Pointage non trouvé")
    
    if pointage.get("check_out_time"):
        raise HTTPException(status_code=400, detail="Ce pointage est déjà terminé")
    
    now = datetime.now(timezone.utc)
    check_in_time = datetime.fromisoformat(pointage["check_in_time"].replace("Z", "+00:00"))
    
    # Calculate worked hours
    total_hours = (now - check_in_time).total_seconds() / 3600
    
    # Calculate overtime and ecart
    planned_hours = pointage.get("planned_hours") or 0
    overtime_hours = max(0, total_hours - planned_hours) if planned_hours > 0 else 0
    ecart_minutes = int((total_hours - planned_hours) * 60) if planned_hours > 0 else 0
    
    # Get config for status determination
    config = await get_pointage_config(db, hotel_id)
    
    # Update pointage
    update_data = {
        "check_out_time": now.isoformat(),
        "total_hours": round(total_hours, 2),
        "overtime_hours": round(overtime_hours, 2) if overtime_hours > 0 else None,
        "ecart_minutes": ecart_minutes,
        "check_out_location": checkout.check_out_location,
        "updated_at": now.isoformat()
    }
    
    # Add manual info if provided
    if checkout.manual_reason:
        update_data["manual_reason"] = checkout.manual_reason
    if checkout.signature_data:
        update_data["signature_data"] = checkout.signature_data
    if checkout.signature_document_url:
        update_data["signature_document_url"] = checkout.signature_document_url
    if checkout.notes:
        update_data["notes"] = checkout.notes
    
    # Determine status
    updated_pointage = {**pointage, **update_data}
    planning = None
    if pointage.get("shift_id"):
        planning = await db.shifts.find_one({"id": pointage["shift_id"]}, {"_id": 0})
    
    update_data["status"] = determine_pointage_status(updated_pointage, planning, config)
    
    await db.staff_pointage.update_one(
        {"id": pointage_id},
        {"$set": update_data}
    )
    
    # Get updated document
    updated = await db.staff_pointage.find_one({"id": pointage_id}, {"_id": 0})
    
    logger.info(f"Check-out recorded: {pointage['employee_name']} - {round(total_hours, 2)}h worked")
    
    return PointageResponse(**updated)


@router.post("/hotels/{hotel_id}/check-out/employee/{employee_id}", response_model=PointageResponse)
async def check_out_by_employee(
    hotel_id: str,
    employee_id: str,
    checkout: PointageCheckOut,
    current_user: dict = Depends(get_current_user)
):
    """
    Pointer la sortie via l'ID employé (pour QR code mobile).
    Trouve automatiquement le pointage ouvert du jour.
    """
    db = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find open pointage for today
    pointage = await db.staff_pointage.find_one({
        "hotel_id": hotel_id,
        "employee_id": employee_id,
        "date": today,
        "check_out_time": None
    }, {"_id": 0})
    
    if not pointage:
        raise HTTPException(
            status_code=404, 
            detail="Aucun pointage en cours trouvé pour aujourd'hui. Veuillez d'abord pointer votre entrée."
        )
    
    # Use the regular check-out function
    return await check_out(hotel_id, pointage["id"], checkout, current_user)


# ═══════════════════════════════════════════════════════════════════════════════
# MANUAL POINTAGE (RECEPTION)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/hotels/{hotel_id}/manual", response_model=PointageResponse)
async def create_manual_pointage(
    hotel_id: str,
    pointage: PointageManualCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Créer un pointage manuel (par la réception).
    Motif obligatoire + signature optionnelle.
    """
    db = get_db()
    
    # Check config
    config = await get_pointage_config(db, hotel_id)
    if not config.get("manual_pointage_enabled"):
        raise HTTPException(status_code=400, detail="Pointage manuel désactivé")
    
    # Validate reason is provided
    if not pointage.manual_reason or len(pointage.manual_reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="Le motif est obligatoire (minimum 5 caractères)")
    
    # Get employee info
    employee = await db.staff_employees.find_one({
        "id": pointage.employee_id,
        "hotel_id": hotel_id,
        "is_active": True
    }, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé ou inactif")
    
    # Check for existing pointage on this date
    existing = await db.staff_pointage.find_one({
        "hotel_id": hotel_id,
        "employee_id": pointage.employee_id,
        "date": pointage.date
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Un pointage existe déjà pour cette date")
    
    # Get planning
    planning = await get_planning_for_employee_date(db, hotel_id, pointage.employee_id, pointage.date)
    
    # Calculate hours
    total_hours = None
    if pointage.check_in_time and pointage.check_out_time:
        total_hours = calculate_hours_between(pointage.check_in_time, pointage.check_out_time)
    
    # Calculate ecart
    planned_hours = planning.get("worked_hours") if planning else None
    ecart_minutes = int((total_hours - planned_hours) * 60) if total_hours and planned_hours else None
    overtime_hours = max(0, total_hours - planned_hours) if total_hours and planned_hours else None
    
    now = datetime.now(timezone.utc)
    pointage_id = str(uuid.uuid4())
    
    # Determine status
    status = PointageStatus.CONFORME.value
    if not pointage.check_out_time:
        status = PointageStatus.EN_COURS.value
    elif ecart_minutes and ecart_minutes > 30:
        status = PointageStatus.DEPASSEMENT.value
    
    pointage_doc = {
        "id": pointage_id,
        "hotel_id": hotel_id,
        "employee_id": pointage.employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "department": employee.get("department", ""),
        "date": pointage.date,
        
        # Times (convert HH:MM to ISO format for consistency)
        "check_in_time": f"{pointage.date}T{pointage.check_in_time}:00",
        "check_out_time": f"{pointage.date}T{pointage.check_out_time}:00" if pointage.check_out_time else None,
        "total_hours": round(total_hours, 2) if total_hours else None,
        
        # Planning
        "planned_start": planning.get("start_time") if planning else None,
        "planned_end": planning.get("end_time") if planning else None,
        "planned_hours": planned_hours,
        "shift_id": planning.get("id") if planning else None,
        
        # Écarts
        "ecart_minutes": ecart_minutes,
        "retard_minutes": None,  # Manual doesn't track late
        
        # Overtime
        "overtime_hours": round(overtime_hours, 2) if overtime_hours and overtime_hours > 0 else None,
        "overtime_validated": False,
        "overtime_rate": None,
        "overtime_validated_by": None,
        "overtime_validated_at": None,
        
        # Metadata
        "source": PointageSource.MANUAL.value,
        "status": status,
        "check_in_location": None,
        "check_out_location": None,
        
        # Manual specific
        "manual_reason": pointage.manual_reason,
        "signature_data": pointage.signature_data,
        "signature_document_url": pointage.signature_document_url,
        "notes": pointage.notes,
        
        # Audit
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": current_user.get("user_id")
    }
    
    await db.staff_pointage.insert_one(pointage_doc)
    
    logger.info(f"Manual pointage created for {employee['first_name']} on {pointage.date} by {current_user.get('email')}")
    
    return PointageResponse(**pointage_doc)


# ═══════════════════════════════════════════════════════════════════════════════
# OVERTIME VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

@router.patch("/hotels/{hotel_id}/pointages/{pointage_id}/validate-overtime", response_model=PointageResponse)
async def validate_overtime(
    hotel_id: str,
    pointage_id: str,
    validation: OvertimeValidation,
    current_user: dict = Depends(get_current_user)
):
    """
    Valider les heures supplémentaires.
    Direction et RH uniquement.
    """
    check_role_access(current_user, ["admin", "manager", "super_admin"])
    db = get_db()
    
    pointage = await db.staff_pointage.find_one({
        "id": pointage_id,
        "hotel_id": hotel_id
    }, {"_id": 0})
    
    if not pointage:
        raise HTTPException(status_code=404, detail="Pointage non trouvé")
    
    if not pointage.get("overtime_hours") or pointage["overtime_hours"] <= 0:
        raise HTTPException(status_code=400, detail="Pas d'heures supplémentaires à valider")
    
    if pointage.get("overtime_validated"):
        raise HTTPException(status_code=400, detail="Heures supplémentaires déjà validées")
    
    now = datetime.now(timezone.utc)
    
    await db.staff_pointage.update_one(
        {"id": pointage_id},
        {"$set": {
            "overtime_validated": True,
            "overtime_rate": validation.overtime_rate.value,
            "overtime_validated_by": current_user.get("user_id"),
            "overtime_validated_at": now.isoformat(),
            "updated_at": now.isoformat()
        }}
    )
    
    updated = await db.staff_pointage.find_one({"id": pointage_id}, {"_id": 0})
    
    logger.info(f"Overtime validated: {pointage['employee_name']} - {pointage['overtime_hours']}h at {validation.overtime_rate.value}%")
    
    return PointageResponse(**updated)


# ═══════════════════════════════════════════════════════════════════════════════
# LIST & SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/pointages", response_model=List[PointageResponse])
async def get_pointages(
    hotel_id: str,
    date: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    employee_id: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get pointages with filters"""
    db = get_db()
    
    query = {"hotel_id": hotel_id}
    
    if date:
        query["date"] = date
    elif from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        query["date"] = {"$gte": from_date}
    elif to_date:
        query["date"] = {"$lte": to_date}
    
    if employee_id:
        query["employee_id"] = employee_id
    if department:
        query["department"] = department
    if status:
        query["status"] = status
    
    pointages = await db.staff_pointage.find(
        query, {"_id": 0}
    ).sort([("date", -1), ("check_in_time", -1)]).to_list(1000)
    
    return [PointageResponse(**p) for p in pointages]


@router.get("/hotels/{hotel_id}/pointages/{pointage_id}", response_model=PointageResponse)
async def get_pointage(
    hotel_id: str,
    pointage_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single pointage by ID"""
    db = get_db()
    
    pointage = await db.staff_pointage.find_one({
        "id": pointage_id,
        "hotel_id": hotel_id
    }, {"_id": 0})
    
    if not pointage:
        raise HTTPException(status_code=404, detail="Pointage non trouvé")
    
    return PointageResponse(**pointage)


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE CURRENT STATUS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/employee/{employee_id}/status")
async def get_employee_pointage_status(
    hotel_id: str,
    employee_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get current pointage status for an employee (for QR mobile app)"""
    db = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get employee info
    employee = await db.staff_employees.find_one({
        "id": employee_id,
        "hotel_id": hotel_id
    }, {"_id": 0})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    # Get today's planning
    planning = await get_planning_for_employee_date(db, hotel_id, employee_id, today)
    
    # Get today's pointage
    pointage = await db.staff_pointage.find_one({
        "hotel_id": hotel_id,
        "employee_id": employee_id,
        "date": today
    }, {"_id": 0})
    
    has_open_pointage = pointage and not pointage.get("check_out_time")
    
    return {
        "employee_id": employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "date": today,
        "has_planning": planning is not None,
        "planned_start": planning.get("start_time") if planning else None,
        "planned_end": planning.get("end_time") if planning else None,
        "has_pointage": pointage is not None,
        "has_open_pointage": has_open_pointage,
        "pointage_id": pointage.get("id") if pointage else None,
        "check_in_time": pointage.get("check_in_time") if pointage else None,
        "check_out_time": pointage.get("check_out_time") if pointage else None,
        "can_check_in": not has_open_pointage,
        "can_check_out": has_open_pointage,
        "action": "check_out" if has_open_pointage else "check_in"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# STATISTICS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/stats", response_model=PointageStats)
async def get_pointage_stats(
    hotel_id: str,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get pointage statistics for a date"""
    db = get_db()
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get all employees
    employees = await db.staff_employees.find({
        "hotel_id": hotel_id,
        "is_active": True
    }, {"_id": 0}).to_list(500)
    
    # Get all pointages for the date
    pointages = await db.staff_pointage.find({
        "hotel_id": hotel_id,
        "date": target_date
    }, {"_id": 0}).to_list(500)
    
    employee_ids_with_pointage = set(p["employee_id"] for p in pointages)
    
    stats = PointageStats(
        date=target_date,
        total_employees=len(employees),
        pointes=len(employee_ids_with_pointage),
        non_pointes=len(employees) - len(employee_ids_with_pointage),
        en_cours=len([p for p in pointages if p.get("status") == PointageStatus.EN_COURS.value]),
        conformes=len([p for p in pointages if p.get("status") == PointageStatus.CONFORME.value]),
        retards=len([p for p in pointages if p.get("status") == PointageStatus.RETARD.value]),
        depassements=len([p for p in pointages if p.get("status") == PointageStatus.DEPASSEMENT.value]),
        anomalies=len([p for p in pointages if p.get("status") == PointageStatus.ANOMALIE.value]),
        total_hours_worked=sum(p.get("total_hours", 0) or 0 for p in pointages),
        total_overtime_hours=sum(p.get("overtime_hours", 0) or 0 for p in pointages),
        overtime_validated_hours=sum(
            p.get("overtime_hours", 0) or 0 
            for p in pointages 
            if p.get("overtime_validated")
        )
    )
    
    return stats


# ═══════════════════════════════════════════════════════════════════════════════
# PAYROLL EXPORT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/export/payroll")
async def export_for_payroll(
    hotel_id: str,
    from_date: str,
    to_date: str,
    current_user: dict = Depends(get_current_user)
):
    """Export pointage data for payroll processing"""
    check_role_access(current_user, ["admin", "manager", "super_admin"])
    db = get_db()
    
    # Get all employees
    employees = await db.staff_employees.find({
        "hotel_id": hotel_id,
        "is_active": True
    }, {"_id": 0}).to_list(500)
    
    # Get all pointages in period
    pointages = await db.staff_pointage.find({
        "hotel_id": hotel_id,
        "date": {"$gte": from_date, "$lte": to_date}
    }, {"_id": 0}).to_list(10000)
    
    # Group by employee
    employee_data = []
    for emp in employees:
        emp_pointages = [p for p in pointages if p["employee_id"] == emp["id"]]
        
        total_hours = sum(p.get("total_hours", 0) or 0 for p in emp_pointages)
        overtime_total = sum(p.get("overtime_hours", 0) or 0 for p in emp_pointages)
        overtime_validated = sum(
            p.get("overtime_hours", 0) or 0 
            for p in emp_pointages 
            if p.get("overtime_validated")
        )
        overtime_25 = sum(
            p.get("overtime_hours", 0) or 0 
            for p in emp_pointages 
            if p.get("overtime_validated") and p.get("overtime_rate") == "25"
        )
        overtime_50 = sum(
            p.get("overtime_hours", 0) or 0 
            for p in emp_pointages 
            if p.get("overtime_validated") and p.get("overtime_rate") == "50"
        )
        
        days_worked = len(set(p["date"] for p in emp_pointages if p.get("check_out_time")))
        absences = 0  # Would need to compare with planning
        
        late_count = len([p for p in emp_pointages if p.get("retard_minutes") and p["retard_minutes"] > 0])
        total_late_minutes = sum(p.get("retard_minutes", 0) or 0 for p in emp_pointages)
        
        employee_data.append({
            "employee_id": emp["id"],
            "employee_name": f"{emp['first_name']} {emp['last_name']}",
            "department": emp.get("department", ""),
            "contract_type": emp.get("contract_type", ""),
            "hourly_rate": emp.get("hourly_rate", 0),
            
            # Hours
            "days_worked": days_worked,
            "total_hours_worked": round(total_hours, 2),
            "overtime_total": round(overtime_total, 2),
            "overtime_validated": round(overtime_validated, 2),
            "overtime_25_percent": round(overtime_25, 2),
            "overtime_50_percent": round(overtime_50, 2),
            
            # Punctuality
            "late_count": late_count,
            "total_late_minutes": total_late_minutes,
            
            # Absences
            "absences": absences,
            
            # Calculated pay components
            "base_pay": round(total_hours * emp.get("hourly_rate", 0), 2),
            "overtime_pay_25": round(overtime_25 * emp.get("hourly_rate", 0) * 1.25, 2),
            "overtime_pay_50": round(overtime_50 * emp.get("hourly_rate", 0) * 1.50, 2)
        })
    
    return PayrollExport(
        hotel_id=hotel_id,
        period_start=from_date,
        period_end=to_date,
        generated_at=datetime.now(timezone.utc).isoformat(),
        employees=employee_data
    )


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/config", response_model=QRCodeConfig)
async def get_pointage_config_endpoint(
    hotel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get pointage configuration for hotel"""
    db = get_db()
    config = await get_pointage_config(db, hotel_id)
    
    # Build QR URL for mobile pointage
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://flowtym.com")
    config["qr_code_url"] = f"{base_url}/pointage/mobile?hotel_id={hotel_id}&token={config['qr_code_secret']}"
    
    return QRCodeConfig(**config)


@router.put("/hotels/{hotel_id}/config")
async def update_pointage_config(
    hotel_id: str,
    qr_code_enabled: Optional[bool] = None,
    geolocation_enabled: Optional[bool] = None,
    geolocation_radius_meters: Optional[int] = None,
    late_tolerance_minutes: Optional[int] = None,
    manual_pointage_enabled: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update pointage configuration"""
    check_role_access(current_user, ["admin", "super_admin"])
    db = get_db()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if qr_code_enabled is not None:
        update_data["qr_code_enabled"] = qr_code_enabled
    if geolocation_enabled is not None:
        update_data["geolocation_enabled"] = geolocation_enabled
    if geolocation_radius_meters is not None:
        update_data["geolocation_radius_meters"] = geolocation_radius_meters
    if late_tolerance_minutes is not None:
        update_data["late_tolerance_minutes"] = late_tolerance_minutes
    if manual_pointage_enabled is not None:
        update_data["manual_pointage_enabled"] = manual_pointage_enabled
    
    await db.pointage_config.update_one(
        {"hotel_id": hotel_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Configuration mise à jour", "success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/hotels/{hotel_id}/alerts", response_model=List[PointageAlert])
async def get_pointage_alerts(
    hotel_id: str,
    include_resolved: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get pointage alerts (missing checkouts, anomalies)"""
    db = get_db()
    
    query = {"hotel_id": hotel_id}
    if not include_resolved:
        query["is_resolved"] = False
    
    alerts = await db.pointage_alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return [PointageAlert(**a) for a in alerts]


@router.post("/hotels/{hotel_id}/detect-anomalies")
async def detect_anomalies(
    hotel_id: str,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Detect pointage anomalies for a date.
    Creates alerts for:
    - Missing checkouts
    - Employees scheduled but didn't point
    - Inconsistent times
    """
    check_role_access(current_user, ["admin", "manager", "super_admin"])
    db = get_db()
    
    target_date = date or (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc)
    alerts_created = 0
    
    # Get all pointages without checkout
    missing_checkouts = await db.staff_pointage.find({
        "hotel_id": hotel_id,
        "date": target_date,
        "check_out_time": None,
        "status": PointageStatus.EN_COURS.value
    }, {"_id": 0}).to_list(500)
    
    for p in missing_checkouts:
        # Check if alert already exists
        existing = await db.pointage_alerts.find_one({
            "hotel_id": hotel_id,
            "employee_id": p["employee_id"],
            "date": target_date,
            "alert_type": "missing_checkout",
            "is_resolved": False
        })
        
        if not existing:
            alert = {
                "id": str(uuid.uuid4()),
                "hotel_id": hotel_id,
                "employee_id": p["employee_id"],
                "employee_name": p["employee_name"],
                "alert_type": "missing_checkout",
                "message": f"Pas de pointage de sortie enregistré pour {p['employee_name']} le {target_date}",
                "date": target_date,
                "is_resolved": False,
                "created_at": now.isoformat()
            }
            await db.pointage_alerts.insert_one(alert)
            alerts_created += 1
    
    # Get scheduled employees who didn't point
    shifts = await db.shifts.find({
        "hotel_id": hotel_id,
        "date": target_date,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(500)
    
    pointages = await db.staff_pointage.find({
        "hotel_id": hotel_id,
        "date": target_date
    }, {"_id": 0}).to_list(500)
    
    pointed_employees = set(p["employee_id"] for p in pointages)
    
    for shift in shifts:
        if shift["employee_id"] not in pointed_employees:
            existing = await db.pointage_alerts.find_one({
                "hotel_id": hotel_id,
                "employee_id": shift["employee_id"],
                "date": target_date,
                "alert_type": "no_pointage",
                "is_resolved": False
            })
            
            if not existing:
                alert = {
                    "id": str(uuid.uuid4()),
                    "hotel_id": hotel_id,
                    "employee_id": shift["employee_id"],
                    "employee_name": shift.get("employee_name", "Employé"),
                    "alert_type": "no_pointage",
                    "message": f"{shift.get('employee_name', 'Employé')} était planifié mais n'a pas pointé le {target_date}",
                    "date": target_date,
                    "is_resolved": False,
                    "created_at": now.isoformat()
                }
                await db.pointage_alerts.insert_one(alert)
                alerts_created += 1
    
    return {
        "message": f"{alerts_created} alerte(s) créée(s)",
        "alerts_created": alerts_created,
        "date": target_date
    }


@router.patch("/hotels/{hotel_id}/alerts/{alert_id}/resolve")
async def resolve_alert(
    hotel_id: str,
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark an alert as resolved"""
    db = get_db()
    now = datetime.now(timezone.utc)
    
    result = await db.pointage_alerts.update_one(
        {"id": alert_id, "hotel_id": hotel_id},
        {"$set": {
            "is_resolved": True,
            "resolved_by": current_user.get("user_id"),
            "resolved_at": now.isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    return {"message": "Alerte résolue", "success": True}
