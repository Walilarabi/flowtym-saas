"""
Staff Pointage Module - Time Clock System
Système de pointage intelligent connecté au planning
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PointageSource(str, Enum):
    QR = "qr"
    MANUAL = "manuel"
    ADMIN = "admin"


class PointageStatus(str, Enum):
    CONFORME = "conforme"           # ✔️ Dans les temps
    RETARD = "retard"               # ⚠️ Arrivée en retard
    DEPASSEMENT = "depassement"     # ⏱️ Dépassement horaire
    NON_POINTE = "non_pointe"       # ❌ Non pointé
    EN_COURS = "en_cours"           # 🔵 Pointage en cours (check-in sans check-out)
    ANOMALIE = "anomalie"           # ⚠️ Temps incohérent


class OvertimeRate(str, Enum):
    RATE_25 = "25"   # +25%
    RATE_50 = "50"   # +50%


# ═══════════════════════════════════════════════════════════════════════════════
# POINTAGE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class PointageCreate(BaseModel):
    """Création d'un pointage (check-in)"""
    employee_id: str
    source: PointageSource = PointageSource.QR
    check_in_location: Optional[Dict[str, float]] = None  # {lat, lng}
    notes: Optional[str] = None
    # Pour pointage manuel
    manual_reason: Optional[str] = None
    signature_data: Optional[str] = None  # Base64 signature canvas
    signature_document_url: Optional[str] = None  # URL document signé


class PointageCheckOut(BaseModel):
    """Check-out d'un pointage existant"""
    check_out_location: Optional[Dict[str, float]] = None
    notes: Optional[str] = None
    manual_reason: Optional[str] = None
    signature_data: Optional[str] = None
    signature_document_url: Optional[str] = None


class PointageResponse(BaseModel):
    """Réponse pointage complète"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    department: str
    date: str
    
    # Heures réelles
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    total_hours: Optional[float] = None
    
    # Heures prévues (depuis planning)
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    planned_hours: Optional[float] = None
    
    # Écarts
    ecart_minutes: Optional[int] = None  # Positif = dépassement, négatif = manque
    retard_minutes: Optional[int] = None  # Minutes de retard à l'arrivée
    
    # Heures supplémentaires
    overtime_hours: Optional[float] = None
    overtime_validated: bool = False
    overtime_rate: Optional[str] = None  # "25" ou "50"
    overtime_validated_by: Optional[str] = None
    overtime_validated_at: Optional[str] = None
    
    # Métadonnées
    source: str
    status: str
    check_in_location: Optional[Dict[str, float]] = None
    check_out_location: Optional[Dict[str, float]] = None
    
    # Pointage manuel
    manual_reason: Optional[str] = None
    signature_data: Optional[str] = None
    signature_document_url: Optional[str] = None
    
    # Audit
    created_at: str
    updated_at: str
    created_by: Optional[str] = None


class PointageManualCreate(BaseModel):
    """Pointage manuel par la réception"""
    employee_id: str
    date: str
    check_in_time: str  # HH:MM format
    check_out_time: Optional[str] = None
    manual_reason: str  # Obligatoire
    signature_data: Optional[str] = None
    signature_document_url: Optional[str] = None
    notes: Optional[str] = None


class OvertimeValidation(BaseModel):
    """Validation des heures supplémentaires"""
    overtime_rate: OvertimeRate
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# QR CODE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class QRCodeConfig(BaseModel):
    """Configuration QR Code pour un hôtel"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    hotel_id: str
    qr_code_enabled: bool = True
    qr_code_secret: str  # Token unique pour le QR
    qr_code_url: str  # URL de pointage
    geolocation_enabled: bool = False
    geolocation_radius_meters: int = 100  # Rayon autorisé en mètres
    late_tolerance_minutes: int = 5  # Tolérance retard
    manual_pointage_enabled: bool = True
    created_at: str
    updated_at: str


class QRCodeResponse(BaseModel):
    """Réponse avec données QR Code"""
    qr_code_url: str
    qr_code_data: str  # Données encodées dans le QR
    qr_code_image_url: Optional[str] = None  # Image QR générée


# ═══════════════════════════════════════════════════════════════════════════════
# STATISTICS & REPORTS
# ═══════════════════════════════════════════════════════════════════════════════

class PointageStats(BaseModel):
    """Statistiques de pointage"""
    date: str
    total_employees: int
    pointes: int
    non_pointes: int
    en_cours: int
    conformes: int
    retards: int
    depassements: int
    anomalies: int
    total_hours_worked: float
    total_overtime_hours: float
    overtime_validated_hours: float


class EmployeePointageSummary(BaseModel):
    """Résumé pointage d'un employé pour une période"""
    employee_id: str
    employee_name: str
    department: str
    period_start: str
    period_end: str
    
    # Totaux
    total_days: int
    days_worked: int
    days_absent: int
    
    # Heures
    total_hours_worked: float
    total_planned_hours: float
    total_overtime: float
    overtime_validated: float
    
    # Ponctualité
    on_time_count: int
    late_count: int
    total_late_minutes: int
    
    # Anomalies
    anomaly_count: int
    missing_checkout_count: int


class PayrollExport(BaseModel):
    """Export pour la paie"""
    hotel_id: str
    period_start: str
    period_end: str
    generated_at: str
    employees: List[Dict[str, Any]]  # Détails par employé


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════════════════════

class PointageAlert(BaseModel):
    """Alerte de pointage"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    hotel_id: str
    employee_id: str
    employee_name: str
    alert_type: str  # missing_checkout, inconsistent_time, no_pointage, late
    message: str
    date: str
    is_resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str
